import '../css/register.css';

export default function Register(){
  return(
    <section class="auth-container">
      <div class="auth-card">
            <h2>Create Your Account</h2>
            <p class="subtitle">Join CareerConnect to centralize and track your job search journey.</p>
            
            <form action="/register" method="POST" class="auth-form" novalidate>
                <div class="form-group">
                    <label for="fullname">Full Name</label>
                    <input type="text" id="fullname" name="name" placeholder="John Doe" autocomplete="name" required/>
                </div>

                <div class="form-group">
                    <label for="email">Email Address</label>
                    <input type="email" id="email" name="email" placeholder="you@example.com" autocomplete="email"/>
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="••••••••" autocomplete="new-password"/>
                </div>

                <div class="form-group">
                    <label for="confirm-password">Confirm Password</label>
                    <input type="password" id="confirm-password" name="confirm-password" placeholder="••••••••" autocomplete="new-password"/>
                </div>

                <div class="form-group">
                    <label for="role">Account Type</label>
                    <select id="role" name="role">
                        <option value="" disabled selected>Select your role...</option>
                        <option value="job_seeker">Job Seeker</option>
                        <option value="recruiter">Recruiter</option>
                    </select>
                 </div>
                <div class="form-group terms">
                    <input type="checkbox" id="terms" name="terms"/>
                    <label for="terms">I agree to the Terms of Service and Privacy Policy</label>
                </div>

                <button type="submit" class="btn-primary">Register</button>
            </form>

            <p class="auth-footer">
                Already have an account? <a href="/login">Login here</a>
            </p>
        </div>
    </section>
  );
}