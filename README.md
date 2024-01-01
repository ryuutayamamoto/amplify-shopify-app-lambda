# Shopify 埋め込みアプリ （Lambda node.js Express）

## 初期設定
パートナーアカウント管理画面でアプリを作成する<br>
(https://shopify.dev/docs/apps/auth/oauth/getting-started#step-1-retrieve-client-credentials)[https://shopify.dev/docs/apps/auth/oauth/getting-started#step-1-retrieve-client-credentials]<br>
authとwhiteListの登録は、<br>
 - option設定: https://app-hostname/api/auth
 - whiteList: https://app-hostname/api/auth/callback

## .env 構成
### Shopify app
CLIENT_ID=App-Client-Id
CLIENT_SECRET=App-Client-Secret
HOSTNAME=App-host-Name
SCOPES=read_products,write_products

### AWS DynamoDB
TABLE_NAME=DynamoDB-Table-Name
DYNAMO_KEY=DynamoUser-Access-Key
DYNAMO_SECRET=DynamoUser-Access-Secret

## Lambda設定
DynamoDBの操作権限を持ったポリシーを設定する必要がある