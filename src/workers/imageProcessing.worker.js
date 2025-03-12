import { imageProcessingQueue } from '../configs/queue.config.js';
import ProductModel from '../models/product.model.js';
import RequestModel from '../models/request.model.js';
import logger from '../utils/winston.logger.js';
import { processImage } from '../services/imageProcessor.service.js';
import { sendWebhookNotification } from '../services/webhook.service.js';

// Process job
imageProcessingQueue.process(async (job) => {
    const { requestId } = job.data;
    logger.info(`Starting image processing for request ${requestId}`);

    try {
        await RequestModel.findOneAndUpdate(
            { requestId },
            { status: 'processing', progress: 0 }
        );

        const products = await ProductModel.find({ requestId });
        const totalProducts = products.length;
        let processedProducts = 0;

        // Process each product
        for (const product of products) {
            try {
                await ProductModel.findByIdAndUpdate(
                    product._id,
                    { processingStatus: 'processing' }
                );

                const outputUrls = [];

                for (const imageUrl of product.inputImageUrls) {
                    try {
                        const outputUrl = await processImage(imageUrl);
                        outputUrls.push(outputUrl);
                    } catch (error) {
                        logger.error(`Error processing image ${imageUrl} for product ${product.productName}: ${error.message}`);
                        outputUrls.push(''); // Push empty string for failed image
                    }
                }

                await ProductModel.findByIdAndUpdate(
                    product._id,
                    {
                        outputImageUrls: outputUrls,
                        processingStatus: 'completed'
                    }
                );

                processedProducts++;
                const progress = Math.floor((processedProducts / totalProducts) * 100);

                await RequestModel.findOneAndUpdate(
                    { requestId },
                    {
                        progress,
                        processedItems: processedProducts
                    }
                );

                // Update job progress
                job.progress(progress);

                logger.info(`Processed ${processedProducts}/${totalProducts} products for request ${requestId}`);
            } catch (error) {
                logger.error(`Error processing product ${product.productName}: ${error.message}`);

                await ProductModel.findByIdAndUpdate(
                    product._id,
                    {
                        processingStatus: 'failed',
                        errorDetails: error.message
                    }
                );
            }
        }

        await RequestModel.findOneAndUpdate(
            { requestId },
            {
                status: 'completed',
                progress: 100,
                processedItems: processedProducts,
                completedAt: new Date()
            }
        );

        // Send webhook notification
        await sendWebhookNotification(requestId);

        logger.info(`Image processing completed for request ${requestId}`);
        return { success: true, requestId };
    } catch (error) {
        logger.error(`Failed to process request ${requestId}: ${error.message}`);

        await RequestModel.findOneAndUpdate(
            { requestId },
            {
                status: 'failed',
                errorMessage: error.message
            }
        );

        throw error;
    }
});

// Handle failed jobs
imageProcessingQueue.on('failed', async (job, error) => {
    const { requestId } = job.data;
    logger.error(`Job failed for request ${requestId}: ${error.message}`);

    await RequestModel.findOneAndUpdate(
        { requestId },
        {
            status: 'failed',
            errorMessage: error.message
        }
    );
});
