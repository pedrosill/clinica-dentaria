const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requirePermission } = require('../middleware/auth');
const controller = require('../controllers/complianceController');

const router = express.Router();
router.get('/', requirePermission('compliance', 'read'), asyncHandler(controller.list));
router.patch('/:itemId', requirePermission('compliance', 'write'), asyncHandler(controller.update));

module.exports = router;
