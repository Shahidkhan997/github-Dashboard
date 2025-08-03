const mongoose = require('mongoose');

const pullRequestSchema = new mongoose.Schema({
  integrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Integration',
    required: true
  },
  repositoryId: Number,
  id: {
    type: Number,
    required: true
  },
  number: Number,
  title: String,
  body: String,
  state: String,
  locked: Boolean,
  user: {
    id: Number,
    login: String,
    avatar_url: String
  },
  created_at: Date,
  updated_at: Date,
  closed_at: Date,
  merged_at: Date,
  merge_commit_sha: String,
  assignees: [{
    id: Number,
    login: String,
    avatar_url: String
  }],
  labels: [{
    id: Number,
    name: String,
    color: String,
    description: String
  }],
  head: {
    ref: String,
    sha: String
  },
  base: {
    ref: String,
    sha: String
  },
  html_url: String,
  diff_url: String,
  patch_url: String
}, {
  timestamps: true
});

pullRequestSchema.index({ integrationId: 1, repositoryId: 1, id: 1 }, { unique: true });

module.exports = mongoose.model('PullRequest', pullRequestSchema);