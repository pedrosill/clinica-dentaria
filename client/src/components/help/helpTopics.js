import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';

export const HELP_TOPICS = [
  {
    id: 'dashboard',
    titleKey: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
    matches: ['/'],
    purposeKey: 'The dashboard is the quick view of today’s clinic work and the next appointments.',
    whenKey: 'Use the dashboard when you start the day or need a quick view of the next operational task.',
    stepsKeys: [
      'Start here to see today’s appointment activity and the next patient.',
      'Use the patient search when you need to open a record quickly.',
      'Open an appointment or the agenda to continue the operational workflow.',
    ],
    afterKey: 'Opening a patient or appointment takes you to the detailed workflow without losing the main navigation.',
    permissionsKey: 'The dashboard shows operational information. Clinical details remain inside the patient record.',
    tipKey: 'Use the dashboard as a starting point, not as a replacement for the full agenda or patient record.',
    actionKey: 'Open dashboard',
  },
  {
    id: 'agenda',
    titleKey: 'Agenda',
    icon: CalendarDays,
    path: '/agenda',
    matches: ['/agenda'],
    purposeKey: 'The agenda is where the clinic plans the day, sees availability, and opens appointments.',
    whenKey: 'Use the agenda to create appointments, check availability, follow attendance, or review a doctor’s day.',
    stepsKeys: [
      'Choose a day or week to see the clinic schedule and each doctor’s availability.',
      'Select a free slot to create an appointment or open a booked slot to review it.',
      'Use Reschedule from appointment details when the date, time, or duration changes.',
    ],
    afterKey: 'New appointments appear in the agenda, and rescheduling refreshes the old and new slots.',
    permissionsKey: 'Booked, blocked, and available slots are shown separately. Dentists can only schedule in their own scope.',
    tipKey: 'Appointment dates and times should be changed through Reschedule so the availability rules stay consistent.',
    actionKey: 'Open agenda',
  },
  {
    id: 'patients',
    titleKey: 'Patients',
    icon: Users,
    path: '/patients',
    matches: ['/patients'],
    purposeKey: 'Patients contains contact details, appointment history, clinical records, and data-governance actions.',
    whenKey: 'Use Patients when you need to find someone, update contact details, or continue work in a patient record.',
    stepsKeys: [
      'Search by name or contact details and open the patient record.',
      'Update operational details in the patient information area.',
      'Use the clinical and governance sections for authorised clinical work, consent, and exports.',
    ],
    afterKey: 'The patient record brings appointments, clinical information, follow-ups, waitlist history, and governance together.',
    permissionsKey: 'Clinical data is sensitive. The available editing and export actions depend on the signed-in role.',
    tipKey: 'Keep operational contact details separate from clinical notes and only use the sections your role allows.',
    actionKey: 'Open patients',
  },
  {
    id: 'recalls',
    titleKey: 'Recalls',
    icon: ClipboardList,
    path: '/recalls',
    matches: ['/recalls'],
    purposeKey: 'Recalls keep future patient follow-ups visible so they are not forgotten after a visit.',
    whenKey: 'Use Recalls when a patient needs a future check-up, review, or other planned follow-up.',
    stepsKeys: [
      'Create a follow-up with a patient, due date, and reason.',
      'Filter the queue by status to focus on pending or due work.',
      'Update the follow-up when it is scheduled, completed, or no longer needed.',
    ],
    afterKey: 'The follow-up stays in the patient history and remains visible in the queue until its status changes.',
    permissionsKey: 'Follow-ups are operational records. The available patient and scheduling actions still follow the user’s role.',
    tipKey: 'Use a clear reason and a realistic due date so the queue remains useful to the whole clinic.',
    actionKey: 'Open recalls',
  },
  {
    id: 'waitlist',
    titleKey: 'Waitlist',
    icon: Clock3,
    path: '/waitlist',
    matches: ['/waitlist'],
    purposeKey: 'The waitlist records requests from patients who want an earlier or future appointment opening.',
    whenKey: 'Use the waitlist when there is no suitable confirmed slot but the patient wants the clinic to follow up on an opening.',
    stepsKeys: [
      'Add the patient’s preferred date, doctor, priority, and a short operational note.',
      'Review waiting and contacted requests in priority order.',
      'Schedule an appointment from a request when a suitable slot becomes available.',
    ],
    afterKey: 'Scheduling from a request links the resulting appointment and resolves the request as booked.',
    permissionsKey: 'The waitlist is a request queue; it does not replace a confirmed appointment in the agenda.',
    tipKey: 'The application does not automatically match waitlist requests to free slots yet; the team reviews them manually.',
    actionKey: 'Open waitlist',
  },
  {
    id: 'reports',
    titleKey: 'Reports',
    icon: BarChart3,
    path: '/reports',
    matches: ['/reports'],
    purposeKey: 'Reports provide a read-only operational view of appointment volume by period, doctor, and status.',
    whenKey: 'Use Reports when you need an operational summary or a filtered list of appointments for a local working file.',
    stepsKeys: [
      'Choose an inclusive date range and, if needed, a doctor or appointment status.',
      'Apply the filters to review totals and the matching appointment rows.',
      'Export the visible operational rows as CSV when a local working copy is needed.',
    ],
    afterKey: 'The report updates from the appointment data and shows up to 200 matching operational rows.',
    permissionsKey: 'Reports contain operational data only. Use the patient record for clinical information.',
    tipKey: 'Use the smallest date range that answers the question and handle exported CSV files as clinic data.',
    actionKey: 'Open reports',
  },
  {
    id: 'settings',
    titleKey: 'Settings',
    icon: Settings,
    path: '/settings',
    matches: ['/settings'],
    purposeKey: 'Settings control the clinic rules, schedules, team access, account security, and compliance checklist.',
    whenKey: 'Use Settings when the clinic’s operating rules, staff access, security, or compliance information needs to change.',
    stepsKeys: [
      'Use Clinic and Scheduling to maintain hours, closures, appointment types, and provider availability.',
      'Use Team and Account to manage access and protect staff accounts.',
      'Use Compliance to record procedures, evidence, responsible people, and approvals.',
    ],
    afterKey: 'Scheduling changes affect future availability, while account and compliance changes remain recorded in their respective sections.',
    permissionsKey: 'Some settings can only be changed by administrators. Dentists do not see the settings area in the main navigation.',
    tipKey: 'Change scheduling settings carefully because they affect the available slots for new and rescheduled appointments.',
    actionKey: 'Open settings',
    hideForDentist: true,
  },
];

export function getVisibleHelpTopics(role) {
  return HELP_TOPICS.filter((topic) => !(topic.hideForDentist && role === 'dentist'));
}

export function getHelpTopicForPath(pathname, role) {
  const visibleTopics = getVisibleHelpTopics(role);
  return visibleTopics.find((topic) => topic.matches.some((path) => pathname === path || pathname.startsWith(`${path}/`)))?.id
    || visibleTopics[0]?.id
    || 'dashboard';
}
