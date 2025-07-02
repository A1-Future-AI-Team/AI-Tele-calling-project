import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
    language: {
        type: String,
        required: true
    },
    objective: {
        type: String,
        required: true
    },
    sampleFlow: {
        type: String
    },
    contactCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

export default mongoose.model('Campaign', campaignSchema); 