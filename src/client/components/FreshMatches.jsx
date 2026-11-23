import { useEffect, useState } from 'react';

export default function FreshMatches({ onView, applicationsByJob }) {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    let controller;
    async function refresh() {
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;
      try {
        const response = await fetch('/api/jobs/recommendations', { signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!signal.aborted) {
          setJobs(data);
          setError(false);
        }
      } catch {
        if (!signal.aborted) setError(true);
      }
    }
    refresh();
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      controller.abort();
      window.removeEventListener('focus', refresh);
      window.clearInterval(timer);
    };
  }, []);

  const matches = jobs.filter(job => !applicationsByJob.has(String(job._id)));
  if (error) return <p role="alert">Unable to refresh new job matches.</p>;
  if (!matches.length) return null;
  return (
    <section className="applications-section fresh-matches" aria-labelledby="fresh-title">
      <h2 id="fresh-title">New jobs matching your recent searches</h2>
      <ul>{matches.map(job => (
        <li key={job._id}>
          <button type="button" onClick={() => onView(job._id)}>{job.title}</button>
          <p>{job.company} · {job.location} · {job.jobType}</p>
          <small>Matches your search “{job.sourceSearch}”</small>
        </li>
      ))}</ul>
    </section>
  );
}
