import { Agent } from '@mastra/core/agent';
import { google } from '@ai-sdk/google';
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { reconciliationTool } from '../tools/reconciliation-tool.js';

export const reconciliationAgent = new Agent({
   id: 'reconciliation-agent',
   name: 'Reconciliation Agent',
   instructions: `You are a reconciliation agent responsible for comparing data between HotWax OMS and Shopify.
  Perform the following steps:
  1. Use the reconciliationTool to execute a reconciliation scenario.
  2. Analyze the results in the reconciliationList, specifically looking at the dataDiff field which summarizes discrepancies.
  3. Provide a clear summary of any discrepancies found and suggest corrective actions if necessary.
  4. Report the reconciliation results directly.
  - If 'messages' indicates an error (like a Groovy NoSignatureException), clarify the error for the user.
  
  Your goal is to make the reconciliation process transparent and help troubleshoot any issues that arise during the API call by interpreting the JSON results.
  
  Always be professional and precise.
  `,
   // model: google('gemini-1.5-flash'),
   model: bedrock('amazon.nova-pro-v1:0'), // Using Nova Pro as per packinghelper template
   tools: { reconciliationTool },
});
