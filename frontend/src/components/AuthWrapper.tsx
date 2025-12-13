import { useState, useEffect } from 'react';
import Login from './Login';
import StudentLogin from './StudentLogin';
import StudentRegistration from './StudentRegistration';

export default function AuthWrapper() {
  const [showRegistration, setShowRegistration] = useState(false);
  const [isStudentLogin, setIsStudentLogin] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsStudentLogin(params.get('type') === 'student');
  }, []);

  if (showRegistration) {
    return <StudentRegistration onBackToLogin={() => setShowRegistration(false)} />;
  }

  if (isStudentLogin) {
    return <StudentLogin onShowRegistration={() => setShowRegistration(true)} />;
  }

  return <Login />;
}