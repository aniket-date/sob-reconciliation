
import { reconciliationScenarios } from './mastra/references/reconciliation-logic.js';
import { compareData, scenarios } from './mastra/tools/reconciliation-logic-helper.js';

console.log('--- Verifying Scenarios ---');
console.log(`Loaded scenarios from reference: ${reconciliationScenarios.length}`);
reconciliationScenarios.forEach(s => console.log(`- ${s.id}`));

console.log(`Loaded scenarios in helper: ${scenarios.length}`);
scenarios.forEach(s => console.log(`- ${s.id}`));

const scenarioId = 'RECL_ORD_STS';
console.log(`\nTesting compareData for ${scenarioId}...`);

const mockSql = {
    orderStatus: [{
        statusId: 'ORDER_APPROVED',
        orderName: 'TEST_ORDER',
        externalId: '12345'
    }]
};
const mockGql = {
    order: {
        displayFulfillmentStatus: 'UNFULFILLED',
        name: 'TEST_ORDER',
        id: 'gid://shopify/Order/12345'
    }
};

const result = compareData(scenarioId, mockSql, mockGql);
console.log(`Result: ${result}`);

if (result.includes('Scenario Not Found')) {
    console.error('FAIL: Scenario not found during test');
    process.exit(1);
} else {
    console.log('PASS: Scenario found and compared');
}
