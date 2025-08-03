const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  integrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Integration',
    required: true
  },
  id: {
    type: Number,
    required: true
  },
  login: String,
  url: String,
  repos_url: String,
  events_url: String,
  hooks_url: String,
  issues_url: String,
  members_url: String,
  description: String,
  name: String,
  company: String,
  blog: String,
  location: String,
  email: String,
  twitter_username: String,
  created_at: Date,
  updated_at: Date,
  public_repos: Number,
  public_members: Number,
  followers: Number,
  following: Number
}, {
  timestamps: true
});

organizationSchema.index({ integrationId: 1, id: 1 }, { unique: true });

module.exports = mongoose.model('Organization', organizationSchema);