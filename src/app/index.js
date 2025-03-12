import express from 'express';
import favicon from 'serve-favicon';
import crossOrigin from 'cors';
import appRoot from 'app-root-path';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import morgan from 'morgan';
import path from 'path';
import { StatusCodes } from 'http-status-codes';

// Import application middleware 
import corsOptions from '../configs/cors.config.js';
import * as ServerStatus from '../services/serverInfo.service.js'
import currentDateTime from '../libs/current.date.time.js';

// Import Logger
import morganLogger from '../utils/morgan.logger.js';

// Routes
import StatusRoutes from '../routes/status.routes.js';
import UploadRoutes from '../routes/upload.routes.js';
import logger from '../utils/winston.logger.js';

dotenv.config();

const app = express();

// HTTP request logger middleware
if (process.env.APP_NODE_ENV !== 'production') {
    app.use(morganLogger());
    app.use(morgan('tiny'));
}

app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

app.use(crossOrigin(corsOptions));

// Parse request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set favicon in API routes
if (process.env.APP_NODE_ENV !== 'production') {
    app.use(favicon(`${appRoot}/public/favicon.ico`));
}

// Set static folder
app.use(express.static('public'));
app.use('/processed', express.static(path.join(appRoot.path, 'processed')));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Response default (welcome) route
app.get("/", ServerStatus.getServerLoadInfo, (req, res) => {
    const uptime = ServerStatus.calculateUptime();
    const serverLoadInfo = req.serverLoadInfo;
    res.status(200).send({
        success: true,
        message: "Assignment Backend!",
        dateTime: new Date().toLocaleString(),
        connectedClient: process.env.CLIENT_BASE_URL,
        systemStatus: {
            uptime: `${uptime}s`,
            cpuLoad: serverLoadInfo.cpuLoad,
            memoryUsage: serverLoadInfo.memoryUsage,
        },
    });
});

// Set application API routes
app.use('/api', StatusRoutes);
app.use('/api', UploadRoutes);


// Add a webhook test endpoint for development
app.post('/webhook', (req, res) => {
    console.log('Webhook received:', req.body);
    res.status(StatusCodes.OK).json({
        status: 'received',
        timestamp: new Date().toISOString()
    });
});

// 404 ~ not found error handler
app.use((req, res, _next) => {
    res.status(404).json({
        success: false,
        time: currentDateTime(),
        message: "Route not found",
        error: `Sorry! Your request url (${req.originalUrl}) was not found.`
    });
});


// 500 ~ internal server error handler
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`);
    
    if (res.headersSent) {
        return next('Something went wrong. App server error.');
    }
    
    return res.status(err.status || StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        time: currentDateTime(),
        message: "Internal Server Error",
        error: err.message || "Something went wrong. App server error.",
        stack: process.env.APP_NODE_ENV === 'development' ? err.stack : undefined
    });
});


export default app;