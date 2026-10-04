import '../css/header.css';
import { Link } from "react-router-dom";


export default function Header({loggedIn, username, onLogout}) {

  return (
    <header className="site-header">
      <nav aria-label="Main navigation">
        <div className="site-nav-container">
          <Link to="/" className="site-logo">
            Career<span>Connect</span>
          </Link>
          <div className="site-nav-links">
            <Link to="/">Home</Link>
            {!loggedIn ? (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            ) : (
              <>
                <span className="site-welcome" id="welcome-message">Welcome Back, {username}!</span>
                <a href="/profile" className="profile-link">
                    <img src="/api/profile/avatar" alt="Profile Picture" className="dashboard-profile"/>
                </a>
                <button onClick={onLogout}>Log Out</button>
              </>
            )}
            
          </div>
        </div>
      </nav>
    </header>
  );
}