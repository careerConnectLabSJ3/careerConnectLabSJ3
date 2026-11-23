import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import JobDetailsModal from './JobDetailsModal';
import FreshMatches from './FreshMatches';

export default function JobSeekerDashboard() {
  // 1. STATE MANAGERS
  const [result, setResult] = useState(null);
  const tableRef = useRef(null);
  const [layouts, setLayouts] = useState({});
  const [listing, setListing] = useState({ keywords: '', view: 'active', typing: false });
  const [jobsError, setJobsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [applicationsError, setApplicationsError] = useState('');
  const [showStatusDebugger, setShowStatusDebugger] = useState(false);
  const [debugApplicationId, setDebugApplicationId] = useState('');
  const [debugStatus, setDebugStatus] = useState('Applied');
  const [debugStatusError, setDebugStatusError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function loadApplications() {
    setApplicationsError('');
    try {
      const response = await fetch('/api/applications', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) {
        setApplicationsError(data.error || 'Unable to load application statuses.');
        return;
      }
      setApplications(data);
    } catch (error) {
      setApplicationsError('Unable to load application statuses.');
    }
  }

  function handleApplied(jobId, applicationsCount) {
    setResult(current => current && ({ ...current, jobs: current.jobs.map(job =>
      job._id === jobId ? { ...job, applicationsCount } : job) }));
    loadApplications();
  }

  function openStatusDebugger() {
    setDebugStatusError('');
    setDebugApplicationId(currentId => currentId || applications[0]?._id || '');
    setShowStatusDebugger(true);
  }

  async function updateApplicationStatus(event) {
    event.preventDefault();
    if (!debugApplicationId || updatingStatus) return;

    setUpdatingStatus(true);
    setDebugStatusError('');
    try {
      const response = await fetch(`/api/applications/${debugApplicationId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: debugStatus })
      });
      const data = await response.json();
      if (!response.ok) {
        setDebugStatusError(data.error || 'Unable to update the application status.');
        return;
      }
      await loadApplications();
      setShowStatusDebugger(false);
    } catch (error) {
      setDebugStatusError('Unable to update the application status.');
    } finally {
      setUpdatingStatus(false);
    }
  }
  
  // NEW STATE FOR DEADLINES
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    const keywords = listing.keywords.trim();
    const debounce = listing.typing && Boolean(keywords);
    setLoading(true);
    setJobsError('');
    async function loadJobs() {
      const params = new URLSearchParams({ keywords, view: listing.view });
      try {
        const response = await fetch('/api/jobs/search?' + params, {
          method: debounce && listing.view === 'active' ? 'POST' : 'GET', signal: controller.signal
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) setResult({ jobs: data, view: listing.view, keywords });
      } catch {
        if (!controller.signal.aborted) setJobsError('Unable to load job listings. Please try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    const timer = window.setTimeout(loadJobs, debounce ? 150 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [listing]);

  useEffect(() => {
    loadApplications();
    
    // FETCH DEADLINES
    const fetchDeadlines = async () => {
        try {
            const res = await fetch('/api/jobs/upcoming-deadlines');
            const data = await res.json();
            setUpcomingDeadlines(data);
        } catch (err) {
            console.error("Failed to load deadlines", err);
        }
    };
    fetchDeadlines();
  }, []);

  const visibleResult = result?.view === listing.view ? result : null;
  const layout = layouts[listing.view];
  // Let the browser size columns from the full list once. If the first response
  // was filtered, replace that provisional layout when the full list is loaded.
  const measureColumns = visibleResult?.jobs.length > 0 &&
    (!layout || (!layout.fullList && !visibleResult.keywords));
  useLayoutEffect(() => {
    if (!measureColumns || !tableRef.current) return;
    const widths = Array.from(tableRef.current.tHead.rows[0].cells, cell => cell.getBoundingClientRect().width);
    const total = widths.reduce((sum, width) => sum + width, 0);
    if (!total) return;
    setLayouts(current => ({ ...current, [visibleResult.view]: {
      fullList: !visibleResult.keywords, widths: widths.map(width => 100 * width / total)
    } }));
  }, [measureColumns, visibleResult]);
  const columnWidths = !measureColumns && layout?.widths;

  const applicationsByJob = new Map(
    applications.map(application => [String(application.job?._id || application.job), application])
  );

  function getOpportunityStatus(job) {
    return applicationsByJob.get(String(job._id))?.status || job.status;
  }

  return (
    <section className="dashboard-main">
      <h1 className="dashboard-title">Job Seeker Dashboard</h1>

      <FreshMatches onView={setSelectedJobId} applicationsByJob={applicationsByJob} />

      {/* --- DEADLINE NOTIFICATION BANNER --- */}
      {upcomingDeadlines.length > 0 && (
        <div style={{ 
            backgroundColor: '#fff3cd', 
            color: '#856404', 
            padding: '15px', 
            borderRadius: '15px', 
            marginBottom: '20px',
            border: '1px solid #ffeeba'
        }}>
          <strong> Heads up!</strong> The following job postings are closing soon:
          <ul style={{ marginTop: '10px', marginBottom: '0',listStyleType: 'none' }}>
            {upcomingDeadlines.map(job => (
              <li key={job._id}>
                <strong>{job.title}</strong> at {job.company} - Deadline: {job.deadline}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="stats-section" aria-label="Application summary">
        <div className="stat-card stat-applied"><h3>Total Applied</h3><p className="stat-number">{applications.length}</p></div>
        <div className="stat-card stat-interviews"><h3>Interviews</h3><p className="stat-number">{applications.filter(application => application.status === 'Interview').length}</p></div>
        <div className="stat-card stat-offers"><h3>Offers</h3><p className="stat-number">{applications.filter(application => application.status === 'Offer').length}</p></div>
      </section>

      {applicationsError && <p className="dashboard-feedback-error" role="alert">{applicationsError}</p>}

      <button type="button" className="debug-status-button" onClick={openStatusDebugger} disabled={applications.length === 0}>
        Debug: update application status
      </button>

      {showStatusDebugger && (
        <div className="debug-modal-backdrop" role="presentation">
          <section className="debug-status-modal" role="dialog" aria-modal="true" aria-labelledby="debug-status-title">
            <div className="debug-status-modal-heading">
              <h2 id="debug-status-title">Update application status</h2>
              <button type="button" onClick={() => setShowStatusDebugger(false)} disabled={updatingStatus}>Close</button>
            </div>
            <p>Temporary testing control. Choose one of your applications and set its status.</p>
            <form onSubmit={updateApplicationStatus}>
              <label htmlFor="debug-application">Application</label>
              <select id="debug-application" value={debugApplicationId} onChange={event => setDebugApplicationId(event.target.value)} required>
                <option value="" disabled>Select an application</option>
                {applications.map(application => (
                  <option key={application._id} value={application._id}>
                    {application.job?.company || 'Unknown company'} — {application.job?.title || 'Unknown job'}
                  </option>
                ))}
              </select>
              <label htmlFor="debug-status">New status</label>
              <select id="debug-status" value={debugStatus} onChange={event => setDebugStatus(event.target.value)}>
                <option value="Applied">Applied</option>
                <option value="Interview">Interview</option>
                <option value="Rejected">Rejected</option>
                <option value="Offer">Offer</option>
              </select>
              {debugStatusError && <p className="debug-status-error" role="alert">{debugStatusError}</p>}
              <div className="debug-status-actions">
                <button type="button" onClick={() => setShowStatusDebugger(false)} disabled={updatingStatus}>Cancel</button>
                <button type="submit" className="debug-status-save" disabled={updatingStatus || !debugApplicationId}>
                  {updatingStatus ? 'Updating...' : 'Update status'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedJobId && (
        <JobDetailsModal key={selectedJobId} jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)} onApplied={handleApplied} />
      )}

      <section className="applications-section opportunities" aria-labelledby="opportunities-title">
        <div className="opportunities-heading">
          <h2 id="opportunities-title">Job Opportunities</h2>
          <div role="radiogroup" aria-label="Posting status" className="opportunities-views">
            {['active', 'past'].map(view => (
              <label key={view}>
                <input type="radio" name="posting-status" value={view} checked={listing.view === view}
                  onChange={() => setListing({ ...listing, view, typing: false })} />
                <span>{view === 'active' ? 'Active jobs' : 'Past jobs'}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="opportunities-search">
          Search jobs
          <input type="search" placeholder="Search by title, skill, or company" maxLength={200}
            value={listing.keywords} onChange={event =>
              setListing({ ...listing, keywords: event.target.value, typing: true })} />
        </label>
        
        <div className="opportunities-results" aria-busy={loading}>
          <table ref={tableRef} className="applications-table" style={{ tableLayout: columnWidths ? 'fixed' : 'auto' }}>
            {columnWidths && <colgroup>{columnWidths.map((width, index) =>
              <col key={index} style={{ width: width + '%' }} />)}</colgroup>}
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Department</th>
                <th>Applications</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {jobsError || !visibleResult?.jobs.length ? (
                <tr><td colSpan={5}>
                  {jobsError ? <p role="alert">{jobsError} <button type="button"
                    onClick={() => setListing({ ...listing, typing: false })}>Try again</button></p>
                    : !visibleResult ? <p role="status">Loading listings…</p>
                    : <p role="status">No {listing.view} jobs {visibleResult.keywords ? 'match your search.' : 'to show.'}</p>}
                </td></tr>
              ) : visibleResult.jobs.map((job) => (
                <tr key={job._id}>
                  <td className="company-name"><strong>{job.title}</strong><div>{job.company} · {job.location} · {job.jobType || 'Not specified'}</div></td>
                  <td>{job.department}</td>
                  <td>{job.applicationsCount} candidates</td>
                  <td>
                    <span className={`status-badge status-${String(getOpportunityStatus(job)).toLowerCase()}`}>
                      {getOpportunityStatus(job)}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="application-details-button" onClick={() => setSelectedJobId(job._id)} aria-label={`View details for ${job.title}`}>
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
