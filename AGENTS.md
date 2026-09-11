# DentalPro project instructions

These instructions apply to the whole repository. Read them before changing code. The existing `.github/agents/ClinicDev.agent.md` contains additional guidance for the invocable ClinicDev agent; these instructions are the shared project baseline.

## Product context

DentalPro is an internal dental-clinic management application. It manages patients, doctors, appointments, the agenda, appointment details, rescheduling, and the dashboard's upcoming agenda.

The current stack is:

- Frontend: React 19, Vite 8, React Router, Tailwind CSS v4, and Lucide React.
- Backend: Node.js, Express 5, Prisma ORM, and SQLite.
- Repository shape: one root workspace with separate `client/` and `server/` applications.

Keep the medical-workflow UI clear, calm, and accessible. Prefer small, targeted changes that fit the existing patterns instead of introducing a new framework, state library, backend platform, or database.

## Repository map

- `client/src/pages/`: route-level page composition.
- `client/src/components/`: reusable UI and feature components.
- `client/src/hooks/`: feature state, data loading, and form behavior.
- `client/src/services/`: frontend API calls.
- `client/src/utils/`: pure formatting, filtering, calendar, and domain helpers.
- `client/src/constants/`: shared frontend options and API-related constants.
- `server/src/routes/`: HTTP route declarations.
- `server/src/controllers/`: request/response handling and HTTP validation boundaries.
- `server/src/services/`: appointment, patient, and doctor business rules.
- `server/src/utils/`: parsing, errors, and reusable backend helpers.
- `server/prisma/schema.prisma`: database model source of truth.
- `server/prisma/migrations/`: committed schema migrations.
- `server/seed.js` and `server/src/startup/`: development seed/backfill behavior.
- `.github/agents/ClinicDev.agent.md`: specialized user-invocable agent instructions.

Maintain the `client/`/`server/` separation. Do not move business rules into page components or bypass the server by making the client the only source of truth.

## Appointment invariants

These rules are product requirements, not merely UI preferences. Enforce them in the server and reflect them in every relevant client flow.

1. Appointment start times use `HH:MM` and a 30-minute grid: `08:00`, `08:30`, `09:00`, and so on.
2. The default clinic start-time options run from `08:00` through `19:30`, with a default close at `20:00`. Practice and provider settings may change the active hours, but a selected duration must still finish by the configured close; longer appointments therefore have fewer valid start times.
3. The add-appointment form and reschedule form must use the same availability rules. A slot must visibly communicate whether it is free or booked, and the server must reject conflicts even if a client is stale.
4. The add-appointment date defaults sensibly, but its calendar picker is opened intentionally by clicking the date field. Do not force an expanded calendar when the form opens.
5. Appointment date and time are changed through the reschedule workflow. The appointment detail page must not expose a separate date/time edit control that bypasses rescheduling.
6. Rescheduling must persist both the date and time and then refresh or reconcile every affected view. The appointment must appear on the agenda under its new date/time and no longer remain in the old slot.
7. Terminal statuses (`completed`, `cancelled`, and `no_show`) must not be offered for rescheduling. Active appointments (`scheduled` and `arrived`) are the normal scheduling states; preserve the existing status semantics when changing availability or dashboard logic.
8. The dashboard's upcoming agenda must be derived from the appointments API, include only future active appointments, sort by the combined appointment date/time, and remain correct after a reschedule or status change.

## Scheduling settings

- `ClinicSettings`, weekly `ClinicSchedule` entries, dated `ClinicClosure` entries, appointment types, and provider schedules are the source of truth for operational scheduling.
- Availability, appointment creation, and rescheduling must all resolve the same clinic/provider schedule for the requested date. Do not reintroduce hard-coded hours or treatment-duration lists in client forms.
- Appointment types may be archived, but existing appointments retain their saved treatment text and duration.

When changing scheduling behavior, inspect and update the complete path: client form state, availability request, server controller, appointment service, conflict validation, persistence, and refresh behavior. Do not fix one screen with a second set of subtly different slot constants.

## Date and time handling

- Treat appointment dates as date-only values in the UI and API payloads: `YYYY-MM-DD`.
- Treat appointment times as local clinic times represented by `HH:MM` strings.
- Do not derive a date-only value with `toISOString().slice(0, 10)`; UTC conversion can move an appointment to the previous or next local day. Use the existing local-date helpers or an equivalent local calendar implementation.
- Use the existing agenda helpers for local day comparisons, calendar ranges, appointment date/time composition, and display formatting before adding new variants.
- Keep the database representation consistent with the existing Prisma `Appointment.date` (`DateTime`) plus `Appointment.time` (`String`) model. Normalize and validate at the server boundary.
- When touching timezone behavior, test dates near midnight and verify the same appointment in the add form, agenda, detail page, reschedule form, and dashboard.

## Implementation conventions

- Keep page components primarily compositional. Put data loading and form transitions in hooks, API calls in services, and pure transformations in utils.
- Use `fetch` and the existing API helpers unless there is a specific reason to change the HTTP layer.
- Keep API errors explicit and user-facing messages actionable. Server routes should return appropriate `400`, `404`, and `500` responses through the existing error-handling pattern.
- Validate IDs, dates, times, durations, required fields, and appointment conflicts on the server. Client validation improves UX but is not a security or correctness boundary.
- Prefer existing UI primitives and Lucide icons. Preserve accessible labels, keyboard interaction, focus behavior, disabled states, and clear booked/free status styling.
- Avoid unrelated refactors while implementing a feature. If a repeated rule needs centralization, make the smallest change that gives both add and reschedule flows one source of truth.
- Do not edit `.env` files, SQLite database files, `node_modules`, or build output as part of normal feature work. Use `.env.example` for shareable configuration documentation.
- If the Prisma schema changes, create and commit a migration; do not hand-edit generated Prisma output.

## Safe change workflow

1. Read the relevant page, hook, service, controller, route, and utility before editing.
2. Trace the data from the UI request through the API and persistence layer, including the refresh path after a mutation.
3. Make a focused change and preserve unrelated user work.
4. Verify the affected behavior at both the server boundary and the UI boundary.
5. Review the diff for accidental secrets, databases, generated files, or dependency directories before committing.

## Verification commands

From the repository root:

```bash
npm run lint --prefix client
npm run build --prefix client
```

For backend syntax checks, run the changed CommonJS files with Node's check mode, for example:

```bash
node --check server/src/services/appointmentService.js
```

For a scheduling change, also exercise the relevant API endpoint and manually verify:

- add appointment shows only valid 30-minute slots;
- `08:00` and `19:30` boundaries behave correctly;
- booked slots cannot be selected or submitted;
- rescheduling moves the appointment to the new agenda date/time;
- the old agenda slot is cleared;
- the dashboard upcoming list uses the new date/time;
- completed, cancelled, and no-show appointments are not reschedulable.

## Git and configuration hygiene

- Keep secrets in local `.env` files; never commit them.
- Keep local SQLite databases out of Git; commit Prisma schema and migrations instead.
- Keep `package-lock.json` files in sync when dependencies change.
- Before committing, inspect `git status` and the staged file list. The root `.gitignore` is the project-wide safety net, while the nested client/server ignore files remain valid for their respective folders.
- Use descriptive commits that explain the user-visible change, such as `Fix dashboard upcoming appointment ordering`.
