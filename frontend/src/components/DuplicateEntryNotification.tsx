import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Flag, UserCircle } from 'lucide-react';
import { apiService } from '../services/api';
import { OptimizedStudentImage } from '../hooks/useOptimizedImage.tsx';
import { soundAlerts } from '../utils/soundAlerts';

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

  useEffect(() => {
    soundAlerts.startDuplicateEntryAlert();
    return () => {
      soundAlerts.stopDuplicateEntryAlert();
    };
  }, []);

  const handleAction = async (action: 'allow' | 'deny' | 'flag') => {
    soundAlerts.stopDuplicateEntryAlert();
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

  const handleCloseClick = () => {
    soundAlerts.stopDuplicateEntryAlert();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 transform scale-110">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-yellow-50">
          <h3 className="text-2xl font-bold text-yellow-800">⚠️ Duplicate Entry Alert</h3>
          <button
            onClick={handleCloseClick}
            className="text-gray-400 hover:text-gray-600"
            disabled={processing}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8">
          <div className="flex items-center space-x-6 mb-6">
            {student ? (
              <OptimizedStudentImage
                studentId={student.StudentID}
                size="medium"
                className="h-24 w-24 rounded-full border-4 border-yellow-400"
                alt={`${student.FirstName} ${student.LastName}`}
                fallbackIcon={<UserCircle className="h-20 w-20 text-blue-600" />}
              />
            ) : (
              <UserCircle className="h-24 w-24 text-gray-400" />
            )}
            <div className="flex-1">
              {student ? (
                <>
                  <p className="text-2xl font-bold text-gray-900">
                    {student.FirstName} {student.LastName}
                  </p>
                  <p className="text-lg text-gray-600 mt-1">ID: {student.StudentID}</p>
                </>
              ) : (
                <p className="text-2xl font-bold text-gray-900">Unknown Student</p>
              )}
            </div>
          </div>

          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-5 mb-6">
            <p className="text-base text-yellow-900 font-medium">
              <strong className="text-lg">⚠️ Warning:</strong> This student has already accessed the cafeteria during this meal period today.
            </p>
          </div>

          <p className="text-base text-gray-700 mb-6 font-medium">
            Please select an action for this duplicate entry:
          </p>

          <div className="flex flex-col space-y-3">
            <button
              onClick={() => handleAction('allow')}
              disabled={processing}
              className="flex items-center justify-center space-x-3 px-6 py-4 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              <CheckCircle className="h-6 w-6" />
              <span>ALLOW ENTRY</span>
            </button>

            <button
              onClick={() => handleAction('deny')}
              disabled={processing}
              className="flex items-center justify-center space-x-3 px-6 py-4 bg-red-600 text-white text-lg font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              <XCircle className="h-6 w-6" />
              <span>DENY ENTRY</span>
            </button>

            <button
              onClick={() => handleAction('flag')}
              disabled={processing}
              className="flex items-center justify-center space-x-3 px-6 py-4 bg-orange-600 text-white text-lg font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              <Flag className="h-6 w-6" />
              <span>FLAG FOR REVIEW</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

