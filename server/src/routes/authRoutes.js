const express = require('express');
const authController = require('../controllers/authController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/csrf', asyncHandler(authController.csrf));
router.get('/users', asyncHandler(authController.loginUsers));
router.post('/login', asyncHandler(authController.login));
router.post('/mfa/verify', asyncHandler(authController.verifyMfa));
router.post('/password/recovery/request', asyncHandler(authController.requestPasswordRecovery));
router.post('/password/recovery/reset', asyncHandler(authController.resetPassword));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', requireAuth, asyncHandler(authController.me));
router.post('/password', requireAuth, asyncHandler(authController.changePassword));
router.post('/mfa/setup', requireAuth, asyncHandler(authController.setupMfa));
router.post('/mfa/enable', requireAuth, asyncHandler(authController.enableMfa));
router.post('/mfa/disable', requireAuth, asyncHandler(authController.disableMfa));

module.exports = router;
