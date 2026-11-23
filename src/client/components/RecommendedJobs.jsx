import { useEffect, useState } from 'react';

export default function RecommendedJobs({ onView }) {
  const [keywords, setKeywords] = useState('');
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const query = keywords.trim();

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ keywords: query });
        const response = await fetch(`/api/jobs/recommendations?${params}`, {
          credentials: 'include', signal: controller.signal
        });
        if (!response.ok) throw new Error('Search failed');
        const jobs = await response.json();
        if (!controller.signal.aborted) setResult({ query, jobs });
      } catch {
        if (!controller.signal.aborted) setResult({ query, error: true });
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, attempt]);

  const current = result?.query === query ? result : null;
  return (
    <section className="applications-section recommendations" aria-labelledby="recommendations-title">
      <h2 id="recommendations-title">Recommended jobs</h2>
      <label htmlFor="recommendation-keywords">Search by keyword</label>
      <input id="recommendation-keywords" type="search" maxLength={200} value={keywords}
        placeholder="Job title, skill, or company" onChange={event => {
          setKeywords(event.target.value);
          if (event.target.value.trim() !== query) setResult(null);
        }} />
      {!query && <p>Enter one or more keywords to find open jobs.</p>}
      {query && !current && <p role="status">Searching for recommended jobs…</p>}
      {current?.error && <p role="alert">Unable to load recommended jobs. <button type="button"
        onClick={() => { setResult(null); setAttempt(value => value + 1); }}>Try again</button></p>}
      {current?.jobs?.length === 0 && <p role="status">No recommended jobs match “{query}”. Try a different keyword.</p>}
      {current?.jobs?.length > 0 && (
        <ul>{current.jobs.map(job => (
          <li key={job._id}>
            <h3>{job.title}</h3>
            <p>{job.company} · {job.location} · {job.jobType}</p>
            <p>Matching keywords: {job.matchedKeywords.join(', ')}</p>
            <button type="button" onClick={() => onView(job._id)}>View details, save or apply</button>
          </li>
        ))}</ul>
      )}
    </section>
  );
}
