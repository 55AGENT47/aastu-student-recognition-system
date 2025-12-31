import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, UserCheck, ChefHat, Shield, Home, GraduationCap } from 'lucide-react';
import AastuLogo from './AastuLogo';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'admin' | 'cafeteria' | 'main_gate' | 'registrar'>('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(username, password, role as any);
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

  const roleOptions = [
    { value: 'admin' as const, label: 'Administrator', icon: UserCheck },
    { value: 'registrar' as const, label: 'Registrar Officer', icon: GraduationCap },
    { value: 'cafeteria' as const, label: 'Cafeteria Security', icon: ChefHat },
    { value: 'main_gate' as const, label: 'Main Security', icon: Shield },
  ];

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
          <p className="mt-2 text-gray-200">Admin & Security Login</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md dark:bg-gray-800/50 rounded-xl shadow-lg p-8 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
          
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-3 text-center">
                 Select Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                {roleOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRole(option.value)}
                      className={`flex flex-col items-center justify-center px-3 py-3 border-2 rounded-md transition-all ${
                        role === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mb-1 ${role === option.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                      <span className={`text-xs font-bold ${role === option.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-200'}`}>
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

       
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-200">
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-white/30 rounded-md shadow-sm bg-white/20 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                placeholder="Enter your username"
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
                    <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500" />
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
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
