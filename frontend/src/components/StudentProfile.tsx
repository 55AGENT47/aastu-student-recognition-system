import { useEffect, useState, useRef } from 'react';
import { User, Camera, Upload, Edit, Save, X } from 'lucide-react';
import { Student } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { OptimizedStudentImage } from '../hooks/useOptimizedImage.tsx';

export default function StudentProfile() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [validatingFace, setValidatingFace] = useState(false);
  const [faceValidationResult, setFaceValidationResult] = useState<{ face_detected: boolean; message: string } | null>(null);
  const [faceStatus, setFaceStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [fullImageSrc, setFullImageSrc] = useState<string | null>(null);
  const [fullImageLoading, setFullImageLoading] = useState(false);
  const [fullImageError, setFullImageError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL ?? '';

  const [editForm, setEditForm] = useState({
    StudentIdentifier: '',
    FirstName: '',
    LastName: '',
    Email: '',
    Department: '',
    PhotoPath: null as string | null,
    EnrollmentDate: new Date().toISOString().split('T')[0],
    CafeAccess: false
  });
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    fetchStudentProfile();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const list = await apiService.getDepartments();
      setDepartments(list);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      
      const students = await apiService.getStudents();
      const currentStudent = students.find(s => s.Email === user?.email);

      if (currentStudent) {
        setStudent(currentStudent);
        setEditForm({
          StudentIdentifier: (currentStudent as any).StudentIdentifier || currentStudent.StudentID || '',
          FirstName: currentStudent.FirstName,
          LastName: currentStudent.LastName,
          Email: currentStudent.Email,
          Department: (currentStudent as any).Department || '',
          PhotoPath: (currentStudent as any).PhotoPath,
          EnrollmentDate: currentStudent.EnrollmentDate ? new Date(currentStudent.EnrollmentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          CafeAccess: !!(currentStudent as any).CafeAccess
        });
        setImagePreview((currentStudent as any).PhotoPath);
        setImageLoaded(false);
      }
    } catch (error) {
      console.error('Failed to fetch student profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!student) return;

    try {
      setSaving(true);
      const updatedStudent = await apiService.updateStudent(student.StudentID, {
        StudentIdentifier: editForm.StudentIdentifier,
        FirstName: editForm.FirstName,
        LastName: editForm.LastName,
        Email: editForm.Email,
        Department: editForm.Department,
        PhotoPath: editForm.PhotoPath || null,
        EnrollmentDate: editForm.EnrollmentDate,
        CafeAccess: editForm.CafeAccess
      });

      setStudent(updatedStudent);
      setEditing(false);

      // Trigger a custom event to notify other components about the profile update
      window.dispatchEvent(new CustomEvent('studentProfileUpdated', { detail: { studentId: student.StudentID } }));

      if (editForm.PhotoPath && editForm.PhotoPath !== (student as any).PhotoPath) {
        alert('Profile updated successfully! Your face has been re-registered for recognition.');
      } else {
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;

        
        try {
          setValidatingFace(true);
          const validation = await apiService.validateFace(result);

            if (validation.face_detected) {
            setImagePreview(result);
            setImageLoaded(false);
            setEditForm({...editForm, PhotoPath: result});
            setFaceStatus({
              type: 'success',
              text: 'Face detected successfully! Image ready for update.'
            });
          } else {
            setFaceStatus({
              type: 'error',
              text: validation.message || 'Unable to detect a face. Please upload a clear image.'
            });
            
            e.target.value = '';
          }
        } catch (error) {
          console.error('Face validation error:', error);
          setFaceStatus({
            type: 'error',
            text: 'Error validating face. Please try again.'
          });
          e.target.value = '';
        } finally {
          setValidatingFace(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
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

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.95);

        
        setValidatingFace(true);
        setFaceValidationResult(null);

        try {
          const validation = await apiService.validateFace(imageData);
          setFaceValidationResult(validation);

          if (validation.face_detected) {
            setImagePreview(imageData);
            setImageLoaded(false);
            setEditForm({...editForm, PhotoPath: imageData});
            setFaceStatus({
              type: 'success',
              text: 'Face captured successfully! Image ready for update.'
            });
            stopCamera();
            setTimeout(() => {
              setShowCaptureModal(false);
              setFaceValidationResult(null);
            }, 1000);
          } else {
            setFaceStatus({
              type: 'error',
              text: validation.message || 'Unable to detect a face. Please try again.'
            });
          }
        } catch (error) {
          console.error('Face validation error:', error);
          setFaceStatus({
            type: 'error',
            text: 'Error validating face. Please try again.'
          });
        } finally {
          setValidatingFace(false);
        }
      }
    }
  };

  const openImageModal = () => {
    if (!student && !imagePreview) return;
    setFullImageError(null);
    if (imagePreview) {
      setFullImageSrc(imagePreview);
      setFullImageLoading(false);
      setShowImageModal(true);
      return;
    }

    if (student?.StudentID) {
      const url = `${API_BASE}/api/images/student/${student.StudentID}?size=full&format=jpeg&no_cache=${Date.now()}`;
      setFullImageSrc(url);
      setFullImageLoading(true);
      setShowImageModal(true);
    }
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setFullImageSrc(null);
    setFullImageError(null);
    setFullImageLoading(false);
  };

  const openCaptureModal = () => {
    setShowCaptureModal(true);
    setTimeout(() => startCamera(), 100);
  };

  const closeCaptureModal = () => {
    stopCamera();
    setShowCaptureModal(false);
    setFaceValidationResult(null);
    setValidatingFace(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Student profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">My Profile</h2>
          <p className="mt-2 text-gray-600">Manage your personal information and face recognition data</p>
        </div>
        {!editing && (
          <button
            onClick={() => {
              setEditing(true);
              setFaceStatus(null);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Edit className="h-5 w-5" />
            <span>Edit Profile</span>
          </button>
        )}
        {!editing && student && (
          <button
            onClick={async () => {
              if (!student) return;
              if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
              try {
                await apiService.deleteStudent(student.StudentID);
                
                (window as any).location.reload();
              } catch (error) {
                console.error('Failed to delete account:', error);
                alert('Failed to delete account. Please try again.');
              }
            }}
            className="ml-3 inline-flex items-center space-x-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
          >
            <span>Delete Account</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1">
            <div className="text-center">
              <div className="relative inline-block">
                {editing && imagePreview ? (
                  <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden">
                    {!imageLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-blue-50">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    <img
                      src={imagePreview}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-blue-100 mx-auto"
                      onLoad={() => setImageLoaded(true)}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.appendChild(
                          Object.assign(document.createElement('div'), {
                            className: 'w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center mx-auto',
                            innerHTML: '<svg class="h-16 w-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>'
                          })
                        );
                      }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openImageModal}
                    className="relative block cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-full"
                    aria-label="View profile photo in full quality"
                  >
                    <OptimizedStudentImage
                      studentId={typeof student?.StudentID === 'number' ? student.StudentID : null}
                      size="full"
                      className="w-32 h-32 rounded-full border-4 border-blue-100 mx-auto object-cover transition-transform duration-200 hover:scale-105"
                      alt="Profile"
                      fallbackIcon={<User className="h-16 w-16 text-blue-600" />}
                    />
                  </button>
                )}

                {editing && (
                  <div className="absolute bottom-0 right-0 flex space-x-1">
                    <label className={`p-2 bg-white rounded-full shadow-lg cursor-pointer hover:bg-gray-50 ${validatingFace ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <Upload className="h-4 w-4 text-gray-600" />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={validatingFace}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={openCaptureModal}
                      disabled={validatingFace}
                      className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 disabled:opacity-50"
                      title="Capture from camera"
                    >
                      <Camera className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                )}
              </div>

              {faceStatus && (
                <div
                  className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                    faceStatus.type === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {faceStatus.text}
                </div>
              )}

              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {student.FirstName} {student.LastName}
              </h3>
              <p className="text-sm text-gray-500">ID: {student.StudentID}</p>
              <p className="text-sm text-gray-500">{student.Email}</p>

              <div className="mt-2">
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${(student as any).CafeAccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {(student as any).CafeAccess ? 'Cafeteria Access: Enabled' : 'Cafeteria Access: Disabled'}
                </span>
              </div>

              {validatingFace && (
                <div className="mt-2 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-xs text-gray-500 mt-1">Validating face...</p>
                </div>
              )}
            </div>
          </div>

          
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student ID</label>
                {editing ? (
                  <input
                    type="text"
                    value={editForm.StudentIdentifier}
                    onChange={(e) => setEditForm({...editForm, StudentIdentifier: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                ) : (
                  <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                    {(student as any).StudentIdentifier || student.StudentID}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editForm.FirstName}
                      onChange={(e) => setEditForm({...editForm, FirstName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  ) : (
                    <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {student.FirstName}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editForm.LastName}
                      onChange={(e) => setEditForm({...editForm, LastName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  ) : (
                    <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {student.LastName}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                {editing ? (
                  <input
                    type="email"
                    value={editForm.Email}
                    onChange={(e) => setEditForm({...editForm, Email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                ) : (
                  <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                    {student.Email}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                {editing ? (
                  <select
                    value={editForm.Department}
                    onChange={(e) => setEditForm({...editForm, Department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                    {(student as any).Department || 'Not specified'}
                  </div>
                )}
              </div>

              {editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Enrollment Date</label>
                  <input
                    type="date"
                    value={editForm.EnrollmentDate}
                    onChange={(e) => setEditForm({...editForm, EnrollmentDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {editing && (
                <div className="flex items-center space-x-2">
                  <input
                    id="CafeAccessEdit"
                    type="checkbox"
                    checked={!!editForm.CafeAccess}
                    onChange={(e) => setEditForm({...editForm, CafeAccess: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="CafeAccessEdit" className="text-sm text-gray-700">Enable Cafeteria Access</label>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enrollment Date</label>
                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                  {new Date(student.EnrollmentDate).toLocaleDateString()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    student.IsActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {student.IsActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {editing && (
                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditForm({
                        StudentIdentifier: (student as any).StudentIdentifier || student.StudentID || '',
                        FirstName: student.FirstName,
                        LastName: student.LastName,
                        Email: student.Email,
                        Department: (student as any).Department || '',
                        PhotoPath: (student as any).PhotoPath,
                        EnrollmentDate: student.EnrollmentDate ? new Date(student.EnrollmentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        CafeAccess: !!(student as any).CafeAccess
                      });
                      setImagePreview((student as any).PhotoPath);
                      setImageLoaded(false);
                      setFaceStatus(null);
                    }}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      
      {showCaptureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Capture Profile Picture</h3>
              <button onClick={closeCaptureModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg"
                  style={{ maxHeight: '400px', display: 'block' }}
                ></video>
                <canvas ref={canvasRef} className="hidden"></canvas>

                {validatingFace && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                      <p className="text-white text-sm">Validating face...</p>
                    </div>
                  </div>
                )}

                {faceValidationResult && (
                  <div className={`absolute top-2 left-2 right-2 p-3 rounded-lg ${
                    faceValidationResult.face_detected
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}>
                    <p className="text-sm font-medium">{faceValidationResult.message}</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Instructions:</strong> Position your face in the center of the frame. Ensure good lighting and look directly at the camera.
                </p>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={captureImage}
                  disabled={validatingFace}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Camera className="h-4 w-4" />
                  <span>{validatingFace ? 'Validating...' : 'Capture & Validate'}</span>
                </button>
                <button
                  onClick={closeCaptureModal}
                  disabled={validatingFace}
                  className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={closeImageModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <p className="text-lg font-semibold text-gray-900">Profile Photo</p>
              <button
                onClick={closeImageModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close image preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative bg-gray-900 flex items-center justify-center min-h-[300px]">
              {fullImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
                </div>
              )}
              {fullImageError ? (
                <div className="py-16 px-6 text-center">
                  <p className="text-sm text-red-600">{fullImageError}</p>
                  <button
                    onClick={() => {
                      setFullImageError(null);
                      if (student?.StudentID) {
                        const url = `${API_BASE}/api/images/student/${student.StudentID}?size=full&format=jpeg&no_cache=${Date.now()}`;
                        setFullImageSrc(url);
                        setFullImageLoading(true);
                      }
                    }}
                    className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                fullImageSrc && (
                  <img
                    src={fullImageSrc}
                    alt="Full size profile"
                    className="max-h-[80vh] w-full object-contain bg-gray-900"
                    onLoad={() => setFullImageLoading(false)}
                    onError={() => {
                      setFullImageLoading(false);
                      setFullImageError('Unable to load profile photo.');
                    }}
                  />
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
