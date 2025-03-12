import { v4 as uuidv4 } from 'uuid';
import { StatusCodes } from 'http-status-codes';
import { imageProcessingQueue } from '../configs/queue.config.js';
import { processCSVData } from '../services/csvParser.service.js';
import RequestModel from '../models/request.model.js';
import logger from '../utils/winston.logger.js';

/**
 * Handle CSV file upload
 */
export const uploadCSV = async (req, res) => {
    try {
        const requestId = uuidv4();

        const request = new RequestModel({
            requestId,
            status: 'pending',
            originalFileName: req.file.originalname
        });

        await request.save();

        // Process CSV data and save to database (asynchronously)
        processCSVData(req.csvData, requestId)
            .then(async (totalItems) => {
                await RequestModel.findOneAndUpdate(
                    { requestId },
                    { totalItems }
                );

                // Add job to processing queue
                await imageProcessingQueue.add(
                    { requestId },
                    {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 1000
                        }
                    }
                );

                logger.info(`Added request ${requestId} to processing queue`);
            })
            .catch(async (error) => {
                logger.error(`Error processing CSV for request ${requestId}: ${error.message}`);

                await RequestModel.findOneAndUpdate(
                    { requestId },
                    {
                        status: 'failed',
                        errorMessage: `CSV processing error: ${error.message}`
                    }
                );
            });

        return res.status(StatusCodes.ACCEPTED).json({
            success: true,
            message: 'File uploaded and processing started',
            requestId
        });
    } catch (error) {
        logger.error(`Upload error: ${error.message}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Error processing upload',
            error: error.message
        });
    }
};
