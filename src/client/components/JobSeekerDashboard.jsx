import { useState, useEffect } from 'react';
import '../public/css/jobSeeker.css';

export default function JobSeekerDashboard() {
  // 1. STATE MANAGERS
  const [jobs, setJobs] = useState([]);
  const [searchTitle, setSearchTitle] = useState('');
  const [searchDept, setSearchDept] = useState('');
  const [searchLocation, setSearchLocation] = useState(''); // <-- Added this
  const [loading, setLoading] = useState(true);

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
  }, []);

  return (
    <section className="dashboard-main">
      <h1 className="dashboard-title">Job Seeker Dashboard</h1>

      <section className="stats-section">
        <div className="stat-card stat-applied"><h3>Total Applied</h3><p className="stat-number">3</p></div>
        <div className="stat-card stat-interviews"><h3>Interviews</h3><p className="stat-number">1</p></div>
        <div className="stat-card stat-offers"><h3>Offers</h3><p className="stat-number">0</p></div>
      </section>

      {/* --- NEW SEARCH & FILTER INTERFACE SECTION --- */}
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
              </tr>
            </thead>
            <tbody>
              {/* Dynamic loop pulling data from Mongoose collection */}
              {jobs.map((job) => (
                <tr key={job._id}>
                  <td className="company-name"><strong>{job.title}</strong></td>
                  <td>{job.department}</td>
                  <td>{job.applicationsCount} candidates</td>
                  <td>
                    <span className="status-badge status-applied">{job.status}</span>
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
