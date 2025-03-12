import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/winston.logger.js';

/**
 * Ensure directories exist
 * @param {String} directory - Directory path
 */
const ensureDirectoryExists = (directory) => {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
};

/**
 * Initialize required directories
 */
const initializeDirectories = () => {
    ensureDirectoryExists(process.env.UPLOAD_DIR);
    ensureDirectoryExists(process.env.OUTPUT_DIR);
};


/**
 * Download image from URL
 * @param {String} url - Image URL
 * @param {String} filename - Filename to save as
 * @returns {Promise<String>} - Path to downloaded file
 */
const downloadImage = async (url, filename) => {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer'
        });

        const filepath = path.join(process.env.UPLOAD_DIR, filename);
        fs.writeFileSync(filepath, response.data);

        return filepath;
    } catch (error) {
        logger.error(`Error downloading image from ${url}: ${error.message}`);
        throw error;
    }
};

/**
 * Compress image by reducing quality
 * @param {String} inputPath - Path to input image
 * @param {String} outputPath - Path to save output image
 * @param {Number} quality - Quality percentage (0-100)
 * @returns {Promise<String>} - Path to compressed image
 */
const compressImage = async (inputPath, outputPath, quality = 50) => {
    try {
        await sharp(inputPath)
            .jpeg({ quality }) // Compress by reducing quality
            .toFile(outputPath);

        return outputPath;
    } catch (error) {
        logger.error(`Error compressing image ${inputPath}: ${error.message}`);
        throw error;
    }
};

/**
 * Process a single image
 * @param {String} imageUrl - URL of the image to process
 * @returns {Promise<String>} - URL of the processed image
 */
const processImage = async (imageUrl) => {
    const imageId = uuidv4();
    const inputFilename = `${imageId}_input.jpg`;
    const outputFilename = `${imageId}_output.jpg`;
    const outputPath = path.join(process.env.OUTPUT_DIR, outputFilename);

    try {
        const inputPath = await downloadImage(imageUrl, inputFilename);

        await compressImage(inputPath, outputPath, 50);

        const outputUrl = `${process.env.APP_BASE_URL}/processed/${outputFilename}`;

        fs.unlinkSync(inputPath);

        return outputUrl;
    } catch (error) {
        logger.error(`Failed to process image ${imageUrl}: ${error.message}`);
        throw error;
    }
};

initializeDirectories();

export { processImage, ensureDirectoryExists };
