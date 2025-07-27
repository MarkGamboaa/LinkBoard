import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';


import LandingPage from './landingPage.jsx';
import SignupPage from './SignupPage.jsx';
import LoginPage from './LoginPage.jsx';
import DashboardPage from './DashboardPage.jsx';



function App() {
  const [page, setPage] = useState('landing');
  const [user, setUser] = useState(null);

  if (page === 'dashboard') {
    return <DashboardPage user={user} onLogout={() => { setUser(null); setPage('landing'); }} />;
  }
  if (page === 'signup') {
    return <SignupPage onBack={() => setPage('landing')} onLogin={() => setPage('login')} />;
  }
  if (page === 'login') {
    return <LoginPage onBack={() => setPage('landing')} onSignup={() => setPage('signup')} onLogin={user => { setUser(user); setPage('dashboard'); }} />;
  }
  return <LandingPage onSignup={() => setPage('signup')} onLogin={() => setPage('login')} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);