export type Period = '7' | '30' | '90';
export type Segment = 'all' | 'new' | 'active' | 'dormant';
export type MessageType = 'all' | 'Promotion' | 'Reminder' | 'Service';
export type Platform = 'all' | 'iOS' | 'Android';

export interface DashboardFilters {
  period: Period;
  segment: Segment;
  messageType: MessageType;
  platform: Platform;
}

export interface MessageRecord {
  id: string;
  name: string;
  type: Exclude<MessageType, 'all'>;
  platform: Exclude<Platform, 'all'>;
  segment: Exclude<Segment, 'all'>;
  sentAt: string;
  deliveredAt: string;
  hasCTA: boolean;
  sender: string;
  audience: string;
  status: 'Delivered' | 'Partially delivered';
  priority: 'High' | 'Normal' | 'Low';
  delivered: number;
  exposed: number;
  opened: number;
  engaged: number;
  ctaExposed: number;
  clicked: number;
  completed: number;
  unread: number;
  medianReadSeconds: number;
  frictionRate: number;
  latencyP95: number;
}

export interface TimingBucket {
  label: string;
  value: number;
}

export interface HourlyMessageClicks {
  hour: string;
  clicks: number;
}

export interface MessageTimingProfile {
  hourlyMessageClicks: HourlyMessageClicks[];
  timeToFirstOpen: TimingBucket[];
  deliveredToClick: TimingBucket[];
  clickToConvert: TimingBucket[];
}

export const defaultFilters: DashboardFilters = {
  period: '30',
  segment: 'all',
  messageType: 'all',
  platform: 'all',
};

export const filterOptions = {
  period: [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
  ],
  segment: [
    { value: 'all', label: 'All segments' },
    { value: 'new', label: 'New users' },
    { value: 'active', label: 'Active users' },
    { value: 'dormant', label: 'Dormant users' },
  ],
  messageType: [
    { value: 'all', label: 'All message types' },
    { value: 'Promotion', label: 'Promotion' },
    { value: 'Reminder', label: 'Reminder' },
    { value: 'Service', label: 'Service update' },
  ],
  platform: [
    { value: 'all', label: 'All platforms' },
    { value: 'iOS', label: 'iOS' },
    { value: 'Android', label: 'Android' },
  ],
} as const;

export const messages: MessageRecord[] = [
  {
    id: 'renewal',
    name: 'Work pass renewal reminder',
    type: 'Reminder',
    platform: 'iOS',
    segment: 'active',
    sentAt: '2026-08-24',
    deliveredAt: '2026-08-24T09:15:00+08:00',
    hasCTA: true,
    sender: 'Work Pass Division',
    audience: 'Active pass holders',
    status: 'Delivered',
    priority: 'High',
    delivered: 218400,
    exposed: 199760,
    opened: 139832,
    engaged: 120255,
    ctaExposed: 103844,
    clicked: 62306,
    completed: 44860,
    unread: 18564,
    medianReadSeconds: 34,
    frictionRate: 1.8,
    latencyP95: 690,
  },
  {
    id: 'skills-future',
    name: 'SkillsFuture credit update',
    type: 'Service',
    platform: 'Android',
    segment: 'active',
    sentAt: '2026-08-22',
    deliveredAt: '2026-08-22T14:30:00+08:00',
    hasCTA: true,
    sender: 'Skills & Training',
    audience: 'Active account holders',
    status: 'Delivered',
    priority: 'Normal',
    delivered: 184300,
    exposed: 158498,
    opened: 82419,
    engaged: 60166,
    ctaExposed: 51992,
    clicked: 20277,
    completed: 14802,
    unread: 36970,
    medianReadSeconds: 42,
    frictionRate: 2.2,
    latencyP95: 740,
  },
  {
    id: 'career-fair',
    name: 'Career fair invitation',
    type: 'Promotion',
    platform: 'iOS',
    segment: 'new',
    sentAt: '2026-08-20',
    deliveredAt: '2026-08-20T11:00:00+08:00',
    hasCTA: true,
    sender: 'Careers Connect',
    audience: 'New jobseekers',
    status: 'Delivered',
    priority: 'Normal',
    delivered: 126800,
    exposed: 104244,
    opened: 47952,
    engaged: 30689,
    ctaExposed: 26546,
    clicked: 9812,
    completed: 6182,
    unread: 30432,
    medianReadSeconds: 27,
    frictionRate: 2.9,
    latencyP95: 810,
  },
  {
    id: 'levy',
    name: 'Foreign worker levy notice',
    type: 'Reminder',
    platform: 'Android',
    segment: 'active',
    sentAt: '2026-08-18',
    deliveredAt: '2026-08-18T08:00:00+08:00',
    hasCTA: true,
    sender: 'Employer Services',
    audience: 'Registered employers',
    status: 'Delivered',
    priority: 'High',
    delivered: 165200,
    exposed: 151264,
    opened: 105885,
    engaged: 87885,
    ctaExposed: 81436,
    clicked: 47233,
    completed: 38259,
    unread: 14868,
    medianReadSeconds: 38,
    frictionRate: 1.5,
    latencyP95: 665,
  },
  {
    id: 'profile',
    name: 'Complete your profile',
    type: 'Service',
    platform: 'iOS',
    segment: 'new',
    sentAt: '2026-08-16',
    deliveredAt: '2026-08-16T16:45:00+08:00',
    hasCTA: true,
    sender: 'Account Services',
    audience: 'Incomplete profiles',
    status: 'Partially delivered',
    priority: 'Normal',
    delivered: 97200,
    exposed: 76888,
    opened: 34600,
    engaged: 22490,
    ctaExposed: 19384,
    clicked: 6784,
    completed: 3867,
    unread: 29412,
    medianReadSeconds: 23,
    frictionRate: 3.4,
    latencyP95: 920,
  },
  {
    id: 'wage',
    name: 'Progressive wage update',
    type: 'Service',
    platform: 'Android',
    segment: 'dormant',
    sentAt: '2026-08-14',
    deliveredAt: '2026-08-14T10:20:00+08:00',
    hasCTA: false,
    sender: 'Policy Updates',
    audience: 'Dormant users',
    status: 'Delivered',
    priority: 'Low',
    delivered: 148600,
    exposed: 102534,
    opened: 32811,
    engaged: 17390,
    ctaExposed: 0,
    clicked: 0,
    completed: 0,
    unread: 68356,
    medianReadSeconds: 31,
    frictionRate: 3.8,
    latencyP95: 990,
  },
  {
    id: 'seminar',
    name: 'Employment seminar series',
    type: 'Promotion',
    platform: 'Android',
    segment: 'active',
    sentAt: '2026-08-12',
    deliveredAt: '2026-08-12T12:15:00+08:00',
    hasCTA: true,
    sender: 'Careers Connect',
    audience: 'Active jobseekers',
    status: 'Delivered',
    priority: 'Low',
    delivered: 119400,
    exposed: 90744,
    opened: 29946,
    engaged: 16770,
    ctaExposed: 13262,
    clicked: 3448,
    completed: 1862,
    unread: 51342,
    medianReadSeconds: 25,
    frictionRate: 3.1,
    latencyP95: 870,
  },
  {
    id: 'expiry',
    name: 'Document expiry alert',
    type: 'Reminder',
    platform: 'iOS',
    segment: 'dormant',
    sentAt: '2026-08-10',
    deliveredAt: '2026-08-10T07:30:00+08:00',
    hasCTA: true,
    sender: 'Work Pass Division',
    audience: 'Expiring document holders',
    status: 'Delivered',
    priority: 'High',
    delivered: 139800,
    exposed: 118830,
    opened: 70110,
    engaged: 55487,
    ctaExposed: 48277,
    clicked: 24139,
    completed: 17139,
    unread: 27960,
    medianReadSeconds: 36,
    frictionRate: 2.5,
    latencyP95: 760,
  },
  {
    id: 'survey',
    name: 'Inbox experience survey',
    type: 'Promotion',
    platform: 'iOS',
    segment: 'active',
    sentAt: '2026-08-08',
    deliveredAt: '2026-08-08T18:00:00+08:00',
    hasCTA: true,
    sender: 'Product Research',
    audience: 'Frequent inbox users',
    status: 'Delivered',
    priority: 'Low',
    delivered: 87600,
    exposed: 68766,
    opened: 21317,
    engaged: 12151,
    ctaExposed: 9237,
    clicked: 2125,
    completed: 1391,
    unread: 35040,
    medianReadSeconds: 19,
    frictionRate: 2.1,
    latencyP95: 710,
  },
  {
    id: 'employer',
    name: 'Employer services digest',
    type: 'Service',
    platform: 'Android',
    segment: 'dormant',
    sentAt: '2026-08-05',
    deliveredAt: '2026-08-05T09:45:00+08:00',
    hasCTA: false,
    sender: 'Employer Services',
    audience: 'Dormant employers',
    status: 'Delivered',
    priority: 'Normal',
    delivered: 105400,
    exposed: 70618,
    opened: 19067,
    engaged: 9724,
    ctaExposed: 0,
    clicked: 0,
    completed: 0,
    unread: 49538,
    medianReadSeconds: 29,
    frictionRate: 4.1,
    latencyP95: 1040,
  },
  {
    id: 'onboarding',
    name: 'Welcome to your inbox',
    type: 'Service',
    platform: 'iOS',
    segment: 'new',
    sentAt: '2026-08-02',
    deliveredAt: '2026-08-02T13:10:00+08:00',
    hasCTA: true,
    sender: 'Account Services',
    audience: 'New account holders',
    status: 'Delivered',
    priority: 'Normal',
    delivered: 74400,
    exposed: 68076,
    opened: 50376,
    engaged: 42316,
    ctaExposed: 37782,
    clicked: 21536,
    completed: 16367,
    unread: 6696,
    medianReadSeconds: 32,
    frictionRate: 1.3,
    latencyP95: 620,
  },
  {
    id: 'benefit',
    name: 'New workplace benefit',
    type: 'Promotion',
    platform: 'Android',
    segment: 'new',
    sentAt: '2026-07-29',
    deliveredAt: '2026-07-29T15:30:00+08:00',
    hasCTA: true,
    sender: 'Workplace Programmes',
    audience: 'New employees',
    status: 'Delivered',
    priority: 'Normal',
    delivered: 92100,
    exposed: 69075,
    opened: 24867,
    engaged: 13926,
    ctaExposed: 11576,
    clicked: 3010,
    completed: 1866,
    unread: 37761,
    medianReadSeconds: 24,
    frictionRate: 2.7,
    latencyP95: 840,
  },
];

const hourLabels = Array.from(
  { length: 24 },
  (_, hour) => (hour % 12 || 12) + (hour < 12 ? 'am' : 'pm'),
);
const hourlyShape = [
  2, 1, 1, 1, 1, 2, 4, 8, 13, 16, 14, 11, 10, 10, 11, 13, 16, 19, 21, 18, 13, 9, 6, 4,
];

function distribute(total: number, labels: string[], weights: number[]): TimingBucket[] {
  if (total <= 0) return labels.map((label) => ({ label, value: 0 }));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const values = weights.map((weight) => Math.floor((total * weight) / weightTotal));
  let remainder = total - values.reduce((sum, value) => sum + value, 0);
  let index = 0;
  while (remainder > 0) {
    values[index % values.length] += 1;
    remainder -= 1;
    index += 1;
  }
  return labels.map((label, bucketIndex) => ({ label, value: values[bucketIndex] }));
}

function buildTimingProfile(message: MessageRecord, seed: number): MessageTimingProfile {
  const shiftedShape = hourlyShape.map(
    (_, index) => hourlyShape[(index + seed) % hourlyShape.length],
  );
  const hourly = distribute(message.opened, hourLabels, shiftedShape);
  const openedTiming = distribute(
    message.opened,
    ['<1h', '1–6h', '6–24h', '1–3d', '3–7d', '>7d'],
    [31 + seed, 22, 20, 12, 6, 2],
  );
  const firstOpen = [
    ...openedTiming,
    { label: 'Never', value: Math.max(0, message.delivered - message.opened) },
  ];
  const converted = distribute(
    message.completed,
    ['<1m', '1–5m', '5–15m', '15–30m', '30–60m', '>1h'],
    [9, 24 + seed, 31, 18, 10, 8],
  );
  return {
    hourlyMessageClicks: hourly.map((bucket) => ({ hour: bucket.label, clicks: bucket.value })),
    timeToFirstOpen: firstOpen,
    deliveredToClick: openedTiming,
    clickToConvert: [
      ...converted,
      { label: 'Not converted', value: Math.max(0, message.clicked - message.completed) },
    ],
  };
}

export const messageTimings: Record<string, MessageTimingProfile> = Object.fromEntries(
  messages.map((message, index) => [message.id, buildTimingProfile(message, (index % 4) + 1)]),
);

export const trendPoints = [
  { day: '27 Jul', reach: 63, open: 34, engaged: 58, sessions: 372 },
  { day: '30 Jul', reach: 65, open: 35, engaged: 59, sessions: 389 },
  { day: '2 Aug', reach: 64, open: 34, engaged: 60, sessions: 381 },
  { day: '5 Aug', reach: 67, open: 36, engaged: 61, sessions: 407 },
  { day: '8 Aug', reach: 66, open: 35, engaged: 60, sessions: 412 },
  { day: '11 Aug', reach: 69, open: 37, engaged: 62, sessions: 430 },
  { day: '14 Aug', reach: 71, open: 38, engaged: 63, sessions: 446 },
  { day: '17 Aug', reach: 70, open: 37, engaged: 62, sessions: 451 },
  { day: '20 Aug', reach: 72, open: 39, engaged: 64, sessions: 467 },
  { day: '23 Aug', reach: 74, open: 40, engaged: 66, sessions: 481 },
  { day: '25 Aug', reach: 71.4, open: 38.1, engaged: 64.2, sessions: 482 },
];

export const timeToOpen = [
  { label: '< 1 hour', value: 31 },
  { label: '1–6 hours', value: 22 },
  { label: '6–24 hours', value: 20 },
  { label: '1–3 days', value: 12 },
  { label: '3–7 days', value: 6 },
  { label: '> 7 days', value: 2 },
  { label: 'Never', value: 7 },
];

export const scrollDepth = [
  { label: '0–25%', value: 18 },
  { label: '25–50%', value: 21 },
  { label: '50–75%', value: 24 },
  { label: '75–100%', value: 37 },
];

export const positionPerformance = [
  { position: '#1', exposure: 98, open: 43 },
  { position: '#2', exposure: 94, open: 31 },
  { position: '#3', exposure: 87, open: 24 },
  { position: '#4–5', exposure: 72, open: 17 },
  { position: '#6–10', exposure: 43, open: 9 },
  { position: '>10', exposure: 18, open: 3 },
];

export const segmentRows = [
  { name: 'New users', reach: 78, open: 49, cta: 34, conversion: 22, users: '142K', trend: 6.2 },
  { name: 'Active users', reach: 91, open: 61, cta: 42, conversion: 31, users: '281K', trend: 3.8 },
  { name: 'Dormant users', reach: 43, open: 18, cta: 9, conversion: 4, users: '59K', trend: -2.4 },
  { name: 'iOS', reach: 76, open: 44, cta: 31, conversion: 21, users: '255K', trend: 4.1 },
  { name: 'Android', reach: 67, open: 33, cta: 24, conversion: 13, users: '227K', trend: 2.6 },
  { name: 'App v4.8+', reach: 84, open: 52, cta: 37, conversion: 26, users: '319K', trend: 5.4 },
];

export const frictionSignals = [
  { name: 'CTA destination failure', share: 37, sessions: 6240, severity: 'High' },
  { name: 'Repeated click', share: 26, sessions: 4384, severity: 'Medium' },
  { name: 'Loading > 3 seconds', share: 18, sessions: 3035, severity: 'High' },
  { name: 'Immediate back', share: 12, sessions: 2023, severity: 'Medium' },
  { name: 'Dead click / other', share: 7, sessions: 1180, severity: 'Low' },
];
