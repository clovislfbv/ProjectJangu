const fs = require('fs');
const path = require('path');

const envFilePath = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');

const readEnv = (name) => process.env[name] || '';

const environmentFileContent = `export const environment = {
    production: ${process.env.NODE_ENV === 'production' ? 'true' : 'false'},
    api_key: '${readEnv('TMDB_TOKEN')}',
    youtube_key: '${readEnv('YOUTUBE_KEY')}',
    watchmode_api_key: '${readEnv('WATCHMODE_API_KEY')}',
};

export const api_key = environment.api_key;
export const youtube_key = environment.youtube_key;
export const watchmode_api_key = environment.watchmode_api_key;
`;

fs.writeFileSync(envFilePath, environmentFileContent);
console.log(`Generated ${envFilePath} from environment variables.`);