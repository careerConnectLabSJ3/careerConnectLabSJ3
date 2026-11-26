import { useCallback, useEffect, useRef, useState } from 'react';

export default function FreshMatches({ onView, applicationsByJob, searchRevision = 0 }) {
  const [result, setResult] = useState({ mode: 'search', jobs: [], message: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');
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
  const matches = pool.filter(job => !applicationsByJob.has(String(job._id)) &&
    (!location || job.location === location) && (!jobType || job.jobType === jobType)).slice(0, 4);
  const locations = [...new Set(pool.map(job => job.location).filter(Boolean))].sort();
  const types = [...new Set(pool.map(job => job.jobType).filter(Boolean))].sort();
  return (
    <section className="applications-section fresh-matches" aria-labelledby="fresh-title" aria-busy={loading}>
      <div className="matches-heading">
        <div><h2 id="fresh-title">Recommended jobs</h2>
          <p>{result.mode === 'ai' ? 'AI matches from your profile, resume and recent searches.' : 'Based only on your recent searches. AI is off.'}</p></div>
        <div className="matches-actions">
          <button type="button" disabled={loading} onClick={() => result.mode === 'ai' ? setConfirming(true) : load()}>Refresh recommendations</button>
          <button type="button" disabled={loading} onClick={() => setConfirming(true)}>{result.mode === 'ai' ? 'Run AI matching again' : 'Improve matches with AI'}</button>
          {result.mode === 'ai' && <button type="button" onClick={() => load()}>Use search-only matches</button>}
        </div>
      </div>
      {confirming && <div className="matches-confirmation" role="dialog" aria-labelledby="matching-consent-title" aria-describedby="matching-consent-description">
        <h3 id="matching-consent-title">Generate AI recommendations?</h3>
        <p id="matching-consent-description">This run sends your professional profile, uploaded resume (if any), recent keyword searches and job postings to Anthropic. Your resume may include contact details. Without a resume, AI uses your profile and searches. Each AI refresh requires your confirmation.</p>
        <button type="button" onClick={() => load(true)}>Confirm and generate AI matches</button>
        <button type="button" onClick={() => setConfirming(false)}>Cancel</button>
      </div>}
      <div className="matches-filters">
        <label>Recommendation location<select value={location} onChange={event => setLocation(event.target.value)}>
          <option value="">All locations</option>{[...new Set([...locations, ...(location ? [location] : [])])].map(value => <option key={value}>{value}</option>)}
        </select></label>
        <label>Recommendation job type<select value={jobType} onChange={event => setJobType(event.target.value)}>
          <option value="">All job types</option>{[...new Set([...types, ...(jobType ? [jobType] : [])])].map(value => <option key={value}>{value}</option>)}
        </select></label>
      </div>
      {loading && <p role="status">Loading recommendations…</p>}
      {error && <div role="alert"><p>{error}</p><button type="button" onClick={() => load()}>Use search-based recommendations</button></div>}
      {result.message && <p>{result.message}</p>}
      {!loading && !matches.length && <p role="status">No matching jobs to show. Try another search or adjust the recommendation filters.</p>}
      {error && result.jobs.length > 0 && <p>Showing your previous recommendations.</p>}
      <ul className="matches-grid">{matches.map(job => (
        <li key={job._id}>
          <button className="match-title" type="button" onClick={() => onView(job._id)}>{job.title}</button>
          <p>{job.company} · {job.location} · {job.jobType || 'Not specified'}</p>
          {job.recommendationType === 'discovery' && <strong>Broader suggestion</strong>}
          <p>{job.explanation}</p>
          {!!job.matchingSkills?.length && <p><strong>Matching skills: </strong>{job.matchingSkills.join(', ')}</p>}
          {!!job.missingQualifications?.length && <p><strong>Not evidenced in your profile or resume: </strong>{job.missingQualifications.join(', ')}</p>}
          <button type="button" onClick={() => onView(job._id)}>View, save or apply</button>
        </li>
      ))}</ul>
    </section>
  );
}
