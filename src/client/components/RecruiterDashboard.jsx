import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import JobPostingForm from './JobPostingForm';
import '../public/css/recruiterDashboard.css';

export default function RecruiterDashboard() {
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    setJobs(currentJobs => [job, ...currentJobs]);
  }

  return (
    <section className="recruiter-dashboard" aria-labelledby="recruiter-title">
      <div className="recruiter-page-heading">
        <div>
          <h1 id="recruiter-title">Recruiter dashboard</h1>
          <p>Post opportunities and keep track of your listings.</p>
        </div>
        <button className="recruiter-button recruiter-button-primary" type="button" disabled={loading} onClick={() => setShowJobForm(true)} aria-expanded={showJobForm} aria-controls="job-posting-form">Post a new job</button>
      </div>
      {showJobForm && <JobPostingForm onCancel={() => setShowJobForm(false)} onPosted={handlePosted} />}
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
                <tr><th scope="col">Job title</th><th scope="col">Department</th><th scope="col" className="recruiter-number">Applications</th><th scope="col">Status</th></tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                      <tr key={job._id}>
                        <th scope="row">{job.title}</th>
                        <td>{job.department}</td>
                        <td className="recruiter-number">
                          <Link
                            className="recruiter-button"
                            aria-label={`View applicants for ${job.title}`}
                            to={`/dashboard/jobs/${job._id}/applications`}
                          >
                            View applicants
                          </Link>
                        </td>
                        <td><span className={`recruiter-status ${job.status === 'Active' ? 'recruiter-status-active' : ''}`}>{job.status}</span></td>
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
