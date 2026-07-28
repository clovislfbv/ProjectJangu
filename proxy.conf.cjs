const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['\"]|['\"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

const tmdbToken = process.env.TMDB_BEARER_TOKEN;
const youtubeKey = process.env.YOUTUBE_API_KEY;
const watchmodeKey = process.env.WATCHMODE_API_KEY;

const appendQueryParam = (url, key, value) => {
  if (!value) return;
  const separator = url.path.includes('?') ? '&' : '?';
  url.path = `${url.path}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
};

module.exports = {
  '/api/tmdb': {
    target: 'https://api.themoviedb.org',
    secure: true,
    changeOrigin: true,
    pathRewrite: { '^/api/tmdb': '' },
    headers: {
      Accept: 'application/json',
      ...(tmdbToken ? { Authorization: `Bearer ${tmdbToken}` } : {}),
    },
  },
  '/api/watchmode': {
    target: 'https://api.watchmode.com',
    secure: true,
    changeOrigin: true,
    pathRewrite: { '^/api/watchmode': '' },
    router(req) {
      appendQueryParam(req, 'apiKey', watchmodeKey);
      return 'https://api.watchmode.com';
    },
  },
  '/api/youtube': {
    target: 'https://www.googleapis.com',
    secure: true,
    changeOrigin: true,
    pathRewrite: { '^/api/youtube': '' },
    router(req) {
      appendQueryParam(req, 'key', youtubeKey);
      return 'https://www.googleapis.com';
    },
  },
};
