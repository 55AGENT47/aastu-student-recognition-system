import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DuplicateAlertProps {
  onClose?: () => void;
}

export default function DuplicateAlert({ onClose }: DuplicateAlertProps) {
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    checkDuplicates();
    const interval = setInterval(checkDuplicates, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkDuplicates = async () => {
    try {
      const response = await fetch('/api/duplicate-entries', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setDuplicateCount(data.duplicate_count);
      setShowAlert(data.has_duplicates);
    } catch (error) {
      console.error('Failed to check duplicates:', error);
    }
  };

  const handleClose = () => {
    setShowAlert(false);
    onClose?.();
  };

  if (!showAlert) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Duplicate Cafeteria Entries Detected
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {duplicateCount} duplicate entries found in the last 24 hours.
            </p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleClose}
              className="inline-flex text-red-400 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}