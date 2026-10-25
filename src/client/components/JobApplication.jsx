import { useEffect, useState } from 'react';
import '../public/css/jobApplication.css';

export default function JobApplication({ jobId, onClose, onApplied }) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadDetails() {
      try {
        const response = await fetch(`/api/jobs/${jobId}`, { credentials: 'include' });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error || 'Unable to load this job. Close it and try again.');
          return;
        }
        setDetails(data);
      } catch (error) {
        if (!cancelled) setError('Unable to load this job. Close it and try again.');
      }
    }
    loadDetails();
    return () => { cancelled = true; };
  }, [jobId]);

  async function handleApply() {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/jobs/${jobId}/applications`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to submit your application. Please try again.');
        return;
      }
      setDetails({ ...details, hasApplied: true });
      setConfirming(false);
      setMessage('Application submitted successfully.');
      onApplied(jobId, data.applicationsCount);
    } catch (error) {
      setError('Unable to confirm submission. Close and reopen this job to check before trying again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="job-application" aria-labelledby="application-job-title">
      <div className="job-application-heading">
        <h2 id="application-job-title">{details ? details.job.title : 'Job details'}</h2>
        <button type="button" disabled={submitting} onClick={onClose}>Close details</button>
      </div>
      {error && <p className="job-application-error" role="alert">{error}</p>}
      {message && <p className="job-application-success" role="status">{message}</p>}
      {!details && !error && <p role="status">Loading job details...</p>}
      {details && (
        <>
          <dl>
            <dt>Company</dt><dd>{details.job.company || 'Not provided'}</dd>
            <dt>Location</dt><dd>{details.job.location || 'Not provided'}</dd>
            <dt>Department</dt><dd>{details.job.department}</dd>
            <dt>Application deadline</dt><dd>{details.job.deadline || 'Not provided'}</dd>
          </dl>
          <h3>Description</h3>
          <p className="job-application-text">{details.job.description || 'Not provided'}</p>
          <h3>Requirements</h3>
          <p className="job-application-text">{details.job.requirements || 'Not provided'}</p>
          {details.hasApplied ? <p>You have already applied for this job.</p> : !details.canApply ? (
            <p>This job is no longer accepting applications.</p>
          ) : confirming ? (
            <div className="job-application-confirmation">
              <p>Submit your application to {details.job.company}? Your CareerConnect profile will be available to this job's recruiter.</p>
              <div className="job-application-actions">
                <button type="button" className="job-application-primary" disabled={submitting} onClick={handleApply}>
                  {submitting ? 'Submitting...' : 'Confirm application'}
                </button>
                <button type="button" disabled={submitting} onClick={() => setConfirming(false)}>Cancel</button>
              </div>
            </div>
          ) : <button type="button" className="job-application-primary" onClick={() => setConfirming(true)}>Apply</button>}
        </>
      )}
    </section>
  );
}
