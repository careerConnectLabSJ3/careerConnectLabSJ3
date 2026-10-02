import '../css/header.css';
import { Link } from "react-router-dom";


export default function Header() {


  return (
    <header className="site-header">
      <nav aria-label="Main navigation">
        <div className="site-nav-container">
          <Link to="/" className="site-logo">
            Career<span>Connect</span>
          </Link>
          <div className="site-nav-links">
            <Link to="/">Home</Link>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </div>
        </div>
      </nav>
    </header>
  );
}