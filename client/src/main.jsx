import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

import LandingPage from './LandingPage.jsx';
import SignupPage from './SignupPage.jsx';
import LoginPage from './LoginPage.jsx';
import DashboardPage from './DashboardPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

function App() {
  const [page, setPage] = useState('landing');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) {
        setPage('dashboard');
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) return null;

  if (page === 'dashboard' && user) {
    return <DashboardPage 
      user={user} 
      onLogout={() => { auth.signOut(); setUser(null); setPage('landing'); }}
      onProfile={() => setPage('profile')}
    />;
  }
  if (page === 'profile' && user) {
    return <ProfilePage 
      user={user} 
      onBack={() => setPage('dashboard')}
      onLogout={() => { auth.signOut(); setUser(null); setPage('landing'); }}
      onUserUpdate={(updatedUser) => {
        console.log('Main App - onUserUpdate called with:', updatedUser);
        console.log('Main App - updatedUser.photoURL:', updatedUser?.photoURL);
        setUser(updatedUser);
      }}
    />;
  }
  if (page === 'signup') {
    return <SignupPage onBack={() => setPage('landing')} onLogin={() => setPage('login')} />;
  }
  if (page === 'login') {
    return <LoginPage onBack={() => setPage('landing')} onSignup={() => setPage('signup')} onLogin={user => { setUser(user); setPage('dashboard'); }} />;
  }
  return <LandingPage onSignup={() => setPage('signup')} onLogin={() => setPage('login')} />;
}

export default App;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);