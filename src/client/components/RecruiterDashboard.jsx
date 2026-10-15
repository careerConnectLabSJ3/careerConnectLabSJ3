import { useEffect, useState } from 'react';
import JobPostingForm from './JobPostingForm';

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
    <section>
      <h2 id="welcome-message">Welcome to your Recruiter Dashboard</h2>
      <p>Manage your job postings and evaluate candidate submissions below.</p>
      <hr />
      <section className="dashboard-actions">
        <h3>Quick Actions</h3>
        <button type="button" disabled={loading} onClick={() => setShowJobForm(true)} aria-expanded={showJobForm} aria-controls="job-posting-form">Post a New Job Opportunity</button>
      </section>
      {showJobForm && <JobPostingForm onCancel={() => setShowJobForm(false)} onPosted={handlePosted} />}
      <section className="active-postings">
        <h3>Your Job Postings</h3>
        {error && (
          <div role="alert">
            <p>{error}</p>
            <button type="button" onClick={loadJobs}>Reload postings</button>
          </div>
        )}
        {loading ? <p>Loading your postings...</p> : !error && (
          jobs.length === 0 ? <p>You have not posted any jobs yet.</p> : (
            <table border="1" cellPadding="10">
              <thead>
                <tr><th>Job Title</th><th>Department</th><th>Applications Received</th><th>Status</th></tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job._id}>
                    <td>{job.title}</td>
                    <td>{job.department}</td>
                    <td>{job.applicationsCount}</td>
                    <td>{job.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </section>
    </section>
  );
}
