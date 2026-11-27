import { useCallback, useEffect, useRef, useState } from 'react';

export default function FreshMatches({ onView, applicationsByJob, searchRevision = 0 }) {
  const [result, setResult] = useState({ mode: 'search', jobs: [], message: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const request = useRef(null);
  const mode = useRef('search');
  const load = useCallback(async (ai = false) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    setConfirming(false);
    try {
      const response = await fetch('/api/jobs/matches', {
        method: ai ? 'POST' : 'GET', credentials: 'include', signal: controller.signal,
        ...(ai ? { headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'confirm-ai-matching' }) } : {})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load recommendations.');
      if (!controller.signal.aborted) {
        mode.current = data.mode;
        setResult(data);
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || 'Unable to load recommendations.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode.current === 'search') load();
  }, [load, searchRevision]);
  useEffect(() => () => request.current?.abort(), []);

  const pool = [...result.jobs, ...(result.alternatives || [])];
  const matches = pool.filter(job => !applicationsByJob.has(String(job._id))).slice(0, 4);
  return (
    <section className="applications-section fresh-matches" aria-labelledby="fresh-title" aria-busy={loading}>
      <div className="matches-heading">
        <div><h2 id="fresh-title">Recommended jobs</h2>
          <p className="matches-description">{result.mode === 'ai' ? 'AI matches from your profile, resume and recent searches.' : 'Based only on your recent searches. AI is off.'}</p></div>
        <div className="matches-actions">
          <button type="button" disabled={loading} onClick={() => result.mode === 'ai' ? setConfirming(true) : load()}><span aria-hidden="true">↻</span> Refresh</button>
          <button className="matches-ai-button" type="button" disabled={loading} onClick={() => setConfirming(true)}><span aria-hidden="true">✦</span> {result.mode === 'ai' ? 'Rerun AI' : 'AI match'}</button>
          {result.mode === 'ai' && <button type="button" onClick={() => load()}><span aria-hidden="true">⌕</span> Search only</button>}
        </div>
      </div>
      {confirming && <div className="matches-confirmation" role="dialog" aria-labelledby="matching-consent-title" aria-describedby="matching-consent-description">
        <h3 id="matching-consent-title">Generate AI recommendations?</h3>
        <p id="matching-consent-description">This run sends your professional profile, uploaded resume (if any), recent keyword searches and job postings to Anthropic. Your resume may include contact details. Without a resume, AI uses your profile and searches. Each AI refresh requires your confirmation.</p>
        <button type="button" onClick={() => load(true)} className="matches-ai-button"><span aria-hidden="true">✦</span> Generate matches</button>
        <button type="button" onClick={() => setConfirming(false)}><span aria-hidden="true">×</span> Cancel</button>
      </div>}
      {loading && <p className="matches-description" role="status">Loading recommendations…</p>}
      {error && <div className="matches-error" role="alert"><p>{error}</p><button type="button" onClick={() => load()}><span aria-hidden="true">↻</span> Retry search</button></div>}
      {result.message && <p className="matches-note">{result.message}</p>}
      {!loading && !matches.length && <p className="matches-description" role="status">No matching jobs to show. Try searching for a different role or skill.</p>}
      {error && result.jobs.length > 0 && <p className="matches-description">Showing your previous recommendations.</p>}
      <ul className="matches-grid">{matches.map(job => (
        <li key={job._id}>
          <button className="match-title" type="button" onClick={() => onView(job._id)}>{job.title}</button>
          {job.recommendationType === 'discovery' && <span className="match-discovery"><span aria-hidden="true">✧</span> Broader suggestion</span>}
          <p className="match-explanation">{job.explanation}</p>
          {!!job.matchingSkills?.length && <div className="match-skills"><strong><span aria-hidden="true">✓</span> Matching skills</strong><div className="match-skill-list">{job.matchingSkills.map(skill => <span className="match-skill" key={skill}>{skill}</span>)}</div></div>}
          {!!job.missingQualifications?.length && <p className="match-qualifications"><strong><span aria-hidden="true">ⓘ</span> Not evidenced in your profile or resume: </strong>{job.missingQualifications.join(', ')}</p>}
          <button className="match-view" type="button" onClick={() => onView(job._id)} aria-label={`View ${job.title}`}>View job <span aria-hidden="true">→</span></button>
        </li>
      ))}</ul>
    </section>
  );
}
