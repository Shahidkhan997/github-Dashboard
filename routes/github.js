const express = require('express');
const githubController = require('../controllers/githubController');

const router = express.Router();

router.post('/sync', githubController.syncData);

module.exports = router;