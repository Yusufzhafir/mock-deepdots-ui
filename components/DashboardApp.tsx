'use client';

import { useMemo, useState, useTransition } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronDown,
  Clock3,
  Eye,
  Filter,
  Inbox,
  Info,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  MousePointerClick,
  Route,
  Search,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DashboardFilters,
  MessageRecord,
  Period,
  SendTimeOpenRate,
  TimingBucket,
  filterOptions,
  messages,
  messageTimings,
  scrollDepth,
  sendTimeDays,
  timeToOpen,
} from '../lib/data';
import {
  aggregateMetrics,
  aggregateSendTimeOpenRates,
  aggregateTimingBuckets,
  bestSendTime,
  filterMessages,
  filtersToQuery,
  formatCompact,
  formatPercent,
  formatSingaporeDateTime,
  getMessageById,
  isTimingBaseSufficient,
  medianTimingBucket,
  parseFilters,
  safeRate,
  topMessagesByEngagement,
  timingBucketTotal,
  weightedAverage,
} from '../lib/metrics';

export type DashboardSection = 'overview' | 'messages' | 'message-detail' | 'behaviour' | 'journey';

const primaryNavItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/messages', label: 'Delivered Messages', icon: MessageSquareText },
];

const analyticsNavItems = [
  { href: '/behaviour', label: 'Behaviour', icon: BarChart3 },
  { href: '/journey', label: 'Action journey', icon: Route },
];

const sectionCopy = {
  overview: [
    'Inbox intelligence',
    'Message Inbox Analytics',
    'Understand whether people notice, read and act on your messages.',
  ],
  messages: [
    'Delivery history',
    'Delivered Messages',
    'Review every message delivery and open its individual performance record.',
  ],
  'message-detail': [
    'Message diagnostics',
    'Individual message performance',
    'See when this message was opened and how quickly people acted.',
  ],
  behaviour: [
    'Consumption signals',
    'Reading behaviour',
    'See how people consume content, where they stop, and whether they reach the CTA.',
  ],
  journey: [
    'Message-level action path',
    'Action journey',
    'Inspect one message at a time. The journey is complete when its CTA is clicked.',
  ],
} as const;

const tooltipStyle = {
  border: '1px solid #e4e8f0',
  borderRadius: 10,
  fontSize: 11,
  boxShadow: '0 12px 32px rgba(34,49,79,.12)',
};

function Panel({
  title,
  eyebrow,
  action,
  className = '',
  children,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <article className={'panel ' + className}>
      <div className="panel-head">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </article>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Filter size={20} />
      </div>
      <h3>No matching data</h3>
      <p>Try widening one of the filters above.</p>
    </div>
  );
}

function Filters({
  filters,
  onChange,
  isPending,
}: {
  filters: DashboardFilters;
  onChange: (key: keyof DashboardFilters, value: string) => void;
  isPending: boolean;
}) {
  const fields = [
    ['period', 'Period', filterOptions.period],
    ['messageType', 'Message type', filterOptions.messageType],
    ['platform', 'Platform', filterOptions.platform],
  ] as const;
  return (
    <section className={'filters ' + (isPending ? 'pending' : '')} aria-label="Dashboard filters">
      {fields.map(([key, label, options]) => (
        <label key={key}>
          {label}
          <span className="select-wrap">
            <select
              value={filters[key]}
              onChange={(event) => onChange(key, event.target.value)}
              aria-label={label}
            >
              {options.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </span>
        </label>
      ))}
      <span className="updated">
        <span className="live-dot" />
        Updated 8 min ago
      </span>
    </section>
  );
}

function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  note,
  favourable,
  definition = 'Calculated from the selected reporting period.',
  totalCount,
  uniqueUsers,
}: {
  label: string;
  value: string;
  delta: number;
  icon: typeof Eye;
  note?: string;
  favourable?: boolean;
  definition?: string;
  totalCount?: number;
  uniqueUsers?: number;
}) {
  const positive = delta >= 0;
  const improved = favourable ?? positive;
  return (
    <article className="kpi-card metric-with-hover" tabIndex={0}>
      <div className="kpi-label">
        <span>{label}</span>
        <span className="kpi-icon">
          <Icon size={15} />
        </span>
      </div>
      <strong>{value}</strong>
      <p>
        <span className={improved ? 'delta up' : 'delta down'}>
          {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(delta).toFixed(1)}%
        </span>
        {note || 'vs previous period'}
      </p>
      <div className="metric-hover-card" role="tooltip">
        <span className="metric-hover-title">
          <Info size={13} />
          How this is calculated
        </span>
        <p>{definition}</p>
        {(totalCount !== undefined || uniqueUsers !== undefined) && (
          <div className="metric-hover-counts">
            {totalCount !== undefined && (
              <span>
                <small>Absolute total</small>
                <strong>{formatAbsolute(totalCount)}</strong>
              </span>
            )}
            {uniqueUsers !== undefined && (
              <span>
                <small>Unique users</small>
                <strong>{formatAbsolute(uniqueUsers)}</strong>
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function MetricDetailCard({
  label,
  value,
  note,
  definition,
  totalCount,
  uniqueUsers,
}: {
  label: string;
  value: string;
  note: string;
  definition: string;
  totalCount?: number;
  uniqueUsers?: number;
}) {
  return (
    <article className="metric-with-hover" tabIndex={0}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
      <div className="metric-hover-card" role="tooltip">
        <span className="metric-hover-title">
          <Info size={13} />
          How this is calculated
        </span>
        <p>{definition}</p>
        {(totalCount !== undefined || uniqueUsers !== undefined) && (
          <div className="metric-hover-counts">
            {totalCount !== undefined && (
              <span>
                <small>Absolute total</small>
                <strong>{formatAbsolute(totalCount)}</strong>
              </span>
            )}
            {uniqueUsers !== undefined && (
              <span>
                <small>Unique users</small>
                <strong>{formatAbsolute(uniqueUsers)}</strong>
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function formatAbsolute(value: number) {
  return new Intl.NumberFormat('en-SG').format(value);
}

function estimatedTotalEvents(uniqueUsers: number, repeatFactor: number) {
  return Math.round(uniqueUsers * repeatFactor);
}

function messageSignal(record: MessageRecord) {
  return record.priority === 'High' ? 'Important' : 'Null';
}

function TimingBarList({
  data,
  base,
  tone,
}: {
  data: TimingBucket[];
  base: number;
  tone: 'open' | 'action';
}) {
  const peak = Math.max(...data.map((bucket) => bucket.value), 1);
  return (
    <div className={'timing-bars ' + tone}>
      {data.map((bucket) => {
        const share = safeRate(bucket.value, base);
        return (
          <div className="timing-bar-row" key={bucket.label}>
            <span>{bucket.label}</span>
            <div className="timing-bar-track" aria-hidden="true">
              <i style={{ width: `${(bucket.value / peak) * 100}%` }} />
            </div>
            <strong>{formatPercent(share)}</strong>
          </div>
        );
      })}
    </div>
  );
}

function TimingEmptyState({ type }: { type: 'no-action' | 'thin-base' }) {
  const noAction = type === 'no-action';
  return (
    <div className="timing-empty">
      <MousePointerClick size={20} />
      <strong>{noAction ? 'No action button' : 'Not enough data'}</strong>
      <span>
        {noAction
          ? 'The selected messages do not have an eligible action-click journey.'
          : 'At least 50 opened recipients are required to show this distribution.'}
      </span>
    </div>
  );
}

function SendTimeHeatmap({ cells }: { cells: SendTimeOpenRate[] }) {
  const best = bestSendTime(cells);
  const maximum = Math.max(...cells.map((cell) => cell.openRate), 1);
  const hours = cells.filter((cell) => cell.day === sendTimeDays[0]).map((cell) => cell.hour);
  const readableHour = (hour: string) => {
    if (/^(1[0-2]|[1-9])(am|pm)$/.test(hour)) return hour;
    const numericHour = Number(hour.replace(':00', ''));
    if (numericHour === 0) return '12am';
    if (numericHour === 12) return '12pm';
    return numericHour > 12 ? `${numericHour - 12}pm` : `${numericHour}am`;
  };
  return (
    <div className="heatmap-wrap">
      <div
        className="heatmap-grid"
        style={{ gridTemplateColumns: `42px repeat(${hours.length}, 1fr)` }}
      >
        <span />
        {hours.map((hour, index) => (
          <span className="heatmap-hour" key={hour}>
            {index % 3 === 0 ? readableHour(hour) : ''}
          </span>
        ))}
        {sendTimeDays.map((day) => (
          <div className="heatmap-row" key={day}>
            <strong>{day}</strong>
            {hours.map((hour) => {
              const cell = cells.find(
                (candidate) => candidate.day === day && candidate.hour === hour,
              )!;
              const isBest = best?.day === day && best.hour === hour;
              const label = `${day} ${readableHour(hour)}: ${formatPercent(cell.openRate)} open rate`;
              return (
                <span
                  className={'heatmap-cell ' + (isBest ? 'best' : '')}
                  key={hour}
                  role="img"
                  aria-label={label}
                  title={label}
                  style={{
                    backgroundColor: `rgba(57, 118, 232, ${0.1 + (cell.openRate / maximum) * 0.8})`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      {best && (
        <p className="heatmap-best">
          <Sparkles size={14} />
          Best window:{' '}
          <strong>
            {best.day} at {readableHour(best.hour)}
          </strong>{' '}
          · {formatPercent(best.openRate)} weighted open rate
        </p>
      )}
    </div>
  );
}

function Overview({
  records,
  query,
  period,
}: {
  records: MessageRecord[];
  query: string;
  period: Period;
}) {
  const metrics = aggregateMetrics(records, period);
  if (!records.length) return <EmptyState />;
  const best = topMessagesByEngagement(records);
  const openBuckets = aggregateTimingBuckets(records, 'timeToFirstOpen', period);
  const actionBuckets = aggregateTimingBuckets(records, 'openToActionClick', period);
  const deliveredBase = timingBucketTotal(openBuckets);
  const actionBase = timingBucketTotal(actionBuckets);
  const hasActionButton = records.some((record) => record.hasCTA);
  const actionTimingAvailable = isTimingBaseSufficient(actionBase);
  const heatmapCells = aggregateSendTimeOpenRates(records);
  return (
    <>
      <section className="kpi-grid overview-kpis" aria-label="Inbox overview metrics">
        <StatCard
          label="Delivered Messages"
          value={formatCompact(metrics.delivered)}
          delta={5.8}
          icon={Inbox}
          note={formatPercent(metrics.exposureRate) + ' active-user reach'}
          definition="All message deliveries recorded in the selected period. A person can receive more than one message."
          totalCount={metrics.delivered}
          uniqueUsers={Math.round(metrics.delivered * 0.81)}
        />
        <StatCard
          label="Engagement Rate"
          value={formatPercent(metrics.engagementRate)}
          delta={4.2}
          icon={Eye}
          note="unique opens ÷ delivered"
          definition="Unique users who opened a delivered message, divided by all delivered messages."
          totalCount={estimatedTotalEvents(metrics.opened, 1.24)}
          uniqueUsers={metrics.opened}
        />
        <StatCard
          label="Median time to open"
          value={medianTimingBucket(openBuckets, 'Never')}
          delta={-8.6}
          favourable
          icon={Clock3}
          note="among recipients who opened"
          definition="The median bucket from delivery to a user’s first open. Users who never opened are excluded from the median."
          totalCount={estimatedTotalEvents(metrics.opened, 1.24)}
          uniqueUsers={metrics.opened}
        />
        <StatCard
          label="Median open to action click"
          value={
            !hasActionButton
              ? 'No action button'
              : actionTimingAvailable
                ? medianTimingBucket(actionBuckets, 'Never clicked')
                : 'Not enough data'
          }
          delta={-5.1}
          favourable
          icon={MousePointerClick}
          note="among recipients who action-clicked"
          definition="The median duration from a user’s first open to their first CTA click, for messages that contain a CTA."
          totalCount={estimatedTotalEvents(metrics.clicked, 1.18)}
          uniqueUsers={metrics.clicked}
        />
      </section>
      <section className="timing-grid" aria-label="Message timing distributions">
        <Panel title="Time to first open" eyebrow="Delivered → first open · blue">
          <TimingBarList data={openBuckets} base={deliveredBase} tone="open" />
          <p className="panel-note">
            <Clock3 size={14} />
            Percent of delivered recipients; “Never” keeps unopened recipients visible.
          </p>
        </Panel>
        <Panel title="Time from open to action click" eyebrow="Open → action click · orange">
          {!hasActionButton ? (
            <TimingEmptyState type="no-action" />
          ) : !actionTimingAvailable ? (
            <TimingEmptyState type="thin-base" />
          ) : (
            <>
              <TimingBarList data={actionBuckets} base={actionBase} tone="action" />
              <p className="panel-note action-note">
                <MousePointerClick size={14} />
                Percent of opened recipients on CTA-bearing messages; timing starts at first open.
              </p>
            </>
          )}
        </Panel>
      </section>
      <Panel
        title="Best time to send"
        eyebrow="Day × hour weighted open rate · Singapore time"
        className="heatmap-panel"
      >
        <SendTimeHeatmap cells={heatmapCells} />
      </Panel>
      <Panel
        title="Top 5 Message Performance"
        eyebrow="Ranked by engagement rate"
        className="ranking-panel"
        action={
          <Link className="text-link" to={'/messages' + (query ? '?' + query : '')}>
            View delivery history
          </Link>
        }
      >
        <div className="ranking-head">
          <span>Rank & message</span>
          <span>Delivered</span>
          <span>Engagement</span>
          <span>CTA click rate</span>
        </div>
        <div className="ranking-list">
          {best.map((record, index) => {
            const detailHref = '/messages/' + record.id + (query ? '?' + query : '');
            return (
              <Link className="ranking-row" to={detailHref} key={record.id}>
                <span className="rank-message">
                  <b>{index + 1}</b>
                  <i className={'message-icon ' + record.type.toLowerCase()}>
                    <MessageSquareText size={14} />
                  </i>
                  <span>
                    <strong>{record.name}</strong>
                    <small>
                      {record.sender} · {record.type}
                    </small>
                  </span>
                </span>
                <span>{formatCompact(record.delivered)}</span>
                <strong>{formatPercent(safeRate(record.opened, record.delivered))}</strong>
                <span className={record.hasCTA ? 'conversion-cell' : 'no-cta'}>
                  {record.hasCTA
                    ? formatPercent(safeRate(record.clicked, record.opened))
                    : 'No action button'}
                </span>
              </Link>
            );
          })}
        </div>
        <p className="definition-note">
          Engagement is unique opens ÷ delivered. CTA click rate includes only messages with a CTA
          and uses unique opens as its denominator.
        </p>
      </Panel>
    </>
  );
}

type SortKey = 'newest' | 'delivered' | 'engagement' | 'ctaConversion';

function MessagesPage({
  records,
  filtersQuery,
}: {
  records: MessageRecord[];
  filtersQuery: string;
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const rows = useMemo(
    () =>
      records
        .filter((record) =>
          [record.name, record.sender].some((value) =>
            value.toLowerCase().includes(search.toLowerCase()),
          ),
        )
        .map((record) => ({
          ...record,
          engagement: safeRate(record.opened, record.delivered),
          ctaConversion: record.hasCTA ? safeRate(record.clicked, record.opened) : -1,
        }))
        .sort((left, right) => {
          if (sort === 'newest')
            return new Date(right.deliveredAt).getTime() - new Date(left.deliveredAt).getTime();
          return Number(right[sort]) - Number(left[sort]);
        }),
    [records, search, sort],
  );
  return (
    <Panel
      title="Delivery history"
      eyebrow="Newest messages first"
      className="table-panel"
      action={<span className="record-count">{rows.length} messages</span>}
    >
      <div className="table-tools">
        <label className="search-box">
          <Search size={15} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search messages or senders"
            aria-label="Search delivered messages"
          />
        </label>
        <label className="sort-control">
          Sort by
          <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="newest">Newest delivered</option>
            <option value="delivered">Delivery volume</option>
            <option value="engagement">Engagement</option>
            <option value="ctaConversion">CTA click rate</option>
          </select>
        </label>
      </div>
      {!rows.length ? (
        <EmptyState />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Delivered at</th>
                <th>Message</th>
                <th>Message signal</th>
                <th>Delivered</th>
                <th>Engagement</th>
                <th>CTA click rate</th>
                <th>CTA</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((record) => {
                const href = '/messages/' + record.id + (filtersQuery ? '?' + filtersQuery : '');
                return (
                  <tr key={record.id}>
                    <td>
                      <Link className="table-row-link delivered-time" to={href}>
                        {formatSingaporeDateTime(record.deliveredAt)}
                        <small>Singapore time</small>
                      </Link>
                    </td>
                    <td>
                      <Link className="table-row-link message-cell" to={href}>
                        <span className={'message-icon ' + record.type.toLowerCase()}>
                          <MessageSquareText size={14} />
                        </span>
                        <span>
                          <strong>{record.name}</strong>
                          <small>
                            {record.sender} · {record.type}
                          </small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <Link className="table-row-link" to={href}>
                        <span className={'signal-badge ' + messageSignal(record).toLowerCase()}>
                          {messageSignal(record)}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <Link className="table-row-link table-metric" to={href}>
                        {formatCompact(record.delivered)}
                        <small>{formatAbsolute(record.delivered)} total</small>
                      </Link>
                    </td>
                    <td>
                      <Link className="table-row-link table-metric" to={href}>
                        <strong>{formatPercent(record.engagement)}</strong>
                        <small>{formatAbsolute(record.opened)} unique users</small>
                      </Link>
                    </td>
                    <td>
                      <Link className="table-row-link table-metric" to={href}>
                        {record.hasCTA ? (
                          <>
                            <span className="conversion-cell">
                              {formatPercent(record.ctaConversion)}
                            </span>
                            <small>{formatAbsolute(record.clicked)} unique users</small>
                          </>
                        ) : (
                          <span className="no-cta">No action button</span>
                        )}
                      </Link>
                    </td>
                    <td>
                      <Link className="table-row-link" to={href}>
                        {record.hasCTA ? (
                          <span className="cta-yes">Available</span>
                        ) : (
                          <span className="no-cta">No action button</span>
                        )}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="definition-strip">
        <span>
          <i className="legend-dot blue" />
          Engagement uses unique opens ÷ delivered messages.
        </span>
        <span>
          <i className="legend-dot green" />
          CTA-less messages are excluded from CTA conversion.
        </span>
      </div>
    </Panel>
  );
}

function DistributionChart({
  data,
  color = '#4d80df',
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  return (
    <div className="chart-medium">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#eef1f5" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9, fill: '#7f899b' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9, fill: '#9aa2b0' }}
            tickFormatter={formatCompact}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => formatCompact(Number(value))}
          />
          <Bar dataKey="value" fill={color} radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MessageDetailPage({ record, query }: { record: MessageRecord; query: string }) {
  const timing = messageTimings[record.id];
  const backHref = '/messages' + (query ? '?' + query : '');
  return (
    <>
      <Link className="back-link" to={backHref}>
        <ArrowLeft size={14} />
        Back to Delivered Messages
      </Link>
      <section className="message-hero">
        <div>
          <div className="message-badges">
            <span className={'signal-badge ' + messageSignal(record).toLowerCase()}>
              {messageSignal(record)} signal
            </span>
            <span className="soft-badge">{record.type}</span>
          </div>
          <h2>{record.name}</h2>
          <p>Sent by {record.sender}</p>
        </div>
        <div className="delivery-stamp">
          <small>Delivered</small>
          <strong>{formatSingaporeDateTime(record.deliveredAt)}</strong>
          <span>Singapore time</span>
        </div>
      </section>
      <section className="detail-kpis" aria-label="Message performance metrics">
        <MetricDetailCard
          label="Delivered volume"
          value={formatCompact(record.delivered)}
          note={`${record.platform} delivery events`}
          definition="All deliveries recorded for this message. Unique recipients are de-duplicated by user ID."
          totalCount={record.delivered}
          uniqueUsers={Math.round(record.delivered * 0.81)}
        />
        <MetricDetailCard
          label="Engagement Rate"
          value={formatPercent(safeRate(record.opened, record.delivered))}
          note={`${formatCompact(record.opened)} unique opens`}
          definition="Unique users who opened this message divided by all delivery events."
          totalCount={estimatedTotalEvents(record.opened, 1.24)}
          uniqueUsers={record.opened}
        />
        <MetricDetailCard
          label="CTA click rate"
          value={
            record.hasCTA
              ? formatPercent(safeRate(record.clicked, record.opened))
              : 'No action button'
          }
          note={
            record.hasCTA
              ? formatCompact(record.clicked) + ' unique clickers ÷ unique opens'
              : 'Excluded from CTA metrics'
          }
          definition="Unique users who clicked the CTA divided by unique users who opened this CTA-bearing message."
          totalCount={record.hasCTA ? estimatedTotalEvents(record.clicked, 1.18) : 0}
          uniqueUsers={record.hasCTA ? record.clicked : 0}
        />
        <MetricDetailCard
          label="Median time to first open"
          value={medianTimingBucket(timing.timeToFirstOpen, 'Never')}
          note="Among messages that were opened"
          definition="The median duration from delivery to each user’s first open. Users who never opened are excluded."
          totalCount={estimatedTotalEvents(record.opened, 1.24)}
          uniqueUsers={record.opened}
        />
      </section>
      <section className="detail-grid">
        <Panel
          title="Time to first open"
          eyebrow="Delivered → first open"
          className="wide-detail-chart"
        >
          <TimingBarList data={timing.timeToFirstOpen} base={record.delivered} tone="open" />
          <p className="panel-note">
            <Clock3 size={14} />
            Percent of delivered recipients; “Never” keeps unopened recipients visible.
          </p>
        </Panel>
        <Panel
          title="Message opens by hour"
          eyebrow="24-hour activity · Singapore time"
          className="wide-detail-chart"
        >
          <div className="chart-medium">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={timing.hourlyOpens}
                margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={'hourly-' + record.id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3976e8" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#3976e8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#eef1f5" />
                <XAxis
                  dataKey="hour"
                  interval={2}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 8, fill: '#8791a2' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fill: '#9aa2b0' }}
                  tickFormatter={formatCompact}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [formatCompact(Number(value)), 'Message opens']}
                />
                <Area
                  type="monotone"
                  dataKey="opens"
                  stroke="#3976e8"
                  strokeWidth={2}
                  fill={'url(#hourly-' + record.id + ')'}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Time from open to action click" eyebrow="Open → action click">
          {!record.hasCTA ? (
            <TimingEmptyState type="no-action" />
          ) : !isTimingBaseSufficient(record.opened) ? (
            <TimingEmptyState type="thin-base" />
          ) : (
            <>
              <TimingBarList data={timing.openToActionClick} base={record.opened} tone="action" />
              <p className="panel-note action-note">
                <MousePointerClick size={14} />
                Percent of opened recipients; “Never clicked” is eligible opens minus action clicks.
              </p>
            </>
          )}
        </Panel>
        <Panel title="Click to conversion" eyebrow="Last qualifying CTA click → nearest conversion">
          {record.hasCTA ? (
            <DistributionChart data={timing.clickToConvert} color="#7569d8" />
          ) : (
            <div className="chart-empty">
              <MousePointerClick size={20} />
              <strong>No action button</strong>
              <span>This message has no click-to-conversion journey.</span>
            </div>
          )}
          {record.hasCTA && (
            <p className="panel-note">
              <Target size={14} />
              A conversion is attributed to the user’s last CTA click before the nearest qualifying
              conversion. {formatAbsolute(record.completed)} unique conversions are linked from{' '}
              {formatAbsolute(record.clicked)} unique clickers.
            </p>
          )}
        </Panel>
      </section>
    </>
  );
}

function BehaviourPage({ records }: { records: MessageRecord[] }) {
  if (!records.length) return <EmptyState />;
  const readTime = weightedAverage(records, 'medianReadSeconds');
  const metrics = aggregateMetrics(records, '30');
  const fullScrollWithoutClick = Math.round((metrics.opened - metrics.clicked) * 0.37);
  const completedUsers = Math.min(metrics.opened, metrics.clicked + fullScrollWithoutClick);
  const completion = safeRate(completedUsers, metrics.opened);
  const repeatOpen = Math.min(34, 18 + records.length * 0.9);
  return (
    <>
      <section className="metric-strip">
        <StatCard
          label="Median reading time"
          value={Math.round(readTime) + 's'}
          delta={6.4}
          icon={Clock3}
          definition="The median active reading duration across unique users who opened a message."
          totalCount={estimatedTotalEvents(metrics.opened, 1.24)}
          uniqueUsers={metrics.opened}
        />
        <StatCard
          label="Content completion"
          value={formatPercent(completion)}
          delta={4.8}
          icon={Target}
          note="CTA click or 100% scroll"
          definition="A user completes the content when they click its CTA or reach 100% scroll. Users meeting both conditions count once."
          totalCount={estimatedTotalEvents(completedUsers, 1.11)}
          uniqueUsers={completedUsers}
        />
        <StatCard
          label="Repeat open rate"
          value={formatPercent(repeatOpen)}
          delta={1.7}
          icon={Eye}
          definition="Unique users who reopened a message divided by unique users who opened it at least once."
          totalCount={estimatedTotalEvents(Math.round((repeatOpen / 100) * metrics.opened), 1.42)}
          uniqueUsers={Math.round((repeatOpen / 100) * metrics.opened)}
        />
      </section>
      <section className="two-column-grid">
        <Panel title="Scroll depth distribution" eyebrow="All opened messages">
          <div className="chart-medium">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scrollDepth} margin={{ top: 10, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eef1f5" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#7f899b' }}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#9aa2b0' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                  {scrollDepth.map((_, index) => (
                    <Cell key={index} fill={index === 3 ? '#3976e8' : '#a9c2f2'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="panel-note">
            <Sparkles size={14} />
            37% of readers reach the final quarter of message content.
          </p>
        </Panel>
        <Panel title="Open → read → CTA exposure" eyebrow="Consumption journey">
          <div className="vertical-journey">
            {[
              ['Opened', 100, '354K'],
              ['Started reading', 91, '322K'],
              ['Reached 50%', 72, '255K'],
              ['Content end', 64, '227K'],
              ['CTA exposed', 51, '181K'],
            ].map(([label, value, count], index) => (
              <div className="vertical-step" key={String(label)}>
                <span>{index + 1}</span>
                <div>
                  <p>
                    <strong>{label}</strong>
                    <em>{count}</em>
                  </p>
                  <div>
                    <i style={{ width: String(value) + '%' }} />
                  </div>
                </div>
                <b>{value}%</b>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Message age & decay" eyebrow="Time to first open">
          <div className="chart-medium">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={timeToOpen}
                layout="vertical"
                margin={{ top: 0, right: 14, left: 12, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={75}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#697488' }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#567fdd" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>
    </>
  );
}

function JourneyPage({ records }: { records: MessageRecord[] }) {
  const [selectedId, setSelectedId] = useState(
    () => records.find((record) => messageSignal(record) === 'Important')?.id || records[0]?.id,
  );
  if (!records.length) return <EmptyState />;
  const selected = records.find((record) => record.id === selectedId) || records[0];
  const stages = [
    ['Message open', selected.opened, 100, 1.24],
    ['CTA exposed', selected.ctaExposed, safeRate(selected.ctaExposed, selected.opened), 1.08],
    ['CTA clicked', selected.clicked, safeRate(selected.clicked, selected.ctaExposed), 1.18],
  ];
  return (
    <>
      <Panel
        title="Message action journey"
        eyebrow="One specific message · journey ends at CTA click"
        action={
          <label className="journey-picker">
            Message
            <select value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
              {records.map((record) => (
                <option value={record.id} key={record.id}>
                  {record.name} · {messageSignal(record)}
                </option>
              ))}
            </select>
          </label>
        }
      >
        <div className="journey-message-context">
          <span className={'signal-badge ' + messageSignal(selected).toLowerCase()}>
            {messageSignal(selected)} signal
          </span>
          <p>
            <strong>{selected.name}</strong>
            <small>
              {selected.sender} · {selected.type}
            </small>
          </p>
        </div>
        {!selected.hasCTA ? (
          <div className="timing-empty compact">
            <MousePointerClick size={20} />
            <strong>No action journey</strong>
            <span>This message has no CTA, so its action signal is null.</span>
          </div>
        ) : (
          <div className="journey-stages three-stages">
            {stages.map(([label, value, rate, repeatFactor], index) => (
              <div className="journey-stage metric-with-hover" tabIndex={0} key={String(label)}>
                <span className="journey-group message">Message</span>
                <div className="journey-node">
                  <span>{index + 1}</span>
                </div>
                <small>{label}</small>
                <strong>{formatCompact(Number(value))}</strong>
                <em>{index === 0 ? 'Baseline' : formatPercent(Number(rate)) + ' from prior'}</em>
                <div className="metric-hover-card" role="tooltip">
                  <span className="metric-hover-title">
                    <Info size={13} />
                    {label}
                  </span>
                  <p>Counts are de-duplicated by user for this selected message.</p>
                  <div className="metric-hover-counts">
                    <span>
                      <small>Absolute total</small>
                      <strong>
                        {formatAbsolute(estimatedTotalEvents(Number(value), Number(repeatFactor)))}
                      </strong>
                    </span>
                    <span>
                      <small>Unique users</small>
                      <strong>{formatAbsolute(Number(value))}</strong>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <section className="journey-grid">
        <Panel title="Where clicks are lost" eyebrow="Selected message only">
          {selected.hasCTA ? (
            <div className="dropoff-list">
              {[
                [
                  'Open → CTA visible',
                  safeRate(selected.ctaExposed, selected.opened),
                  selected.opened - selected.ctaExposed,
                ],
                [
                  'CTA visible → click',
                  safeRate(selected.clicked, selected.ctaExposed),
                  selected.ctaExposed - selected.clicked,
                ],
              ].map(([label, rate, lost]) => (
                <div key={String(label)}>
                  <span>{label}</span>
                  <div className="dropoff-bar">
                    <i style={{ width: String(rate) + '%' }} />
                  </div>
                  <strong>{formatPercent(Number(rate))}</strong>
                  <small>{formatAbsolute(Number(lost))} users</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="chart-empty compact">
              <span>No CTA stages to diagnose.</span>
            </div>
          )}
        </Panel>
        <Panel title="Task tracking contract" eyebrow="Mini-service instrumentation">
          <div className="tracking-contract">
            <span className="tracking-event">start_action</span>
            <div>
              <strong>API expansion required</strong>
              <p>
                Track the action start inside the mini-service and send the message ID, user ID,
                task ID and event timestamp.
              </p>
            </div>
          </div>
          <div className="callout">
            <Route size={17} />
            <p>
              <strong>Boundary:</strong> The message Action journey ends at CTA click. Downstream
              task events are tracked separately and can be joined using the message and task IDs.
            </p>
          </div>
        </Panel>
      </section>
    </>
  );
}

export default function DashboardApp({
  section,
  messageId,
}: {
  section: DashboardSection;
  messageId?: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const query = filtersToQuery(filters);
  const filteredRecords = useMemo(() => filterMessages(messages, filters), [filters]);
  const copy = sectionCopy[section];
  const selectedMessage = messageId ? getMessageById(messages, messageId) : undefined;
  const updateFilter = (key: keyof DashboardFilters, value: string) => {
    const next = { ...filters, [key]: value } as DashboardFilters;
    const nextQuery = filtersToQuery(next);
    startTransition(() =>
      navigate(
        { pathname, search: nextQuery ? '?' + nextQuery : '' },
        { replace: true, preventScrollReset: true },
      ),
    );
  };
  const sectionContent = {
    overview: <Overview records={filteredRecords} query={query} period={filters.period} />,
    messages: <MessagesPage records={filteredRecords} filtersQuery={query} />,
    'message-detail': selectedMessage ? (
      <MessageDetailPage record={selectedMessage} query={query} />
    ) : (
      <EmptyState />
    ),
    behaviour: <BehaviourPage records={filteredRecords} />,
    journey: <JourneyPage records={filteredRecords} />,
  }[section];
  const renderNavItems = (items: typeof primaryNavItems) =>
    items.map((item) => {
      const Icon = item.icon;
      const active =
        item.href === '/'
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/');
      return (
        <Link
          to={item.href + (query ? '?' + query : '')}
          className={'nav-link ' + (active ? 'active' : '')}
          key={item.href}
          onClick={() => setMenuOpen(false)}
        >
          <Icon size={17} />
          {item.label}
        </Link>
      );
    });
  return (
    <main className="app-frame">
      <aside className={'sidebar ' + (menuOpen ? 'open' : '')}>
        <div className="sidebar-head">
          <Link to={'/' + (query ? '?' + query : '')} className="brand">
            <span className="brand-mark">d</span>
            <span>deepdots</span>
          </Link>
          <button
            className="mobile-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <nav aria-label="Primary navigation">
          <p className="nav-section-label">Workspace</p>
          {renderNavItems(primaryNavItems)}
          <p className="nav-section-label analytics-label">Analytics</p>
          {renderNavItems(analyticsNavItems)}
        </nav>
        <div className="sidebar-meta">
          <div>
            <span className="live-dot" />
            Demo workspace
          </div>
          <small>Synthetic product data</small>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="menu-backdrop"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <section className="content-shell">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="menu-button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={19} />
            </button>
            <div>
              <p className="eyebrow">{copy[0]}</p>
              <h1>
                {section === 'message-detail' && selectedMessage ? selectedMessage.name : copy[1]}
              </h1>
            </div>
          </div>
          <div className="header-actions">
            <button className="icon-button" aria-label="Notifications">
              <Bell size={16} />
              <span />
            </button>
            <div className="avatar">YO</div>
          </div>
        </header>
        <div className="page-content">
          <div className="page-intro">
            <p>{copy[2]}</p>
            <span className="demo-pill">
              <span />
              Demo data
            </span>
          </div>
          {section !== 'message-detail' && (
            <Filters filters={filters} onChange={updateFilter} isPending={isPending} />
          )}{' '}
          {sectionContent}
        </div>
      </section>
    </main>
  );
}
