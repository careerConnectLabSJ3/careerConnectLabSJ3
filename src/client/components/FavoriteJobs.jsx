import { useState, useEffect, useMemo } from 'react';

export default function FavoriteJobs() {

  const FILTERS = [
  { value: 'all', label: 'All applications' },
  { value: 'Open', label: 'Open' },
  { value: 'Closed', label: 'Closed' }
];

  const [favoriteJobs, setFavoriteJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');


  async function fetchFavoriteJobs() {
    try {
      const response = await fetch('/api/favorite-jobs', { credentials: 'include' });
      if (!response.ok) {
        setError('Failed to fetch favorite jobs');
        throw new Error('Failed to fetch favorite jobs');
      }
      const data = await response.json();
      setFavoriteJobs(data);
    } catch (error) {
      console.error('Error fetching favorite jobs:', error);
      setError('Failed to fetch favorite jobs');
    }
  }

  useEffect(() => {
    fetchFavoriteJobs().finally(() => setLoading(false));
  }, []);

  const filteredFavorites = useMemo(() => {
      if (filter === 'all') return favoriteJobs;
      return favoriteJobs.filter(job => job.status === filter);
    }, [favoriteJobs, filter]);

  return(
    <section className="job-applications-page">
      <div className="job-applications-heading">
        <div>
          <h1 id="job-applications-title">My Saved Jobs</h1>
          <p>Keep all of your favorite jobs for future viewing.</p>
        </div>
        <span className="job-applications-count">
          {favoriteJobs.length} {favoriteJobs.length === 1 ? 'job' : 'jobs'}
        </span>
      </div>

      <nav className="application-filters" aria-label="Filter applications">
        {FILTERS.map(option => (
          <button
            key={option.value}
            type="button"
            className={filter === option.value ? 'application-filter is-selected' : 'application-filter'}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <p className="job-application-empty" role="status">Loading your saved jobs...</p>
      ) : !error && filteredFavorites.length === 0 ? (
        <div className="application-empty">
          <h2>{favoriteJobs.length === 0 ? 'No favorited jobs yet' : 'No matching favorite jobs'}</h2>
          <p>{favoriteJobs.length === 0 ? 'Jobs you favorite will appear here.' : 'Try another status filter.'}</p>
        </div>
      ) : !error && (
        <div className="application-table-scroll" role="region" aria-label="My Favorited Jobs" tabIndex="0">
          <table className="job-applications-table">
            <thead>
              <tr>
                <th scope="col">Job Title</th>
                <th scope="col">Company</th>
                <th scope="col">Status</th>
                <th scope="col">Deadline</th>
                <th scope="col">Location</th>
                <th scope="col"><span className="visually-hidden">Details</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredFavorites.map(job => (
                <tr key={job._id}>
                  <th scope="row">{job?.title || 'Job no longer available'}</th>
                  <td>{job?.company || 'Unknown company'}</td>
                  <td><span className={job.status}>{job.status}</span></td>
                  <td><span className={job.deadline}>{job.deadline}</span></td>
                  <td>{job?.location || 'Not provided'}</td>
                  <td>
                    <button type="button" className="application-details-button" disabled={!job?._id} onClick={() => setSelectedJob(job)}>
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}