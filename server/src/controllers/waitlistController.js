const waitlistService = require('../services/waitlistService');

async function listWaitlist(req, res) { return res.status(200).json(await waitlistService.listWaitlist(req.query, req.user)); }
async function createWaitlistEntry(req, res) { return res.status(201).json(await waitlistService.createWaitlistEntry(req.params.patientId, req.body, req.user, req)); }
async function transitionWaitlistEntry(req, res) { return res.status(200).json(await waitlistService.transitionWaitlistEntry(req.params.id, req.body, req.user, req)); }

module.exports = { listWaitlist, createWaitlistEntry, transitionWaitlistEntry };
