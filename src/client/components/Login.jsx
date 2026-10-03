import { useState } from 'react';
import '../css/login.css';
import { Link, Navigate, useNavigate } from "react-router-dom";
import JobSeekerDashboard from './JobSeekerDashboard';


export default function Login(){

  const [error, setError] = useState('');


  async function handleLogin(e){
    e.preventDefault();

    const email = e.target.email.value;
    const password = e.target.password.value;

    try{
      const res = await fetch('/api/login',{
        method: 'POST',
        headers: {
         'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email, password
        }),
      });

      if(!res.ok){
        const errMsg = await res.text();
        setError(errMsg);
        return
      }

      const data = await res.json();
      if(data.role == "job_seeker"){
        <Navigate to={<JobSeekerDashboard />}/>
      }
      // else if(data.role == "recruiter"){
      //   Navigate()
      // }

    }
    catch(e){
      console.error("Login error:", e);
      setError("Unable to connect to server.");
    }
  }

  return(
    <section className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Log in to manage your job search activities</p>
        
        {error && (
          <p className="auth-error">
            {error}
          </p>
        )}

        <form className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" name="email" placeholder="Enter your email" required/>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" placeholder="Enter your password" required/>
          </div>

          <button className="btn-primary" onSubmit={handleLogin}>Log In</button>
        </form>

        <p className="auth-redirect">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </section>
  );
}