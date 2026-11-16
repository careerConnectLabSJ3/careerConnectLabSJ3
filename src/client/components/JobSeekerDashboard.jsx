import { useState, useEffect } from 'react';
import JobDetailsModal from './JobDetailsModal';

export default function JobSeekerDashboard() {
  // 1. STATE MANAGERS
  const [jobs, setJobs] = useState([]);
  const [searchTitle, setSearchTitle] = useState('');
  const [searchDept, setSearchDept] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
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
    setJobs(currentJobs => currentJobs.map(job => job._id === jobId ? { ...job, applicationsCount } : job));
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

  // 2. FETCH DATA FUNCTION
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/jobs/search?title=${searchTitle}&department=${searchDept}&location=${searchLocation}`);
      const data = await response.json();
      setJobs(data);
    }
    catch (error) {
      console.error("Error connecting to search API:", error);
    }
    finally {
      setLoading(false);
    }
  };

  // 3. HOOK: Run automatically when the dashboard mounts
  useEffect(() => {
    fetchJobs();
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

  const applicationsByJob = new Map(
    applications.map(application => [String(application.job?._id || application.job), application])
  );

  function getOpportunityStatus(job) {
    return applicationsByJob.get(String(job._id))?.status || job.status;
  }

  return (
    <section className="dashboard-main">
      <h1 className="dashboard-title">Job Seeker Dashboard</h1>

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

      {/* --- SEARCH & FILTER INTERFACE SECTION --- */}
      <section className="search-section" style={{ margin: '20px 0', display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="Search by job title..." 
          value={searchTitle}
          onChange={(e) => setSearchTitle(e.target.value)}
          style={{ padding: '8px', width: '250px' }}
        />
        <input 
          type="text" 
          placeholder="Filter by department..." 
          value={searchDept}
          onChange={(e) => setSearchDept(e.target.value)}
          style={{ padding: '8px', width: '200px' }}
        />
        <input 
          type="text" 
          placeholder="Filter by location..." 
          value={searchLocation}
          onChange={(e) => setSearchLocation(e.target.value)}
          style={{ padding: '8px', width: '200px' }}
        />
        <button onClick={fetchJobs} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          Search Jobs
        </button>
      </section>

      {selectedJobId && (
        <JobDetailsModal key={selectedJobId} jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)} onApplied={handleApplied} />
      )}

      <section className="applications-section">
        <h2>Job Opportunities</h2>
        
        {loading ? (
          <p>Loading active job listings...</p>
        ) : jobs.length === 0 ? (
          <p>No jobs found matching those search criteria.</p>
        ) : (
          <table className="applications-table">
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
              {jobs.map((job) => (
                <tr key={job._id}>
                  <td className="company-name"><strong>{job.title}</strong></td>
                  <td>{job.department}</td>
                  <td>{job.applicationsCount} candidates</td>
                  <td>
                    <span className={`status-badge status-${String(getOpportunityStatus(job)).toLowerCase()}`}>
                      {getOpportunityStatus(job)}
                    </span>
                  </td>
                  <td>
                    <button type="button" onClick={() => setSelectedJobId(job._id)} aria-label={`View details for ${job.title}`}>
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}
