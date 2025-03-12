import mongoose from "mongoose";

export const RequestSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    totalItems: {
        type: Number,
        default: 0
    },
    processedItems: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    },
    errorMessage: {
        type: String
    },
    webhookStatus: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'not_configured'],
        default: 'pending'
    },
    originalFileName: {
        type: String
    }
}, {
    timestamps: true
});

export default mongoose.model.Requests || mongoose.model('Request', RequestSchema);