

export default function JobSeekerDashboard(){
  return(
    <section className="dashboard-main">
      <h1 className="dashboard-title">Job Seeker Dashboard</h1>

        <section className="stats-section">
            <div className="stat-card stat-applied">
                <h3>Total Applied</h3>
                <p className="stat-number">3</p>
            </div>
            <div className="stat-card stat-interviews">
                <h3>Interviews</h3>
                <p className="stat-number">1</p>
            </div>
            <div className="stat-card stat-offers">
                <h3>Offers</h3>
                <p className="stat-number">0</p>
            </div>
        </section>

        <section className="applications-section">
            <h2>Recent Applications</h2>
            <table className="applications-table">
                <thead>
                    <tr>
                        <th>Company</th>
                        <th>Position</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="company-name">Google</td>
                        <td>Frontend Developer</td>
                        <td><span className="status-badge status-interviewing">Interviewing</span></td>
                    </tr>
                    <tr>
                        <td className="company-name">Amazon</td>
                        <td>Software Engineer Intern</td>
                        <td><span className="status-badge status-applied">Applied</span></td>
                    </tr>
                </tbody>
            </table>
        </section>
    </section>
  );
}