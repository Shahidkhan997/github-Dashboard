const express = require('express');
const dataController = require('../controllers/dataController');

const router = express.Router();

router.get('/collections', dataController.getCollections.bind(dataController));
router.get('/:collection/:userId', dataController.getData.bind(dataController));
router.get('/search/:userId/:query', dataController.globalSearch.bind(dataController));

module.exports = router;