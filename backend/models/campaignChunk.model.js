import mongoose from 'mongoose';

const campaignChunkSchema = new mongoose.Schema({
  campaignId: { 
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String
    required: true 
  },
  chunk: { 
    type: String, 
    required: true 
  },
  embedding: { 
    type: [Number], 
    required: true 
  },
  chunkIndex: { 
    type: Number, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for efficient similarity search
campaignChunkSchema.index({ campaignId: 1, chunkIndex: 1 });
campaignChunkSchema.index({ embedding: 1 });

const CampaignChunk = mongoose.model('CampaignChunk', campaignChunkSchema);

export default CampaignChunk; 