

export default function RecruiterDashboard(){
  
  return(
     <section>
        <h2 id="welcome-message">Welcome to your Recruiter Dashboard</h2>
        <p>Manage your job postings and evaluate candidate submissions below.</p>

        <hr/>

        <section class="dashboard-actions">
            <h3>💼 Quick Actions</h3>
            <button onclick="alert('Job Posting system coming soon!')">Post a New Job Opportunity</button>
        </section>

        <br/>

        <section class="active-postings">
            <h3>🗒️ Your Active Job Postings</h3>
            <table border="1" cellpadding="10" style="width:100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
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
                        <td style="color: green;"><strong>Active</strong></td>
                    </tr>
                    
                    <tr>
                        <td><strong>Product Manager</strong></td>
                        <td>Product Team</td>
                        <td>2 Candidates</td>
                        <td style="color: green;"><strong>Active</strong></td>
                    </tr>
                </tbody>
            </table>
        </section>
    </section>
  );
}