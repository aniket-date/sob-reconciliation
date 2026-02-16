---
name: Reconciliation Scenarios
description: This file defines the comparison logic for various reconciliation scenarios between HotWax OMS and Shopify.
scenarios:
  - id: "RECL_ORD_STS"
    name: "Order Status Reconciliation"
    description: "Compares high-level order status and identifiers between OMS and Shopify."
    sqlPath: "orderStatus[0]"
    gqlPath: "order"
    mappings:
      - omsField: "orderName"
        shopifyField: "name"
        label: "Order Name"
      - omsField: "externalId"
        shopifyField: "id"
        label: "Order ID (GID)"
        transform: "stripGid"
      - omsField: "statusId"
        shopifyField: "displayFulfillmentStatus"
        label: "Order Status"
        valueMap:
          "ORDER_APPROVED": "UNFULFILLED"

  - id: "RECL_ORD_ITEM_STS"
    name: "Order Item Status Reconciliation"
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

## Scenarios

### 1. Order Status (`RECL_ORD_STS`)
This scenario validates that the basic order identity and its processing status match across both platforms.

| OMS Field (SQL) | Shopify Field (GQL) | Notes |
| :--- | :--- | :--- |
| `orderName` | `name` | Human-readable order number (e.g., #1001) |
| `externalId` | `id` | Shopify Internal ID (GID) |
| `statusId` | `displayFulfillmentStatus` | Current state of the order |

### 2. Order Item Status (`RECL_ORD_ITEM_STS`)
This scenario performs a list-based comparison of all line items within an order.

| OMS Field (SQL) | Shopify Field (GQL) | Notes |
| :--- | :--- | :--- |
| `externalId` | `node.id` | Primary key for matching items |
| `statusId` | `node.fulfillmentStatus` | Item-level fulfillment state |
| `orderItemSeqId` | `node.id` | OMS sequence ID vs Shopify Line GID |
