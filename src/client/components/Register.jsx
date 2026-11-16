import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Register(){

    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "",
        terms: false
    });

    async function handleRegister(e){
        e.preventDefault();
        try{
            const res = await fetch('/api/register',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(formData),
                }
            );

            if(!res.ok){
                const errMsg = await res.text();
                setError(errMsg);
                return;
            }
            await res.json();
            navigate("/login");
        }
        catch(e){
            console.error("Register error:", e.message);
            setError(e.message);
        }
    }
    
    return(
        <section className="auth-container">
        <div className="auth-card">
                <h2>Create Your Account</h2>
                <p className="subtitle">Join CareerConnect to centralize and track your job search journey.</p>
                {error && (
                <p className="auth-error">
                    {error}
                </p>
                )}
                <form className="auth-form" noValidate onSubmit={handleRegister}>
                    <div className="form-group">
                        <label htmlFor="fullname">Full Name</label>
                        <input type="text" id="fullname" name="name" placeholder="John Doe" autoComplete="name" required
                        onChange={(e) => setFormData({
                            ...formData,
                            name: e.target.value
                        })}/>
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input type="email" id="email" name="email" placeholder="you@example.com" autoComplete="email"
                         onChange={(e) => setFormData({
                            ...formData,
                            email: e.target.value
                        })}/>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input type="password" id="password" name="password" placeholder="••••••••" autoComplete="new-password"
                         onChange={(e) => setFormData({
                            ...formData,
                            password: e.target.value
                        })}/>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirm-password">Confirm Password</label>
                        <input type="password" id="confirm-password" name="confirm-password" placeholder="••••••••" autoComplete="new-password"
                        onChange={(e) => setFormData({
                            ...formData,
                            confirmPassword: e.target.value
                        })}/>
                    </div>

                    <div className="form-group">
                        <label htmlFor="role">Account Type</label>
                        <select 
                        id="role" 
                        name="role" 
                        value={formData.role} 
                        onChange={(e) => setFormData({
                            ...formData,
                            role: e.target.value
                        })}>
                            <option value="" disabled>Select your role...</option>
                            <option value="job_seeker">Job Seeker</option>
                            <option value="recruiter">Recruiter</option>
                        </select>
                    </div>
                    <div className="form-group terms">
                        <input type="checkbox" id="terms" name="terms"
                        checked={formData.terms}
                        onChange={(e) => setFormData({
                            ...formData,
                            terms: e.target.checked
                        })}/>
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