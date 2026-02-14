import { reconciliationScenarios, type Scenario, type Mapping } from '../references/reconciliation-logic.js';

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

export function compareData(scenarioId: string, sqlData: any, gqlData: any): string {
    console.log(`[DEBUG] compareData called for scenarioId: "${scenarioId}"`);

    const currentScenarios = reconciliationScenarios;
    const scenario = currentScenarios.find(s => s.id === scenarioId);

    if (!scenario) {
        console.log(`[DEBUG] Scenario "${scenarioId}" NOT FOUND. Available IDs: ${currentScenarios.map(s => s.id).join(', ')}`);
        return `Scenario Not Found: The scenario "${scenarioId}" was not found in the loaded configuration. Available: ${currentScenarios.map(s => s.id).join(', ')}`;
    }

    let diffs: string[] = [];

    // Case 1: Simple object comparison
    if (scenario.type !== 'list') {
        let targetSql = sqlData;
        let targetGql = gqlData;

        if (scenario.sqlPath) targetSql = getValue(sqlData, scenario.sqlPath);
        if (scenario.gqlPath) targetGql = getValue(gqlData, scenario.gqlPath);

        targetSql = targetSql || sqlData;
        targetGql = targetGql || gqlData;

        scenario.mappings.forEach(m => {
            let omsVal = getValue(targetSql, m.omsField);
            let shopifyVal = getValue(targetGql, m.shopifyField);

            // Apply transforms
            if (m.transform === 'stripGid') {
                omsVal = stripGid(omsVal);
                shopifyVal = stripGid(shopifyVal);
            }

            // Apply value mapping to OMS value
            if (m.valueMap && omsVal in m.valueMap) {
                console.log(`[DEBUG] Mapping value "${omsVal}" to "${m.valueMap[omsVal]}"`);
                omsVal = m.valueMap[omsVal];
            }

            if (omsVal !== shopifyVal) {
                diffs.push(`${m.label}: OMS(${omsVal}) vs Shopify(${shopifyVal})`);
            }
        });
    }
    // Case 2: List comparison
    else if (scenario.type === 'list' && scenario.matchBy) {
        const sqlList = (scenario.sqlPath ? getValue(sqlData, scenario.sqlPath) : sqlData) || [];
        const gqlList = (scenario.gqlPath ? getValue(gqlData, scenario.gqlPath) : gqlData) || [];

        const sqlArray = Array.isArray(sqlList) ? sqlList : [sqlList];
        const gqlArray = Array.isArray(gqlList) ? gqlList : [gqlList];

        sqlArray.forEach((sqlItem: any) => {
            let omsMatchVal = getValue(sqlItem, scenario.matchBy!.oms);
            if (scenario.matchBy!.transform === 'stripGid') omsMatchVal = stripGid(omsMatchVal);

            const matchingGqlItem = gqlArray.find((gqlItem: any) => {
                let gqlMatchVal = getValue(gqlItem, scenario.matchBy!.shopify);
                if (scenario.matchBy!.transform === 'stripGid') gqlMatchVal = stripGid(gqlMatchVal);
                return omsMatchVal === gqlMatchVal;
            });

            if (!matchingGqlItem) {
                diffs.push(`Item ID ${omsMatchVal}: Missing in Shopify`);
                return;
            }

            scenario.mappings.forEach(m => {
                let omsVal = getValue(sqlItem, m.omsField);
                let shopifyVal = getValue(matchingGqlItem, m.shopifyField);

                if (m.transform === 'stripGid') {
                    omsVal = stripGid(omsVal);
                    shopifyVal = stripGid(shopifyVal);
                }

                // Apply value mapping
                if (m.valueMap && omsVal in m.valueMap) {
                    omsVal = m.valueMap[omsVal];
                }

                if (omsVal !== shopifyVal) {
                    diffs.push(`Item ID ${omsMatchVal} - ${m.label}: OMS(${omsVal}) vs Shopify(${shopifyVal})`);
                }
            });
        });

        // Check for items in Shopify but not in OMS
        gqlArray.forEach((gqlItem: any) => {
            let gqlMatchVal = getValue(gqlItem, scenario.matchBy!.shopify);
            if (scenario.matchBy!.transform === 'stripGid') gqlMatchVal = stripGid(gqlMatchVal);

            const matchingSqlItem = sqlArray.find((sqlItem: any) => {
                let omsMatchVal = getValue(sqlItem, scenario.matchBy!.oms);
                if (scenario.matchBy!.transform === 'stripGid') omsMatchVal = stripGid(omsMatchVal);
                return omsMatchVal === gqlMatchVal;
            });

            if (!matchingSqlItem) {
                diffs.push(`Item ID ${gqlMatchVal}: Missing in OMS`);
            }
        });
    }

    return diffs.length > 0 ? `Discrepancy: ${diffs.join('; ')}` : "Match: All fields equal";
}
