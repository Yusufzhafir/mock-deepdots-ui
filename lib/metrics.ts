import {
  DashboardFilters,
  MessageRecord,
  MessageType,
  Period,
  Platform,
  Segment,
  defaultFilters,
} from './data';

const periods: Period[] = ['7', '30', '90'];
const segments: Segment[] = ['all', 'new', 'active', 'dormant'];
const messageTypes: MessageType[] = ['all', 'Promotion', 'Reminder', 'Service'];
const platforms: Platform[] = ['all', 'iOS', 'Android'];

export function safeRate(numerator: number, denominator: number) {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

export function parseFilters(params: URLSearchParams): DashboardFilters {
  const period = params.get('period') as Period;
  const segment = params.get('segment') as Segment;
  const messageType = params.get('type') as MessageType;
  const platform = params.get('platform') as Platform;
  return {
    period: periods.includes(period) ? period : defaultFilters.period,
    segment: segments.includes(segment) ? segment : defaultFilters.segment,
    messageType: messageTypes.includes(messageType) ? messageType : defaultFilters.messageType,
    platform: platforms.includes(platform) ? platform : defaultFilters.platform,
  };
}

export function filtersToQuery(filters: DashboardFilters) {
  const params = new URLSearchParams();
  if (filters.period !== defaultFilters.period) params.set('period', filters.period);
  if (filters.segment !== 'all') params.set('segment', filters.segment);
  if (filters.messageType !== 'all') params.set('type', filters.messageType);
  if (filters.platform !== 'all') params.set('platform', filters.platform);
  return params.toString();
}

export function filterMessages(records: MessageRecord[], filters: DashboardFilters) {
  return records.filter((record) =>
    (filters.segment === 'all' || record.segment === filters.segment) &&
    (filters.messageType === 'all' || record.type === filters.messageType) &&
    (filters.platform === 'all' || record.platform === filters.platform)
  );
}

const periodFactors: Record<Period, number> = { '7': 0.27, '30': 1, '90': 2.78 };

export function aggregateMetrics(records: MessageRecord[], period: Period) {
  const factor = periodFactors[period];
  const sum = (key: keyof MessageRecord) =>
    Math.round(records.reduce((total, record) => total + Number(record[key]), 0) * factor);
  const delivered = sum('delivered');
  const exposed = sum('exposed');
  const opened = sum('opened');
  const engaged = sum('engaged');
  const ctaExposed = sum('ctaExposed');
  const clicked = sum('clicked');
  const completed = sum('completed');
  const unread = sum('unread');
  const ctaEligible = records.filter((record) => record.hasCTA);
  const ctaEligibleOpened = Math.round(
    ctaEligible.reduce((total, record) => total + record.opened, 0) * factor
  );
  const ctaEligibleClicked = Math.round(
    ctaEligible.reduce((total, record) => total + record.clicked, 0) * factor
  );
  return {
    delivered, exposed, opened, engaged, ctaExposed, clicked, completed, unread,
    ctaEligibleOpened, ctaEligibleClicked,
    engagementRate: safeRate(opened, delivered),
    ctaConversionFromOpens: safeRate(ctaEligibleClicked, ctaEligibleOpened),
    exposureRate: safeRate(exposed, delivered),
    openRate: safeRate(opened, exposed),
    engagedRate: safeRate(engaged, opened),
    ctaExposureRate: safeRate(ctaExposed, opened),
    ctaRate: safeRate(clicked, ctaExposed),
    conversionRate: safeRate(completed, clicked),
    endToEndRate: safeRate(completed, delivered),
    unreadRate: safeRate(unread, delivered),
  };
}

export function topMessagesByEngagement(records: MessageRecord[], limit = 5) {
  return [...records]
    .sort((left, right) => {
      const rateDifference = safeRate(right.opened, right.delivered) - safeRate(left.opened, left.delivered);
      return rateDifference || right.delivered - left.delivered || left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}

export function getMessageById(records: MessageRecord[], id: string) {
  return records.find((record) => record.id === id);
}

export function formatSingaporeDateTime(value: string) {
  return new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat('en', { notation:'compact', maximumFractionDigits:1 }).format(value);
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

export function weightedAverage(records: MessageRecord[], key: 'medianReadSeconds' | 'frictionRate' | 'latencyP95') {
  if (!records.length) return 0;
  const totalWeight = records.reduce((total, record) => total + record.opened, 0);
  if (!totalWeight) return 0;
  return records.reduce((total, record) => total + record[key] * record.opened, 0) / totalWeight;
}
