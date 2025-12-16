import { useEffect } from 'react';
import { AlertTriangle, X, Clock, User, Calendar } from 'lucide-react';

interface DuplicateEntryAlertProps {
  studentName: string;
  firstEntryTime: string;
  currentTime: string;
  mealPeriod: string;
  onClose: () => void;
}

export default function DuplicateEntryAlert({
  studentName,
  firstEntryTime,
  currentTime,
  mealPeriod,
  onClose
}: DuplicateEntryAlertProps) {
  
  useEffect(() => {
    console.log('🎯 DuplicateEntryAlert mounted for:', studentName);
    
    const autoCloseTimer = setTimeout(() => {
      console.log('⏰ Auto-closing duplicate alert');
      onClose();
    }, 30000);
    
    return () => clearTimeout(autoCloseTimer);
  }, [studentName, onClose]);
  
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  const calculateTimeDifference = () => {
    const first = new Date(firstEntryTime);
    const current = new Date(currentTime);
    const diffMinutes = Math.round((current.getTime() - first.getTime()) / 60000);
    return diffMinutes;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 transition-opacity"
        onClick={onClose}
      />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full border-4 border-red-500 animate-pulse">
          <div className="bg-red-600 text-white p-6 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-8 w-8" />
                <div>
                  <h2 className="text-2xl font-bold">DUPLICATE ENTRY DETECTED!</h2>
                  <p className="text-red-100">Immediate attention required</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-red-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-red-50 dark:bg-gray-700 rounded-lg">
              <User className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Student</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {studentName}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">First Entry</span>
                </div>
                <p className="text-lg font-bold">
                  {formatTime(firstEntryTime)}
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Current Attempt</span>
                </div>
                <p className="text-lg font-bold">
                  {formatTime(currentTime)}
                </p>
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    ⚠️ Meal Period: {mealPeriod}
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-300">
                    Time between entries: {calculateTimeDifference()} minutes
                  </p>
                </div>
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                What action would you like to take?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  Allow Entry (Exception)
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  Deny Entry
                </button>
                <button
                  onClick={() => {
                    console.log('Flag student:', studentName);
                    onClose();
                  }}
                  className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                >
                  Flag
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 rounded-b-xl">
            <p className="text-xs text-gray-500 text-center">
              Alert will auto-dismiss in 30 seconds
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
