import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import JobDetailsModal from './JobDetailsModal';
import FreshMatches from './FreshMatches';

export default function JobSeekerDashboard() {
  // 1. STATE MANAGERS
  const [result, setResult] = useState(null);
  const tableRef = useRef(null);
  const [minResultsHeight, setMinResultsHeight] = useState(0);
  const [layouts, setLayouts] = useState({});
  const [listing, setListing] = useState({ keywords: '', view: 'all', typing: false });
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('latest');
  const [jobsError, setJobsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [applicationsError, setApplicationsError] = useState('');
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [searchRevision, setSearchRevision] = useState(0);
  const lastSavedSearch = useRef('');

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
          method: 'GET', signal: controller.signal
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) {
          setResult({ jobs: data, view: listing.view, keywords });
          setPage(1);
        }
      } catch {
        if (!controller.signal.aborted) setJobsError('Unable to load job listings. Please try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    const timer = window.setTimeout(loadJobs, debounce ? 150 : 0);
    // Listing refreshes are read-only. Save only after typing has settled.
    const historyTimer = debounce && listing.view !== 'past' ? window.setTimeout(async () => {
      if (keywords.toLowerCase() === lastSavedSearch.current) return;
      try {
        const response = await fetch('/api/jobs/search?' + new URLSearchParams({ keywords, view: 'active' }), {
          method: 'POST', signal: controller.signal
        });
        if (response.ok && !controller.signal.aborted) {
          lastSavedSearch.current = keywords.toLowerCase();
          setSearchRevision(value => value + 1);
        }
      } catch { /* A failed history save must not hide search results. */ }
    }, 1200) : null;
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(historyTimer);
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
  const publishedTime = job => Math.max(Date.parse(job.publishedAt) || 0,
    Date.parse(job.publishDate) || 0,
    /^[a-f0-9]{24}$/i.test(job._id) ? parseInt(job._id.slice(0, 8), 16) * 1000 : 0);
  const sortedJobs = [...(visibleResult?.jobs || [])].sort((a, b) => {
    const newest = publishedTime(b) - publishedTime(a) || String(b._id).localeCompare(String(a._id));
    if (sort === 'oldest') return -newest;
    if (sort === 'title') return a.title.localeCompare(b.title) || newest;
    return newest;
  });
  const pageCount = Math.max(1, Math.ceil(sortedJobs.length / 25));
  const currentPage = Math.min(page, pageCount);
  const pageJobs = sortedJobs.slice((currentPage - 1) * 25, currentPage * 25);
  const layout = layouts[listing.view];
  // Let the browser size columns from the first page once. If the first response
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

  function switchView(view) {
    // A shorter list can leave too little document below the viewport to retain
    // scrollY. Reserve just that space, while allowing longer lists to grow.
    const results = tableRef.current.parentElement;
    const distanceBelowViewport = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
    setMinResultsHeight(window.scrollY > 0
      ? Math.max(0, Math.ceil(results.offsetHeight - distanceBelowViewport))
      : 0);
    setPage(1);
    setListing({ ...listing, view, typing: false });
  }

  return (
    <section className="dashboard-main">
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

      <h1 className="dashboard-title">Job Seeker Dashboard</h1>

      <FreshMatches onView={setSelectedJobId} applicationsByJob={applicationsByJob} searchRevision={searchRevision} />

      <section className="stats-section" aria-label="Application summary">
        <div className="stat-card stat-applied"><h3>Total Applied</h3><p className="stat-number">{applications.length}</p></div>
        <div className="stat-card stat-interviews"><h3>Interviews</h3><p className="stat-number">{applications.filter(application => application.status === 'Interview').length}</p></div>
        <div className="stat-card stat-offers"><h3>Offers</h3><p className="stat-number">{applications.filter(application => application.status === 'Offer').length}</p></div>
      </section>

      {applicationsError && <p className="dashboard-feedback-error" role="alert">{applicationsError}</p>}

      {selectedJobId && (
        <JobDetailsModal key={selectedJobId} jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)} onApplied={handleApplied} />
      )}

      <section className="applications-section opportunities" aria-labelledby="opportunities-title">
        <div className="opportunities-heading">
          <h2 id="opportunities-title">Job Opportunities</h2>
          <div role="radiogroup" aria-label="Posting status" className="opportunities-views">
            {['all', 'active', 'past'].map(view => (
              <label key={view}>
                <input type="radio" name="posting-status" value={view} checked={listing.view === view}
                  onChange={() => switchView(view)} />
                <span>{view === 'all' ? 'All jobs' : view === 'active' ? 'Active jobs' : 'Closed jobs'}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="opportunities-tools">
          <label className="opportunities-sort"><span aria-hidden="true">&#8597;</span>
            <select aria-label="Sort jobs" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}>
              <option value="latest">Newest</option><option value="oldest">Oldest</option><option value="title">Title A–Z</option>
            </select>
          </label>
        </div>
        <label className="opportunities-search">
          Search jobs
          <input type="search" placeholder="Search by title, skill, or company" maxLength={200}
            value={listing.keywords} onChange={event =>
              setListing({ ...listing, keywords: event.target.value, typing: true })} />
        </label>
        
        <div className="opportunities-results" role="region" aria-label="Job listings" tabIndex={0} aria-busy={loading}
          style={{ minHeight: minResultsHeight }}>
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
                    : <p role="status">No {listing.view === 'all' ? '' : listing.view === 'past' ? 'closed' : 'active'} jobs {visibleResult.keywords ? 'match your search.' : 'to show.'}</p>}
                </td></tr>
              ) : pageJobs.map((job) => (
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
        {!jobsError && sortedJobs.length > 25 && <nav className="opportunities-pagination" aria-label="Job listing pages">
          <button type="button" aria-label="Previous page" title="Previous page" disabled={loading || currentPage === 1} onClick={() => setPage(currentPage - 1)}>&lsaquo;</button>
          <span role="status" aria-live="polite">{currentPage} / {pageCount}</span>
          <button type="button" aria-label="Next page" title="Next page" disabled={loading || currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>&rsaquo;</button>
        </nav>}
      </section>
    </section>
  );
}
