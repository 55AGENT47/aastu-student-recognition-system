import React, { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import AuthWrapper from './components/AuthWrapper';
import CafeteriaSecurityPortal from './components/CafeteriaSecurityPortal';
import MainGateSecurityPortal from './components/MainGateSecurityPortal';
import StudentPortal from './components/StudentPortal';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

const AppContent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('role') || window.location.pathname === '/login') {
      setShowLogin(true);
    }
  }, []);

  if (!isAuthenticated) {
    if (showLogin || window.location.pathname === '/login') {
      return <AuthWrapper />;
    }
    if (window.location.pathname === '/404' || (window.location.pathname !== '/' && window.location.pathname !== '/login')) {
      return <NotFound />;
    }
    return <Home />;
  }

  if (user?.role === 'student') {
    return <StudentPortal />;
  } else if (user?.role === 'cafeteria') {
    return <CafeteriaSecurityPortal />;
  } else if (user?.role === 'main_gate') {
    return <MainGateSecurityPortal />;
  } else {
    return <Dashboard />;
  }
};

const App: React.FC = () => {
  // Listen for student profile updates globally: clear cache and preload fresh images
  useEffect(() => {
    const handler = async (ev: any) => {
      try {
        const studentId = ev?.detail?.studentId;
        if (!studentId) return;
        const { imageCache } = await import('./services/imageCache');
        imageCache.clearStudent(studentId);
        const API_BASE = (import.meta as any).env.VITE_API_BASE_URL ?? '';
        const ts = Date.now();
        const urls = [
          `${API_BASE}/api/images/student/${studentId}?size=thumbnail&format=webp&no_cache=${ts}`,
          `${API_BASE}/api/images/student/${studentId}?size=medium&format=webp&no_cache=${ts}`,
          `${API_BASE}/api/images/student/${studentId}?size=full&format=jpeg&no_cache=${ts}`,
        ];
        imageCache.preloadImages(urls);
      } catch (err) {
        console.warn('Error handling studentProfileUpdated preloads:', err);
      }
    };

    window.addEventListener('studentProfileUpdated', handler);
    return () => window.removeEventListener('studentProfileUpdated', handler);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;