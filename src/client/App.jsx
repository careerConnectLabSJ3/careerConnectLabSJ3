import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Header from './components/Header'
import Welcome from './components/Welcome'
import Login from "./components/Login";


function App() {
  return (
    <BrowserRouter>
      <Header/>
      <main>
        <Routes>
          <Route path="/" element={<Welcome/>}/>
          <Route path="/login" element={<Login/>}/>

        </Routes>
      </main>
      <footer>
        <p>&copy; 2026 CareerConnect | SOEN341 Project</p>
      </footer>
    </BrowserRouter>  
  );
}

export default App;
