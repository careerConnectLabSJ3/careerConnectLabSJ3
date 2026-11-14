import { useEffect, useState } from 'react';
import JobPostingForm from './JobPostingForm';
import '../public/css/recruiterDashboard.css';

export default function RecruiterDashboard() {
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingJob, setEditingJob] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  async function loadJobs() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/jobs/mine', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to load your job postings.');
        return;
      }
      setJobs(data);
    } catch (error) {
      setError('Unable to load your job postings. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  function handlePosted(job) {
    if (editingJob) {
      setJobs(currentJobs => currentJobs.map(j => j._id === job._id ? job : j));
    } else {
      setJobs(currentJobs => [job, ...currentJobs]);
    }
    setShowJobForm(false);
    setEditingJob(null);
  }

  async function handleDelete(jobId) {
    if (!window.confirm("Are you sure you want to delete this job? This cannot be undone.")) return;
    try {
      const response = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) {
        setJobs(currentJobs => currentJobs.filter(j => j._id !== jobId));
      } else {
        alert("Failed to delete the job.");
      }
    } catch (err) {
      alert("Error deleting job.");
    }
  }

  async function handleStatusChange(jobId, newStatus) {
    try {
      const response = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (response.ok) {
        setJobs(currentJobs => currentJobs.map(j => j._id === jobId ? data.job : j));
      } else {
        alert(data.error || "Failed to change status.");
      }
    } catch (err) {
      alert("Error changing status.");
    }
  }

  async function handleDuplicate(jobId) {
    try {
      const response = await fetch(`/api/jobs/${jobId}/duplicate`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setJobs(currentJobs => [data.job, ...currentJobs]);
      } else {
        alert(data.error || "Failed to duplicate the job.");
      }
    } catch (err) {
      alert("Error duplicating job.");
    }
  }

  // Helper to get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Filter the jobs based on the toggle
  const filteredJobs = jobs.filter(job => {
    // If the deadline is before today, it's expired (archived)
    const isExpired = job.deadline < today;
    
    // If showArchived is true, show ONLY expired. If false, show ONLY active.
    return showArchived ? isExpired : !isExpired;
  });

  return (
    <section className="recruiter-dashboard" aria-labelledby="recruiter-title">
      <div className="recruiter-page-heading">
        <div>
          <h1 id="recruiter-title">Recruiter dashboard</h1>
          <p>Post opportunities and keep track of your listings.</p>
        </div>
        <button className="recruiter-button recruiter-button-primary" type="button" disabled={loading} onClick={() => { setEditingJob(null); setShowJobForm(true); }} aria-expanded={showJobForm} aria-controls="job-posting-form">
          Post a new job
        </button>
      </div>
      
      {showJobForm && (
        <JobPostingForm 
          onCancel={() => { setShowJobForm(false); setEditingJob(null); }} 
          onPosted={handlePosted} 
          editingJob={editingJob}
        />
      )}
      
      <section className="recruiter-postings" aria-labelledby="recruiter-postings-title">
        
        {/* UPDATED HEADING SECTION WITH TOGGLE BUTTON */}
        <div className="recruiter-section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h2 id="recruiter-postings-title" style={{ margin: 0 }}>Your job postings</h2>
            {!loading && !error && <span style={{ fontSize: '0.9em', color: '#666' }}>{filteredJobs.length} {filteredJobs.length === 1 ? 'posting' : 'postings'}</span>}
          </div>
          
          <button 
            type="button" 
            className="recruiter-button" 
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? '← Back to Active Jobs' : 'View Archived Jobs'}
          </button>
        </div>

        {error && (
          <div className="recruiter-feedback recruiter-feedback-error" role="alert">
            <p>{error}</p>
            <button className="recruiter-button" type="button" onClick={loadJobs}>Reload postings</button>
          </div>
        )}
        
        {loading ? <p className="recruiter-empty" role="status">Loading your postings...</p> : !error && (
          filteredJobs.length === 0 ? (
            <div className="recruiter-empty">
              <p>{showArchived ? 'No archived jobs found.' : 'No active job postings yet.'}</p>
              {!showArchived && <p>Your opportunities will appear here after you post a job.</p>}
            </div> 
          ) : (
            <div className="recruiter-table-scroll" role="region" aria-label="Your job postings" tabIndex="0">
            <table className="recruiter-table">
              <thead>
                <tr>
                  <th scope="col">Job title</th>
                  <th scope="col">Department</th> 
                  <th scope="col" className="recruiter-number" style={{ whiteSpace: 'nowrap' }}>Applications</th>  
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: 'center' }}>Actions</th> 
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map(job => (
                  <tr key={job._id}>
                    <th scope="row">{job.title}</th>
                    <td>{job.department}</td>
                    <td className="recruiter-number">{job.applicationsCount}</td>
                    <td>
                      <span className={`recruiter-status ${job.status === 'Active' ? 'recruiter-status-active' : ''}`}>
                        {job.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
                        <button className="recruiter-button" onClick={() => { setEditingJob(job); setShowJobForm(true); }}>
                          Edit
                        </button>

                        <button className="recruiter-button" onClick={() => handleDuplicate(job._id)}>
                          Duplicate
                        </button>
                        
                        {job.status === 'Active' && (
                          <button className="recruiter-button" onClick={() => handleStatusChange(job._id, 'Closed')}>
                            Close
                          </button>
                        )}
                        {job.status === 'Draft' && (
                          <button className="recruiter-button" onClick={() => handleStatusChange(job._id, 'Active')}>
                            Publish
                          </button>
                        )}
                        
                        <button className="recruiter-button" onClick={() => handleDelete(job._id)} style={{ color: 'red', borderColor: 'red',display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap', justifyContent: 'flex-end', width: '100%' }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )
        )}
      </section>
    </section>
  );
}