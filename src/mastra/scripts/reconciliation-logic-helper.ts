import { reconciliationScenarios, globalFieldMappings, globalValueMappings, type Scenario, type Mapping } from './reconciliation-logic.js';

export { Scenario, Mapping };

export const scenarios: Scenario[] = reconciliationScenarios;

export function stripGid(gid: string): string {
    if (!gid) return gid;
    const parts = gid.split('/');
    return parts[parts.length - 1];
}
function getValue(obj: any, path: string): any {
    if (!path) return undefined;
    return path.split('.').reduce((acc, part) => {
        if (acc === null || acc === undefined) return acc;
        const match = part.match(/(.+)\[(\d+)\]/);
        if (match) {
            const key = match[1];
            const index = parseInt(match[2], 10);
            return acc[key]?.[index];
        }
        return acc[part];
    }, obj);
}

/**
 * Compares a single pair of items based on a mapping, including global fallbacks.
 */
function getFieldDiff(omsItem: any, shopifyItem: any, mapping: Mapping): string | null {
    let omsVal = getValue(omsItem, mapping.omsField);

    // If shopifyField is missing in mapping, check global mappings or use identity
    let shopifyField = mapping.shopifyField;
    if (!shopifyField) {
        shopifyField = globalFieldMappings[mapping.omsField] || mapping.omsField;
    }

    let shopifyVal = getValue(shopifyItem, shopifyField);

    // Apply transforms
    if (mapping.transform === 'stripGid') {
        omsVal = stripGid(omsVal);
        shopifyVal = stripGid(shopifyVal);
    }

    // Auto-strip Shopify GIDs
    if (typeof shopifyVal === 'string' && shopifyVal.startsWith('gid://')) {
        shopifyVal = stripGid(shopifyVal);
    }

    // Specifically handle the case where OMS data is missing/empty but Shopify data exists
    if ((omsVal === null || omsVal === undefined || omsVal === '') &&
        (shopifyVal !== null && shopifyVal !== undefined && shopifyVal !== '')) {
        return `${mapping.label || mapping.omsField}: OMS is empty/null vs Shopify(${shopifyVal})`;
    }

    // Ignore discrepancies if Shopify data is missing/empty, even if OMS has data
    if (shopifyVal === null || shopifyVal === undefined || shopifyVal === '') {
        return null;
    }

    // Determine the expected Shopify value based on value mappings
    let expectedShopifyVal = omsVal; // Default to identity
    const valueMap = mapping.valueMap || globalValueMappings[mapping.omsField];
    if (valueMap && omsVal !== undefined && omsVal !== null && omsVal in valueMap) {
        expectedShopifyVal = valueMap[omsVal];
    }

    // Support OR logic for expectedShopifyVal (e.g., "capture|sale")
    if (typeof expectedShopifyVal === 'string' && expectedShopifyVal.includes('|')) {
        const options = expectedShopifyVal.split('|').map(o => o.trim());
        if (options.includes(shopifyVal)) {
            return null; // Match found in one of the options
        }
        return `${mapping.label || mapping.omsField}: OMS(${omsVal} -> expected one of [${options.join(', ')}]) vs Shopify(${shopifyVal})`;
    }
    // Compare values, allowing for type coercion if they are string representations of the same value
    if (omsVal != shopifyVal) { // Use loose equality for common types if needed, or stick to strict
        // If a value mapping was applied, compare shopifyVal against the transformed expectedShopifyVal
        if (expectedShopifyVal !== omsVal) {
            if (shopifyVal != expectedShopifyVal) {
                return `${mapping.label || mapping.omsField}: OMS(${omsVal} -> expected ${expectedShopifyVal}) vs Shopify(${shopifyVal})`;
            }
        } else {
            // No value mapping, just direct comparison
            return `${mapping.label || mapping.omsField}: OMS(${omsVal}) vs Shopify(${shopifyVal})`;
        }
    }
    return null;
}

export function compareData(scenarioId: string, sqlData: any, gqlData: any): string {
    console.log(`[DEBUG] compareData called for scenarioId: "${scenarioId}"`);

    const currentScenarios = reconciliationScenarios;
    let scenario = currentScenarios.find(s => s.id === scenarioId);

    // If scenario is not found, we create a "virtual" generic scenario
    if (!scenario) {
        console.log(`[DEBUG] Scenario "${scenarioId}" NOT FOUND. Falling back to global generic mappings.`);
        scenario = {
            id: scenarioId,
            name: "Generic Reconciliation",
            description: "Automatically derived from global mappings",
            mappings: []
        };
    }

    let diffs: string[] = [];

    // Case 1: Simple object comparison
    if (scenario.type !== 'list') {
        let targetSql = sqlData;
        let targetGql = gqlData;

        if (scenario.sqlPath) targetSql = getValue(sqlData, scenario.sqlPath);
        if (scenario.gqlPath) targetGql = getValue(gqlData, scenario.gqlPath);

        // Target root if undefined
        targetSql = targetSql || sqlData;
        targetGql = targetGql || gqlData;

        if (!scenario.sqlPath) {
            if (targetSql.orderStatus && Array.isArray(targetSql.orderStatus) && targetSql.orderStatus.length > 0) {
                targetSql = targetSql.orderStatus[0];
            } else if (targetSql.orderSalesChannel && Array.isArray(targetSql.orderSalesChannel) && targetSql.orderSalesChannel.length > 0) {
                targetSql = targetSql.orderSalesChannel[0];
            }
        }
        if (!scenario.gqlPath && targetGql.order) {
            targetGql = targetGql.order;
        }

        // Merge Strategy: Start with all global mappings as default
        const globalMappings: Mapping[] = Object.entries(globalFieldMappings).map(([oms, shopify]) => ({
            omsField: oms,
            shopifyField: shopify,
            label: oms
        }));

        // Merge with scenario-specific mappings (scenario overrides global for the same omsField)
        const scenarioMappings = scenario.mappings || [];
        const mergedMappingsMap = new Map<string, Mapping>();

        // Load globals first
        globalMappings.forEach(m => mergedMappingsMap.set(m.omsField, m));
        // Overwrite with scenario-specifics
        scenarioMappings.forEach(m => mergedMappingsMap.set(m.omsField, m));

        const mappingsToUse = Array.from(mergedMappingsMap.values());

        mappingsToUse.forEach(m => {
            const diff = getFieldDiff(targetSql, targetGql, m);
            if (diff) diffs.push(diff);
        });
    }
    // Case 2: List comparison
    else if (scenario.type === 'list' && scenario.matchBy) {
        const sqlList = (scenario.sqlPath ? getValue(sqlData, scenario.sqlPath) : sqlData) || [];
        const gqlList = (scenario.gqlPath ? getValue(gqlData, scenario.gqlPath) : gqlData) || [];

        const sqlArray = Array.isArray(sqlList) ? sqlList : [sqlList];
        const gqlArray = Array.isArray(gqlList) ? gqlList : [gqlList];

        // Merge Strategy: Start with all global mappings as default
        const globalMappings: Mapping[] = Object.entries(globalFieldMappings).map(([oms, shopify]) => ({
            omsField: oms,
            shopifyField: shopify,
            label: oms
        }));

        const scenarioMappings = scenario.mappings || [];
        const mergedMappingsMap = new Map<string, Mapping>();

        globalMappings.forEach(m => mergedMappingsMap.set(m.omsField, m));
        scenarioMappings.forEach(m => mergedMappingsMap.set(m.omsField, m));

        const mappingsToUse = Array.from(mergedMappingsMap.values());

        sqlArray.forEach((sqlItem: any) => {
            let omsMatchVal = getValue(sqlItem, scenario!.matchBy!.oms);
            if (scenario!.matchBy!.transform === 'stripGid') omsMatchVal = stripGid(omsMatchVal);

            const matchingGqlItem = gqlArray.find((gqlItem: any) => {
                let gqlMatchVal = getValue(gqlItem, scenario!.matchBy!.shopify);
                if (scenario!.matchBy!.transform === 'stripGid') gqlMatchVal = stripGid(gqlMatchVal);
                return omsMatchVal === gqlMatchVal;
            });

            if (!matchingGqlItem) {
                diffs.push(`Item ID ${omsMatchVal}: Missing in Shopify`);
                return;
            }

            mappingsToUse.forEach(m => {
                const diff = getFieldDiff(sqlItem, matchingGqlItem, m);
                if (diff) {
                    diffs.push(`Item ID ${omsMatchVal} - ${diff}`);
                }
            });
        });

        // Check for items in Shopify but not in OMS
        gqlArray.forEach((gqlItem: any) => {
            let gqlMatchVal = getValue(gqlItem, scenario!.matchBy!.shopify);
            if (scenario!.matchBy!.transform === 'stripGid') gqlMatchVal = stripGid(gqlMatchVal);

            const matchingSqlItem = sqlArray.find((sqlItem: any) => {
                let omsMatchVal = getValue(sqlItem, scenario!.matchBy!.oms);
                if (scenario!.matchBy!.transform === 'stripGid') omsMatchVal = stripGid(omsMatchVal);
                return omsMatchVal === gqlMatchVal;
            });

            if (!matchingSqlItem) {
                diffs.push(`Item ID ${gqlMatchVal}: Missing in OMS`);
            }
        });
    }

    return diffs.length > 0 ? `Discrepancy: ${diffs.join('; ')}` : "Match: All fields equal";
}
