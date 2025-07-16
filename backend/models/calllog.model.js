import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema({
    contactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact',

    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',

    },
    language: {
        type: String,

    },
    status: {
        type: String,

    },
    startTime: {
        type: Date,

    },
    endTime: {
        type: Date
    },
    duration: {
        type: Number
    },
    aiResponseLog: [{
        type: mongoose.Schema.Types.Mixed
    }],
    callSid: {
        type: String,
        index: true
    },
    to: {
        type: String
    },
    from: {
        type: String
    },
    initialGreetingText: {
        type: String
    },
    initialGreetingAudioUrl: {
        type: String
    }
}, {
    timestamps: true
});

export default mongoose.model('CallLog', callLogSchema); 