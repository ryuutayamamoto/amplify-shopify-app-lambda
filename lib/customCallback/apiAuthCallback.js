const ShopifyErrors = require("@shopify/shopify-api/lib/error");
const tslib_1 = require("tslib");
const isbot_1 = tslib_1.__importDefault(require("isbot"));
const shopifyUtils = require("@shopify/shopify-api/lib/utils");
const shop_validator_1 = require("@shopify/shopify-api/lib/utils/shop-validator");
const http_client_1 = require("@shopify/shopify-api/lib/clients/http_client/http_client");
const types_1 = require("@shopify/shopify-api/lib/clients/http_client/types");
const http_1 = require("@shopify/shopify-api/runtime/http");
const logger_1 = require("@shopify/shopify-api/lib/logger");
const safe_compare_1 = require("@shopify/shopify-api/lib/auth/oauth/safe-compare");
const create_session_1 = require("@shopify/shopify-api/lib/auth/oauth/create-session");
const logForBot = ({ request, log, func }) => {
    log.debug(`Possible bot request to auth ${func}: `, {
        userAgent: request.headers['User-Agent'],
    });
};

export function callbackComp(config) {
  return function callback(_a) {
      var adapterArgs = tslib_1.__rest(_a, []);
      return tslib_1.__awaiter(this, void 0, void 0, function* () {
          const log = (0, logger_1.logger)(config);
          const request = yield (0, http_1.abstractConvertRequest)(adapterArgs);
          const query = new URL(request.url, `${config.hostScheme}://${config.hostName}`).searchParams;
          const shop = query.get('shop');

          const response = {};

          if ((0, isbot_1.default)(request.headers['User-Agent'])) {
              logForBot({ request, log, func: 'callback' });
              throw new ShopifyErrors.BotActivityDetected('Invalid OAuth callback initiated by bot');
          }


          log.info('Completing OAuth', { shop });
          const cookies = new http_1.Cookies(request, response, {
              keys: [config.apiSecretKey],
              secure: true,
          });
          const stateFromCookie = yield cookies.getAndVerify('shopify_app_state');
          cookies.deleteCookie('shopify_app_state');


          if (!stateFromCookie) {
              log.error('Could not find OAuth cookie', { shop });
              throw new ShopifyErrors.CookieNotFound(`Cannot complete OAuth process. Could not find an OAuth cookie for shop url: ${shop}`);
          }


          const authQuery = Object.fromEntries(query.entries());


          if (!(yield validQuery({ config, query: authQuery, stateFromCookie }))) {
              log.error('Invalid OAuth callback', { shop, stateFromCookie });
              throw new ShopifyErrors.InvalidOAuthError('Invalid OAuth callback.');
          }


          log.debug('OAuth request is valid, requesting access token', { shop });

          const body = {
              client_id: config.apiKey,
              client_secret: config.apiSecretKey,
              code: query.get('code'),
          };

          const postParams = {
              path: '/admin/oauth/access_token',
              type: types_1.DataType.JSON,
              data: body,
          };

          const cleanShop = (0, shop_validator_1.sanitizeShop)(config)(query.get('shop'), true);


          const HttpClient = (0, http_client_1.httpClientClass)(config);

          const client = new HttpClient({ domain: cleanShop });
          const postResponse = yield client.post(postParams);

          const session = (0, create_session_1.createSession)({
              accessTokenResponse: (0, create_session_1.accessTokenResponse)(postResponse),
              shop: cleanShop,
              state: stateFromCookie,
              config,
          });


          if (!config.isEmbeddedApp) {
              yield cookies.setAndSign('shopify_app_session', session.id, {
                  expires: session.expires,
                  sameSite: 'lax',
                  secure: true,
                  path: '/',
              });
          }


          return {
              headers: (yield (0, http_1.abstractConvertHeaders)(cookies.response.headers, adapterArgs)),
              session,
          };
      });
  };
}

function validQuery({ config, query, stateFromCookie, }) {
  return tslib_1.__awaiter(this, void 0, void 0, function* () {
      return ((yield (0, shopifyUtils.validateHmac)(config)(query)) &&
          (0, safe_compare_1.safeCompare)(query.state, stateFromCookie));
  });
}