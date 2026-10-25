import { useState, useEffect } from 'react';
import '../public/css/jobSeeker.css';
import JobApplication from './JobApplication';

export default function JobSeekerDashboard() {
  // 1. STATE MANAGERS
  const [jobs, setJobs] = useState([]);
  const [searchTitle, setSearchTitle] = useState('');
  const [searchDept, setSearchDept] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);

  function handleApplied(jobId, applicationsCount) {
    setJobs(currentJobs => currentJobs.map(job => job._id === jobId ? { ...job, applicationsCount } : job));
  }
  
  // NEW STATE FOR DEADLINES
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);

  // 2. FETCH DATA FUNCTION
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/jobs/search?title=${searchTitle}&department=${searchDept}&location=${searchLocation}`);
      const data = await response.json();
      setJobs(data);
    }
    catch (error) {
      console.error("Error connecting to search API:", error);
    }
    finally {
      setLoading(false);
    }
  };

  // 3. HOOK: Run automatically when the dashboard mounts
  useEffect(() => {
    fetchJobs();
    
    // FETCH DEADLINES
    const fetchDeadlines = async () => {
        try {
            const res = await fetch('/api/jobs/upcoming-deadlines');
            const data = await res.json();
            setUpcomingDeadlines(data);
        } catch (err) {
            console.error("Failed to load deadlines", err);
        }
    };
    fetchDeadlines();
  }, []);

  return (
    <section className="dashboard-main">
      <h1 className="dashboard-title">Job Seeker Dashboard</h1>

      {/* --- DEADLINE NOTIFICATION BANNER --- */}
      {upcomingDeadlines.length > 0 && (
        <div style={{ 
            backgroundColor: '#fff3cd', 
            color: '#856404', 
            padding: '15px', 
            borderRadius: '15px', 
            marginBottom: '20px',
            border: '1px solid #ffeeba'
        }}>
          <strong> Heads up!</strong> The following job postings are closing soon:
          <ul style={{ marginTop: '10px', marginBottom: '0',listStyleType: 'none' }}>
            {upcomingDeadlines.map(job => (
              <li key={job._id}>
                <strong>{job.title}</strong> at {job.company} - Deadline: {job.deadline}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="stats-section">
        <div className="stat-card stat-applied"><h3>Total Applied</h3><p className="stat-number">3</p></div>
        <div className="stat-card stat-interviews"><h3>Interviews</h3><p className="stat-number">1</p></div>
        <div className="stat-card stat-offers"><h3>Offers</h3><p className="stat-number">0</p></div>
      </section>

      {/* --- SEARCH & FILTER INTERFACE SECTION --- */}
      <section className="search-section" style={{ margin: '20px 0', display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="Search by job title..." 
          value={searchTitle}
          onChange={(e) => setSearchTitle(e.target.value)}
          style={{ padding: '8px', width: '250px' }}
        />
        <input 
          type="text" 
          placeholder="Filter by department..." 
          value={searchDept}
          onChange={(e) => setSearchDept(e.target.value)}
          style={{ padding: '8px', width: '200px' }}
        />
        <input 
          type="text" 
          placeholder="Filter by location..." 
          value={searchLocation}
          onChange={(e) => setSearchLocation(e.target.value)}
          style={{ padding: '8px', width: '200px' }}
        />
        <button onClick={fetchJobs} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          Search Jobs
        </button>
      </section>

      {selectedJobId && (
        <JobApplication key={selectedJobId} jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)} onApplied={handleApplied} />
      )}

      <section className="applications-section">
        <h2>Available Job Opportunities</h2>
        
        {loading ? (
          <p>Loading active job listings...</p>
        ) : jobs.length === 0 ? (
          <p>No jobs found matching those search criteria.</p>
        ) : (
          <table className="applications-table">
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Department</th>
                <th>Applications</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job._id}>
                  <td className="company-name"><strong>{job.title}</strong></td>
                  <td>{job.department}</td>
                  <td>{job.applicationsCount} candidates</td>
                  <td>
                    <span className="status-badge status-applied">{job.status}</span>
                  </td>
                  <td>
                    <button type="button" onClick={() => setSelectedJobId(job._id)} aria-label={`View details for ${job.title}`}>
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}
