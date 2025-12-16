import { useEffect, useState, useRef } from 'react';
import { Search, UserCircle, Camera, Upload, X, Trash2 } from 'lucide-react';
import { Student } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { OptimizedStudentImage } from '../hooks/useOptimizedImage.tsx';


interface StudentManagementProps {
  viewOnly?: boolean;
}

export default function StudentManagement({ viewOnly = false }: StudentManagementProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    StudentID: '',
    StudentIdentifier: '',
    FirstName: '',
    LastName: '',
    Email: '',
    Department: '',
    EnrollmentYear: new Date().getFullYear(),
    PhotoPath: undefined as string | undefined,
    CafeAccess: false
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [validatingFace, setValidatingFace] = useState(false);
  const [faceValidationResult, setFaceValidationResult] = useState<{ face_detected: boolean; message: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { user } = useAuth();
  const canManage = !viewOnly && user?.role === 'admin';

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await apiService.getStudents();
      setStudents(data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const studentData = {
        StudentID: newStudent.StudentID,
        StudentIdentifier: newStudent.StudentIdentifier,
        FirstName: newStudent.FirstName,
        LastName: newStudent.LastName,
        Email: newStudent.Email,
        Department: newStudent.Department,
        EnrollmentYear: newStudent.EnrollmentYear,
        PhotoPath: newStudent.PhotoPath,
        CafeAccess: newStudent.CafeAccess
      };

      const student = await apiService.createStudent(studentData);
      setStudents([student, ...students]);
      setShowAddModal(false);
      resetForm();
      
      if (newStudent.PhotoPath) {
        alert('Student registered successfully! Face has been automatically registered for recognition.');
      } else {
        alert('Student registered successfully! Please add a face image for recognition.');
      }
    } catch (error) {
      console.error('Failed to add student:', error);
      alert('Failed to add student. Please check if student number or email already exists.');
    }
  };

  const handleDelete = async (student: Student) => {
    if (!window.confirm(`Are you sure you want to delete ${student.FirstName} ${student.LastName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiService.deleteStudent(student.StudentID);
      setStudents(students.filter(s => s.StudentID !== student.StudentID));
      alert('Student deleted successfully');
    } catch (error) {
      console.error('Failed to delete student:', error);
      alert('Failed to delete student. Please try again.');
    }
  };

  const resetForm = () => {
    setNewStudent({
      StudentID: '',
      StudentIdentifier: '',
      FirstName: '',
      LastName: '',
      Email: '',
      Department: '',
      EnrollmentYear: new Date().getFullYear(),
      PhotoPath: undefined,
      CafeAccess: false
    });
    setImagePreview(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = (event.target as FileReader).result;
        if (result && typeof result === 'string') {
          setImagePreview(result);
          
          try {
            setValidatingFace(true);
            const validation = await apiService.validateFace(result);
            
            if (validation.face_detected) {
              setNewStudent(prev => ({...prev, PhotoPath: result}));
              alert('✓ Face detected successfully! Image ready for registration.');
            } else {
              alert(`⚠️ ${validation.message}\n\nPlease upload an image with a clear, visible face.`);
              setImagePreview(null);
              e.target.value = '';
            }
          } catch (error) {
            console.error('Face validation error:', error);
            alert('Error validating face. Please try again.');
            setImagePreview(null);
            e.target.value = '';
          } finally {
            setValidatingFace(false);
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try again.');
      setImagePreview(null);
      e.target.value = '';
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
            setNewStudent({...newStudent, PhotoPath: imageData});
            stopCamera();
            setTimeout(() => {
              setShowCaptureModal(false);
              setFaceValidationResult(null);
            }, 1000);
          } else {
            alert(validation.message);
          }
        } catch (error) {
          console.error('Face validation error:', error);
          alert('Error validating face. Please try again.');
        } finally {
          setValidatingFace(false);
        }
      }
    }
  };

  useEffect(() => {
    if (newStudent.PhotoPath) {
      setImagePreview(newStudent.PhotoPath);
    }
  }, [newStudent.PhotoPath]);

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

  const filteredStudents = students.filter(
    (student) =>
      `${student.FirstName} ${student.LastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.StudentIdentifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.Email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Register Student</h3>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <input
                type="text"
                placeholder="Student ID"
                value={newStudent.StudentID}
                onChange={(e) => setNewStudent({...newStudent, StudentID: e.target.value})}
                className="w-full p-2 border rounded-lg"
                required
              />
              <input
                type="text"
                placeholder="Student Identifier (e.g., ID Card Number)"
                value={newStudent.StudentIdentifier}
                onChange={(e) => setNewStudent({...newStudent, StudentIdentifier: e.target.value})}
                className="w-full p-2 border rounded-lg"
                required
              />
              <input
                type="text"
                placeholder="First Name"
                value={newStudent.FirstName}
                onChange={(e) => setNewStudent({...newStudent, FirstName: e.target.value})}
                className="w-full p-2 border rounded-lg"
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={newStudent.LastName}
                onChange={(e) => setNewStudent({...newStudent, LastName: e.target.value})}
                className="w-full p-2 border rounded-lg"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={newStudent.Email}
                onChange={(e) => setNewStudent({...newStudent, Email: e.target.value})}
                className="w-full p-2 border rounded-lg"
                required
              />
              <input
                type="text"
                placeholder="Department"
                value={newStudent.Department}
                onChange={(e) => setNewStudent({...newStudent, Department: e.target.value})}
                className="w-full p-2 border rounded-lg"
              />
              <select
                value={newStudent.EnrollmentYear}
                onChange={(e) => setNewStudent({...newStudent, EnrollmentYear: parseInt(e.target.value)})}
                className="w-full p-2 border rounded-lg"
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year}>
                      Enrollment Year: {year}
                    </option>
                  );
                })}
              </select>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="addCafeAccess"
                  checked={newStudent.CafeAccess}
                  onChange={(e) => setNewStudent({...newStudent, CafeAccess: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="addCafeAccess" className="ml-2 block text-sm text-gray-700">
                  Cafeteria Access (Enable meal service)
                </label>
              </div>

              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Face Image <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Required for face recognition. Please ensure the image contains a clear, front-facing face.
                </p>
                <div className="flex space-x-2">
                  <label className={`flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 ${validatingFace ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <Upload className="h-4 w-4 mr-2" />
                    <span className="text-sm">{validatingFace ? 'Validating...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={validatingFace}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => openCaptureModal()}
                    disabled={validatingFace}
                    className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    <span className="text-sm">Capture from Camera</span>
                  </button>
                </div>
                {imagePreview && (
                  <div className="mt-2 flex items-center space-x-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 rounded-lg object-cover border-2 border-green-500"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="text-sm text-green-600">
                      <p className="font-medium">✓ Face image ready</p>
                      <p className="text-xs text-gray-500">Image will be saved and registered</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg">
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="flex-1 bg-gray-300 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {showCaptureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Capture Face Image</h3>
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

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Student Management</h2>
          <p className="mt-2 text-gray-600">Search and manage registered students</p>
        </div>

      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search students by name, ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrollment Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cafe Access
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {loading ? 'Loading students...' : 'No students found'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                <tr key={student.StudentID} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <OptimizedStudentImage
                        studentId={typeof student.StudentID === 'number' ? student.StudentID : null}
                        size="thumbnail"
                        className="h-10 w-10 rounded-full"
                        alt={`${student.FirstName} ${student.LastName}`}
                        fallbackIcon={<UserCircle className="h-6 w-6 text-blue-600" />}
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{`${student.FirstName} ${student.LastName}`}</div>
                        <div className="text-sm text-gray-500">{student.Email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.StudentIdentifier}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{(student as any).Department || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(student.EnrollmentDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      student.IsActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {student.IsActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      (student as any).CafeAccess
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {(student as any).CafeAccess ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {canManage && (
                      <button
                        onClick={() => handleDelete(student)}
                        className="inline-flex items-center space-x-1 text-red-600 hover:text-red-900"
                        title="Delete Student"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="text-sm font-medium">Delete</span>
                      </button>
                    )}
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}