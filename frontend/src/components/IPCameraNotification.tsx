import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Camera, AlertTriangle } from 'lucide-react';

interface IPCameraNotificationProps {
  show: boolean;
  type: 'success' | 'failure' | 'unknown' | 'connection';
  message: string;
  studentName?: string;
  confidence?: number;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export default function IPCameraNotification({
  show,
  type,
  message,
  studentName,
  confidence,
  onClose,
  autoClose = true,
  duration = 3000
}: IPCameraNotificationProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
    
    if (show && autoClose) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300); // Wait for animation
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, autoClose, duration, onClose]);

  // Only show notifications for verification results, not connection status
  if (!visible) return null;
  if (type === 'connection') return null;

  const getNotificationStyle = () => {
    switch (type as string) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'failure':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'unknown':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'connection':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = () => {
    switch (type as string) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'failure':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'unknown':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case 'connection':
        return <Camera className="h-6 w-6 text-blue-600" />;
      default:
        return <Camera className="h-6 w-6 text-gray-600" />;
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${
      visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`max-w-sm w-full rounded-lg border-2 shadow-lg p-4 ${getNotificationStyle()}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                IP Camera Verification
              </p>
              <button
                onClick={() => {
                  setVisible(false);
                  setTimeout(onClose, 300);
                }}
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-sm">
              {message}
            </p>
            {studentName && (
              <p className="mt-1 text-sm font-semibold">
                Student: {studentName}
              </p>
            )}
            {confidence !== undefined && (
              <p className="mt-1 text-xs opacity-75">
                Confidence: {Math.round(confidence * 100)}%
              </p>
            )}
            <p className="mt-1 text-xs opacity-60">
              {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}