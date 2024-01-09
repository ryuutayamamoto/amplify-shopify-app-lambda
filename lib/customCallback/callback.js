const shopifyApi = require('@shopify/shopify-api');
const redirectToAuth = require('@shopify/shopify-app-express/build/cjs/redirect-to-auth');

const { dynamodb } = require('../shopify');

export async function authCallback({
  req,
  res,
  api,
  config
}) {
  try {
    // セッションを取得
    const callbackResponse = await shopifyApi.auth.callback({
      rawRequest: req,
      rawResponse: res
    });

    // セッションを保存
    console.log('Callback is valid, storing session', {
      shop: callbackResponse.session.shop,
      isOnline: callbackResponse.session.isOnline
    });
    await api.sessionStorage.storeSession(callbackResponse.session);

    // If this is an offline OAuth process, register webhooks
    // オフラインOAuthプロセスの場合、webhookを登録
    if (!callbackResponse.session.isOnline) {
      await registerWebhooks(callbackResponse.session);
    }

    // If we're completing an offline OAuth process, immediately kick off the online one
    // オフラインOAuthプロセスを完了する場合、オンラインのOAuthプロセスをすぐに開始します。
    if (config.useOnlineTokens && !callbackResponse.session.isOnline) {
      console.log('Completing offline token OAuth, redirecting to online token OAuth', {
        shop: callbackResponse.session.shop
      });
      await redirectToAuth.redirectToAuth({
        req,
        res,
        api,
        config,
        isOnline: true
      });
      return false;
    }

    // セッションをローカル側に保存
    res.locals.shopify = {
      ...res.locals.shopify,
      session: callbackResponse.session
    };

    console.log('Completed OAuth callback', {
      shop: callbackResponse.session.shop,
      isOnline: callbackResponse.session.isOnline
    });

    return true;
  } catch (error) {
    console.error(`Failed to complete OAuth with error: ${error}`);
    await handleCallbackError(req, res, api, config, error);
  }
  return false;
}

// webhook登録
async function registerWebhooks(session) {
  console.log('Registering webhooks', { shop: session.shop });

  // webhookにセッションを登録
  const responsesByTopic = await shopifyApi.webhooks.register({
    session
  });

  // エラーがあればログに出力
  for (const topic in responsesByTopic) {
    if (!Object.prototype.hasOwnProperty.call(responsesByTopic, topic)) {
      continue;
    }

    for (const response of responsesByTopic[topic]) {
      if (!response.success && !shopifyApi.gdprTopics.includes(topic)) {
        const result = response.result;

        if (result.errors) {
          console.error(`Failed to register ${topic} webhook: ${result.errors[0].message}`, {
            shop: session.shop
          });
        } else {
          console.error(`Failed to register ${topic} webhook: ${JSON.stringify(result.data)}`, {
            shop: session.shop
          });
        }
      }
    }
  }
}

// エラー処理
async function handleCallbackError(req, res, api, config, error) {
  switch (true) {
    case error instanceof shopifyApi.InvalidOAuthError:
      res.status(400);
      res.send(error.message);
      break;
    case error instanceof shopifyApi.CookieNotFound:
      await redirectToAuth.redirectToAuth({
        req,
        res,
        api,
        config
      });
      break;
    case error instanceof shopifyApi.BotActivityDetected:
      res.status(410);
      res.send(error.message);
      break;
    default:
      res.status(500);
      res.send(error.message);
      break;
  }
}