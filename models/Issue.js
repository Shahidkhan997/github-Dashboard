const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
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
  milestone: {
    id: Number,
    title: String,
    description: String,
    state: String,
    due_on: Date
  },
  created_at: Date,
  updated_at: Date,
  closed_at: Date,
  html_url: String,
  comments: Number,
  pull_request: {
    url: String,
    html_url: String,
    diff_url: String,
    patch_url: String
  }
}, {
  timestamps: true
});

issueSchema.index({ integrationId: 1, repositoryId: 1, id: 1 }, { unique: true });

module.exports = mongoose.model('Issue', issueSchema);