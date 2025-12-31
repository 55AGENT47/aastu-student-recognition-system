import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, GraduationCap, ArrowLeft, X, Check } from 'lucide-react';
import AastuLogo from './AastuLogo';
import { apiService } from '../services/api';

interface StudentRegistrationProps {
  onBackToLogin: () => void;
}

export default function StudentRegistration({ onBackToLogin }: StudentRegistrationProps) {
  const [formData, setFormData] = useState({
    StudentID: '',
    FirstName: '',
    LastName: '',
    Email: '',
    Department: '',
    EnrollmentYear: new Date().getFullYear(),
    EnrollmentDate: new Date().toISOString().split('T')[0],
    CafeAccess: false,
    PhotoPath: null as string | null,
    Password: '',
    ConfirmPassword: ''
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [photoSource, setPhotoSource] = useState<'upload' | 'capture' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const list = await apiService.getDepartments();
      setDepartments(list);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (error) {
      console.error('Camera error:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      setImagePreview(imageData);
      setPhotoSource('capture');
      setShowCaptureModal(false);
      stopCamera();
      setFormData(prev => ({ ...prev, PhotoPath: imageData } as any));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setImagePreview(data);
      setPhotoSource('upload');
      setFormData(prev => ({ ...prev, PhotoPath: data } as any));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.PhotoPath) {
      setError('Photo is required. Please upload or capture a photo.');
      setLoading(false);
      return;
    }

    if (formData.Password !== formData.ConfirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.Password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const registrationData = {
        studentIdentifier: formData.StudentID,
        FirstName: formData.FirstName,
        LastName: formData.LastName,
        Email: formData.Email,
        Department: formData.Department,
        EnrollmentYear: formData.EnrollmentYear,
        EnrollmentDate: formData.EnrollmentDate,
        CafeAccess: formData.CafeAccess,
        PhotoPath: formData.PhotoPath || null,
        Password: formData.Password
      };

      console.log('Sending registration data:', registrationData);

      const response = await fetch('/api/registration/student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      
      

      // Parse created student response and preload images to speed up first view
      try {
        const created = await response.json();
        // Dispatch update event so other parts update
        window.dispatchEvent(new CustomEvent('studentProfileUpdated', { detail: { studentId: created.StudentID } }));

        // Preload image URLs for the new student (thumbnail, medium, full) with cache-bust
        try {
          const API_BASE = (import.meta as any).env.VITE_API_BASE_URL ?? '';
          const ts = Date.now();
          const urls = [
            `${API_BASE}/api/images/student/${created.StudentID}?size=thumbnail&format=webp&no_cache=${ts}`,
            `${API_BASE}/api/images/student/${created.StudentID}?size=medium&format=webp&no_cache=${ts}`,
            `${API_BASE}/api/images/student/${created.StudentID}?size=full&format=jpeg&no_cache=${ts}`,
          ];
          // Import imageCache dynamically to avoid circular deps
          const { imageCache } = await import('../services/imageCache');
          imageCache.preloadImages(urls);
        } catch (e) {
          console.warn('Preload images failed:', e);
        }
      } catch (e) {
        // Ignore parse/preload errors, still show success
      }

      setSuccess(true);
      // Don't redirect to login immediately - show pending approval message
      setTimeout(() => {
        onBackToLogin();
      }, 5000); // Give more time to read the message

    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-green-600 mb-4">
              <GraduationCap className="h-16 w-16 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
            <p className="text-gray-600 mb-4">Your registration has been submitted successfully.</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 text-sm font-medium mb-2">⏳ Pending Approval</p>
              <p className="text-yellow-700 text-sm">
                Please wait patiently while the Registrar Officer reviews and approves your registration. 
                You will be able to access your profile once approved.
              </p>
            </div>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <AastuLogo size="lg" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Student Registration</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Create your student account</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <button
            onClick={onBackToLogin}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Login
          </button>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label htmlFor="StudentID" className="block text-sm font-medium text-gray-700">
                Student ID
              </label>
              <input
                id="StudentID"
                name="StudentID"
                type="text"
                required
                value={formData.StudentID}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your student ID"
              />
            </div>

            
            <div>
              <label htmlFor="FirstName" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                id="FirstName"
                name="FirstName"
                type="text"
                required
                value={formData.FirstName}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your first name"
              />
            </div>

            
            <div>
              <label htmlFor="LastName" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                id="LastName"
                name="LastName"
                type="text"
                required
                value={formData.LastName}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your last name"
              />
            </div>

            
            <div>
              <label htmlFor="Email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="Email"
                name="Email"
                type="email"
                required
                value={formData.Email}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
              />
            </div>

            
            <div>
              <label htmlFor="Department" className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <select
                id="Department"
                name="Department"
                required
                value={formData.Department}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            
            <div>
              <label htmlFor="EnrollmentDate" className="block text-sm font-medium text-gray-700">
                Enrollment Date
              </label>
              <input
                id="EnrollmentDate"
                name="EnrollmentDate"
                type="date"
                required
                value={formData.EnrollmentDate}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            
            <div className="flex items-center">
              <input
                id="CafeAccess"
                name="CafeAccess"
                type="checkbox"
                checked={formData.CafeAccess}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="CafeAccess" className="ml-2 block text-sm text-gray-700">
                Cafeteria Access (Check if you want meal service)
              </label>
            </div>

            
            <div>
              <label htmlFor="Password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="Password"
                  name="Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.Password}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            
            <div>
              <label htmlFor="ConfirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="ConfirmPassword"
                  name="ConfirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.ConfirmPassword}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Photo (required)</label>
              <div className="flex items-center space-x-3">
                <div className="w-24 h-24 bg-gray-100 rounded overflow-hidden flex items-center justify-center relative">
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-500">No image</div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                    <button type="button" onClick={() => { setShowCaptureModal(true); setTimeout(startCamera, 150); }} className="px-3 py-1 bg-gray-200 rounded">Capture</button>
                  </div>
                  <p className="text-xs text-blue-600 font-medium">💡 Tip: Use a high-quality, well-lit photo with your face clearly visible for better recognition accuracy.</p>
                  {imagePreview && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <Check className="h-4 w-4" />
                      <span className="text-xs font-medium">
                        Photo {photoSource === 'capture' ? 'captured' : 'uploaded'} successfully!
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            
            {showCaptureModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Capture Photo</h3>
                    <button onClick={() => { stopCamera(); setShowCaptureModal(false); }} className="text-gray-400 hover:text-gray-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg" style={{ maxHeight: 400 }} />
                      <canvas ref={canvasRef} className="hidden" />
                    </div>

                    <div className="flex space-x-2">
                      <button type="button" onClick={captureImage} className="flex-1 bg-blue-600 text-white py-2 rounded-lg">Capture</button>
                      <button type="button" onClick={() => { stopCamera(); setShowCaptureModal(false); }} className="flex-1 bg-gray-300 py-2 rounded-lg">Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            
            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}