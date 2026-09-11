# DentalPro feature inventory

This is the source-of-truth checklist for feature work. Before starting a new feature, search the repository and update this file. “Partial” means the domain/API exists but an important user workflow is still missing.

Last reviewed: 2026-09-11

## Implemented

| Area | Current coverage | Evidence |
| --- | --- | --- |
| Authentication | HTTP-only session login/logout, protected routes, roles, default administrator bootstrap | `server/src/routes/authRoutes.js`, `client/src/context/AuthContext.jsx` |
| Dashboard | Patient count/search and upcoming active appointments | `client/src/pages/Dashboard.jsx`, `client/src/utils/dashboardUtils.js` |
| Agenda | Week/month views, 30-minute booking grid, booked/free/unavailable states, 08:00–19:30 starts | `client/src/pages/Agenda.jsx`, `server/src/services/appointmentService.js` |
| Appointments | Create, edit active appointments, reschedule, conclude, status changes, conflict checks | `client/src/pages/AppointmentDetail.jsx`, `server/src/services/appointmentService.js` |
| Patients | Search, create/edit/delete, appointment history and patient detail | `client/src/pages/Patients.jsx`, `server/src/services/patientService.js` |
| Clinical records | Medical profile, FDI odontogram, tooth findings, clinical notes, treatment plans | `client/src/components/patient-detail/ClinicalRecordSection.jsx`, `server/src/services/clinicalService.js` |
| Doctors | Doctor CRUD and detail/contact view | `client/src/pages/Doctors.jsx`, `server/src/services/doctorService.js` |
| Clinic settings | Clinic hours/breaks, closures, appointment types, provider schedules, clinic language | `client/src/pages/Settings.jsx`, `server/src/services/clinicSettingsService.js` |
| Operational health | Liveness/readiness endpoints and automated unit/integration/E2E checks | `server/src/app.js`, `e2e/` |

## Partial — extend these instead of creating parallel features

| Area | Existing foundation | Next increment |
| --- | --- | --- |
| Localization | Global provider and persisted `en` / `pt-PT` setting | Translate remaining screens, locale-aware dates, and add locale regression coverage |
| Appointment status | Status API and server guards exist | Add visible check-in/no-show/cancel actions and enforce a complete transition policy |
| Clinical workflow | Patient clinical workspace exists | Link appointment conclusion to a draft/final clinical note and expose note editing where allowed |
| Appointment types | Admin settings persist active templates | Use active configured types as the booking source of truth instead of duplicated constants |
| Production security | Session auth and several role guards exist | Complete appointment/clinical authorization, audit history, and deployment hardening |
| Browser verification | Playwright covers core appointment and clinical flows | Add locale checks and stable locale-independent selectors |

## Missing — do not claim these are already available

1. Recall/follow-up queue with due dates and patient recall history.
2. Waitlist with priority and automatic slot matching.
3. Patient documents, consent forms, signatures, expiry, and version history.
4. Operational reports: appointments by provider/status/date, no-shows, utilization, treatment-plan progress, and export.
5. Patient communications: confirmation/reminder templates, delivery logs, preferences, and retry handling.
6. User administration and password change/reset workflows.
7. Audit log for clinical, appointment, user, and settings changes.
8. Billing and payments (explicitly deferred to a future version).

## Change-control rule

Every feature PR/commit should state one of `implemented`, `partial`, or `missing` for the affected inventory row and link to the relevant code/tests. If an apparently new requirement maps to an existing or partial row, extend that implementation instead of adding a second model, route, or screen.
