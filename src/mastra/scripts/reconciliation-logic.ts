export interface Mapping {
    omsField: string;
    shopifyField?: string;
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
    mappings?: Mapping[];
}

/**
 * Global field mappings: Maps OMS field names to Shopify field names.
 * These are used as defaults if no specific mapping is provided in a scenario.
 */
export const globalFieldMappings: Record<string, string> = {
    "orderName": "name",
    "externalId": "id",
    "statusId": "displayFulfillmentStatus",
    "shopifyOrderId": "legacyResourceId",
    "orderDate": "createdAt",
    "entryDate": "createdAt",
    "createdDate": "createdAt",
    "fromDate": "createdAt",
    "thruDate": "closedAt",
    "currencyUom": "currencyCode",
    "presentmentCurrencyUom": "presentmentCurrencyCode",
    "quantity": "quantity",
    "unitListPrice": "originalUnitPriceSet.shopMoney.amount",
    "unitPrice": "discountedUnitPriceSet.shopMoney.amount",
    "itemDescription": "variant.title",
    "originFacilityId": "location.legacyResourceId",
    "shipmentMethodTypeId": "title",
    "salesChannelEnumId": "sourceName",
    "postalCode": "zip",
    "countryCode": "countryCodeV2",
    "stateProvinceGeoId": "provinceCode",
    "contactNumber": "phone",
    "orderEmail": "email",
    "firstName": "customer.firstName",
    "lastName": "customer.lastName",
    "middleName": "customer.middleName",
    "maxAmount": "amountSet.shopMoney.amount",
    "paymentMethodTypeId": "gateway",
    "textData": "statusPageUrl",
    "paymentStatusId": "kind"
};

/**
 * Global value mappings: Provides common value translations for specific OMS fields.
 * Keyed by the OMS field name (e.g., "statusId").
 */
export const globalValueMappings: Record<string, Record<string, string>> = {
    "statusId": {
        "ORDER_APPROVED": "UNFULFILLED",
        "ORDER_COMPLETED": "FULFILLED",
        "ORDER_CANCELLED": "CANCELLED",
        "POS_COMPLETED": "FULFILLED",
        "ITEM_COMPLETED": "FULFILLED",
        "ITEM_APPROVED": "UNFULFILLED"
    },
    "salesChannelEnumId": {
        "POS_SALES_CHANNEL": "pos",
        "WEB_SALES_CHANNEL": "web",
        "PHONE_SALES_CHANNEL": "iphone",
        "EXCHG_SALES_CHANNEL": "exchange",
        "CSR_SALES_CHANNEL": "shopify_draft_order",
        "LOOP_EXCH": "1662707"
    },
    "paymentMethodTypeId": {
        "EXT_SHOP_CASH": "cash",
        "EXT_SHOP_CASH_ON_DEL": "Cash on Delivery (COD)",
        "EXT_SHOP_PAYPAL": "paypal",
        "EXT_SHOP_GFT_CARD": "gift_card",
        "SHOP_STORE_CREDIT": "shopify_store_credit",
        "EXCHANGE_CREDIT": "exchange-credit",
        "EXT_SHOP_AFTRPAY": "afterpay",
        "EXT_SHOP_AFTRPAY_NA": "afterpay_north_america",
        "EXT_SHOP_PAY_INSTALL": "shopify_installments",
        "EXT_SHOP_AMEX": "American Express",
        "EXT_SHOP_VISA": "Visa",
        "EXT_SHOP_MASTERCARD": "Mastercard",
        "EXT_SHOP_DISCOVER": "Discover",
        "EXT_SHOP_KLARNA": "Klarna"
    },
    "shipmentMethodTypeId": {
        "STANDARD": "Standard"
    },
    "paymentStatusId": {
        "PAYMENT_AUTHORIZED": "authorization",
        "PAYMENT_SETTLED": "capture|sale",
        "PAYMENT_REFUNDED": "refund|void"
    }
};

export const reconciliationScenarios: Scenario[] = [
    {
        id: "RECL_ORD_STS_DEMO",
        name: "For Demo Only - Order Status Reconciliation",
        description: "Compares high-level order status and identifiers between OMS and Shopify.",
        sqlPath: "orderStatus[0]",
        gqlPath: "order",
        mappings: [
            {
                omsField: "orderName",
                label: "Order Name"
                // shopifyField and valueMap will be picked up from globals
            },
            {
                omsField: "externalId",
                label: "Order ID (GID)",
                transform: "stripGid"
                // shopifyField will be picked up from globals
            },
            {
                omsField: "statusId",
                label: "Order Status"
                // valueMap will be picked up from globals
            },
            {
                omsField: "salesChannelEnumId",
                label: "Sales Channel"
            },
            {
                omsField: "orderDate",
                label: "Order Date"
            }
        ]
    },
    {
        id: "RECL_ORD_ITEM_STS_DEMO",
        name: "For Demo Only - Order Item Status Reconciliation",
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
