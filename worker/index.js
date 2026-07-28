const API_ROUTES = [
  { prefix: '/api/tmdb', origin: 'https://api.themoviedb.org', secret: 'TMDB_BEARER_TOKEN', auth: 'bearer' },
  { prefix: '/api/youtube', origin: 'https://www.googleapis.com', secret: 'YOUTUBE_API_KEY', auth: 'key' },
  { prefix: '/api/watchmode', origin: 'https://api.watchmode.com', secret: 'WATCHMODE_API_KEY', auth: 'apiKey' },
];

function apiResponse(message, status) {
  return Response.json({ error: message }, { status });
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

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    const apiRoute = API_ROUTES.find(({ prefix }) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (apiRoute) return proxyApi(request, env, apiRoute);
    return env.ASSETS.fetch(request);
  },
};