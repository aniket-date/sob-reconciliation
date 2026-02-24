import 'dotenv/config';
import { reconciliationTool } from './mastra/tools/reconciliation-tool.js';

async function run() {
    try {
        const result = await reconciliationTool.execute({
            orderIdList: '2684',
            productCategoryId: 'RECL_SALES_CHN'
        });
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Execution failed:', error);
    }
}

run();
