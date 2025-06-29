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

To add your TMDB API key, open [this file](src/environments/environment.ts) and inside it define your key, for example:

```ts
// src/environments/environment.ts
export const api_key = 'YOUR_TMDB_API_KEY';
```
