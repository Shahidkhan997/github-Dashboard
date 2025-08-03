const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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
  login: String,
  name: String,
  email: String,
  avatar_url: String,
  company: String,
  location: String,
  blog: String,
  bio: String,
  twitter_username: String,
  public_repos: Number,
  public_gists: Number,
  followers: Number,
  following: Number,
  created_at: Date,
  updated_at: Date,
  html_url: String,
  type: String,
  site_admin: Boolean
}, {
  timestamps: true
});

userSchema.index({ integrationId: 1, id: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);