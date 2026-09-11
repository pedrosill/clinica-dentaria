const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requirePermission } = require('../middleware/auth');
const controller = require('../controllers/waitlistController');

const router = express.Router();
const waitlistRead = requirePermission('waitlist', 'read');
const waitlistWrite = requirePermission('waitlist', 'write');

router.get('/waitlist', waitlistRead, asyncHandler(controller.listWaitlist));
router.post('/patients/:patientId/waitlist', waitlistWrite, asyncHandler(controller.createWaitlistEntry));
router.patch('/waitlist/:id', waitlistWrite, asyncHandler(controller.transitionWaitlistEntry));

module.exports = router;
