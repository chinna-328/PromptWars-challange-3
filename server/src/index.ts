import { env } from './lib/env';
import { logger } from './lib/logger';
import { createDb } from './db';
import { createApp } from './app';

const db = createDb(env.DB_PATH);
const app = createApp({ db });

app.listen(env.PORT, () => {
  logger.info(`EcoTrace API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
