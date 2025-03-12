import mongoose from "mongoose";

export const ProductSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        index: true
    },
    serialNumber: {
        type: Number,
        required: true
    },
    productName: {
        type: String,
        required: true,
        trim: true
    },
    inputImageUrls: [{
        type: String,
        required: true
    }],
    outputImageUrls: [{
        type: String,
        default: []
    }],
    processingStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    errorDetails: {
        type: String
    }
}, {
    timestamps: true
});

ProductSchema.index({ requestId: 1, serialNumber: 1 }, { unique: true });
ProductSchema.index({ requestId: 1, productName: 1 });

export default mongoose.model.Products || mongoose.model('Product', ProductSchema);