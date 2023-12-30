const { BillingInterval, LATEST_API_VERSION } = require("@shopify/shopify-api");
const { restResources } = require("@shopify/shopify-api/rest/admin/2023-04");
const { shopifyApp } = require("@shopify/shopify-app-express");
const { DynamoDBSessionStorage } = require('@shopify/shopify-app-session-storage-dynamodb');
require('dotenv').config();

const { CLIENT_ID,
  CLIENT_SEECRET,
  HOSTNAME,
  SCOPES,
  DYNAMO_KEY,
  DYNAMO_SECRET,
  TABLE_NAME } = process.env;

// https://github.com/Shopify/shopify-app-js/tree/main/packages/shopify-app-session-storage-dynamodb
const storage = new DynamoDBSessionStorage({
  sessionTableName: TABLE_NAME,
  shopIndexName: 'ShopIndex',
  config: {
    region: 'us-east-1',
    accessKeyId: DYNAMO_KEY,
    secretAccessKey: DYNAMO_SECRET
  },
});

// 埋め込みアプリでは、月額課金はできない
// const billingConfig = {
//   "My Shopify One-Time Charge": {
//     // This is an example configuration that would do a one-time charge for $5 (only USD is currently supported)
//     amount: 5.0,
//     currencyCode: "USD",
//     interval: BillingInterval.OneTime,
//   },
// };

const shopify = shopifyApp({

  api: {
    apiKey: CLIENT_ID,
    apiSecretKey: CLIENT_SEECRET,
    hostName: HOSTNAME,
    apiVersion: LATEST_API_VERSION,
    scopes: SCOPES.split(","),
    restResources,
    billing: undefined, // or replace with billingConfig above to enable example billing
  },

  // - 認証設定: auth で認証の設定を行っています。path は認証のパス、callbackPath は認証後のコールバックパスを設定しています。
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },

  // - Webhook設定: webhooks でWebhookの設定を行っています。path はWebhookのパスを設定しています。
  webhooks: {
    path: "/api/webhooks",
  },

  // This should be replaced with your preferred storage strategy
  // sessionStorage: storage,
});

export default shopify;