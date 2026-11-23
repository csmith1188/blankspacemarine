const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const axios = require('axios');

const BASE_URL = 'https://api.schoology.com/v1';

function withRealm(authHeader) {
    if (authHeader && !/realm=/.test(authHeader)) {
        return authHeader.replace(/^OAuth /, 'OAuth realm="Schoology API", ');
    }
    return authHeader;
}

function getSchoologyConfig() {
    const key = (process.env.SCHOOLOGY_KEY || '').trim();
    const secret = (process.env.SCHOOLOGY_SECRET || '').trim();
    const domain = (process.env.SCHOOLOGY_DOMAIN || 'app.schoology.com')
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '');
    return { key, secret, domain };
}

function parseFormEncoded(body) {
    const params = new URLSearchParams(String(body || ''));
    const out = {};
    for (const [k, v] of params.entries()) {
        out[k] = v;
    }
    return out;
}

function createClient(consumerKey, consumerSecret, domainOverride) {
    const cfg = getSchoologyConfig();
    const key = String(consumerKey != null ? consumerKey : cfg.key).trim();
    const secret = String(consumerSecret != null ? consumerSecret : cfg.secret).trim();
    const domain = String(domainOverride != null ? domainOverride : cfg.domain)
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '') || 'app.schoology.com';

    const oauth = new OAuth({
        consumer: { key, secret },
        signature_method: 'HMAC-SHA1',
        hash_function(baseString, hmacKey) {
            return crypto.createHmac('sha1', hmacKey).update(baseString).digest('base64');
        }
    });

    function authHeaders(method, url, token = null, extraParams = {}) {
        const requestData = {
            url,
            method: method.toUpperCase(),
            data: extraParams
        };
        const auth = oauth.toHeader(
            token ? oauth.authorize(requestData, token) : oauth.authorize(requestData)
        );
        auth.Authorization = withRealm(auth.Authorization);
        return {
            ...auth,
            Accept: 'application/json'
        };
    }

    /**
     * Signed Schoology REST request (2-legged when token is null, 3-legged when token is provided).
     * Re-signs on redirects — reusing an OAuth header causes nonce replay 401s.
     */
    async function signedRequest(method, reqPath, body = null, token = null) {
        let url = reqPath.startsWith('http') ? reqPath : BASE_URL + reqPath;
        const upper = method.toUpperCase();
        let redirectHops = 0;

        while (redirectHops < 5) {
            const headers = authHeaders(upper, url, token);
            if (body != null) headers['Content-Type'] = 'application/json';

            const response = await axios({
                url,
                method: upper,
                headers,
                data: body != null ? body : undefined,
                maxRedirects: 0,
                timeout: 15000,
                validateStatus: (status) =>
                    (status >= 200 && status < 300) || (status >= 300 && status < 400)
            });

            if (response.status >= 300 && response.status < 400 && response.headers.location) {
                const next = response.headers.location;
                url = next.startsWith('http') ? next : new URL(next, url).toString();
                redirectHops += 1;
                continue;
            }

            return response.data;
        }

        throw new Error('Too many redirects while calling Schoology API');
    }

    /**
     * Step 1 of 3-legged OAuth 1.0a: obtain a temporary request token.
     */
    async function getRequestToken() {
        const url = `${BASE_URL}/oauth/request_token`;
        const headers = authHeaders('GET', url);
        headers.Accept = 'text/plain, */*';

        const response = await axios.get(url, {
            headers,
            responseType: 'text',
            timeout: 15000
        });
        const parsed = parseFormEncoded(response.data);
        if (!parsed.oauth_token || !parsed.oauth_token_secret) {
            throw new Error('Schoology did not return a valid OAuth request token.');
        }
        return {
            key: parsed.oauth_token,
            secret: parsed.oauth_token_secret
        };
    }

    /**
     * Step 2 of 3-legged OAuth 1.0a: build the Schoology user authorization URL.
     */
    function getAuthorizeUrl(requestTokenKey, callbackUrl) {
        const params = new URLSearchParams({
            oauth_token: requestTokenKey,
            oauth_callback: callbackUrl
        });
        return `https://${domain}/oauth/authorize?${params.toString()}`;
    }

    /**
     * Step 3 of 3-legged OAuth 1.0a: exchange an authorized request token for an access token.
     */
    async function getAccessToken(requestToken) {
        const url = `${BASE_URL}/oauth/access_token`;
        const headers = authHeaders('GET', url, requestToken);
        headers.Accept = 'text/plain, */*';

        const response = await axios.get(url, {
            headers,
            responseType: 'text',
            timeout: 15000
        });
        const parsed = parseFormEncoded(response.data);
        if (!parsed.oauth_token || !parsed.oauth_token_secret) {
            throw new Error('Schoology did not return a valid OAuth access token.');
        }
        return {
            key: parsed.oauth_token,
            secret: parsed.oauth_token_secret
        };
    }

    return {
        signedRequest,
        getRequestToken,
        getAuthorizeUrl,
        getAccessToken,
        hasConsumerKeys: () => !!(key && secret),
        BASE_URL,
        domain
    };
}

module.exports = {
    createClient,
    getSchoologyConfig,
    BASE_URL
};
