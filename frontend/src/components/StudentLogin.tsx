import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, GraduationCap, Home } from 'lucide-react';
import AastuLogo from './AastuLogo';
import ForgotPassword from './ForgotPassword';

interface StudentLoginProps {
  onShowRegistration?: () => void;
}

export default function StudentLogin({ onShowRegistration }: StudentLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(username, password, 'student');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message || 'Invalid credentials');
      } else {
        setError('Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#D4AF37] via-black to-white dark:from-[#D4AF37] dark:via-black dark:to-white animate-gradient px-4">
      <a href="/" className="absolute top-4 left-4 flex items-center space-x-2 text-white hover:text-[#D4AF37] transition-colors">
        <Home className="w-5 h-5" />
        <span className="font-medium">Home</span>
      </a>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <AastuLogo size="lg" />
          </div>
          <h2 className="text-3xl font-bold text-white">Student Recognition System</h2>
          <p className="mt-2 text-gray-200">Student Login</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md dark:bg-gray-800/50 rounded-xl shadow-lg p-8 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center px-4 py-3 border-2 border-blue-500 bg-blue-50 rounded-md">
                <GraduationCap className="h-6 w-6 text-blue-600 mr-2" />
                <span className="text-sm font-bold text-blue-700">Student</span>
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-200">
                Email
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-white/30 rounded-md shadow-sm bg-white/20 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-white/30 rounded-md shadow-sm bg-white/20 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-300" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-[#D4AF37] hover:bg-[#C5A028] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <div className="mt-4 space-y-3">
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm font-medium text-[#D4AF37] hover:text-[#C5A028]"
              >
                Forgot Password?
              </button>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-200">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={onShowRegistration}
                  className="font-medium text-[#D4AF37] hover:text-[#C5A028]"
                >
                  Register here
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
