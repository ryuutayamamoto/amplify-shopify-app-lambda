# Shopify 埋め込みアプリ （Lambda node.js Express）

## 初期設定
パートナーアカウント管理画面でアプリを作成する<br>
(https://shopify.dev/docs/apps/auth/oauth/getting-started#step-1-retrieve-client-credentials)[https://shopify.dev/docs/apps/auth/oauth/getting-started#step-1-retrieve-client-credentials]<br>
authとwhiteListの登録は、<br>
 - option設定: https://app-hostname/api/auth
 - whiteList: https://app-hostname/api/auth/callback

## .env 構成
### Shopify app
CLIENT_ID=App-Client-Id<br>
CLIENT_SECRET=App-Client-Secret<br>
HOSTNAME=App-host-Name<br>
SCOPES=read_products,write_products<br>

### AWS DynamoDB
TABLE_NAME=DynamoDB-Table-Name<br>
DYNAMO_KEY=DynamoUser-Access-Key<br>
DYNAMO_SECRET=DynamoUser-Access-Secret<br>

## Lambda設定
DynamoDBの操作権限を持ったポリシーを設定する必要がある