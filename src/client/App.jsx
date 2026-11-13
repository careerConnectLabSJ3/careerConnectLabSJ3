import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import './public/css/style.css';
import Header from './components/Header'
import Welcome from './components/Welcome'
import Login from "./components/Login";
import Register from "./components/Register";
import { useEffect, useState } from "react";
import JobSeekerDashboard from "./components/JobSeekerDashboard";
import Profile from "./components/Profile";
import RecruiterDashboard from "./components/RecruiterDashboard";
import { RecruiterApplicantsPage } from "./components/RecruiterApplications";
import JobApplications from "./components/JobApplications";
import FavoriteJobs from "./components/FavoriteJobs";

function App() {

  const [session, setSession] = useState({loggedIn: false});
  const [loading, setLoading] = useState(true);

  // checks if there's a session attributed to a user logged in
  const checkUserSession = async() => {
    try{
      const res = await fetch('/api/check-session',{
          credentials: 'include'
      });
      const data = await res.json();
      setSession(data);
    }
    catch(e){
      console.error('Unable to fetch logged in user', e.message)
    }
    finally{
      setLoading(false);
    }
  };

  // logout api fetch
  const logout = async() => {
    try{
      const res = await fetch('/api/logout',{
        method: 'POST',
        credentials: 'include'
      });
      if(!res.ok){
        throw new Error('Logout failed')
      }
      await checkUserSession();
    }
    catch(e){
      console.error("Unable to logout:", e)
    }
  };


  useEffect(() => {
    checkUserSession();
  }, []);

  if(loading){
    return(
      <section className="loading">Loading...</section>
    );
  }

  return (
    <BrowserRouter>
      <Header onLogout={logout} loggedIn={session.loggedIn} username={session?.user?.name} role={session?.user?.role}/>
      <main>
        <Routes>
          <Route path="/" element={session.loggedIn ? <Navigate to="/dashboard"/> : <Welcome />}/>
          <Route path="/login" element={<Login onLogin={checkUserSession}/>}/>
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" 
            element={
              !session.loggedIn ? (
                  <Navigate to="/login" />
              ) : session.user.role === 'job_seeker' ? (
                  <JobSeekerDashboard />
              ) : session.user.role === 'recruiter' ? (
                  <RecruiterDashboard />
              ) : (
                  <Navigate to="/" />
              )
            } 
          />
          <Route path="/dashboard/jobs/:jobId/applications/:applicationId?" element={
            !session.loggedIn ? <Navigate to="/login" /> :
              session.user.role === 'recruiter' ? <RecruiterApplicantsPage /> : <Navigate to="/dashboard" />
          } />
          <Route path="/applications" element={
            !session.loggedIn ? <Navigate to="/login" /> : session.user.role === 'job_seeker' ? <JobApplications /> : <Navigate to="/dashboard" />
          } />
          <Route path="/favorite-jobs" element={!session.loggedIn ? <Navigate to="/login" /> : session.user.role === 'job_seeker' ? <FavoriteJobs /> : <Navigate to="/dashboard" />} />
          <Route path="/profile" element={session.loggedIn ? <Profile/> : <Navigate to="/login"/>}/>
        </Routes>
      </main>
      <footer>
        <p>&copy; 2026 CareerConnect | SOEN341 Project</p>
      </footer>
    </BrowserRouter>  
  );
}

export default App;
