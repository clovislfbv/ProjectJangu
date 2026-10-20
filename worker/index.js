const API_ROUTES = [
  { prefix: '/api/tmdb', origin: 'https://api.themoviedb.org', secret: 'TMDB_BEARER_TOKEN', auth: 'bearer' },
  { prefix: '/api/youtube', origin: 'https://www.googleapis.com', secret: 'YOUTUBE_API_KEY', auth: 'key' },
  { prefix: '/api/watchmode', origin: 'https://api.watchmode.com', secret: 'WATCHMODE_API_KEY', auth: 'apiKey' },
];

const SITE_URL_CHECK_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  Priority: 'u=0, i',
  'Sec-CH-UA': '"Chromium";v="154", "Google Chrome";v="154", "Not A(Brand";v="99"',
  'Sec-CH-UA-Mobile': '?0',
  'Sec-CH-UA-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
};

function apiResponse(message, status) {
  return Response.json({ error: message }, { status });
}

function getWebflixDomain(html) {
  const match = html.match(/<[^>]*id=["']url-domain["'][^>]*>([^<]+)</i);
  const domain = match?.[1].trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (!domain || !/^[a-z0-9.-]+(?::\d+)?$/i.test(domain)) return null;
  return `https://${domain}`;
}

function getMovixDomain(html) {
  const links = html.match(/<a\b[^>]*href\s*=\s*(['"])(.*?)\1[^>]*>/gis) ?? [];
  for (const link of links) {
    const match = link.match(/href\s*=\s*(['"])(https?:\/\/(?:www\.)?(movix\.[a-z]{2,}))(?=[/:?#'"])/i);
    if (match) return new URL(match[2]).origin;
  }

  const match = html.match(/(?:https?:\/\/)?(?:www\.)?(movix\.[a-z]{2,})(?=[:/\s?#]|$)/i);
  return match ? `https://${match[1].toLowerCase()}` : null;
}

async function proxyApi(request, env, route) {
  const secret = env[route.secret];
  if (!secret) return apiResponse(`Missing Cloudflare secret: ${route.secret}`, 500);

  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(route.origin);
  upstreamUrl.pathname = incomingUrl.pathname.slice(route.prefix.length) || '/';
  upstreamUrl.search = incomingUrl.search;

  if (route.prefix === '/api/tmdb' && [
    '/3/discover/movie',
    '/3/search/movie',
    '/3/movie/now_playing',
  ].includes(upstreamUrl.pathname)) {
    upstreamUrl.searchParams.set('include_adult', 'false');
  }

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('Accept', 'application/json');

  if (route.auth === 'bearer') {
    headers.set('Authorization', `Bearer ${secret}`);
  } else {
    upstreamUrl.searchParams.set(route.auth, secret);
  }

  return fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'follow',
  });
}

async function checkWebflixOfficialUrl() {
  try {
    const response = await fetch('https://webflixfr.github.io/', {
      headers: SITE_URL_CHECK_HEADERS,
    });
    const html = await response.text();
    const url = getWebflixDomain(html) ?? 'https://webflix.art';
    return Response.json({ url }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return apiResponse('Unable to check Webflix domain', 502);
  }
}

async function checkMovixOfficialUrl() {
  try {
    const response = await fetch('https://movix.online/', {
      headers: SITE_URL_CHECK_HEADERS,
    });
    const html = await response.text();
    const url = getMovixDomain(html);
    if (!url) return apiResponse('Movix domain not found', 502);
    return Response.json({ url }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return apiResponse('Unable to check Movix URL', 502);
  }
}

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/movix-url') return checkMovixOfficialUrl();
    if (pathname === '/api/webflix-url') return checkWebflixOfficialUrl();

    const apiRoute = API_ROUTES.find(({ prefix }) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (apiRoute) return proxyApi(request, env, apiRoute);
    return env.ASSETS.fetch(request);
  },
};