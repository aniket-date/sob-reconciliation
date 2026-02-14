import { Mastra } from '@mastra/core/mastra';
import { Agent } from '@mastra/core/agent';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { Memory } from '@mastra/memory';
import { z } from 'zod';

import { reconciliationAgent } from './agents/reconciliation-agent.js';

/**
 * Schema for structured reconciliation results
 */
const reconciliationResultSchema = z.object({
    reconciliationList: z.array(z.any()),
    messages: z.string().optional(),

    summary: z.string().describe('A summary of what was reconciled and any issues found in the JSON response'),
});

const storage = new LibSQLStore({
    id: "mastra-storage",
    url: "file:./mastra.db",
});

const memory = new Memory({
    storage,
});

export const mastra = new Mastra({
    agents: { reconciliation: reconciliationAgent },
    logger: new PinoLogger({
        name: 'ReconciliationAgent',
        level: 'info',
    }),
    memory: { default: memory },
    server: {
        apiPrefix: '/api',
        port: 4112, // Using a different port than packinghelper to avoid conflicts
        apiRoutes: [
            {
                path: '/api/agents/reconciliation/execute',
                method: 'POST',
                handler: async (c) => {
                    const mastra = c.get('mastra');
                    const { orderIdList, productCategoryId } = await c.req.json();

                    const agent = mastra.getAgent('reconciliation');
                    const prompt = `Reconcile orders for IDs: ${orderIdList} with category: ${productCategoryId}`;

                    const result = await agent.generate(prompt, {
                        structuredOutput: {
                            schema: reconciliationResultSchema,
                        },
                    });

                    return c.json(result.object);
                },
            },
        ],
    },
});
