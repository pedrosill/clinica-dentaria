# DentalPro product scope

Last reviewed: 2026-09-13

## Purpose

DentalPro is an internal application for the day-to-day operation of a small dental clinic. It supports the clinic's existing team and clinical workflow; it is not intended to become a full financial or hospital-management platform in the current phase.

The clinic currently has one dentist, who is also the clinic owner and clinical lead, and a secretary who performs most of the daily operational work.

## Users and responsibilities

- **Secretary:** primary daily operator. She manages the agenda, patients, appointments, follow-ups, recalls, waitlist requests, and the manual transcription of historical paper records. Transcribed clinical information must remain clearly marked until validated by the dentist.
- **Dentist:** clinical responsibility. She reviews and validates transcriptions, writes and finalizes clinical notes, manages the odontogram and treatment plans, and can operate the agenda and patient workflow.
- **Administrator:** technical and account administration only where needed. Administrative access must not be treated as automatic permission to alter or validate clinical content.

Access must follow least privilege, use individual accounts, and keep an audit trail for sensitive reads and changes.

## Essential scope

### Daily clinic operation

- Dashboard with the next useful operational actions.
- Agenda by dentist, with clinic/provider availability, appointment creation, rescheduling, conclusion, cancellation, no-show, and arrived status.
- Patient search, registration, contact details, appointment history, recalls, and waitlist.
- Clear navigation between agenda, patient files, and appointment details.

### Clinical work

- Patient medical and dental profile.
- FDI odontogram and tooth-level findings.
- Clinical notes with draft/final states, immutable final notes, and versioned addenda.
- Treatment plans with ordered, tooth-linked procedures, independent from billing.
- Paper-record migration with the states **transcribed** and **validated by the dentist**.
- A secretary may transcribe information, but final clinical validation remains with the dentist.

### Governance and operational safety

- Individual authentication, role-based access, MFA for privileged accounts, and safe account recovery.
- Audit of sensitive access and changes.
- Patient export and workflows for access, correction, and deletion requests.
- Consent and private document handling.
- Clinic compliance checklist with evidence, owners, and approvals.
- Automatic local backups, an external copy, and a documented restore test.
- Production deployment documentation and clinic approval.

### Product quality

- Portuguese as the primary clinic language.
- Calm, accessible, responsive interface with short workflows and clear feedback.
- Help centre explaining the agenda, patients, recalls, waitlist, reports, and settings.
- Automated tests for critical appointment, clinical, security, and data-governance paths.

## Deployment boundary

The first supported deployment is local to the clinic. The application must not depend on cloud hosting or public network access to operate.

Local deployment still requires access controls on the computer/network, encrypted production storage, protected private documents, backups outside the primary machine, restore verification, and documented operational procedures.

## Planned next increments

- Complete the clinical workflow with richer note editing/addenda and an explicit paper-migration register.
- Finish Portuguese localization and locale-aware date formatting.
- Complete the clinic-approved retention configuration and its operational execution.
- Add email appointment confirmations/reminders with patient preferences, response tracking, delivery logs, and retry handling. This work remains experimental until explicitly integrated into the main branch.
- Improve operational reports and add stable locale-independent browser-test selectors.

## Scope rule

Only the capabilities listed as essential or planned next increments are current product requirements. New functionality should be justified against this document and reflected in `docs/FEATURE_INVENTORY.md` before implementation.
