import '../css/login.css';
import { Link } from "react-router-dom";


export default function Login(){

  // const handleSubmit = async(e) => {
  //   e.preventDefault();
  // };

  return(
    <section className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Log in to manage your job search activities</p>

        <form className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" name="email" placeholder="Enter your email" required/>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" placeholder="Enter your password" required/>
          </div>

          <button type="submit" className="btn-primary" >Log In</button>
        </form>

        <p className="auth-redirect">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </section>
  );
}