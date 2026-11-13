import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatDate } from '../utils/jobUtils';
import '../public/css/recruiterDashboard.css';

const PROFILE_FIELDS = [
  ['email', 'Email'],
  ['education', 'Education'],
  ['experience', 'Work experience'],
  ['skills', 'Skills']
];

function useApplicationsRequest(url, errorMessage, refreshInterval = 0) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let loading = false;

    async function load() {
      if (loading) return;
      loading = true;
      try {
        const response = await fetch(url, { credentials: 'include', signal: controller.signal, cache: 'no-store' });
        const data = await response.json();
        if (!controller.signal.aborted) {
          setResult(response.ok ? { url, data } : { url, error: data.error || errorMessage });
        }
      } catch {
        if (!controller.signal.aborted) {
          setResult(previous => ({
            data: previous?.url === url ? previous.data : undefined,
            url,
            error: errorMessage
          }));
        }
      } finally {
        loading = false;
      }
    }

    function refreshVisiblePage() {
      if (!document.hidden) load();
    }

    load();
    if (!refreshInterval) return () => controller.abort();
    const timer = window.setInterval(refreshVisiblePage, refreshInterval);
    window.addEventListener('focus', refreshVisiblePage);
    document.addEventListener('visibilitychange', refreshVisiblePage);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshVisiblePage);
      document.removeEventListener('visibilitychange', refreshVisiblePage);
    };
  }, [url, errorMessage, refreshInterval]);

  return result?.url === url ? result : {};
}

export function RecruiterApplicantsPage() {
  const { jobId, applicationId } = useParams();
  const navigate = useNavigate();
  const { data: jobs, error } = useApplicationsRequest('/api/jobs/mine', 'Unable to load your job postings. Please try again.');
  const job = jobs?.find(posting => posting._id === jobId);

  return (
    <section className="recruiter-dashboard" aria-labelledby="applicants-page-title">
      <Link to="/dashboard">Back to job postings</Link>
      <div className="recruiter-page-heading recruiter-application-heading">
        <div>
          <h1 id="applicants-page-title">Job applicants</h1>
          {job && <p>{job.title}</p>}
        </div>
      </div>
      {error && <p className="recruiter-feedback recruiter-feedback-error" role="alert">{error}</p>}
      {!jobs && !error && <p role="status">Loading job posting...</p>}
      {jobs && !job && <p role="alert">Job posting not found.</p>}
      {job && <RecruiterApplicantList key={jobId} job={job} />}
      {applicationId && (
        <RecruiterApplicationDetails
          key={applicationId}
          onClose={() => navigate(`/dashboard/jobs/${encodeURIComponent(jobId)}/applications`, { replace: true })}
        />
      )}
    </section>
  );
}

function RecruiterApplicantList({ job }) {
  const [searchField, setSearchField] = useState('name');
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState('newest');
  const { data: applications, error } = useApplicationsRequest(
    `/api/jobs/${job._id}/applications`,
    'Unable to load applications. Please try again.',
    15000
  );

  const query = keyword.trim().toLowerCase();
  const visibleApplications = applications?.filter(application => {
    const value = searchField === 'status' ? application.status : application.applicant?.[searchField];
    return (value || '').toLowerCase().includes(query);
  }).sort((first, second) => {
    if (sort === 'name') {
      return (first.applicant?.name || '').localeCompare(second.applicant?.name || '', undefined, { sensitivity: 'base' });
    }
    const dateOrder = (Date.parse(first.appliedAt) || 0) - (Date.parse(second.appliedAt) || 0);
    return sort === 'oldest' ? dateOrder : -dateOrder;
  });

  return (
    <section className="recruiter-postings recruiter-applicants" aria-label={`Applicants for ${job.title}`}>
      <div className="recruiter-section-heading">
        <h2>Applicants</h2>
        {applications && <span>{applications.length} {applications.length === 1 ? 'applicant' : 'applicants'}</span>}
      </div>
      {error && <p className="recruiter-feedback recruiter-feedback-error" role="alert">{error}</p>}
      {!applications && !error && <p className="recruiter-empty" role="status">Loading applicants...</p>}
      {applications?.length === 0 && <p className="recruiter-empty">No one has applied for this posting yet.</p>}
      {applications?.length > 0 && (
        <>
          <div className="recruiter-applicant-controls">
            <label>
              Search field
              <select value={searchField} onChange={event => setSearchField(event.target.value)}>
                <option value="name">Name</option>
                {PROFILE_FIELDS.filter(([field]) => field !== 'email').map(([field, label]) => (
                  <option key={field} value={field}>{label}</option>
                ))}
                <option value="status">Application status</option>
              </select>
            </label>
            <label>
              Keyword
              <input type="search" value={keyword} onChange={event => setKeyword(event.target.value)} />
            </label>
            <label>
              Sort by
              <select value={sort} onChange={event => setSort(event.target.value)}>
                <option value="newest">Date applied, newest first</option>
                <option value="oldest">Date applied, oldest first</option>
                <option value="name">Name, A to Z</option>
              </select>
            </label>
          </div>
          {visibleApplications.length === 0 ? (
            <p className="recruiter-empty" role="status">No applicants match your search.</p>
          ) : (
            <table className="recruiter-table recruiter-applicant-table" aria-label="Applications">
              <thead>
                <tr><th scope="col">Applicant</th><th scope="col">Date applied</th><th scope="col">Status</th></tr>
              </thead>
              <tbody>
                {visibleApplications.map(application => (
                  <tr key={application._id}>
                    <th scope="row">
                      <Link to={`/dashboard/jobs/${job._id}/applications/${application._id}`}>
                        {application.applicant?.name || 'Unavailable applicant'}
                      </Link>
                    </th>
                    <td>{formatDate(application.appliedAt)}</td>
                    <td>{application.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}

function RecruiterApplicationDetails({ onClose }) {
  const { jobId, applicationId } = useParams();
  const dialogRef = useRef(null);
  const url = `/api/jobs/${encodeURIComponent(jobId)}/applications/${encodeURIComponent(applicationId)}`;
  const { data: application, error } = useApplicationsRequest(url, 'Unable to load this application. Please try again.');

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="recruiter-application-modal"
      aria-labelledby="applicant-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="recruiter-modal-content">
      <div className="recruiter-page-heading">
        <div>
          <h2 id="applicant-title">{application?.applicant?.name || 'Application details'}</h2>
          {application && <p>{application.job.title}</p>}
        </div>
        <button type="button" className="recruiter-button" onClick={onClose} autoFocus>Close application</button>
      </div>
      {error && <p className="recruiter-feedback recruiter-feedback-error" role="alert">{error}</p>}
      {!application && !error && <p role="status">Loading application...</p>}
      {application && (
        <section className="recruiter-postings recruiter-application-details" aria-label="Application">
          <dl>
            <div><dt>Date applied</dt><dd>{formatDate(application.appliedAt)}</dd></div>
            <div><dt>Status</dt><dd>{application.status}</dd></div>
            {application.applicant && PROFILE_FIELDS.map(([field, label]) => (
              <div key={field}>
                <dt>{label}</dt>
                <dd>{application.applicant[field] || 'Not provided'}</dd>
              </div>
            ))}
            <div>
              <dt>CV</dt>
              <dd>
                {application.resume ? (
                  <a href={`${url}/resume`} target="_blank" rel="noopener">View CV ({application.resume.fileName})</a>
                ) : 'No CV on file.'}
              </dd>
            </div>
          </dl>
          {!application.applicant && <p>The applicant’s profile is unavailable.</p>}
        </section>
      )}
      </div>
    </dialog>
  );
}
