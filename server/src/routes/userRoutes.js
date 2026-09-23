const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireRole } = require('../middleware/auth');
const authService = require('../services/authService');
const HttpError = require('../utils/httpError');
const { parseCookies, SESSION_COOKIE_NAME } = require('../utils/auth');

const router = express.Router();
router.use(requireRole('admin'));

router.get('/', asyncHandler(async (req, res) => res.json(await authService.listUsers())));
router.post('/', asyncHandler(async (req, res) => {
  const user = await authService.createUser(req.body || {});
  return res.status(201).json(user);
}));
router.patch('/:id', asyncHandler(async (req, res) => {
  return res.json(await authService.updateUser(req.params.id, req.body || {}, req.user));
}));
router.patch('/:id/active', asyncHandler(async (req, res) => {
  const active = req.body?.isActive;
  if (typeof active !== 'boolean') throw new HttpError(400, 'isActive must be a boolean');
  return res.json(await authService.setUserActive(req.params.id, active, req.user));
}));
router.patch('/:id/password', asyncHandler(async (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  return res.json(await authService.resetUserPassword(
    req.params.id,
    req.body?.newPassword,
    req.user,
    cookies[SESSION_COOKIE_NAME],
  ));
}));

module.exports = router;
