import { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { apiService } from '../services/api';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

export default function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleOTPChange = async (value: string) => {
    setOtpCode(value);
    if (value.length === 6) {
      setLoading(true);
      try {
        await apiService.verifyOTP(email, value);
        setMessage('OTP verified successfully');
        setStep('password');
      } catch (error: any) {
        setMessage(error.response?.data?.detail || 'Invalid or expired OTP');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiService.forgotPassword(email);
      setMessage('OTP sent to your email');
      setStep('otp');
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiService.verifyOTP(email, otpCode);
      setMessage('OTP verified successfully');
      setStep('password');
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await apiService.resetPassword(email, otpCode, newPassword);
      setMessage('Password reset successfully');
      setTimeout(() => onBackToLogin(), 2000);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#D4AF37] via-black to-white dark:from-[#D4AF37] dark:via-black dark:to-white animate-gradient px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white/10 backdrop-blur-md dark:bg-gray-800/50 rounded-xl shadow-lg p-8 border border-white/20">
          <button
            onClick={onBackToLogin}
            className="flex items-center text-white hover:text-[#D4AF37] mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Login
          </button>

          <h2 className="text-2xl font-bold text-white mb-6">
            {step === 'email' ? 'Forgot Password' : step === 'otp' ? 'Enter OTP' : 'Create New Password'}
          </h2>

          {step === 'email' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200">Email</label>
                <div className="mt-1 relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-300" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 block w-full px-3 py-2 border border-white/30 rounded-md bg-white/20 backdrop-blur-sm text-white placeholder-gray-300"
                    placeholder="Enter your email"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#D4AF37] text-black py-2 rounded-lg hover:bg-[#C5A028] disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          ) : step === 'otp' ? (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200">OTP Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => handleOTPChange(e.target.value)}
                  className="block w-full px-3 py-2 border border-white/30 rounded-md bg-white/20 backdrop-blur-sm text-white text-center text-2xl tracking-widest"
                  placeholder="000000"
                  autoFocus
                />
                <p className="text-xs text-gray-300 mt-2 text-center">Enter the 6-digit code sent to your email</p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200">New Password</label>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-300" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10 block w-full px-3 py-2 border border-white/30 rounded-md bg-white/20 backdrop-blur-sm text-white placeholder-gray-300"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-300" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">Confirm Password</label>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-300" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 block w-full px-3 py-2 border border-white/30 rounded-md bg-white/20 backdrop-blur-sm text-white placeholder-gray-300"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-300" />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#D4AF37] text-black py-2 rounded-lg hover:bg-[#C5A028] disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              message.includes('successfully') || message.includes('sent') 
                ? 'bg-green-100/20 text-green-300' 
                : 'bg-red-100/20 text-red-300'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
