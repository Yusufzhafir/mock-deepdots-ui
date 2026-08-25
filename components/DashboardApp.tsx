'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bell, ChevronDown,
  CircleGauge, Clock3, Eye, Filter, HeartPulse, Inbox, LayoutDashboard,
  Menu, MessageSquareText, MousePointerClick, Route, Search, ShieldCheck,
  Sparkles, Target, UsersRound, X,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  DashboardFilters, MessageRecord, filterOptions, frictionSignals, messages,
  positionPerformance, scrollDepth, segmentRows, timeToOpen, trendPoints,
} from '../lib/data';
import {
  aggregateMetrics, filterMessages, filtersToQuery, formatCompact, formatPercent,
  parseFilters, safeRate, weightedAverage,
} from '../lib/metrics';

export type DashboardSection = 'overview' | 'messages' | 'behaviour' | 'journey' | 'segments' | 'health';

const navItems = [
  { href:'/', label:'Overview', icon:LayoutDashboard },
  { href:'/messages', label:'Messages', icon:MessageSquareText },
  { href:'/behaviour', label:'Behaviour', icon:BarChart3 },
  { href:'/journey', label:'Action journey', icon:Route },
  { href:'/segments', label:'Segments', icon:UsersRound },
  { href:'/health', label:'Health', icon:HeartPulse },
];

const sectionCopy = {
  overview: ['Inbox intelligence', 'Message Inbox Analytics', 'Understand whether people notice, read and act on your messages.'],
  messages: ['Campaign diagnostics', 'Message performance', 'Compare every campaign using meaningful exposure and conversion denominators.'],
  behaviour: ['Consumption signals', 'Reading behaviour', 'See how people consume content, where they stop, and whether they reach the CTA.'],
  journey: ['Before and after click', 'Action journey', 'Separate message effectiveness from downstream destination performance.'],
  segments: ['Audience intelligence', 'Segment comparison', 'Find who the inbox works for—and where the experience needs attention.'],
  health: ['Experience diagnostics', 'Friction & technical health', 'Monitor the interaction and delivery issues that quietly suppress outcomes.'],
} as const;

const tooltipStyle = {
  border:'1px solid #e4e8f0', borderRadius:10, fontSize:11,
  boxShadow:'0 12px 32px rgba(34,49,79,.12)',
};

function Panel({ title, eyebrow, action, className = '', children }: {
  title:string; eyebrow?:string; action?:React.ReactNode; className?:string; children:React.ReactNode;
}) {
  return <article className={'panel ' + className}>
    <div className="panel-head">
      <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{action}
    </div>
    {children}
  </article>;
}

function EmptyState() {
  return <div className="empty-state">
    <div className="empty-icon"><Filter size={20}/></div>
    <h3>No matching data</h3><p>Try widening one of the filters above.</p>
  </div>;
}

function Filters({ filters, onChange, isPending }: {
  filters:DashboardFilters;
  onChange:(key:keyof DashboardFilters, value:string)=>void;
  isPending:boolean;
}) {
  const fields = [
    ['period', 'Period', filterOptions.period],
    ['segment', 'Segment', filterOptions.segment],
    ['messageType', 'Message type', filterOptions.messageType],
    ['platform', 'Platform', filterOptions.platform],
  ] as const;
  return <section className={'filters ' + (isPending ? 'pending' : '')} aria-label="Dashboard filters">
    {fields.map(([key, label, options]) => <label key={key}>{label}
      <span className="select-wrap">
        <select value={filters[key]} onChange={(event) => onChange(key, event.target.value)} aria-label={label}>
          {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
        </select><ChevronDown size={13}/>
      </span>
    </label>)}
    <span className="updated"><span className="live-dot"/>Updated 8 min ago</span>
  </section>;
}

function StatCard({ label, value, delta, icon:Icon, note }: {
  label:string; value:string; delta:number; icon:typeof Eye; note?:string;
}) {
  const positive = delta >= 0;
  return <article className="kpi-card">
    <div className="kpi-label"><span>{label}</span><span className="kpi-icon"><Icon size={15}/></span></div>
    <strong>{value}</strong>
    <p><span className={positive ? 'delta up' : 'delta down'}>
      {positive ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
      {Math.abs(delta).toFixed(1)}%
    </span>{note || 'vs previous period'}</p>
  </article>;
}

function Overview({ records }: { records:MessageRecord[] }) {
  const metrics = aggregateMetrics(records, '30');
  if (!records.length) return <EmptyState/>;
  const reach = metrics.exposureRate * .86;
  const funnel = [
    ['Delivered', metrics.delivered, 100],
    ['Exposed', metrics.exposed, metrics.exposureRate],
    ['Opened', metrics.opened, metrics.openRate],
    ['Meaningful read', metrics.engaged, metrics.engagedRate],
    ['CTA exposed', metrics.ctaExposed, metrics.ctaExposureRate],
    ['CTA clicked', metrics.clicked, metrics.ctaRate],
    ['Completed action', metrics.completed, metrics.conversionRate],
  ] as const;
  const max = metrics.delivered;
  const best = [...records].sort((a,b) => safeRate(b.clicked,b.ctaExposed) - safeRate(a.clicked,a.ctaExposed)).slice(0,4);
  return <>
    <section className="kpi-grid" aria-label="Inbox health metrics">
      <StatCard label="Inbox reach" value={formatPercent(reach)} delta={4.2} icon={Inbox}/>
      <StatCard label="Open rate" value={formatPercent(metrics.openRate)} delta={-1.8} icon={Eye}/>
      <StatCard label="Engaged rate" value={formatPercent(metrics.engagedRate)} delta={7.1} icon={Sparkles}/>
      <StatCard label="CTA conversion" value={formatPercent(metrics.ctaRate)} delta={3.4} icon={MousePointerClick}/>
      <StatCard label="Completed action" value={formatPercent(metrics.endToEndRate)} delta={2.2} icon={Target}/>
    </section>
    <section className="overview-grid">
      <Panel title="North-star outcome funnel" eyebrow="Business outcome" className="funnel-panel" action={<span className="soft-badge">30 days</span>}>
        <div className="funnel-list">{funnel.map(([label,value,rate], index) => <div className="funnel-row" key={label}>
          <div className="funnel-meta"><span>{label}</span><strong>{formatCompact(value)}</strong></div>
          <div className="funnel-track"><span style={{width:String(Math.max(4,(value/max)*100))+'%'}}/></div>
          <span className="funnel-rate">{index === 0 ? 'Baseline' : formatPercent(rate) + ' of prior'}</span>
        </div>)}</div>
        <div className="funnel-insight"><Sparkles size={15}/><p><strong>Best opportunity:</strong> open rate is down 1.8%. Improving exposure-to-open by two points would create roughly {formatCompact(metrics.exposed*.02)} more opens.</p></div>
      </Panel>
      <Panel title="Reach & engagement trend" eyebrow="Inbox usage" className="trend-panel" action={<span className="metric-highlight">71.4%</span>}>
        <div className="chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendPoints} margin={{top:6,right:2,left:-25,bottom:0}}>
              <defs><linearGradient id="reachFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4d82e7" stopOpacity={.26}/><stop offset="95%" stopColor="#4d82e7" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="#eef1f5"/><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{fontSize:9,fill:'#929aab'}} interval={2}/><YAxis tickLine={false} axisLine={false} tick={{fontSize:9,fill:'#929aab'}} domain={[50,80]}/>
              <Tooltip contentStyle={tooltipStyle}/><Area type="monotone" dataKey="reach" stroke="#3976e8" strokeWidth={2} fill="url(#reachFill)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mini-stats"><div><small>Inbox users</small><strong>482K</strong></div><div><small>Sessions / user</small><strong>2.8</strong></div><div><small>Revisit rate</small><strong>42%</strong></div></div>
      </Panel>
      <Panel title="Time to first open" eyebrow="Message decay">
        <div className="distribution-list">{timeToOpen.map((item) => <div key={item.label} className="distribution-row">
          <span>{item.label}</span><div><i style={{width:String(item.value*2.6)+'%'}}/></div><strong>{item.value}%</strong>
        </div>)}</div>
        <p className="panel-note"><Clock3 size={14}/>73% of messages that are opened receive their first open within 24 hours.</p>
      </Panel>
      <Panel title="Top message performance" eyebrow="Campaigns" action={<Link className="text-link" href="/messages">View all</Link>}>
        <div className="compact-table"><div className="compact-head"><span>Message</span><span>Open</span><span>CTA</span></div>
          {best.map((record) => <div className="compact-row" key={record.id}><span><i className={'type-dot ' + record.type.toLowerCase()}/>{record.name}</span><strong>{formatPercent(safeRate(record.opened,record.exposed),0)}</strong><strong>{formatPercent(safeRate(record.clicked,record.ctaExposed),0)}</strong></div>)}
        </div>
      </Panel>
      <Panel title="Downstream conversion" eyebrow="After click">
        <div className="step-flow">
          {[['CTA clicks',metrics.clicked,100],['Page loaded',Math.round(metrics.clicked*.94),94],['Started action',Math.round(metrics.clicked*.71),71],['Completed',metrics.completed,safeRate(metrics.completed,metrics.clicked)]].map(([label,value,rate],index) => <div className="step-card" key={String(label)}>
            <span className="step-number">{index+1}</span><small>{label}</small><strong>{formatCompact(Number(value))}</strong><em>{formatPercent(Number(rate),0)}</em>
          </div>)}
        </div>
        <p className="panel-note warning"><ShieldCheck size={14}/>Destination completion is the largest remaining post-click drop-off.</p>
      </Panel>
      <Panel title="Inbox friction" eyebrow="Experience health" action={<span className="status-badge good">Stable</span>}>
        <div className="friction-summary"><div className="friction-ring"><strong>3.5%</strong><span>of sessions</span></div>
          <div className="friction-top">{frictionSignals.slice(0,3).map((signal) => <div key={signal.name}><span>{signal.name}</span><strong>{signal.share}%</strong></div>)}</div>
        </div>
        <Link className="panel-link" href="/health">See all friction and technical signals <ArrowUpRight size={13}/></Link>
      </Panel>
    </section>
  </>;
}

type SortKey = 'delivered' | 'openRate' | 'engagedRate' | 'ctaRate' | 'conversionRate' | 'unreadRate';

function MessagesPage({ records }: { records:MessageRecord[] }) {
  const [query,setQuery] = useState('');
  const [sort,setSort] = useState<SortKey>('delivered');
  const rows = useMemo(() => records
    .filter((record) => record.name.toLowerCase().includes(query.toLowerCase()))
    .map((record) => ({
      ...record,
      openRate:safeRate(record.opened,record.exposed),
      engagedRate:safeRate(record.engaged,record.opened),
      ctaRate:safeRate(record.clicked,record.ctaExposed),
      conversionRate:safeRate(record.completed,record.clicked),
      unreadRate:safeRate(record.unread,record.delivered),
    })).sort((a,b) => Number(b[sort])-Number(a[sort])), [records,query,sort]);
  return <Panel title="Campaign performance" eyebrow="One message per row" className="table-panel" action={<span className="record-count">{rows.length} campaigns</span>}>
    <div className="table-tools">
      <label className="search-box"><Search size={15}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search campaigns" aria-label="Search campaigns"/></label>
      <label className="sort-control">Sort by<select value={sort} onChange={(event)=>setSort(event.target.value as SortKey)}><option value="delivered">Delivered</option><option value="openRate">Open rate</option><option value="engagedRate">Engaged</option><option value="ctaRate">CTA rate</option><option value="conversionRate">Conversion</option><option value="unreadRate">Unread</option></select></label>
    </div>
    {!rows.length ? <EmptyState/> : <div className="data-table-wrap"><table className="data-table">
      <thead><tr><th>Message</th><th>Delivered</th><th>Exposure</th><th>Open</th><th>Engaged</th><th>CTA visible</th><th>CTA CTR</th><th>Conversion</th><th>Unread</th></tr></thead>
      <tbody>{rows.map((record) => <tr key={record.id}>
        <td><div className="message-cell"><span className={'message-icon ' + record.type.toLowerCase()}><MessageSquareText size={14}/></span><span><strong>{record.name}</strong><small>{record.type} · {record.platform} · {record.segment}</small></span></div></td>
        <td>{formatCompact(record.delivered)}</td><td>{formatPercent(safeRate(record.exposed,record.delivered))}</td><td><strong>{formatPercent(record.openRate)}</strong></td><td>{formatPercent(record.engagedRate)}</td><td>{formatPercent(safeRate(record.ctaExposed,record.opened))}</td><td>{formatPercent(record.ctaRate)}</td><td><span className="conversion-cell">{formatPercent(record.conversionRate)}</span></td><td><span className={record.unreadRate>35?'risk-text':''}>{formatPercent(record.unreadRate)}</span></td>
      </tr>)}</tbody>
    </table></div>}
    <div className="definition-strip"><span><i className="legend-dot blue"/>CTA CTR uses CTA exposed—not opens—as its denominator.</span><span><i className="legend-dot green"/>Conversion means completed downstream action ÷ CTA clicks.</span></div>
  </Panel>;
}

function BehaviourPage({ records }: { records:MessageRecord[] }) {
  if (!records.length) return <EmptyState/>;
  const readTime = weightedAverage(records,'medianReadSeconds');
  const completion = aggregateMetrics(records,'30').engagedRate;
  const repeatOpen = Math.min(34, 18 + records.length*.9);
  return <>
    <section className="metric-strip">
      <StatCard label="Median reading time" value={Math.round(readTime)+'s'} delta={6.4} icon={Clock3}/>
      <StatCard label="Content completion" value={formatPercent(completion)} delta={4.8} icon={Target}/>
      <StatCard label="Early abandonment" value="12.6%" delta={-3.1} icon={ArrowDownRight} note="lower is better"/>
      <StatCard label="Repeat open rate" value={formatPercent(repeatOpen)} delta={1.7} icon={Eye}/>
    </section>
    <section className="two-column-grid">
      <Panel title="Scroll depth distribution" eyebrow="All opened messages">
        <div className="chart-medium"><ResponsiveContainer width="100%" height="100%"><BarChart data={scrollDepth} margin={{top:10,right:4,left:-28,bottom:0}}><CartesianGrid vertical={false} stroke="#eef1f5"/><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{fontSize:10,fill:'#7f899b'}}/><YAxis tickLine={false} axisLine={false} tick={{fontSize:9,fill:'#9aa2b0'}}/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey="value" radius={[5,5,0,0]}>{scrollDepth.map((_,index)=><Cell key={index} fill={index===3?'#3976e8':'#a9c2f2'}/>)}</Bar></BarChart></ResponsiveContainer></div>
        <p className="panel-note"><Sparkles size={14}/>37% of readers reach the final quarter of message content.</p>
      </Panel>
      <Panel title="Open → read → CTA exposure" eyebrow="Consumption journey">
        <div className="vertical-journey">{[
          ['Opened',100,'354K'],['Started reading',91,'322K'],['Reached 50%',72,'255K'],['Content end',64,'227K'],['CTA exposed',51,'181K']
        ].map(([label,value,count],index)=><div className="vertical-step" key={String(label)}><span>{index+1}</span><div><p><strong>{label}</strong><em>{count}</em></p><div><i style={{width:String(value)+'%'}}/></div></div><b>{value}%</b></div>)}</div>
      </Panel>
      <Panel title="Message age & decay" eyebrow="Time to first open">
        <div className="chart-medium"><ResponsiveContainer width="100%" height="100%"><BarChart data={timeToOpen} layout="vertical" margin={{top:0,right:14,left:12,bottom:0}}><XAxis type="number" hide/><YAxis dataKey="label" type="category" width={75} tickLine={false} axisLine={false} tick={{fontSize:10,fill:'#697488'}}/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey="value" fill="#567fdd" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></div>
      </Panel>
      <Panel title="Inbox position effect" eyebrow="Visibility analysis">
        <div className="chart-medium"><ResponsiveContainer width="100%" height="100%"><LineChart data={positionPerformance} margin={{top:8,right:8,left:-24,bottom:0}}><CartesianGrid vertical={false} stroke="#eef1f5"/><XAxis dataKey="position" tickLine={false} axisLine={false} tick={{fontSize:10,fill:'#7f899b'}}/><YAxis tickLine={false} axisLine={false} tick={{fontSize:9,fill:'#9aa2b0'}}/><Tooltip contentStyle={tooltipStyle}/><Legend iconType="circle" wrapperStyle={{fontSize:10}}/><Line type="monotone" dataKey="exposure" stroke="#3976e8" strokeWidth={2} dot={{r:3}}/><Line type="monotone" dataKey="open" stroke="#836fe7" strokeWidth={2} dot={{r:3}}/></LineChart></ResponsiveContainer></div>
        <p className="panel-note warning"><Activity size={14}/>Position #1 receives 14× the open rate of messages below position 10.</p>
      </Panel>
    </section>
  </>;
}

function JourneyPage({ records }: { records:MessageRecord[] }) {
  if (!records.length) return <EmptyState/>;
  const metrics = aggregateMetrics(records,'30');
  const landingLoaded = Math.round(metrics.clicked*.94);
  const started = Math.round(landingLoaded*.76);
  const completed = metrics.completed;
  const stages = [
    ['Message open',metrics.opened,100,'Message'],['CTA exposed',metrics.ctaExposed,safeRate(metrics.ctaExposed,metrics.opened),'Message'],
    ['CTA clicked',metrics.clicked,safeRate(metrics.clicked,metrics.ctaExposed),'Message'],['Page loaded',landingLoaded,safeRate(landingLoaded,metrics.clicked),'Destination'],
    ['Started action',started,safeRate(started,landingLoaded),'Destination'],['Completed',completed,safeRate(completed,started),'Outcome'],
  ];
  return <>
    <Panel title="Full action journey" eyebrow="Message → destination → outcome" action={<span className="status-badge good">Healthy message</span>}>
      <div className="journey-stages">{stages.map(([label,value,rate,group],index)=><div className="journey-stage" key={String(label)}>
        <span className={'journey-group ' + String(group).toLowerCase()}>{group}</span><div className="journey-node"><span>{index+1}</span></div>
        <small>{label}</small><strong>{formatCompact(Number(value))}</strong><em>{index===0?'Baseline':formatPercent(Number(rate))+' from prior'}</em>
      </div>)}</div>
    </Panel>
    <section className="journey-grid">
      <Panel title="Where conversion is lost" eyebrow="Stage diagnosis">
        <div className="dropoff-list">
          {[['Open → CTA visible',safeRate(metrics.ctaExposed,metrics.opened),metrics.opened-metrics.ctaExposed],['CTA visible → click',metrics.ctaRate,metrics.ctaExposed-metrics.clicked],['Click → page load',safeRate(landingLoaded,metrics.clicked),metrics.clicked-landingLoaded],['Load → start',safeRate(started,landingLoaded),landingLoaded-started],['Start → complete',safeRate(completed,started),started-completed]].map(([label,rate,lost])=><div key={String(label)}><span>{label}</span><div className="dropoff-bar"><i style={{width:String(rate)+'%'}}/></div><strong>{formatPercent(Number(rate))}</strong><small>{formatCompact(Number(lost))} lost</small></div>)}
        </div>
      </Panel>
      <Panel title="Message vs destination" eyebrow="Ownership">
        <div className="ownership-grid"><div className="ownership-card good"><span><MessageSquareText size={16}/>Message experience</span><strong>{formatPercent(metrics.ctaRate)}</strong><small>CTA visible → click</small><p>Strong intent creation. Copy and CTA are working.</p></div><div className="ownership-card warning"><span><Route size={16}/>Destination experience</span><strong>{formatPercent(safeRate(completed,landingLoaded))}</strong><small>Page loaded → completion</small><p>Primary constraint. Review form length and page load.</p></div></div>
        <div className="callout"><Sparkles size={17}/><p><strong>Diagnosis:</strong> Messaging is generating qualified clicks. Most remaining opportunity sits after the destination loads.</p></div>
      </Panel>
    </section>
  </>;
}

function SegmentsPage() {
  const [metric,setMetric] = useState<'reach'|'open'|'cta'|'conversion'>('open');
  return <section className="segments-grid">
    <Panel title="Who the inbox works for" eyebrow="Segment matrix" className="segment-table-panel">
      <div className="data-table-wrap"><table className="data-table segment-table"><thead><tr><th>Segment</th><th>Audience</th><th>Inbox reach</th><th>Open</th><th>CTA</th><th>Conversion</th><th>Trend</th></tr></thead><tbody>
        {segmentRows.map((row)=><tr key={row.name}><td><div className="segment-name"><span>{row.name.charAt(0)}</span><strong>{row.name}</strong></div></td><td>{row.users}</td><td>{row.reach}%</td><td><strong>{row.open}%</strong></td><td>{row.cta}%</td><td><span className="conversion-cell">{row.conversion}%</span></td><td><span className={row.trend>=0?'delta up':'delta down'}>{row.trend>=0?<ArrowUpRight size={12}/>:<ArrowDownRight size={12}/>} {Math.abs(row.trend)}%</span></td></tr>)}
      </tbody></table></div>
    </Panel>
    <Panel title="Segment comparison" eyebrow="Selected metric" action={<select className="inline-select" value={metric} onChange={(event)=>setMetric(event.target.value as typeof metric)}><option value="reach">Inbox reach</option><option value="open">Open rate</option><option value="cta">CTA rate</option><option value="conversion">Conversion</option></select>}>
      <div className="chart-tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={segmentRows} layout="vertical" margin={{top:4,right:15,left:24,bottom:0}}><XAxis type="number" domain={[0,100]} tickLine={false} axisLine={false} tick={{fontSize:9,fill:'#9aa2b0'}}/><YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} tick={{fontSize:10,fill:'#697488'}}/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey={metric} fill="#477de1" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></div>
    </Panel>
    <Panel title="Largest audience gap" eyebrow="Recommended focus" className="insight-panel">
      <div className="insight-hero"><span><Target size={18}/></span><div><h3>Dormant users</h3><p>Reach is 48 points behind active users, and only 18% of exposed messages are opened.</p></div></div>
      <div className="recommendation"><strong>Test next</strong><span>Prioritise recency-based ordering and notification timing for dormant users.</span></div>
    </Panel>
  </section>;
}

function HealthPage({ records }: { records:MessageRecord[] }) {
  const friction = weightedAverage(records,'frictionRate');
  const p95 = weightedAverage(records,'latencyP95');
  const latencyData = trendPoints.map((point,index)=>({day:point.day,p50:260+index*4+(index%3)*12,p95:Math.round(p95*.88)+index*7,p99:Math.round(p95*1.45)+index*10}));
  return <>
    <section className="metric-strip">
      <StatCard label="Inbox friction rate" value={formatPercent(friction)} delta={-5.4} icon={MousePointerClick} note="lower is better"/>
      <StatCard label="API success rate" value="99.93%" delta={0.08} icon={ShieldCheck}/>
      <StatCard label="Render failure" value="0.18%" delta={-12.1} icon={Activity} note="lower is better"/>
      <StatCard label="Load latency P95" value={Math.round(p95)+'ms'} delta={3.4} icon={CircleGauge}/>
    </section>
    <section className="health-grid">
      <Panel title="Sessions with friction" eyebrow="Cause breakdown">
        <div className="friction-bars">{frictionSignals.map((signal,index)=><div key={signal.name}><span className="friction-rank">{index+1}</span><p><strong>{signal.name}</strong><small>{formatCompact(signal.sessions)} affected sessions</small></p><div><i style={{width:String(signal.share*2.3)+'%'}}/></div><b>{signal.share}%</b><em className={'severity ' + signal.severity.toLowerCase()}>{signal.severity}</em></div>)}</div>
      </Panel>
      <Panel title="Load latency trend" eyebrow="Milliseconds" action={<span className="status-badge warning">P95 rising</span>}>
        <div className="chart-tall"><ResponsiveContainer width="100%" height="100%"><LineChart data={latencyData} margin={{top:8,right:8,left:-18,bottom:0}}><CartesianGrid vertical={false} stroke="#eef1f5"/><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{fontSize:9,fill:'#929aab'}} interval={2}/><YAxis tickLine={false} axisLine={false} tick={{fontSize:9,fill:'#929aab'}}/><Tooltip contentStyle={tooltipStyle}/><Legend iconType="circle" wrapperStyle={{fontSize:10}}/><Line type="monotone" dataKey="p50" stroke="#78a0e8" strokeWidth={2} dot={false}/><Line type="monotone" dataKey="p95" stroke="#3976e8" strokeWidth={2} dot={false}/><Line type="monotone" dataKey="p99" stroke="#826ee1" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div>
      </Panel>
      <Panel title="Technical signal status" eyebrow="Latest 30 days" className="wide-panel">
        <div className="technical-grid">{[
          ['Inbox API','99.93%','success rate','good'],['Message rendering','0.18%','failed renders','good'],['CTA navigation','0.74%','destination failure','warning'],['Empty state','1.30%','of inbox sessions','neutral'],['Duplicate messages','0.06%','of delivered','good'],['Analytics events','0.22%','estimated drop rate','good']
        ].map(([label,value,note,status])=><div className="technical-card" key={label}><span className={'signal-dot '+status}/><p>{label}</p><strong>{value}</strong><small>{note}</small></div>)}</div>
      </Panel>
    </section>
  </>;
}

export default function DashboardApp({ section }: { section:DashboardSection }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuOpen,setMenuOpen] = useState(false);
  const [isPending,startTransition] = useTransition();
  const filters = useMemo(()=>parseFilters(new URLSearchParams(searchParams.toString())),[searchParams]);
  const query = filtersToQuery(filters);
  const filteredRecords = useMemo(()=>filterMessages(messages,filters),[filters]);
  const copy = sectionCopy[section];
  const updateFilter = (key:keyof DashboardFilters,value:string) => {
    const next = {...filters,[key]:value} as DashboardFilters;
    const nextQuery = filtersToQuery(next);
    startTransition(()=>router.replace(pathname+(nextQuery?'?'+nextQuery:''),{scroll:false}));
  };
  const sectionContent = {
    overview:<Overview records={filteredRecords}/>, messages:<MessagesPage records={filteredRecords}/>,
    behaviour:<BehaviourPage records={filteredRecords}/>, journey:<JourneyPage records={filteredRecords}/>,
    segments:<SegmentsPage/>, health:<HealthPage records={filteredRecords}/>,
  }[section];
  return <main className="app-frame">
    <aside className={'sidebar '+(menuOpen?'open':'')}>
      <div className="sidebar-head"><Link href={'/'+(query?'?'+query:'')} className="brand"><span className="brand-mark">d</span><span>deepdots</span></Link><button className="mobile-close" onClick={()=>setMenuOpen(false)} aria-label="Close menu"><X size={18}/></button></div>
      <nav aria-label="Primary navigation">{navItems.map((item)=>{const Icon=item.icon;const active=pathname===item.href;return <Link href={item.href+(query?'?'+query:'')} className={'nav-link '+(active?'active':'')} key={item.href} onClick={()=>setMenuOpen(false)}><Icon size={17}/>{item.label}</Link>})}</nav>
      <div className="sidebar-meta"><div><span className="live-dot"/>Demo workspace</div><small>Synthetic product data</small></div>
    </aside>
    {menuOpen && <button className="menu-backdrop" aria-label="Close menu" onClick={()=>setMenuOpen(false)}/>}
    <section className="content-shell">
      <header className="topbar"><div className="topbar-title"><button className="menu-button" onClick={()=>setMenuOpen(true)} aria-label="Open menu"><Menu size={19}/></button><div><p className="eyebrow">{copy[0]}</p><h1>{copy[1]}</h1></div></div><div className="header-actions"><button className="icon-button" aria-label="Notifications"><Bell size={16}/><span/></button><div className="avatar">YO</div></div></header>
      <div className="page-content"><div className="page-intro"><p>{copy[2]}</p><span className="demo-pill"><span/>Demo data</span></div><Filters filters={filters} onChange={updateFilter} isPending={isPending}/>{sectionContent}</div>
    </section>
  </main>;
}
