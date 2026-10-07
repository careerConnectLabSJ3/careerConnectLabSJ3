

export default function RecruiterDashboard(){

  function handleAlert(){
    return(
      alert('Job Posting system coming soon!')
    );
  }

  return(
     <section>
        <h2 id="welcome-message">Welcome to your Recruiter Dashboard</h2>
        <p>Manage your job postings and evaluate candidate submissions below.</p>

        <hr/>

        <section className="dashboard-actions">
            <h3>💼 Quick Actions</h3>
            <button onClick={handleAlert}>Post a New Job Opportunity</button>
        </section>

        <br/>

        <section className="active-postings">
            <h3>🗒️ Your Active Job Postings</h3>
            <table border="1" cellPadding="10">
                <thead>
                    <tr style={{backgroundColor: '#f2f2f2'}}>
                        <th>Job Title</th>
                        <th>Department</th>
                        <th>Applications Received</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    
                    <tr>
                        <td><strong>Junior Software Engineer</strong></td>
                        <td>Engineering</td>
                        <td>4 Candidates</td>
                        <td style={{color: 'green'}}><strong>Active</strong></td>
                    </tr>
                    
                    <tr>
                        <td><strong>Product Manager</strong></td>
                        <td>Product Team</td>
                        <td>2 Candidates</td>
                        <td style={{color: 'green'}}><strong>Active</strong></td>
                    </tr>
                </tbody>
            </table>
        </section>
    </section>
  );
}