const mongoose = require('mongoose');

const commitSchema = new mongoose.Schema({
  integrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Integration',
    required: true
  },
  repositoryId: Number,
  sha: {
    type: String,
    required: true
  },
  message: String,
  author: {
    name: String,
    email: String,
    date: Date
  },
  committer: {
    name: String,
    email: String,
    date: Date
  },
  url: String,
  html_url: String,
  stats: {
    additions: Number,
    deletions: Number,
    total: Number
  },
  files: [{
    filename: String,
    status: String,
    additions: Number,
    deletions: Number,
    changes: Number
  }]
}, {
  timestamps: true
});

commitSchema.index({ integrationId: 1, repositoryId: 1, sha: 1 }, { unique: true });

module.exports = mongoose.model('Commit', commitSchema);