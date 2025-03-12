import logger from '../utils/winston.logger.js';
import productModel from '../models/product.model.js';

/**
 * Process CSV data and save to database
 * @param {Array} csvData - Parsed CSV data
 * @param {String} requestId - Unique request ID
 * @returns {Promise<number>} - Total number of products processed
 */
const processCSVData = async (csvData, requestId) => {
    try {
        const products = csvData.map(row => ({
            requestId,
            serialNumber: parseInt(row['S. No.']),
            productName: row['Product Name'],
            inputImageUrls: row['Input Image Urls'].split(',').map(url => url.trim()),
            outputImageUrls: [],
            processingStatus: 'pending'
        }));

        await productModel.insertMany(products);

        logger.info(`Saved ${products.length} products for request ${requestId}`);
        return products.length;
    } catch (error) {
        logger.error(`Error processing CSV data for request ${requestId}: ${error.message}`);
        throw error;
    }
};

export { processCSVData };
