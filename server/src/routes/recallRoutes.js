const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requirePermission } = require('../middleware/auth');
const controller = require('../controllers/recallController');

const router = express.Router();
const recallRead = requirePermission('recall', 'read');
const recallWrite = requirePermission('recall', 'write');

router.get('/recalls', recallRead, asyncHandler(controller.listRecalls));
router.post('/patients/:patientId/recalls', recallWrite, asyncHandler(controller.createRecall));
router.patch('/recalls/:id', recallWrite, asyncHandler(controller.transitionRecall));

module.exports = router;
