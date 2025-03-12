import 'dotenv/config';
import app from './src/app/index.js';
import connectDatabase from './src/database/connect.mongo.db.js';
import logger from './src/utils/winston.logger.js';

import './src/workers/imageProcessing.worker.js';

const port = process.env.APP_PORT || 3030;

connectDatabase().then(() => {
    app.listen(port, () => {
        logger.info(`App server running on: ${process.env.APP_BASE_URL || `http://localhost:${port}`}`);
    });
}).catch(error => {
    console.log('Invalid database connection...!');
})
