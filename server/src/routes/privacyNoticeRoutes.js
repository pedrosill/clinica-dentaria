const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/privacyNoticeController');

const router = express.Router();
router.get('/:token', asyncHandler(controller.show));
router.post('/:token', asyncHandler(controller.respond));

module.exports = router;
