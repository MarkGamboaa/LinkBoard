import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import LandingPage from './LandingPage.jsx';
import Signup from './Signup.jsx';
import Login from './Login.jsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
