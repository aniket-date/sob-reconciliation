import { reconciliationTool } from './mastra/tools/reconciliation-tool.js';

async function run() {
    try {
        const result = await reconciliationTool.execute({
            orderIdList: '18',
            productCategoryId: 'RECL_ORD_STS'
        });
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Execution failed:', error);
    }
}

run();
