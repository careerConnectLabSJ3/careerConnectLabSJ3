import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import JobDetailsModal from './JobDetailsModal';
import { formatDate, statusClass } from '../utils/jobUtils';

const FILTERS = [
  { value: 'all', label: 'All applications' },
  { value: 'Applied', label: 'Applied' },
  { value: 'Interview', label: 'Interview' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Offer', label: 'Offer' }
];

export default function JobApplications() {
  const [applications, setApplications] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStatus = searchParams.get('status');
  const filter = FILTERS.some(option => option.value === requestedStatus) ? requestedStatus : 'all';
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadApplications() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/applications', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to load your applications.');
        return;
      }
      setApplications(data);
    } catch (loadError) {
      setError('Unable to load your applications. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApplications();
  }, []);

  function changeFilter(value) {
    if (value === 'all') setSearchParams({});
    else setSearchParams({ status: value });
  }

  const filteredApplications = useMemo(() => {
    if (filter === 'all') return applications;
    return applications.filter(application => application.status === filter);
  }, [applications, filter]);

  return (
    <section className="job-applications-page" aria-labelledby="job-applications-title">
      <div className="job-applications-heading">
        <div>
          <h1 id="job-applications-title">My job applications</h1>
          <p>Keep all of your submitted applications and their current status in one place.</p>
        </div>
        <span className="job-applications-count">
          {applications.length} {applications.length === 1 ? 'application' : 'applications'}
        </span>
      </div>

      <nav className="application-filters" aria-label="Filter applications">
        {FILTERS.map(option => (
          <button
            key={option.value}
            type="button"
            className={filter === option.value ? 'application-filter is-selected' : 'application-filter'}
            aria-pressed={filter === option.value}
            onClick={() => changeFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="application-feedback application-feedback-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={loadApplications}>Try again</button>
        </div>
      )}

      {loading ? (
        <p className="application-empty" role="status">Loading your applications...</p>
      ) : !error && filteredApplications.length === 0 ? (
        <div className="application-empty">
          <h2>{applications.length === 0 ? 'No applications yet' : 'No matching applications'}</h2>
          <p>{applications.length === 0 ? 'Applications you submit will appear here.' : 'Try another status filter.'}</p>
        </div>
      ) : !error && (
        <div className="application-table-scroll" role="region" aria-label="My job applications" tabIndex="0">
          <table className="job-applications-table">
            <thead>
              <tr>
                <th scope="col">Company</th>
                <th scope="col">Job title</th>
                <th scope="col">Applied on</th>
                <th scope="col">Application status</th>
                <th scope="col">Job status</th>
                <th scope="col"><span className="visually-hidden">Details</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map(application => (
                <tr key={application._id}>
                  <th scope="row">{application.job?.company || 'Unknown company'}</th>
                  <td>{application.job?.title || 'Job no longer available'}</td>
                  <td>{formatDate(application.appliedAt)}</td>
                  <td><span className={statusClass(application.status || 'Applied')}>{application.status || 'Applied'}</span></td>
                  <td><span className={statusClass(application.jobStatus)}>{application.jobStatus}</span></td>
                  <td>
                    <button type="button" className="application-details-button" disabled={!application.job?._id} onClick={() => setSelectedApplication(application)}>
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedApplication && selectedApplication.job?._id && (
        <JobDetailsModal
          key={selectedApplication._id}
          jobId={selectedApplication.job._id}
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
        />
      )}
    </section>
  );
}
