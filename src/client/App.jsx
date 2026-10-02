import { BrowserRouter, Routes, Route } from "react-router-dom";

import './css/style.css';
import Header from './components/Header'
import Welcome from './components/Welcome'
import Login from "./components/Login";
import Register from "./components/Register";


function App() {
  return (
    <BrowserRouter>
      <Header/>
      <main>
        <Routes>
          <Route path="/" element={<Welcome />}/>
          <Route path="/login" element={<Login />}/>
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
      <footer>
        <p>&copy; 2026 CareerConnect | SOEN341 Project</p>
      </footer>
    </BrowserRouter>  
  );
}

export default App;
