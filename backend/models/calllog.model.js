import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema({
    contactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact',
        required: true
    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: true
    },
    language: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date
    },
    duration: {
        type: Number
    },
    aiResponseLog: [{
        type: mongoose.Schema.Types.Mixed
    }]
}, {
    timestamps: true
});

export default mongoose.model('CallLog', callLogSchema); 