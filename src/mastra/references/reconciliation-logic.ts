export interface Mapping {
    omsField: string;
    shopifyField: string;
    label: string;
    transform?: 'stripGid';
    valueMap?: Record<string, string>;
}

export interface Scenario {
    id: string;
    name: string;
    description: string;
    sqlPath?: string;
    gqlPath?: string;
    type?: 'list';
    matchBy?: {
        oms: string;
        shopify: string;
        transform?: 'stripGid';
    };
    mappings: Mapping[];
}

export const reconciliationScenarios: Scenario[] = [
    {
        id: "RECL_ORD_STS",
        name: "Order Status Reconciliation",
        description: "Compares high-level order status and identifiers between OMS and Shopify.",
        sqlPath: "orderStatus[0]",
        gqlPath: "order",
        mappings: [
            {
                omsField: "orderName",
                shopifyField: "name",
                label: "Order Name"
            },
            {
                omsField: "externalId",
                shopifyField: "id",
                label: "Order ID (GID)",
                transform: "stripGid"
            },
            {
                omsField: "statusId",
                shopifyField: "displayFulfillmentStatus",
                label: "Order Status",
                valueMap: {
                    "ORDER_APPROVED": "UNFULFILLED"
                }
            }
        ]
    },
    {
        id: "RECL_ORD_ITEM_STS",
        name: "Order Item Status Reconciliation",
        description: "Compares item-level status and fulfillment details.",
        sqlPath: "orderItemStatus",
        gqlPath: "order.lineItems.edges",
        type: "list",
        matchBy: {
            oms: "externalId",
            shopify: "node.id",
            transform: "stripGid"
        },
        mappings: [
            {
                omsField: "statusId",
                shopifyField: "node.fulfillmentStatus",
                label: "Item Fulfillment Status"
            },
            {
                omsField: "orderItemSeqId",
                shopifyField: "node.id",
                label: "Line Item ID",
                transform: "stripGid"
            }
        ]
    }
];
