import '../css/register.css';

export default function Register(){
  return(
    <section className="auth-container">
      <div className="auth-card">
            <h2>Create Your Account</h2>
            <p className="subtitle">Join CareerConnect to centralize and track your job search journey.</p>
            
            <form className="auth-form" noValidate>
                <div className="form-group">
                    <label htmlFor="fullname">Full Name</label>
                    <input type="text" id="fullname" name="name" placeholder="John Doe" autoComplete="name" required/>
                </div>

                <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input type="email" id="email" name="email" placeholder="you@example.com" autoComplete="email"/>
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="••••••••" autoComplete="new-password"/>
                </div>

                <div className="form-group">
                    <label htmlFor="confirm-password">Confirm Password</label>
                    <input type="password" id="confirm-password" name="confirm-password" placeholder="••••••••" autoComplete="new-password"/>
                </div>

                <div className="form-group">
                    <label htmlFor="role">Account Type</label>
                    <select id="role" name="role">
                        <option value="" disabled selected>Select your role...</option>
                        <option value="job_seeker">Job Seeker</option>
                        <option value="recruiter">Recruiter</option>
                    </select>
                 </div>
                <div className="form-group terms">
                    <input type="checkbox" id="terms" name="terms"/>
                    <label htmlFor="terms">I agree to the Terms of Service and Privacy Policy</label>
                </div>

                <button type="submit" className="btn-primary">Register</button>
            </form>

            <p className="auth-footer">
                Already have an account? <a href="/login">Login here</a>
            </p>
        </div>
    </section>
  );
}