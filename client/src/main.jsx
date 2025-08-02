import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

import LandingPage from './LandingPage.jsx';
import SignupPage from './SignupPage.jsx';
import LoginPage from './LoginPage.jsx';
import DashboardPage from './DashboardPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import PublicBoardPage from './PublicBoardPage.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
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

  if (loading) {
    return <LoadingSpinner fullScreen text="Initializing..." />;
  }

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setPage('landing');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (page === 'dashboard' && user) {
    return <DashboardPage 
      user={user} 
      onLogout={handleLogout}
      onProfile={() => setPage('profile')}
      onPublic={() => setPage('public')}
    />;
  }
  if (page === 'profile' && user) {
    return <ProfilePage 
      user={user} 
      onBack={() => setPage('dashboard')}
      onLogout={handleLogout}
      onUserUpdate={(updatedUser) => {
        console.log('Main App - onUserUpdate called with:', updatedUser);
        console.log('Main App - updatedUser.photoURL:', updatedUser?.photoURL);
        setUser(updatedUser);
      }}
    />;
  }
  if (page === 'public') {
    return <PublicBoardPage 
      onLogin={() => setPage('login')} 
      onSignup={() => setPage('signup')} 
      onBackToDashboard={() => setPage('dashboard')}
      isLoggedIn={!!user}
    />;
  }
  if (page === 'signup') {
    return <SignupPage onBack={() => setPage('landing')} onLogin={() => setPage('login')} />;
  }
  if (page === 'login') {
    return <LoginPage onBack={() => setPage('landing')} onSignup={() => setPage('signup')} onLogin={user => { setUser(user); setPage('dashboard'); }} />;
  }
  return <LandingPage onSignup={() => setPage('signup')} onLogin={() => setPage('login')} onPublic={() => setPage('public')} />;
}

export default App;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);