import './css/style.css';
import './css/header.css';
import Header from './components/Header'
import Welcome from './components/Welcome'


function App() {
  return (
    <>
    <Header/>
      <main>
        <Welcome/>
      </main>
      <footer>
        <p>&copy; 2026 CareerConnect | SOEN341 Project</p>
      </footer>
    </>
  );
}

export default App;
