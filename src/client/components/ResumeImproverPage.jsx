import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ResumeFeedback from './ResumeFeedback';

export default function ResumeImproverPage() {
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function loadResume() {
      try {
        const response = await fetch('/api/user-profile', {
          credentials: 'include', signal: controller.signal
        });
        if (!response.ok) throw new Error('Unable to load your resume.');
        const profile = await response.json();
        if (!controller.signal.aborted) setResume(profile.resume || null);
      } catch {
        if (!controller.signal.aborted) setError('Unable to load your resume. Refresh the page to try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadResume();
    return () => controller.abort();
  }, []);

  return (
    <>
      <div className="resume-improver-nav">
        <Link to="/profile">← Back to profile</Link>
        {loading && <p role="status">Loading your resume…</p>}
        {error && <p className="resume-review-error" role="alert">{error}</p>}
        {message && <p className="resume-save-message" role="status">{message}</p>}
      </div>
      {!loading && !error && (
        <ResumeFeedback key={resume?.version || resume?.uploadedAt || 'no-resume'} resume={resume}
          onResumeSaved={(updated, notice) => { setResume(updated); setMessage(notice); }} />
      )}
    </>
  );
}
