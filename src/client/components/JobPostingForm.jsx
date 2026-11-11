import { useState } from 'react';
import '../public/css/jobPosting.css';

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function JobPostingForm({ onCancel, onPosted, editingJob = null }) {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function clearMessage() {
    setError('');
    setMessage('');
  }

  // actionType is either 'Active' (Post/Publish) or 'Draft' (Save Draft)
  async function handleSubmit(event, actionType) {
    event.preventDefault();
    if (submitting) return;
    clearMessage();
    const form = event.currentTarget;

    const formData = new FormData(form);
    const dataObj = Object.fromEntries(formData);
    dataObj.status = actionType; // Add the status dynamically

    // Validation
    if (actionType === 'Active') {
        for (const value of formData.values()) {
            if (!value.trim()) {
                setError('Please fill in every field to publish.');
                return;
            }
        }
        if (formData.get('deadline') < getTodayDate()) {
            setError('The application deadline must be today or a future date to publish.');
            return;
        }
    }

    setSubmitting(true);
    
   
    const url = editingJob ? `/api/jobs/${editingJob._id}` : '/api/jobs';
    const method = editingJob ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataObj)
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to save your job. Please try again.');
        return;
      }
      form.reset();
      setMessage(editingJob ? 'Job updated successfully.' : 'Job posted successfully.');
      onPosted(data.job);
    } catch (err) {
      setError('Unable to confirm the posting. Check your job list before trying again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="job-posting-form" className="job-posting" aria-labelledby="job-posting-title">
      <h2 id="job-posting-title">{editingJob ? 'Edit job posting' : 'Create a job posting'}</h2>
      
      <form onSubmit={(e) => handleSubmit(e, 'Active')} onChange={clearMessage}>
        <fieldset className="job-posting-grid" disabled={submitting}>
        
        <div className="job-posting-field">
          <label htmlFor="job-title">Job title</label>
          <input id="job-title" name="title" type="text" defaultValue={editingJob?.title || ''} required />
        </div>

        <div className="job-posting-field">
          <label htmlFor="job-company">Company</label>
          <input id="job-company" name="company" type="text" defaultValue={editingJob?.company || ''} required />
        </div>

        <div className="job-posting-field">
          <label htmlFor="job-department">Department</label>
          <input id="job-department" name="department" type="text" defaultValue={editingJob?.department || ''} required />
        </div>

        <div className="job-posting-field">
          <label htmlFor="job-location">Location</label>
          <input id="job-location" name="location" type="text" defaultValue={editingJob?.location || ''} required />
        </div>

        <div className="job-posting-field job-posting-wide">
          <label htmlFor="job-description">Description</label>
          <textarea id="job-description" name="description" rows="4" defaultValue={editingJob?.description || ''} required />
        </div>

        <div className="job-posting-field job-posting-wide">
          <label htmlFor="job-requirements">Requirements</label>
          <textarea id="job-requirements" name="requirements" rows="4" defaultValue={editingJob?.requirements || ''} required />
        </div>

        <div className="job-posting-field">
          <label htmlFor="job-deadline">Application deadline</label>
          <input id="job-deadline" name="deadline" type="date" defaultValue={editingJob?.deadline || ''} min={getTodayDate()} required />
        </div>

        {error && <p className="job-posting-error" role="alert">{error}</p>}
        {message && <p className="job-posting-message" role="status">{message}</p>}

        <div className="job-posting-actions">
          {/* Publish/Update Button */}
          <button className="recruiter-button recruiter-button-primary" type="submit">
            {submitting ? 'Saving...' : (editingJob ? 'Save Changes' : 'Post Job')}
          </button>

          {/* Save as Draft Button */}
          <button className="recruiter-button" type="button" disabled={submitting} onClick={(e) => handleSubmit(e, 'Draft')}>
            Save as Draft
          </button>

          <button className="recruiter-button" type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
        </div>
        </fieldset>
      </form>
    </section>
  );
}