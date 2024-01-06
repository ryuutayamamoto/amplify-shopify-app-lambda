const serverless = require('serverless-http');
const express = require('express');

// lib
const { shopify, dynamodb } = require('./lib/shopify');
const { PrivacyWebhookHandlers } = require('./lib/privacy');
const { authCallback } = require('./lib/customCallback/callback');

const REDIRECT_URI = 'https://kupy86gijk.execute-api.us-east-1.amazonaws.com/callback';
const allowedOrigins = ['http://localhost:3000', 'https://main.d2s05i8g7qfx6c.amplifyapp.com'];

const app = express();


// クロスオリジン対応
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  // Other CORS headers you might want to set
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  next();  // Call next() to pass control to the next middleware function.
});



// Set up Shopify authentication and webhook handling
// このコードは、ShopifyのOAuth認証フローを開始するためのエンドポイントを設定しています。具体的には、shopify.config.auth.pathで指定されたパス（通常は/api/auth）にGETリクエストが来たときに、shopify.auth.begin()ミドルウェアが実行されます。
// shopify.auth.begin()ミドルウェアは、ShopifyのOAuth認証フローを開始します。これは、ユーザーをShopifyの認証ページにリダイレクトし、そこでユーザーはアプリのインストールと必要なスコープの許可を行います。
app.get(shopify.config.auth.path, shopify.auth.begin());

// このコードは、ShopifyのOAuth認証フローのコールバックエンドポイントを設定しています。具体的には、shopify.config.auth.callbackPathで指定されたパス（通常は/api/auth/callback）にGETリクエストが来たときに、shopify.auth.callback()ミドルウェアが実行されます。
//shopify.auth.callback()ミドルウェアは、ShopifyからのOAuth認証フローのコールバックを処理します。これは、Shopifyからの認証コードを受け取り、それを使用してアクセストークンを取得します。
// その後、shopify.redirectToShopifyOrAppRoot()ミドルウェアが実行されます。これは、ユーザーをShopify管理画面またはアプリのルートパスにリダイレクトします。
app.get(
  shopify.config.auth.callbackPath,
  authCallback(),
  shopify.redirectToShopifyOrAppRoot()
);

app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);


// このコードは、Expressのミドルウェアとしてshopify.validateAuthenticatedSession()を使用しています。このミドルウェアは、/api/*パスにマッチするすべてのリクエストに対して適用されます。
// shopify.validateAuthenticatedSession()ミドルウェアは、リクエストが認証済みのセッションから来ていることを検証します。認証済みのセッションが存在しない場合、このミドルウェアはエラーレスポンスを送信します。これにより、/api/*パスにマッチするルートは、認証済みのユーザーからのリクエストのみを処理します。
app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

// このコードは、shopify.cspHeaders()ミドルウェアをExpressアプリケーションに追加しています。このミドルウェアは、Content Security Policy (CSP) ヘッダーをレスポンスに追加します。
//CSPは、特定の種類のコンテンツがどこから読み込まれるべきかをブラウザに指示するセキュリティ機能です。これにより、クロスサイトスクリプティング（XSS）攻撃などの一部の種類の攻撃を防ぐことができます。
// app.use(shopify.cspHeaders());

// Shopifyがショップにインストールされていることを確認
// フロント側のビルドファイルを送信
// app.get('/', shopify.ensureInstalledOnShop(), (req, res) => {
//   res.send('Hello world!');
// });

app.get('/', async (req, res, next) => {
  if(!req.query.shop) {
    res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
    return;
  }

  try {
    const session = await dynamodb.findSessionsByShop(req.query.shop);

    if(session.length > 0) {
      res.send('Hello world!');
    } else {
      next();
    }
  } catch (e) {
    // セッションのデータを取得できなかった場合
    console.error(`not found session data: ${e}`);
    res.status(400).send(`not found session data: ${e}`);
  }
}, shopify.ensureInstalledOnShop());

app.get('/install', shopify.ensureInstalledOnShop());

app.get('/shop_exist', async (req, res) => {
  if(!req.query.shop) {
    res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
    return;
  }

  const session = await dynamodb.findSessionsByShop(req.query.shop);
  res.status(200).send(session.length > 0);
});

const handler = serverless(app);

module.exports.handler = async (event, context) => {
  return await handler(event, context);
};

