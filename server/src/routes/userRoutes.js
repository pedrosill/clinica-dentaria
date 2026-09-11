const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireRole } = require('../middleware/auth');
const authService = require('../services/authService');
const HttpError = require('../utils/httpError');

const router = express.Router();
router.use(requireRole('admin'));

router.get('/', asyncHandler(async (req, res) => res.json(await authService.listUsers())));
router.post('/', asyncHandler(async (req, res) => {
  const user = await authService.createUser(req.body || {});
  return res.status(201).json(user);
}));
router.patch('/:id/active', asyncHandler(async (req, res) => {
  const active = req.body?.isActive;
  if (typeof active !== 'boolean') throw new HttpError(400, 'isActive must be a boolean');
  return res.json(await authService.setUserActive(req.params.id, active, req.user));
}));

module.exports = router;
