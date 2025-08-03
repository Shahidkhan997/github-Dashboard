const mongoose = require('mongoose');

const repositorySchema = new mongoose.Schema({
  integrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Integration',
    required: true
  },
  organizationId: Number,
  id: {
    type: Number,
    required: true
  },
  name: String,
  full_name: String,
  description: String,
  private: Boolean,
  html_url: String,
  clone_url: String,
  git_url: String,
  ssh_url: String,
  default_branch: String,
  language: String,
  languages_url: String,
  stargazers_count: Number,
  watchers_count: Number,
  forks_count: Number,
  open_issues_count: Number,
  size: Number,
  created_at: Date,
  updated_at: Date,
  pushed_at: Date
}, {
  timestamps: true
});

repositorySchema.index({ integrationId: 1, id: 1 }, { unique: true });
repositorySchema.index({ integrationId: 1, organizationId: 1 });

module.exports = mongoose.model('Repository', repositorySchema);