# DentalPro feature inventory

This is the source-of-truth checklist for feature work. Before starting a new feature, search the repository and update this file. “Partial” means the domain/API exists but an important user workflow is still missing.

Last reviewed: 2026-09-12

## Implemented

| Area | Current coverage | Evidence |
| --- | --- | --- |
| Authentication and user management | HTTP-only session login/logout, protected routes, roles, default administrator bootstrap, signed-in self-service password change with session revocation, and admin UI to list/create/activate/deactivate users (with self-deactivation prevented) | `server/src/routes/authRoutes.js`, `server/src/routes/userRoutes.js`, `server/src/services/authService.js`, `client/src/components/settings/UserManagementSection.jsx`, `client/src/services/users.js`, `server/src/integration/auth.integration.test.js` |
| Dashboard | Patient count/search and upcoming active appointments | `client/src/pages/Dashboard.jsx`, `client/src/utils/dashboardUtils.js` |
| Agenda | Week/month views, clinic-wide doctor calendar inspection, 30-minute booking grid, booked/free/unavailable states, 08:00–19:30 starts; dentists can only schedule their own calendar | `client/src/pages/Agenda.jsx`, `server/src/services/appointmentService.js` |
| Appointments | Create, edit active appointments, reschedule, conclude, check-in, no-show, cancellation, status changes, conflict checks | `client/src/pages/AppointmentDetail.jsx`, `client/src/components/appointment-detail/CancelAppointmentModal.jsx`, `server/src/services/appointmentService.js` |
| Patients | Search, create/edit/delete, appointment history and patient detail | `client/src/pages/Patients.jsx`, `server/src/services/patientService.js` |
| Recall/follow-up | Persistent due-date queue, patient history, create/update workflow, role and dentist scope, duplicate and archive guards | `server/src/services/recallService.js`, `client/src/pages/Recalls.jsx`, `server/src/integration/recalls.integration.test.js` |
| Waitlist | Persistent patient queue used as the clinic’s appointment-request workflow, with optional requested date/doctor, priority, status transitions, duplicate and archive guards, dentist requests for any patient but only their own doctor, compact patient history, and audit events; scheduling from a request links the resulting appointment and resolves the request atomically | `server/src/services/waitlistService.js`, `client/src/pages/Waitlist.jsx`, `server/src/integration/waitlist.integration.test.js` |
| Clinical records | Medical profile, FDI odontogram, tooth findings, clinical notes, treatment plans | `client/src/components/patient-detail/ClinicalRecordSection.jsx`, `server/src/services/clinicalService.js` |
| Doctors | Doctor CRUD and detail/contact view | `client/src/pages/Doctors.jsx`, `server/src/services/doctorService.js` |
| Clinic settings | Clinic hours/breaks, closures, appointment types, provider schedules, clinic language | `client/src/pages/Settings.jsx`, `server/src/services/clinicSettingsService.js` |
| Operational health | Liveness/readiness endpoints and automated unit/integration/E2E checks | `server/src/app.js`, `e2e/` |
| Data governance | Append-only audit events, consent lifecycle, patient export, internal data-subject requests, document metadata, explicit retention preview/holds, plus bounded patient-detail consent and JSON export UI | `server/src/services/governanceService.js`, `client/src/components/patient-detail/PatientGovernanceSection.jsx`, `client/src/services/patients.js` |

## Partial — extend these instead of creating parallel features

| Area | Existing foundation | Next increment |
| --- | --- | --- |
| Localization | Global provider and persisted `en` / `pt-PT` setting | Translate remaining screens, locale-aware dates, and add locale regression coverage |
| Clinical workflow | Patient clinical workspace, final-note locking, and versioned addenda exist | Link appointment conclusion to a draft/final clinical note and expose note editing where allowed |
| Document governance | Consent records, document metadata, structured export, and data-subject request tracking exist | Private binary storage/downloads, signatures, expiry, and document version history are still missing |
| Retention governance | Disabled-by-default policies, holds, preview, and explicit admin application exist | Clinic-approved durations and any deletion/anonymization executor are still missing |
| Appointment types | Admin settings persist active templates; create, edit, reschedule, and conclude use active configured types/durations | `client/src/utils/appointmentTypeUtils.js`, `client/src/hooks/useAppointmentForm.js`, `client/src/components/appointment-detail/`, `server/src/services/appointmentService.js`, `client/src/utils/appointmentTypeUtils.test.js` |
| Operational reports | Read-only appointment report by inclusive date range, doctor, and status, with minimized operational rows, totals, role scope, and local CSV export of visible rows | `server/src/routes/reportRoutes.js`, `server/src/services/reportService.js`, `server/src/integration/reports.integration.test.js`, `client/src/pages/Reports.jsx`, `e2e/reports-workflow.spec.js` |
| Production security | Session auth, CSRF/origin checks, security headers, fail-closed production config, local encrypted backup/restore tooling, central role/resource matrix, dentist-to-doctor scope, non-destructive archiving, contact validation, and audit history | Active SQLite encryption at rest, TLS/proxy, off-host backup monitoring, MFA/password recovery, and clinic approval of deployment, retention, and incident procedures remain operational requirements |
| Browser verification | Playwright covers core appointment and clinical flows | Add locale checks and stable locale-independent selectors |

## Missing — do not claim these are already available

1. Automatic waitlist slot matching.
2. Patient communications: confirmation/reminder templates, delivery logs, preferences, and retry handling.
3. Billing and payments (explicitly deferred to a future version).

## Change-control rule

Every feature PR/commit should state one of `implemented`, `partial`, or `missing` for the affected inventory row and link to the relevant code/tests. If an apparently new requirement maps to an existing or partial row, extend that implementation instead of adding a second model, route, or screen.
