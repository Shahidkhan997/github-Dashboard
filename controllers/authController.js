const jwt = require('jsonwebtoken');
const axios = require('axios');
const Integration = require('../models/Integration');

class AuthController {
  async githubCallback(req, res) {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).json({ error: 'Authorization code not provided' });
      }

      // Exchange code for access token
      const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code
      }, {
        headers: {
          'Accept': 'application/json'
        }
      });

      const { access_token, scope } = tokenResponse.data;

      if (!access_token) {
        return res.status(400).json({ error: 'Failed to obtain access token' });
      }

      // Get user information
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${access_token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      const userInfo = userResponse.data;

      // Store or update integration
      const integration = await Integration.findOneAndUpdate(
        { userId: userInfo.id.toString(), provider: 'github' },
        {
          accessToken: access_token,
          userInfo: {
            id: userInfo.id,
            login: userInfo.login,
            name: userInfo.name,
            email: userInfo.email,
            avatar_url: userInfo.avatar_url,
            company: userInfo.company,
            location: userInfo.location
          },
          scopes: scope ? scope.split(',') : [],
          connectedAt: new Date(),
          lastSyncAt: new Date(),
          isActive: true
        },
        { upsert: true, new: true }
      );

      // Generate JWT token for frontend
      const jwtToken = jwt.sign(
        { integrationId: integration._id, userId: userInfo.id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${jwtToken}&status=success`);
    } catch (error) {
      console.error('GitHub callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/integrations?status=error&message=${encodeURIComponent(error.message)}`);
    }
  }

  async getIntegrationStatus(req, res) {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      const integration = await Integration.findOne({ 
        userId: userId.toString(), 
        provider: 'github',
        isActive: true 
      });

      if (!integration) {
        return res.json({ connected: false });
      }

      res.json({
        connected: true,
        connectedAt: integration.connectedAt,
        lastSyncAt: integration.lastSyncAt,
        userInfo: integration.userInfo
      });
    } catch (error) {
      console.error('Integration status error:', error);
      res.status(500).json({ error: 'Failed to get integration status' });
    }
  }

  async removeIntegration(req, res) {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      await Integration.findOneAndUpdate(
        { userId: userId.toString(), provider: 'github' },
        { isActive: false }
      );

      res.json({ success: true, message: 'Integration removed successfully' });
    } catch (error) {
      console.error('Remove integration error:', error);
      res.status(500).json({ error: 'Failed to remove integration' });
    }
  }
}

module.exports = new AuthController();