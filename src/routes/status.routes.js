import express from 'express';
import { getStatus, getResults, generateOutputCSV } from '../controllers/status.controller.js'

const router = express.Router();

router.get('/status/:requestId', getStatus);

router.get('/results/:requestId', getResults);

router.get('/csv/:requestId', generateOutputCSV);

export default router;
