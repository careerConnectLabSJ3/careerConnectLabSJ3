import { useEffect, useState } from 'react';
import JobPostingForm from './JobPostingForm';
import '../public/css/recruiterDashboard.css';

export default function RecruiterDashboard() {
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingJob, setEditingJob] = useState(null);

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
        <div className="recruiter-section-heading">
          <h2 id="recruiter-postings-title">Your job postings</h2>
          {!loading && !error && <span>{jobs.length} {jobs.length === 1 ? 'posting' : 'postings'}</span>}
        </div>
        {error && (
          <div className="recruiter-feedback recruiter-feedback-error" role="alert">
            <p>{error}</p>
            <button className="recruiter-button" type="button" onClick={loadJobs}>Reload postings</button>
          </div>
        )}
        {loading ? <p className="recruiter-empty" role="status">Loading your postings...</p> : !error && (
          jobs.length === 0 ? <div className="recruiter-empty"><p>No job postings yet.</p><p>Your opportunities will appear here after you post a job.</p></div> : (
            <div className="recruiter-table-scroll" role="region" aria-label="Your job postings" tabIndex="0">
            <table className="recruiter-table">
              <thead>
                <tr>
                  <th scope="col">Job title</th>
                  <th scope="col">Department</th> {/* <-- RESTORED */}
                  <th scope="col" className="recruiter-number">Applications</th> {/* <-- RESTORED */}
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th> {/* <-- NEW */}
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
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
                      {/* Using the recruiter-button class to make them look consistent */}
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="recruiter-button" onClick={() => { setEditingJob(job); setShowJobForm(true); }}>
                          Edit
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
                        
                        <button className="recruiter-button" onClick={() => handleDelete(job._id)} style={{ color: 'red', borderColor: 'red' }}>
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