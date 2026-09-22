# DentalPro feature inventory

This is the source-of-truth checklist for feature work. Before starting a new feature, search the repository and update this file. “Partial” means the domain/API exists but an important user workflow is still missing.

Last reviewed: 2026-09-15

Product scope and clinic responsibilities: `docs/PRODUCT_SCOPE.md`.

## Implemented

| Area | Current coverage | Evidence |
| --- | --- | --- |
| Authentication and user management | HTTP-only sessions, protected routes, roles, password policy, TOTP MFA setup/verification, one-time recovery tokens, session revocation, and admin UI to manage users | `server/src/routes/authRoutes.js`, `server/src/services/authService.js`, `client/src/pages/Login.jsx`, `client/src/components/settings/MfaSection.jsx` |
| Dashboard and smart work queue | Patient count/search, upcoming active appointments, and a role-scoped queue of prioritised next actions | `client/src/pages/Dashboard.jsx`, `client/src/utils/dashboardUtils.js`, `server/src/services/workQueueService.js`, `client/src/components/dashboard/DashboardWorkQueue.jsx` |
| Agenda | Week/month views, clinic-wide doctor calendar inspection, 30-minute booking grid, booked/free/unavailable states, 08:00–19:30 starts; dentists can only schedule their own calendar | `client/src/pages/Agenda.jsx`, `server/src/services/appointmentService.js` |
| Appointments | Create, edit active appointments, reschedule, conclude, check-in, no-show, cancellation, status changes, conflict checks | `client/src/pages/AppointmentDetail.jsx`, `client/src/components/appointment-detail/CancelAppointmentModal.jsx`, `server/src/services/appointmentService.js` |
| Patients | Search, create/edit/delete, appointment history and patient detail | `client/src/pages/Patients.jsx`, `server/src/services/patientService.js` |
| Recall/follow-up | Persistent due-date queue, patient history, create/update workflow, role and dentist scope, duplicate and archive guards | `server/src/services/recallService.js`, `client/src/pages/Recalls.jsx`, `server/src/integration/recalls.integration.test.js` |
| Waitlist | Persistent patient queue used as the clinic’s appointment-request workflow, with optional requested date/doctor, priority, status transitions, duplicate and archive guards, dentist requests for any patient but only their own doctor, compact patient history, and audit events; scheduling from a request links the resulting appointment and resolves the request atomically | `server/src/services/waitlistService.js`, `client/src/pages/Waitlist.jsx`, `server/src/integration/waitlist.integration.test.js` |
| Clinical records | Medical profile, FDI odontogram, tooth findings, treatment plans, paper-transcription state, linked draft creation when a visit is concluded, multiple performed treatments with optional tooth/surface, immutable final notes, and dentist validation/finalization | `client/src/components/patient-detail/ClinicalRecordSection.jsx`, `server/src/services/clinicalService.js`, `server/src/services/appointmentService.js` |
| Doctors | Doctor CRUD and detail/contact view | `client/src/pages/Doctors.jsx`, `server/src/services/doctorService.js` |
| Clinic settings | Clinic hours/breaks, closures, appointment types, provider schedules, clinic language | `client/src/pages/Settings.jsx`, `server/src/services/clinicSettingsService.js` |
| Operational health | Liveness/readiness endpoints and automated unit/integration/E2E checks | `server/src/app.js`, `e2e/` |
| Data governance | Append-only audit events, sensitive-operation fail-closed audit, consent lifecycle, reasoned patient export, rights-request workflow, private document upload/download with hash, retention preview/holds, and an operational compliance checklist with per-item procedures, evidence, and approval state | `server/src/services/governanceService.js`, `server/src/services/privateDocumentService.js`, `server/src/services/complianceService.js`, `client/src/components/patient-detail/PatientGovernanceSection.jsx`, `client/src/components/settings/ComplianceSection.jsx` |
| Help center | Interactive in-app guide for the dashboard, agenda, patients, recalls, waitlist, reports, and settings, with direct links to each area | `client/src/components/HelpCenter.jsx`, `client/src/components/help/helpTopics.js`, `client/src/components/Sidebar.jsx` |
| Smart work queue | Role-scoped operational queue that derives prioritised next actions from arrivals, overdue appointments, recalls, urgent waitlist requests, incomplete contacts, and transcription validation; refreshes when returning to the app, supports urgency/date filters, and recommends the next action | `server/src/services/workQueueService.js`, `client/src/components/dashboard/DashboardWorkQueue.jsx`, `client/src/hooks/useWorkQueue.js`, `client/src/utils/workQueueUtils.test.js` |

## Partial — extend these instead of creating parallel features

| Area | Existing foundation | Next increment |
| --- | --- | --- |
| Localization | Global provider and persisted `en` / `pt-PT` setting | Translate remaining screens, locale-aware dates, and add locale regression coverage |
| Clinical workflow | Patient clinical workspace, appointment-linked draft notes, multi-treatment completion, tooth-linked treatment details, private appointment evidence, final-note locking, versioned addenda, paper transcription state, and dentist validation/finalization | Expose richer note editing/addenda and a complete migration register with explicit batch status |
| Document governance | Consent records, metadata, structured export, private binary storage/downloads, hashes and expiry/version fields | Formal signatures and retention executor remain clinic/legal decisions |
| Retention governance | Disabled-by-default policies, holds, preview, and explicit admin application exist | Clinic-approved durations and any deletion/anonymization executor are still missing |
| Appointment types | Admin settings persist active templates; create, edit, reschedule, and conclude use active configured types/durations | `client/src/utils/appointmentTypeUtils.js`, `client/src/hooks/useAppointmentForm.js`, `client/src/components/appointment-detail/`, `server/src/services/appointmentService.js`, `client/src/utils/appointmentTypeUtils.test.js` |
| Operational reports | Read-only appointment report by inclusive date range, doctor, and status, with minimized operational rows, totals, role scope, and local CSV export of visible rows | `server/src/routes/reportRoutes.js`, `server/src/services/reportService.js`, `server/src/integration/reports.integration.test.js`, `client/src/pages/Reports.jsx`, `e2e/reports-workflow.spec.js` |
| Production security | Session auth, CSRF/origin checks, security headers, central role/resource matrix, MFA/recovery, private files, encrypted backup status and second-copy support, dentist scope, required audit for sensitive actions, explicit loopback profile, fictional-data Docker profile for shared local-network testing, and production Docker profile with internal Caddy HTTPS | Installing the CA on both clinic computers, active SQLite/VM volume encryption, local firewall/OS account controls, OS scheduler/alerting, external backup host, and clinic approval remain operational requirements |
| Browser verification | Playwright covers core appointment and clinical flows | Add locale checks and stable locale-independent selectors |

## Missing — do not claim these are already available

1. Patient communications: confirmation/reminder templates, delivery logs, preferences, and retry handling. Email implementation is experimental and remains outside `master` until accepted.

## Change-control rule

Every feature PR/commit should state one of `implemented`, `partial`, or `missing` for the affected inventory row and link to the relevant code/tests. If an apparently new requirement maps to an existing or partial row, extend that implementation instead of adding a second model, route, or screen.
