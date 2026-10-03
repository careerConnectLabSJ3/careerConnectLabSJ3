import '../css/header.css';
import { Link } from "react-router-dom";


export default function Header({loggedIn, username}) {


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
                <span class="site-welcome" id="welcome-message">Welcome Back, {username}!</span>
                <a href="/profile" class="profile-link">
                    <img src="/profile/avatar" alt="Profile Picture" class="dashboard-profile"/>
                </a>
                <a href="/logout">Log Out</a>
              </>
            )}
            
          </div>
        </div>
      </nav>
    </header>
  );
}