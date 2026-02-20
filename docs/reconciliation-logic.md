---
name: Reconciliation Scenarios
description: This file defines the comparison logic for various reconciliation scenarios between HotWax OMS and Shopify.
scenarios:
  - id: "RECL_ORD_STS_DEMO"
    name: "For Demo Only - Order Status Reconciliation"
    description: "Compares high-level order status and identifiers between OMS and Shopify."
    sqlPath: "orderStatus[0]"
    gqlPath: "order"
    mappings:
      - omsField: "orderName"
        label: "Order Name"
      - omsField: "externalId"
        label: "Order ID (GID)"
        transform: "stripGid"
      - omsField: "statusId"
        label: "Order Status"

  - id: "RECL_ORD_ITEM_STS_DEMO"
    name: "For Demo Only - Order Item Status Reconciliation"
    description: "Compares item-level status and fulfillment details."
    sqlPath: "orderItemStatus"
    gqlPath: "order.lineItems.edges"
    type: "list"
    matchBy:
      oms: "externalId"
      shopify: "node.id"
      transform: "stripGid"
    mappings:
      - omsField: "statusId"
        shopifyField: "node.fulfillmentStatus"
        label: "Item Fulfillment Status"
      - omsField: "orderItemSeqId"
        shopifyField: "node.id"
        label: "Line Item ID"
        transform: "stripGid"
---

# Reconciliation Logic Definitions

This document defines the rules for comparing data between HotWax OMS (captured via SQL) and Shopify (captured via GraphQL).

## Common Transforms
- **stripGid**: Extracts the numeric ID from a Shopify Global ID (e.g., `gid://shopify/Order/12345` -> `12345`).

## Generic Mappings

The system supports global mappings that act as defaults if a scenario does not explicitly define them.

### Global Field Mappings
These map common OMS field names to their Shopify counterparts:
- `orderName` -> `name`
- `externalId` -> `id`
- `statusId` -> `displayFulfillmentStatus`
- `shopifyOrderId` -> `legacyResourceId`
- `orderDate`, `entryDate`, `createdDate`, `fromDate` -> `createdAt`
- `thruDate` -> `closedAt`
- `currencyUom` -> `currencyCode`
- `presentmentCurrencyUom` -> `presentmentCurrencyCode`
- `quantity` -> `quantity`
- `unitListPrice` -> `originalUnitPriceSet.shopMoney.amount`
- `unitPrice` -> `discountedUnitPriceSet.shopMoney.amount`
- `itemDescription` -> `variant.title`
- `originFacilityId` -> `location.legacyResourceId`
- `shipmentMethodTypeId` -> `title`
- `salesChannelEnumId` -> `sourceName`
- `toName` -> `name`
- `postalCode` -> `zip`
- `countryCode` -> `countryCodeV2`
- `stateProvinceGeoId` -> `provinceCode`
- `contactNumber` -> `phone`
- `infoString` -> `email`
- `firstName`, `lastName`, `middleName` -> `customer.*`
- `maxAmount` -> `amountSet.shopMoney.amount`
- `paymentMethodTypeId` -> `gateway`
- `textData` -> `statusPageUrl`
- `paymentStatusId` -> `kind`

### Global Value Mappings
Common value translations are applied globally to specific OMS fields:
- `statusId`:
  - `ORDER_APPROVED` -> `UNFULFILLED`
  - `ORDER_COMPLETED` -> `FULFILLED`
  - `ORDER_CANCELLED` -> `CANCELLED`
  - `POS_COMPLETED` -> `FULFILLED`
  - `ITEM_COMPLETED` -> `FULFILLED`
  - `ITEM_APPROVED` -> `UNFULFILLED`
- `salesChannelEnumId`:
  - `POS_SALES_CHANNEL` -> `pos`
  - `WEB_SALES_CHANNEL` -> `web`
  - `PHONE_SALES_CHANNEL` -> `iphone`
  - `EXCHG_SALES_CHANNEL` -> `exchange`
  - `CSR_SALES_CHANNEL` -> `shopify_draft_order`
  - `LOOP_EXCH` -> `1662707`
- `paymentMethodTypeId`:
  - `EXT_SHOP_CASH` -> `cash`
  - `EXT_SHOP_CASH_ON_DEL` -> `Cash on Delivery (COD)`
  - `EXT_SHOP_PAYPAL` -> `paypal`
  - `EXT_SHOP_GFT_CARD` -> `gift_card`
  - `SHOP_STORE_CREDIT` -> `shopify_store_credit`
  - `EXCHANGE_CREDIT` -> `exchange-credit`
  - `EXT_SHOP_AFTRPAY` -> `afterpay`
  - `EXT_SHOP_AFTRPAY_NA` -> `afterpay_north_america`
  - `EXT_SHOP_PAY_INSTALL` -> `shopify_installments`
  - `EXT_SHOP_AMEX` -> `American Express`
  - `EXT_SHOP_VISA` -> `Visa`
  - `EXT_SHOP_MASTERCARD` -> `Mastercard`
  - `EXT_SHOP_DISCOVER` -> `Discover`
  - `EXT_SHOP_KLARNA` -> `Klarna`
- `shipmentMethodTypeId`:
  - `STANDARD` -> `Standard`
- `paymentStatusId`:
  - `PAYMENT_AUTHORIZED` -> `authorization`
  - `PAYMENT_SETTLED` -> `capture|sale`
  - `PAYMENT_REFUNDED` -> `refund|void`

### Value Mapping Special Logic
The reconciliation engine supports a pipe (`|`) character in the registry to indicate multiple acceptable matches for a single OMS value. For example, `capture|sale` allows the engine to succeed if either value is found in Shopify.

> [!TIP]
> Scenarios can now have "sparse" mappings. If `shopifyField` or `valueMap` is omitted in a scenario's mapping list, the system will automatically fall back to these global defaults.

## Scenarios

### 1. Order Status (`RECL_ORD_STS_DEMO`)
This scenario validates that the basic order identity and its processing status match across both platforms.

| OMS Field (SQL) | Shopify Field (GQL) | Notes |
| :--- | :--- | :--- |
| `orderName` | `name` | Human-readable order number (e.g., #1001) |
| `externalId` | `id` | Shopify Internal ID (GID) |
| `statusId` | `displayFulfillmentStatus` | Current state of the order |

### 2. Order Item Status (`RECL_ORD_ITEM_STS_DEMO`)
This scenario performs a list-based comparison of all line items within an order.

| OMS Field (SQL) | Shopify Field (GQL) | Notes |
| :--- | :--- | :--- |
| `externalId` | `node.id` | Primary key for matching items |
| `statusId` | `node.fulfillmentStatus` | Item-level fulfillment state |
| `orderItemSeqId` | `node.id` | OMS sequence ID vs Shopify Line GID |
