import { useState } from 'react';
import { X, CheckCircle, XCircle, Flag, UserCircle } from 'lucide-react';
import { apiService } from '../services/api';
import { OptimizedStudentImage } from '../hooks/useOptimizedImage.tsx';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  student_id: number | null;
  log_id: number | null;
  created_at: string;
}

interface Student {
  StudentID: string;
  FirstName: string;
  LastName: string;
  PhotoPath?: string;
}

interface DuplicateEntryNotificationProps {
  notification: Notification;
  student?: Student;
  onAction: (notificationId: number, action: string) => void;
  onClose: () => void;
}

export default function DuplicateEntryNotification({
  notification,
  student,
  onAction,
  onClose
}: DuplicateEntryNotificationProps) {
  const [processing, setProcessing] = useState(false);

  const handleAction = async (action: 'allow' | 'deny' | 'flag') => {
    setProcessing(true);
    try {
      await apiService.handleNotificationAction(notification.id, action);
      onAction(notification.id, action);
      onClose();
    } catch (error) {
      console.error('Failed to handle action:', error);
      alert(`Failed to ${action} entry. Please try again.`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Duplicate Entry Alert</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={processing}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            {student ? (
              <OptimizedStudentImage
                studentId={student.StudentID}
                size="medium"
                className="h-16 w-16 rounded-full"
                alt={`${student.FirstName} ${student.LastName}`}
                fallbackIcon={<UserCircle className="h-12 w-12 text-blue-600" />}
              />
            ) : (
              <UserCircle className="h-16 w-16 text-gray-400" />
            )}
            <div className="flex-1">
              {student ? (
                <>
                  <p className="text-lg font-semibold text-gray-900">
                    {student.FirstName} {student.LastName}
                  </p>
                  <p className="text-sm text-gray-500">ID: {student.StudentID}</p>
                </>
              ) : (
                <p className="text-lg font-semibold text-gray-900">Unknown Student</p>
              )}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> This student has already accessed the cafeteria during this meal period today.
            </p>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Please select an action for this duplicate entry:
          </p>

          <div className="flex flex-col space-y-2">
            <button
              onClick={() => handleAction('allow')}
              disabled={processing}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCircle className="h-5 w-5" />
              <span>ALLOW</span>
            </button>

            <button
              onClick={() => handleAction('deny')}
              disabled={processing}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <XCircle className="h-5 w-5" />
              <span>DENY</span>
            </button>

            <button
              onClick={() => handleAction('flag')}
              disabled={processing}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Flag className="h-5 w-5" />
              <span>FLAG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

