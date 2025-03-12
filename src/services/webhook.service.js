import axios from 'axios';
import logger from '../utils/winston.logger.js';
import RequestModel from '../models/request.model.js';
import ProductModel from '../models/product.model.js';

/**
 * Send webhook notification when processing is complete
 * @param {String} requestId - The request ID
 * @returns {Promise<Boolean>} - Success status
 */
const sendWebhookNotification = async (requestId) => {
    // Skip if webhooks are disabled
    if (process.env.WEBHOOK_ENABLED !== 'true' || !process.env.WEBHOOK_URL) {
        logger.info(`Webhooks disabled for request ${requestId}`);
        await RequestModel.findOneAndUpdate(
            { requestId },
            { webhookStatus: 'not_configured' }
        );
        return false;
    }

    try {
        const request = await RequestModel.findOne({ requestId });
        if (!request) {
            logger.error(`Request ${requestId} not found for webhook notification`);
            return false;
        }

        const products = await ProductModel.find({ requestId });

        const payload = {
            requestId,
            status: request.status,
            totalItems: request.totalItems,
            processedItems: request.processedItems,
            completedAt: request.completedAt || new Date(),
            products: products.map(product => ({
                serialNumber: product.serialNumber,
                productName: product.productName,
                inputImageUrls: product.inputImageUrls,
                outputImageUrls: product.outputImageUrls,
                status: product.processingStatus
            }))
        };

        await axios.post(process.env.WEBHOOK_URL, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        await RequestModel.findOneAndUpdate(
            { requestId },
            { webhookStatus: 'sent' }
        );

        logger.info(`Webhook sent successfully for request ${requestId}`);
        return true;
    } catch (error) {
        logger.error(`Webhook failed for request ${requestId}: ${error.message}`);

        await RequestModel.findOneAndUpdate(
            { requestId },
            { webhookStatus: 'failed' }
        );

        return false;
    }
};

export { sendWebhookNotification };
