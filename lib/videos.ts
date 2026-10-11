// The marketing videos shown on /videos. Files live in public/videos.
// To add a video: drop the .mp4 in public/videos and add an entry here.

export interface VideoChapter {
  /** Anchor on the page, e.g. /videos#guests */
  slug: string
  file: string
  title: string
  seconds: number
  /** One or two sentences: what this part of the product is for. */
  summary: string
  /** What the viewer sees in the video. */
  points: string[]
  /** Who it is most useful for. */
  audience: string
}

export interface VideoGroup {
  name: string
  blurb: string
  chapters: VideoChapter[]
}

export const PROMO = {
  file: '/videos/Sojourn_2_Minute_Marketing_Promo.mp4',
  title: 'The whole product in two minutes',
  seconds: 120,
}

export const VIDEO_GROUPS: VideoGroup[] = [
  {
    name: 'Start here',
    blurb: 'What a new visitor sees before signing in.',
    chapters: [
      {
        slug: 'landing-page',
        file: '/videos/Sojourn_Tutorial_01_Landing_Page_v5.mp4',
        title: 'The landing page',
        seconds: 129,
        summary: 'A walk through the public website: what the product does, how one booking flows through the whole business, and how to create a workspace.',
        points: ['The headline and the live preview of the product', 'The six main features and the Guest, Revenue, Legal, Partners flow', 'The phone experience and how your data is kept private', 'Questions and answers, and where to get started'],
        audience: 'Anyone seeing the product for the first time',
      },
    ],
  },
  {
    name: 'Dashboards',
    blurb: 'The three screens that answer "how are we doing?" at a glance.',
    chapters: [
      {
        slug: 'dashboard',
        file: '/videos/Sojourn_Tutorial_02_Dashboard.mp4',
        title: 'The dashboard',
        seconds: 92,
        summary: 'The owner’s one-page picture of the business: money in, money out, cash on hand, who is staying tonight and who arrives this week.',
        points: ['Total revenue, total expenses, capital funded and net position', 'Revenue against expenses month by month', 'Cash in each account and expenses still missing a receipt', 'Guests in-house now, arrivals in the coming days, and open tasks'],
        audience: 'Owners and managers',
      },
      {
        slug: 'operations',
        file: '/videos/Sojourn_Tutorial_03_Operations.mp4',
        title: 'Operations',
        seconds: 101,
        summary: 'The manager’s morning screen. It gathers everything that needs attention today so nobody has to open five different lists.',
        points: ['Today’s check-ins, check-outs, occupied and available rooms', 'Upcoming arrivals and departures with balances still to collect', 'Revenue this month and money guests still owe', 'Overdue tasks, fire-safety alerts and the cash position'],
        audience: 'General managers and front desk',
      },
      {
        slug: 'partners-dashboard',
        file: '/videos/Sojourn_Tutorial_04_Partners_Dashboard.mp4',
        title: 'The partners dashboard',
        seconds: 134,
        summary: 'Reporting for owners and investors, built from the same numbers the manager works with every day.',
        points: ['Financial overview and revenue by booking source', 'Capital funded and each partner’s share', 'Budget against actual results', 'Occupancy, average rate and revenue per room, cost structure and forecast'],
        audience: 'Partners, shareholders and investors',
      },
    ],
  },
  {
    name: 'Daily operations',
    blurb: 'The screens the team uses every day, designed for a phone first.',
    chapters: [
      {
        slug: 'guests',
        file: '/videos/Sojourn_Tutorial_05_Guests.mp4',
        title: 'Guests and bookings',
        seconds: 80,
        summary: 'The most important screen. A booking is typed once, and the calendar, the revenue, the cash account and the guest’s invoice all follow from it.',
        points: ['Adding a booking: room, dates, rate and booking source', 'Recording a deposit and later payments, and seeing the balance due', 'Searching, filtering and exporting the list', 'Creating an invoice and sharing it with the guest by link'],
        audience: 'Front desk and managers',
      },
      {
        slug: 'occupancy',
        file: '/videos/Sojourn_Tutorial_06_Occupancy.mp4',
        title: 'Occupancy calendar',
        seconds: 66,
        summary: 'A month at a glance: every room down the side, every day across the top, and a coloured bar for each stay.',
        points: ['Moving between months', 'Occupancy percentage, nights sold and bookings for the month', 'Average rate per night and revenue per available room', 'Tapping a stay to see the booking behind it'],
        audience: 'Managers planning the weeks ahead',
      },
      {
        slug: 'rooms',
        file: '/videos/Sojourn_Tutorial_07_Rooms.mp4',
        title: 'Rooms',
        seconds: 110,
        summary: 'Each room has its own page with photos, what is inside it, and its fire-safety records.',
        points: ['Room cards showing which rooms are occupied tonight', 'Photos of each room', 'The inventory list: furniture, electronics, linen and more', 'Fire extinguishers with expiry dates and warnings before they run out'],
        audience: 'Managers and housekeeping',
      },
      {
        slug: 'tasks',
        file: '/videos/Sojourn_Tutorial_08_Tasks.mp4',
        title: 'Tasks',
        seconds: 52,
        summary: 'A shared to-do list for the property, organised by department, with a person responsible and a due date for each job.',
        points: ['Adding a task and assigning it to someone', 'Changing a task’s status as work moves on', 'Seeing what is overdue at a glance', 'Filtering by department or to your own tasks'],
        audience: 'The whole team',
      },
      {
        slug: 'complaints',
        file: '/videos/Sojourn_Tutorial_09_Complaints.mp4',
        title: 'Complaints',
        seconds: 54,
        summary: 'A simple record of guest complaints, so nothing is forgotten and you can see how each one was resolved.',
        points: ['Logging a complaint with the room, category and how serious it is', 'Following it from open to in progress to resolved', 'Writing down what was done about it', 'Spotting critical issues that are still open'],
        audience: 'Front desk and managers',
      },
      {
        slug: 'staff-hours',
        file: '/videos/Sojourn_Tutorial_10_Staff_Hours.mp4',
        title: 'Staff hours',
        seconds: 62,
        summary: 'Hours worked and pay for each member of staff, added up by month.',
        points: ['Recording a day’s hours for a staff member', 'Hourly rates and the pay they add up to', 'Monthly totals per person', 'Filtering by staff member and exporting the list'],
        audience: 'Managers and whoever runs payroll',
      },
    ],
  },
  {
    name: 'Money',
    blurb: 'Income, cash, the accountant’s view and the budget.',
    chapters: [
      {
        slug: 'revenue',
        file: '/videos/Sojourn_Tutorial_11_Revenue.mp4',
        title: 'Revenue',
        seconds: 49,
        summary: 'One list holds all income, and every report adds up that same list, so the numbers always agree.',
        points: ['Booking income that arrives by itself from the Guests screen', 'Adding other income such as restaurant takings or tours', 'Totals by booking source and by month', 'Why booking lines are locked here and edited on the booking'],
        audience: 'Owners, managers and finance',
      },
      {
        slug: 'accounts',
        file: '/videos/Sojourn_Tutorial_13_Accounts.mp4',
        title: 'Accounts',
        seconds: 36,
        summary: 'How much money is in the bank and in the cash box, and every movement that explains the balance.',
        points: ['A balance for each account and the total cash on hand', 'Movements added by themselves from guest payments and expenses', 'Correcting a balance after counting the cash'],
        audience: 'Owners and finance',
      },
      {
        slug: 'legal-and-accounting',
        file: '/videos/Sojourn_Tutorial_14_Legal_and_Accounting.mp4',
        title: 'Legal and accounting',
        seconds: 44,
        summary: 'The page for your accountant or lawyer. They see only what you chose to share, and mark each expense as accepted, needing clarification or rejected.',
        points: ['Expenses and income shared for review', 'Reviewing an expense and leaving a note', 'Totals by review status', 'Downloading or printing the report for a month'],
        audience: 'Accountants, lawyers and owners',
      },
      {
        slug: 'budget',
        file: '/videos/Sojourn_Tutorial_15_Budget.mp4',
        title: 'Budget',
        seconds: 43,
        summary: 'Plan the year room by room and cost by cost, then compare the plan with what really happened.',
        points: ['Expected revenue for each room and month', 'Running costs and one-off investments', 'The rent schedule', 'Budget against actual, month by month'],
        audience: 'Owners, partners and finance',
      },
    ],
  },
  {
    name: 'Partners',
    blurb: 'For businesses owned by several people.',
    chapters: [
      {
        slug: 'partner-list',
        file: '/videos/Sojourn_Tutorial_16_Partner_List.mp4',
        title: 'Partner list',
        seconds: 31,
        summary: 'A profile for each partner with their role, ownership share and how much capital they have put in.',
        points: ['Partner cards with photo, role and ownership percentage', 'Capital paid in against the amount agreed', 'Adding or editing a partner'],
        audience: 'Partners and owners',
      },
      {
        slug: 'capital',
        file: '/videos/Sojourn_Tutorial_17_Capital.mp4',
        title: 'Capital',
        seconds: 24,
        summary: 'Every contribution of capital, by partner and by date.',
        points: ['Recording a contribution', 'Totals per partner and each one’s share of the capital paid', 'The full history, ready to export'],
        audience: 'Partners and finance',
      },
      {
        slug: 'partner-work',
        file: '/videos/Sojourn_Tutorial_18_Partner_Work.mp4',
        title: 'Partner work',
        seconds: 26,
        summary: 'Hours partners work for the business, valued at an hourly rate, so effort is recorded as well as money.',
        points: ['Logging hours for a month', 'The value of that work at the agreed rate', 'Totals per partner'],
        audience: 'Partners',
      },
      {
        slug: 'meetings',
        file: '/videos/Sojourn_Tutorial_19_Meetings.mp4',
        title: 'Meetings',
        seconds: 30,
        summary: 'Minutes of partner meetings kept in one place: who attended, what was decided and who does what next.',
        points: ['Recording a meeting with its participants', 'Agenda, decisions and action items', 'Attaching documents to the meeting'],
        audience: 'Partners and owners',
      },
    ],
  },
  {
    name: 'Company and settings',
    blurb: 'Keeping passwords safe and making the system fit your business.',
    chapters: [
      {
        slug: 'login-keys',
        file: '/videos/Sojourn_Tutorial_21_Login_Keys.mp4',
        title: 'Login keys',
        seconds: 19,
        summary: 'A locked place for the passwords your business shares, such as booking sites and the bank, so they stop living in chat messages.',
        points: ['Saving a login for a website or service', 'Revealing and copying a password only when you need it', 'Passwords stored encrypted'],
        audience: 'Owners and managers',
      },
      {
        slug: 'settings',
        file: '/videos/Sojourn_Tutorial_22_Settings.mp4',
        title: 'Settings',
        seconds: 122,
        summary: 'Where you shape the system around your business: your people and what each can see, your properties, your invoice details and your own lists.',
        points: ['Your workspace and the people in it, and inviting someone by link', 'Roles: what each person can view, add, edit and delete', 'Currency, tax, invoice details and your own categories', 'Exporting your data and the history of every change'],
        audience: 'Owners and administrators',
      },
    ],
  },
]

export const ALL_CHAPTERS: VideoChapter[] = VIDEO_GROUPS.flatMap((g) => g.chapters)
export const TOTAL_SECONDS = ALL_CHAPTERS.reduce((s, c) => s + c.seconds, 0)

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
