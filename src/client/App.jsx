import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import './css/style.css';
import Header from './components/Header'
import Welcome from './components/Welcome'
import Login from "./components/Login";
import Register from "./components/Register";
import { useEffect, useState } from "react";
import JobSeekerDashboard from "./components/JobSeekerDashboard";


function App() {

  const [session, setSession] = useState({});

  // checks if there's a session attributed to a user logged in
  const checkUserSession = async() => {
    try{
      const res = await fetch('/api/check-session');
      const data = await res.json();
      setSession(data);
    }
    catch(e){
      console.error('Unable to fetch logged in user', e.message)
    }
  };

  useEffect(() => {
    checkUserSession();
  }, []);

  return (
    <BrowserRouter>
      <Header/>
      <main>
        <Routes>
          <Route path="/" element={<Welcome />}/>
          <Route path="/login" element={<Login />}/>
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={session.loggedIn ? <JobSeekerDashboard/> : <Navigate to="/"/>}/>
        </Routes>
      </main>
      <footer>
        <p>&copy; 2026 CareerConnect | SOEN341 Project</p>
      </footer>
    </BrowserRouter>  
  );
}

export default App;
