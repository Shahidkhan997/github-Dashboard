const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    required: true,
    default: 'github'
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: String,
  userInfo: {
    id: Number,
    login: String,
    name: String,
    email: String,
    avatar_url: String,
    company: String,
    location: String
  },
  scopes: [String],
  connectedAt: {
    type: Date,
    default: Date.now
  },
  lastSyncAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

integrationSchema.index({ userId: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model('Integration', integrationSchema);