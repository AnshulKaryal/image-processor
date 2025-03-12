import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadCSV } from '../controllers/upload.controller.js';
import validateCSV from '../middleware/csvValidator.js';
import { ensureDirectoryExists } from '../services/imageProcessor.service.js';

const router = express.Router();

ensureDirectoryExists('./uploads/csv');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/csv');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

router.post('/upload', upload.single('file'), validateCSV, uploadCSV);

export default router;
