
import { compareData } from './mastra/scripts/reconciliation-logic-helper.js';

console.log('--- Testing Generic Field Mapping ---');
const scenarioId = 'RECL_ORD_STS_DEMO';

// Scenario RECL_ORD_STS has explicit mappings, but let's see if we can trigger generic ones
// by passing a mock scenario later or relying on the fact that getFieldDiff handles it.

const mockSql = {
    orderStatus: [{
        statusId: 'ORDER_APPROVED',
        orderName: 'TEST_123',
        externalId: '555'
    }]
};
const mockGql = {
    order: {
        displayFulfillmentStatus: 'UNFULFILLED',
        name: 'TEST_123',
        id: 'gid://shopify/Order/555'
    }
};

console.log('Testing existing scenario (should still pass):');
const result1 = compareData(scenarioId, mockSql, mockGql);
console.log(`Result 1: ${result1}`);

console.log('\n--- Testing Global Value Mapping Fallback ---');
const mockSql2 = {
    orderStatus: [{
        statusId: 'ORDER_COMPLETED', // This is in globalValueMappings but NOT in RECL_ORD_STS explicit valueMap
        orderName: 'TEST_456',
        externalId: '666'
    }]
};
const mockGql2 = {
    order: {
        displayFulfillmentStatus: 'FULFILLED', // Should match via globalValueMappings
        name: 'TEST_456',
        id: 'gid://shopify/Order/666'
    }
};

// Note: Current RECL_ORD_STS mapping for statusId has an explicit (narrow) valueMap.
// To test global fallback, we'd need a mapping that DOESN'T have a valueMap.
// Let's modify the scenario temporarily or just verify this in a custom way.

console.log('Testing global fallback with narrow valueMap override (should DISCREPANCY on status):');
const result2 = compareData(scenarioId, mockSql2, mockGql2);
console.log(`Result 2: ${result2}`);

console.log('\n--- Testing Scenario with NO Mappings ---');
// We need to pass a scenario ID that exists but has no mappings. 
// Since we use the hardcoded reconciliationScenarios, let's just mock the data and see if it falls back.
// Actually, compareData finds the scenario from the import. 
// Let's verify RECL_ORD_STS (which now has sparse mappings) first.

const mockSql3 = {
    orderStatus: [{
        statusId: 'ORDER_APPROVED',
        orderName: 'SPARSE_TEST',
        externalId: '999'
    }]
};
const mockGql3 = {
    order: {
        displayFulfillmentStatus: 'UNFULFILLED',
        name: 'SPARSE_TEST',
        id: 'gid://shopify/Order/999'
    }
};

console.log('Testing RECL_ORD_STS with sparse mappings (should use field/value globals):');
const result3 = compareData(scenarioId, mockSql3, mockGql3);
console.log(`Result 3: ${result3}`);

async function main() {
    // Test 3: Unknown Scenario ID (Fallback to Globals)
    console.log("\n--- Test 3: Unknown Scenario ID (Fallback to Globals) ---");
    const unknownScenarioId = "NON_EXISTENT_SCENARIO";
    const sqlData3 = {
        orderName: "1001",
        currencyUom: "USD"
    };
    const gqlData3 = {
        name: "1001",
        currencyCode: "EUR" // Discrepancy here!
    };

    const result3 = compareData(unknownScenarioId, sqlData3, gqlData3);
    console.log(`Result: ${result3}`);
    if (result3.includes("Discrepancy") && result3.includes("currencyUom")) {
        console.log("✅ Success: Unknown scenario correctly fell back to globals.");
    } else {
        console.log("❌ Failure: Unknown scenario did not use globals as expected.");
    }

    // Test 4: Merged Mappings (Scenario + Globals)
    console.log("\n--- Test 4: Merged Mappings (Scenario + Globals) ---");
    // RECL_ORD_STS_DEMO has orderName, but NOT currencyUom in its mappings list.
    // However, currencyUom IS in globalFieldMappings.
    const sqlData4 = {
        orderStatus: [{
            orderName: "1001",
            currencyUom: "USD"
        }]
    };
    const gqlData4 = {
        order: {
            name: "1001",
            currencyCode: "EUR" // Discrepancy here!
        }
    };

    const result4 = compareData("RECL_ORD_STS_DEMO", sqlData4, gqlData4);
    console.log(`Result: ${result4}`);
    if (result4.includes("Discrepancy") && result4.includes("currencyUom")) {
        console.log("✅ Success: Scenario mappings merged correctly with globals.");
    } else {
        console.log("❌ Failure: Scenario did not pick up global mapping for currencyUom.");
    }
    // Test 5: Payment Status OR Logic
    console.log("\n--- Test 5: Payment Status OR Logic ---");
    // PAYMENT_SETTLED maps to "capture|sale"
    const sqlData5 = {
        paymentStatusId: "PAYMENT_SETTLED"
    };
    const gqlData5a = { kind: "capture" };
    const gqlData5b = { kind: "sale" };
    const gqlData5c = { kind: "authorization" }; // Should fail

    const result5a = compareData("GENERIC_PAYMENT", sqlData5, gqlData5a);
    const result5b = compareData("GENERIC_PAYMENT", sqlData5, gqlData5b);
    const result5c = compareData("GENERIC_PAYMENT", sqlData5, gqlData5c);

    console.log(`Result Capture: ${result5a}`);
    console.log(`Result Sale: ${result5b}`);
    console.log(`Result Auth (Expected Fail): ${result5c}`);

    if (result5a === "Match: All fields equal" &&
        result5b === "Match: All fields equal" &&
        result5c.includes("Discrepancy")) {
        console.log("✅ Success: Payment status OR logic verified (capture|sale).");
    } else {
        console.log("❌ Failure: Payment status OR logic failed.");
    }
}

main().catch(console.error);
