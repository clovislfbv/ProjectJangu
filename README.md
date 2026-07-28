# MovieBrowser

This project is a school assignment at EPITA that allows users to browse and search movies using the TMDB API.
It uses Angular to fetch and display movie data from TMDB, providing search, filter, and detailed movie view features.

## Installation

To install dependencies, run:

```bash
npm install
```

## Development server

To start a local server, run:

```bash
ng serve
```

## API keys from environment variables

Do not commit real API keys in `src/environments/environment.ts`.

The file `src/environments/environment.ts` is generated at build time from environment variables.

Required variables:

- `TMDB_TOKEN`
- `YOUTUBE_KEY`
- `WATCHMODE_API_KEY`

Example for local development:

```bash
export TMDB_TOKEN="your_tmdb_bearer_token"
export YOUTUBE_KEY="your_youtube_key"
export WATCHMODE_API_KEY="your_watchmode_key"
npm start
```

For a production build:

```bash
TMDB_TOKEN="your_tmdb_bearer_token" \
YOUTUBE_KEY="your_youtube_key" \
WATCHMODE_API_KEY="your_watchmode_key" \
npm run build
```

### Cloudflare Workers

The Angular application calls `/api/tmdb`, `/api/youtube`, and `/api/watchmode`.
`worker/index.js` proxies these routes from Cloudflare so API credentials are not exposed in the browser bundle.

Configure the required Worker secrets once:

```bash
npx wrangler secret put TMDB_BEARER_TOKEN
npx wrangler secret put YOUTUBE_API_KEY
npx wrangler secret put WATCHMODE_API_KEY
```

Then deploy the Angular assets and Worker together:

```bash
npm run deploy
```

For a local Cloudflare preview, create a non-committed `.dev.vars` containing the same three variables, then run `npm run preview`.

### GitHub Pages

If you deploy to GitHub Pages with GitHub Actions, store the variables as GitHub repository secrets, then run:

```bash
npm run build:gh-pages
```

Then deploy:

```bash
npm run deploy:gh-pages
```

Important: environment variables keep keys out of the source code, but Angular is a frontend app. Any key used directly by Angular is still included in the built JavaScript bundle and can be seen by users in the browser.
