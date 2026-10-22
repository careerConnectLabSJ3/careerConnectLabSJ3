import { useState } from 'react';
import '../public/css/jobPosting.css';

function getTodayDate() {
  // Use the recruiter's local calendar date, rather than UTC.
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function JobPostingForm({ onCancel, onPosted }) {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function clearMessage() {
    setError('');
    setMessage('');
  }

  async function handlePost(event) {
    event.preventDefault();
    if (submitting) return;
    clearMessage();
    const form = event.currentTarget;

    // The browser checks required fields first. Also reject spaces-only text.
    const formData = new FormData(form);
    for (const value of formData.values()) {
      if (!value.trim()) {
        setError('Please fill in every field. Text fields cannot contain only spaces.');
        return;
      }
    }

    if (formData.get('deadline') < getTodayDate()) {
      setError('The application deadline must be today or a future date.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData))
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to post your job. Please try again.');
        return;
      }
      form.reset();
      setMessage('Job posted successfully. Job seekers can now find it in search.');
      onPosted(data.job);
    } catch (error) {
      setError('Unable to confirm the posting. Check your job list before trying again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="job-posting-form" className="job-posting" aria-labelledby="job-posting-title">
      <h3 id="job-posting-title">Create a Job Posting</h3>
      <p id="job-posting-note">All fields are required. Your job will be visible to job seekers after posting.</p>

      <form onSubmit={handlePost} onChange={clearMessage} aria-describedby="job-posting-note">
        <fieldset disabled={submitting}>
        <div className="job-posting-field">
          <label htmlFor="job-title">Job title</label>
          <input id="job-title" name="title" type="text" required />
        </div>

        <div className="job-posting-field">
          <label htmlFor="job-company">Company</label>
          <input id="job-company" name="company" type="text" required />
        </div>

        <div className="job-posting-field">
          <label htmlFor="job-department">Department</label>
          <input id="job-department" name="department" type="text" placeholder="For example, Engineering" required />
        </div>

        <div className="job-posting-field">
          <label htmlFor="job-location">Location</label>
          <input id="job-location" name="location" type="text" placeholder="For example, Montreal or Remote" required />
        </div>

        <div className="job-posting-field">
          <label htmlFor="job-description">Description</label>
          <textarea id="job-description" name="description" rows="4" required />
        </div>

        <div className="job-posting-field">
          <label htmlFor="job-requirements">Requirements</label>
          <textarea id="job-requirements" name="requirements" rows="4" required />
        </div>

        <div className="job-posting-field">
          <label htmlFor="job-deadline">Application deadline</label>
          <input id="job-deadline" name="deadline" type="date" min={getTodayDate()} required />
        </div>

        {error && <p className="job-posting-error" role="alert">{error}</p>}
        {message && <p className="job-posting-message" role="status">{message}</p>}

        <div className="job-posting-actions">
          <button className="btn btn-primary" type="submit">{submitting ? 'Posting...' : 'Post job'}</button>
          <button className="btn" type="button" onClick={onCancel}>Cancel</button>
        </div>
        </fieldset>
      </form>
    </section>
  );
}
