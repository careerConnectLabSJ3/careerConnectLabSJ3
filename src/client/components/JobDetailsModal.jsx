import { useEffect, useState } from 'react';
import '../public/css/jobApplication.css';
import '../public/css/jobApplications.css';

function formatDate(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
}

function statusClass(status) {
  return `application-status application-status-${String(status).toLowerCase()}`;
}

export default function JobDetailsModal({ jobId, onClose, onApplied = () => {}, application = null }) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadDetails() {
      try {
        const response = await fetch(`/api/jobs/${jobId}/details`, { credentials: 'include' });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error || 'Unable to load this job. Close it and try again.');
          return;
        }
        setDetails(data);
      } catch (loadError) {
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
    } catch (submitError) {
      setError('Unable to confirm submission. Close and reopen this job to check before trying again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFavorite() {
    try{
      if(!details.isFavorite){
        const response = await fetch(`/api/jobs/${jobId}/favorite`, {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ confirmed: true })
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || 'Unable to favorite this job. Please try again.');
          return;
        }
        setDetails({ ...details, isFavorite: true });
      }
    } catch(e){
      console.error("Unable to favorite job:", e)
    }
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div className="job-details-modal-backdrop" role="presentation" onMouseDown={handleBackdropClick}>
      <div className="job-details-modal" role="dialog" aria-modal="true" aria-labelledby="application-job-title">
        <section className="job-application" aria-labelledby="application-job-title">
          <div className="job-application-heading">
            <h2 id="application-job-title">{details ? details.job.title : 'Job details'}</h2>
            <button type="button" onClick={handleFavorite}>Favourite</button>
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
                {application && (
                  <>
                    <dt>Applied on</dt><dd>{formatDate(application.appliedAt)}</dd>
                    <dt>Application status</dt>
                    <dd><span className={statusClass(application.status || 'Applied')}>{application.status || 'Applied'}</span></dd>
                    <dt>Job status</dt>
                    <dd><span className={statusClass(application.jobStatus || 'Closed')}>{application.jobStatus || 'Not available'}</span></dd>
                  </>
                )}
              </dl>
              <h3>Description</h3>
              <p className="job-application-text">{details.job.description || 'Not provided'}</p>
              <h3>Requirements</h3>
              <p className="job-application-text">{details.job.requirements || 'Not provided'}</p>
              {details.hasApplied ? (
                <p className="job-application-notice job-application-notice-applied" role="status">
                  <strong>Application already submitted</strong>
                  <span>You have already applied for this job.</span>
                </p>
              ) : !details.canApply ? (
                <p className="job-application-notice job-application-notice-closed" role="alert">
                  <strong>Applications are closed</strong>
                  <span>This job is no longer accepting applications.</span>
                </p>
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
      </div>
    </div>
  );
}
