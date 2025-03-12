import fs from 'fs';
import { createReadStream } from 'fs';
import csv from 'csv-parser';
import { StatusCodes } from 'http-status-codes';
import logger from '../utils/winston.logger.js';

const validateCSV = (req, res, next) => {
    if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'No CSV file uploaded'
        });
    }

    // Check file extension
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    if (fileExtension !== 'csv') {
        fs.unlinkSync(req.file.path);
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'Only CSV files are allowed'
        });
    }

    const results = [];
    const errors = [];
    let rowNumber = 0;

    createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
            rowNumber++;

            if (!data['S. No.'] || !data['Product Name'] || !data['Input Image Urls']) {
                errors.push(`Row ${rowNumber}: Missing required columns`);
                return;
            }

            if (isNaN(parseInt(data['S. No.']))) {
                errors.push(`Row ${rowNumber}: Serial Number must be a number`);
            }

            if (!data['Product Name'].trim()) {
                errors.push(`Row ${rowNumber}: Product Name cannot be empty`);
            }

            const imageUrls = data['Input Image Urls'].split(',').map(url => url.trim());
            if (imageUrls.length === 0 || !imageUrls[0]) {
                errors.push(`Row ${rowNumber}: No image URLs provided`);
            } else {
                for (const url of imageUrls) {
                    try {
                        new URL(url);
                    } catch (e) {
                        errors.push(`Row ${rowNumber}: Invalid URL format - ${url}`);
                    }
                }
            }

            results.push(data);
        })
        .on('end', () => {
            if (errors.length > 0) {
                fs.unlinkSync(req.file.path);
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'CSV validation failed',
                    errors
                });
            }

            if (results.length === 0) {
                fs.unlinkSync(req.file.path);
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'CSV file is empty or has no valid rows'
                });
            }

            // Store the parsed data for the next middleware
            req.csvData = results;
            fs.unlinkSync(req.file.path);
            next();
        })
        .on('error', (error) => {
            logger.error(`CSV parsing error: ${error.message}`);
            fs.unlinkSync(req.file.path);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Error parsing CSV file',
                error: error.message
            });
        });
};

export default validateCSV;
