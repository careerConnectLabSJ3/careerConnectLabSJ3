import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import './public/css/style.css';
import Header from './components/Header'
import Welcome from './components/Welcome'
import Login from "./components/Login";
import Register from "./components/Register";
import { useEffect, useState } from "react";
import JobSeekerDashboard from "./components/JobSeekerDashboard";
import Profile from "./components/Profile";


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
      <Header onLogout={logout} loggedIn={session.loggedIn} username={session?.user?.name}/>
      <main>
        <Routes>
          <Route path="/" element={session.loggedIn ? <JobSeekerDashboard/> : <Welcome />}/>
          <Route path="/login" element={<Login onLogin={checkUserSession}/>}/>
          <Route path="/register" element={<Register />} />
          <Route path="/job-seeker-dashboard" element={session.loggedIn ? <JobSeekerDashboard/> : <Navigate to="/login"/>}/>
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
