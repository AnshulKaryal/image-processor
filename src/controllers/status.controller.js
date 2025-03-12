import { StatusCodes } from 'http-status-codes';
import RequestModel from '../models/request.model.js';
import ProductModel from '../models/product.model.js';
import logger from '../utils/winston.logger.js';

/**
 * Get processing status for a request
 */
export const getStatus = async (req, res) => {
    try {
        const { requestId } = req.params;

        if (!requestId) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Request ID is required'
            });
        }

        const request = await RequestModel.findOne({ requestId });

        if (!request) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Request not found'
            });
        }

        const productsStats = await ProductModel.aggregate([
            { $match: { requestId } },
            {
                $group: {
                    _id: '$processingStatus',
                    count: { $sum: 1 }
                }
            }
        ]);

        const stats = {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0
        };

        productsStats.forEach(stat => {
            stats[stat._id] = stat.count;
        });

        return res.status(StatusCodes.OK).json({
            success: true,
            data: {
                requestId: request.requestId,
                status: request.status,
                progress: request.progress,
                totalItems: request.totalItems,
                processedItems: request.processedItems,
                createdAt: request.createdAt,
                completedAt: request.completedAt,
                webhookStatus: request.webhookStatus,
                error: request.errorMessage,
                stats
            }
        });
    } catch (error) {
        logger.error(`Status check error: ${error.message}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Error retrieving status',
            error: error.message
        });
    }
};

/**
 * Get detailed results for a completed request
 */
export const getResults = async (req, res) => {
    try {
        const { requestId } = req.params;

        if (!requestId) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Request ID is required'
            });
        }

        const request = await RequestModel.findOne({ requestId });

        if (!request) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Request not found'
            });
        }

        const products = await ProductModel.find(
            { requestId },
            { __v: 0, _id: 0, requestId: 0 }
        ).sort({ serialNumber: 1 });

        const csvFormat = products.map(product => ({
            'S. No.': product.serialNumber,
            'Product Name': product.productName,
            'Input Image Urls': product.inputImageUrls.join(', '),
            'Output Image Urls': product.outputImageUrls.join(', '),
            'Status': product.processingStatus
        }));

        return res.status(StatusCodes.OK).json({
            success: true,
            data: {
                requestStatus: request.status,
                progress: request.progress,
                totalItems: request.totalItems,
                processedItems: request.processedItems,
                completedAt: request.completedAt,
                products: csvFormat
            }
        });
    } catch (error) {
        logger.error(`Results retrieval error: ${error.message}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Error retrieving results',
            error: error.message
        });
    }
};

/**
 * Generate output CSV for a completed request
 */
export const generateOutputCSV = async (req, res) => {
    try {
        const { requestId } = req.params;

        if (!requestId) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Request ID is required'
            });
        }

        const request = await RequestModel.findOne({ requestId });

        if (!request) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Request not found'
            });
        }

        if (request.status !== 'completed') {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Request processing not completed yet'
            });
        }

        const products = await ProductModel.find({ requestId })
            .sort({ serialNumber: 1 });

        // Generate CSV content
        let csvContent = 'S. No.,Product Name,Input Image Urls,Output Image Urls\n';

        products.forEach(product => {
            csvContent += `${product.serialNumber},"${product.productName}","${product.inputImageUrls.join(', ')}","${product.outputImageUrls.join(', ')}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="processed_results_${requestId}.csv"`);

        return res.status(StatusCodes.OK).send(csvContent);
    } catch (error) {
        logger.error(`CSV generation error: ${error.message}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Error generating CSV',
            error: error.message
        });
    }
};
