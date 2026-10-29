import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

import LandingPage from './LandingPage.jsx';
import SignupPage from './SignupPage.jsx';
import LoginPage from './LoginPage.jsx';
import DashboardPage from './DashboardPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import PublicBoardPage from './PublicBoardPage.jsx';
import BoardInvitePage from './BoardInvitePage.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

const routeByPath = {
  '/': 'landing',
  '/signup': 'signup',
  '/login': 'login',
  '/dashboard': 'dashboard',
  '/profile': 'profile',
  '/public': 'public',
  '/invite': 'invite',
};

const getPageFromLocation = () => {
  const inviteToken = new URLSearchParams(window.location.search).get('invite');
  if (inviteToken) return 'invite';
  return routeByPath[window.location.pathname.replace(/\/$/, '') || '/'] || 'landing';
};

const getPathForPage = (page, inviteToken = null) => {
  const paths = {
    landing: '/',
    signup: '/signup',
    login: '/login',
    dashboard: '/dashboard',
    profile: '/profile',
    public: '/public',
    invite: '/invite',
  };
  const path = paths[page] || '/';
  return page === 'invite' && inviteToken
    ? `${path}?invite=${encodeURIComponent(inviteToken)}`
    : path;
};

function App() {
  const [inviteToken, setInviteToken] = useState(() => new URLSearchParams(window.location.search).get('invite'));
  const [page, setPageState] = useState(getPageFromLocation);
  const [user, setUser] = useState(null);
  const [pendingBoardCopyId, setPendingBoardCopyId] = useState(() => new URLSearchParams(window.location.search).get('copyBoard'));
  const [loading, setLoading] = useState(true);

  const navigate = (nextPage, { replace = false } = {}) => {
    const currentDepth = window.history.state?.linkBoardRoute ? (window.history.state.routeDepth || 0) : 0;
    const routeDepth = replace ? currentDepth : currentDepth + 1;
    const nextState = { linkBoardRoute: true, routeDepth, page: nextPage };
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method](nextState, '', getPathForPage(nextPage, inviteToken));
    setPageState(nextPage);
  };

  const goBack = (fallbackPage) => {
    if (window.history.state?.linkBoardRoute && (window.history.state.routeDepth || 0) > 0) {
      window.history.back();
    } else {
      navigate(fallbackPage, { replace: true });
    }
  };

  useEffect(() => {
    const currentPage = getPageFromLocation();
    if (!window.history.state?.linkBoardRoute) {
      window.history.replaceState(
        { linkBoardRoute: true, routeDepth: 0, page: currentPage },
        '',
        window.location.href,
      );
    }

    const handlePopState = () => {
      setInviteToken(new URLSearchParams(window.location.search).get('invite'));
      setPageState(getPageFromLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setLoading(false);
      const currentPage = getPageFromLocation();
      if (authUser) {
        const nextPage = inviteToken ? 'invite' : ['landing', 'login', 'signup'].includes(currentPage) ? 'dashboard' : currentPage;
        if (nextPage !== currentPage) navigate(nextPage, { replace: true });
      } else if (['dashboard', 'profile'].includes(currentPage)) {
        navigate('landing', { replace: true });
      }
    });
    return unsubscribe;
  }, [inviteToken]);

  if (loading) {
    return <LoadingSpinner fullScreen text="Initializing..." />;
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigate('landing', { replace: true });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (page === 'invite' && inviteToken) {
    return (
      <BoardInvitePage
        token={inviteToken}
        user={user}
        onLogin={() => navigate('login')}
        onSignup={() => navigate('signup')}
        onSwitchAccount={async () => {
          await signOut(auth);
          setUser(null);
          navigate('invite', { replace: true });
        }}
        onAccepted={() => {
          setInviteToken(null);
          navigate('dashboard', { replace: true });
        }}
      />
    );
  }

  if (page === 'dashboard' && user) {
    return (
      <>
        <DashboardPage 
          user={user} 
          onLogout={handleLogout}
          onProfile={() => navigate('profile')}
          onPublic={() => navigate('public')}
          pendingBoardCopyId={pendingBoardCopyId}
          onPendingBoardCopyHandled={() => setPendingBoardCopyId(null)}
        />
        <ToastContainer />
      </>
    );
  }
  if (page === 'profile' && user) {
    return (
      <>
        <ProfilePage 
          user={user} 
          onBack={() => goBack('dashboard')}
          onLogout={handleLogout}
          onUserUpdate={(updatedUser) => {
            console.log('Main App - onUserUpdate called with:', updatedUser);
            console.log('Main App - updatedUser.photoURL:', updatedUser?.photoURL);
            setUser(updatedUser);
          }}
        />
        <ToastContainer />
      </>
    );
  }
  if (page === 'public') {
    return (
      <>
        <PublicBoardPage 
          onLogin={() => navigate('login')} 
          onSignup={() => navigate('signup')} 
          onBackToDashboard={() => goBack(user ? 'dashboard' : 'landing')}
          onRequireLoginToCopy={(boardId) => {
            setPendingBoardCopyId(boardId);
            navigate('login');
          }}
          isLoggedIn={!!user}
        />
        <ToastContainer />
      </>
    );
  }
  if (page === 'signup') {
    return (
      <>
        <SignupPage onBack={() => goBack('landing')} onLogin={() => navigate('login')} continueWithBoardCopy={Boolean(pendingBoardCopyId)} inviteToken={inviteToken} pendingBoardCopyId={pendingBoardCopyId} />
        <ToastContainer />
      </>
    );
  }
  if (page === 'login') {
    return (
      <>
        <LoginPage onBack={() => goBack('landing')} onSignup={() => navigate('signup')} continueWithBoardCopy={Boolean(pendingBoardCopyId)} onLogin={user => { setUser(user); navigate(inviteToken ? 'invite' : 'dashboard', { replace: true }); }} />
        <ToastContainer />
      </>
    );
  }
  return (
    <>
      <LandingPage onSignup={() => navigate('signup')} onLogin={() => navigate('login')} onPublic={() => navigate('public')} />
      <ToastContainer />
    </>
  );
}

export default App;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
