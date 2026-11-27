import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { startForRange, weeklyCounts } from '../utils/analyticsDates';

const RANGES = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'all', label: 'All time' }
];
const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected'];
const STATUS_COLORS = { Applied: '#2563eb', Interview: '#d97706', Offer: '#16a34a', Rejected: '#dc2626' };
const getStatusColor = status => STATUS_COLORS[status];

export default function ProfileAnalytics() {
  const [range, setRange] = useState('30');
  const [applications, setApplications] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/applications', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load application analytics.');
      setApplications(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load application analytics.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!applications) return [];
    const start = startForRange(range);
    return applications.filter(application => {
      const appliedAt = new Date(application.appliedAt);
      return !Number.isNaN(appliedAt.valueOf()) && (!start || appliedAt >= start);
    });
  }, [applications, range]);

  const statusCounts = useMemo(() => STATUSES.map(status => ({
    status, count: filtered.filter(application => application.status === status).length
  })), [filtered]);

  const weekly = useMemo(() => weeklyCounts(filtered, range), [filtered, range]);
  const maxWeekly = Math.max(1, ...weekly.map(item => item.count));
  const maxStatus = Math.max(1, ...statusCounts.map(item => item.count));

  return <section className="profile-analytics" aria-labelledby="profile-analytics-title">
    <div className="profile-analytics-heading">
      <div><p className="profile-eyebrow">APPLICATION PULSE</p><h2 id="profile-analytics-title">Your progress</h2><p>Submitted applications grouped by week. Statuses show the current state of applications in this period.</p></div>
      <div className="profile-range-control" role="group" aria-label="Analytics date range">
        {RANGES.map(option => <button key={option.value} type="button" className={range === option.value ? 'is-selected' : ''} aria-pressed={range === option.value} onClick={() => setRange(option.value)}>{option.label}</button>)}
      </div>
    </div>
    {applications === null && !error && <p className="profile-analytics-state" role="status">Loading your application activity…</p>}
    {error && <div className="profile-analytics-state profile-analytics-error" role="alert"><p>{error}</p><button type="button" onClick={load}>Try again</button></div>}
    {applications !== null && !error && filtered.length === 0 && <div className="profile-analytics-state"><p>No applications in this period yet.</p><Link to="/dashboard">Explore jobs</Link></div>}
    {applications !== null && !error && filtered.length > 0 && <div className="profile-chart-grid">
      <article className="profile-chart-card" aria-labelledby="weekly-applications-title">
        <div className="profile-chart-card-heading"><div><h3 id="weekly-applications-title">Applications per week</h3><p>{filtered.length} submitted in this period</p></div><span aria-hidden="true">↗</span></div>
        <div className="profile-bars profile-week-bars" role="list" aria-label="Applications submitted per week">
          {weekly.map(item => <Link to="/applications" className="profile-bar-row" role="listitem" key={item.key} aria-label={`${item.count} applications during the week of ${item.label}`} title={`${item.count} applications · week of ${item.label}`}><span>{item.label}</span><span className="profile-bar-track"><span style={{ height: `${(item.count / maxWeekly) * 100}%`, minHeight: item.count ? '3px' : '0' }} /></span><strong>{item.count}</strong></Link>)}
        </div>
      </article>
      <article className="profile-chart-card" aria-labelledby="status-breakdown-title">
        <div className="profile-chart-card-heading"><div><h3 id="status-breakdown-title">Current status</h3><p>Select a status to view matching applications</p></div><span aria-hidden="true">◎</span></div>
        <div className="profile-bars" role="list" aria-label="Application status breakdown">
          {statusCounts.map(item => <Link to={`/applications?status=${encodeURIComponent(item.status)}`} className={`profile-bar-row status-${item.status.toLowerCase()}`} role="listitem" key={item.status} aria-label={`${item.count} ${item.status} applications`} title={`${item.count} ${item.status} applications`}><span>{item.status}</span><span className="profile-bar-track"><span style={{ height: `${(item.count / maxStatus) * 100}%`, minHeight: item.count ? '3px' : '0' }} /></span><strong>{item.count}</strong></Link>)}
        </div>
      </article>
    </div>}
  </section>;
}

export function RecruiterAnalytics() {
  const [range, setRange] = useState('30');
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');
  const request = useRef(null);
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError('');
    setJobs(null);
    try {
      const start = startForRange(range);
      const query = start ? '?' + new URLSearchParams({ since: start.toISOString() }) : '';
      const response = await fetch('/api/jobs/analytics' + query, { credentials: 'include', signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load posting analytics.');
      if (!controller.signal.aborted) setJobs(data);

    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError.message || 'Unable to load posting analytics.');
    }
  }, [range]);
  useEffect(() => { load(); return () => request.current?.abort(); }, [load]);
  const filteredJobs = (jobs || []).filter(job => job.total > 0);
  const maxApplicants = Math.max(1, ...filteredJobs.map(job => job.total));
  const statusCount = (job, status) => job.counts[status] || 0;
  return <section className="profile-analytics" aria-labelledby="recruiter-analytics-title">
    <div className="profile-analytics-heading">
      <div><p className="profile-eyebrow">HIRING PULSE</p><h2 id="recruiter-analytics-title">Your hiring overview</h2><p>Applicant volume and current candidate status for your postings. Statuses reflect the selected submission period.</p></div>
      <div className="profile-range-control" role="group" aria-label="Analytics date range">{RANGES.map(option => <button key={option.value} type="button" className={range === option.value ? 'is-selected' : ''} aria-pressed={range === option.value} onClick={() => setRange(option.value)}>{option.label}</button>)}</div>
    </div>
    {jobs === null && !error && <p className="profile-analytics-state" role="status">Loading your posting activity…</p>}
    {error && <div className="profile-analytics-state profile-analytics-error" role="alert"><p>{error}</p><button type="button" onClick={load}>Try again</button></div>}
    {jobs !== null && !error && filteredJobs.length === 0 && <div className="profile-analytics-state"><p>No applicants in this period yet.</p><Link to="/dashboard">View your postings</Link></div>}
    {jobs !== null && !error && filteredJobs.length > 0 && <div className="profile-chart-grid">
      <article className="profile-chart-card" aria-labelledby="posting-volume-title"><div className="profile-chart-card-heading"><div><h3 id="posting-volume-title">Applicants per posting</h3><p>Open a bar to review candidates</p></div><span aria-hidden="true">↗</span></div><div className="profile-vertical-bars" role="list" aria-label="Applicants per posting">{filteredJobs.map(job => <Link className="profile-vertical-bar-item" role="listitem" key={job._id} to={`/dashboard/jobs/${job._id}/applications`} aria-label={`${job.total} applicants for ${job.title}`} title={`${job.total} applicants · ${job.title}`}><span className="profile-vertical-bar-value">{job.total}</span><span className="profile-vertical-bar-track"><span style={{ height: `${(job.total / maxApplicants) * 100}%` }} /></span><span className="profile-vertical-bar-label">{job.title}</span></Link>)}</div></article>
      <article className="profile-chart-card" aria-labelledby="candidate-status-title"><div className="profile-chart-card-heading"><div><h3 id="candidate-status-title">Candidate statuses</h3><p>Current status by posting</p></div><span aria-hidden="true">◔</span></div><div className="profile-legend" aria-label="Status legend">{STATUSES.map(status => <span key={status}><i className={`legend-${status.toLowerCase()}`} />{status}</span>)}</div><div className="profile-pie-grid" role="list" aria-label="Candidate status pies by posting">{filteredJobs.map(job => { const total = job.total; let offset = 0; const segments = STATUSES.map(status => { const count = statusCount(job, status); const start = offset; offset += (count / total) * 100; return `${getStatusColor(status)} ${start}% ${offset}%`; }); return <Link className="profile-pie-card" role="listitem" key={job._id} to={`/dashboard/jobs/${job._id}/applications`} aria-label={`${job.title}: ${STATUSES.map(status => `${status} ${statusCount(job, status)}`).join(', ')}`} title={`${job.title}: ${STATUSES.map(status => `${status} ${statusCount(job, status)}`).join(' · ')}`}><span className="profile-pie" style={{ background: `conic-gradient(${segments.join(', ')})` }} aria-hidden="true" /><strong>{job.title}</strong><small>{total} {total === 1 ? 'applicant' : 'applicants'}</small><span className="profile-pie-counts">{STATUSES.map(status => <span key={status}><i className={`legend-${status.toLowerCase()}`} />{statusCount(job, status)}</span>)}</span></Link>; })}</div></article>
    </div>}
  </section>;
}
