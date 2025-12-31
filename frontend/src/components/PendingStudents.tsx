import { useEffect, useState } from 'react';
import { Check, X, Clock, User, Mail, Calendar, Building2 } from 'lucide-react';
import { Student } from '../types';
import { OptimizedStudentImage } from '../hooks/useOptimizedImage.tsx';
import { apiService } from '../services/api';

export default function PendingStudents() {
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingStudents();
  }, []);

  const fetchPendingStudents = async () => {
    try {
      const data = await apiService.getPendingStudents();
      setPendingStudents(data);
    } catch (error) {
      console.error('Failed to fetch pending students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (studentId: string, approved: boolean) => {
    try {
      const endpoint = approved 
        ? `/api/registration/approve/${studentId}` 
        : `/api/registration/reject/${studentId}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to update student status');
      
      setPendingStudents(prev => prev.filter(s => s.StudentID !== studentId));
      alert(`Student ${approved ? 'approved' : 'rejected'} successfully`);
      
      // Trigger overview refresh
      window.dispatchEvent(new Event('studentApprovalChanged'));
    } catch (error) {
      console.error('Failed to update student status:', error);
      alert('Failed to update student status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Pending Approvals</h2>
          <p className="mt-2 text-gray-600">Review and approve student registrations</p>
        </div>
        <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
          {pendingStudents.length} Pending
        </div>
      </div>

      {pendingStudents.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pending approvals</h3>
          <p className="mt-1 text-sm text-gray-500">All student registrations are up to date.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="grid gap-6 p-6">
            {pendingStudents.map((student) => (
              <div key={student.StudentID} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Student Photo */}
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                      <OptimizedStudentImage
                        studentId={student.StudentID}
                        size="medium"
                        className="w-full h-full object-cover"
                        alt={`${student.FirstName} ${student.LastName}`}
                        fallbackIcon={<User className="h-12 w-12 text-gray-400" />}
                      />
                    </div>
                  </div>
                  
                  {/* Student Information */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {student.FirstName} {student.LastName}
                        </h3>
                        <p className="text-sm text-gray-500">ID: {(student as any).StudentIdentifier || student.StudentID}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{student.Email}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Building2 className="h-4 w-4" />
                        <span>{(student as any).Department || 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>Enrolled: {new Date(student.EnrollmentDate).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">Cafeteria Access:</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          (student as any).CafeAccess 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {(student as any).CafeAccess ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">Status:</span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                          Pending Approval
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2 lg:w-32">
                    <button
                      onClick={() => handleApproval(student.StudentID, true)}
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleApproval(student.StudentID, false)}
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}