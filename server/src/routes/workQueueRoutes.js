const express = require('express');
const { requirePermission } = require('../middleware/auth');
const controller = require('../controllers/workQueueController');

const router = express.Router();

router.get('/', requirePermission('appointment', 'read'), controller.getWorkQueue);

module.exports = router;
