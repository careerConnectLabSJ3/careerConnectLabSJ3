import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";


export default function Header() {


  return (
    <header className="site-header">
      <nav aria-label="Main navigation">
        <div className="site-nav-container">
          <a href="/" className="site-logo">
            Career<span>Connect</span>
          </a>
          <div className="site-nav-links">
            <a href="/" className="active">Home</a>
            <a href="/login">Login</a>
            <a href="/register">Register</a>
          </div>
        </div>
      </nav>
    </header>
  );
}