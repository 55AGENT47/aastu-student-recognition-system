import { useState, useEffect } from 'react';
import { Camera, LogOut, ChefHat, LayoutDashboard, UtensilsCrossed, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LiveVerification from './LiveVerification';
import CafeteriaLogs from './CafeteriaLogs';
import Overview from './Overview';
import DuplicateEntryNotification from './DuplicateEntryNotification';
import { apiService } from '../services/api';
import { CafeteriaLog, Student as StudentType } from '../types';
import AastuLogo from './AastuLogo';

import MealScheduleConfig from './MealScheduleConfig';

type Tab = 'overview' | 'verification' | 'logs' | 'ip-camera' | 'meal-schedule';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  student_id: number | null;
  log_id: number | null;
  created_at: string;
  is_read: boolean;
}

interface StudentInfo {
  StudentID: string;
  FirstName: string;
  LastName: string;
  PhotoPath?: string;
}

export default function CafeteriaSecurityPortal() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { user, logout } = useAuth();
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [showRestartButton, setShowRestartButton] = useState(false);

  useEffect(() => {
    const restartTab = sessionStorage.getItem('cafeteria_restart_tab');
    if (restartTab) {
      sessionStorage.removeItem('cafeteria_restart_tab');
      setActiveTab(restartTab as Tab);
    }
  }, []);

  const tabs = [
    { id: 'overview' as Tab, name: 'Overview', icon: LayoutDashboard },
    { id: 'verification' as Tab, name: 'Live Verification', icon: Camera },
    { id: 'ip-camera' as Tab, name: 'IP Camera Verification', icon: Smartphone },
    { id: 'logs' as Tab, name: 'Cafeteria Logs', icon: UtensilsCrossed },
    { id: 'meal-schedule' as Tab, name: 'Meal Schedule', icon: ChefHat },
  ];

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const notifications = await apiService.getNotifications();
        const unreadDuplicate = notifications.find(
          (n: Notification) => n.type === 'duplicate_entry' && !n.is_read
        );
        
        if (unreadDuplicate) {
          setCurrentNotification(unreadDuplicate);
          // Fetch student info from the log if log_id is available
          if (unreadDuplicate.log_id) {
            try {
              const logs = await apiService.getCafeteriaLogs() as CafeteriaLog[];
              const log = logs.find((l) => l.LogID === unreadDuplicate.log_id);
              if (log && log.FirstName && log.LastName) {
                setStudent({
                  StudentID: String(log.StudentID || 'N/A'),
                  FirstName: log.FirstName,
                  LastName: log.LastName,
                  PhotoPath: (log as any).PhotoPath || undefined
                });
              } else if (unreadDuplicate.student_id) {
                // Fallback to fetching from students list
                const students = await apiService.getStudents() as StudentType[];
                const foundStudent = students.find((s) => 
                  (s as any).id === unreadDuplicate.student_id || 
                  (s.StudentID && String(s.StudentID) === String(unreadDuplicate.student_id))
                );
                if (foundStudent) {
                  setStudent({
                    StudentID: String(foundStudent.StudentID || foundStudent.StudentIdentifier || (foundStudent as any).id || 'N/A'),
                    FirstName: foundStudent.FirstName,
                    LastName: foundStudent.LastName,
                    PhotoPath: foundStudent.PhotoPath || undefined
                  });
                }
              }
            } catch (error) {
              console.error('Failed to fetch student:', error);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const handleNotificationAction = async (_notificationId: number, _action: string) => {
    setCurrentNotification(null);
    setStudent(null);
    setShowRestartButton(true);
    // Refresh logs if on logs tab
    if (activeTab === 'logs') {
      window.dispatchEvent(new Event('refreshCafeteriaLogs'));
    }
  };

  const handleCloseNotification = () => {
    setCurrentNotification(null);
    setStudent(null);
    setShowRestartButton(true);
  };

  const handleRestartCamera = () => {
    sessionStorage.setItem('cafeteria_restart_tab', activeTab);
    setShowRestartButton(false);
    window.location.reload();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview />;
      case 'verification':
        return <LiveVerification key="live-verification" cameraId={2} isActive={activeTab === 'verification' && !currentNotification} webcamOnly={true} />;
      case 'ip-camera':
        return <LiveVerification key="ip-camera-verification" cameraId={2} isActive={activeTab === 'ip-camera' && !currentNotification} ipCameraOnly={true} />;
      case 'logs':
        return <CafeteriaLogs />;
      case 'meal-schedule':
        return <MealScheduleConfig />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {currentNotification && (
        <DuplicateEntryNotification
          notification={currentNotification}
          student={student || undefined}
          onAction={handleNotificationAction}
          onClose={handleCloseNotification}
        />
      )}
      <div className="flex flex-1">
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <AastuLogo size="sm" className="mb-3" />
            <div className="flex items-center space-x-2 mt-2">
              <ChefHat className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cafeteria Security Portal</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-orange-50 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-orange-600 dark:bg-orange-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.name?.charAt(0) || 'C'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.name || 'Cafeteria Security'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-8 py-8">
            {showRestartButton && (activeTab === 'verification' || activeTab === 'ip-camera') && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Camera className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Camera stopped after notification</span>
                </div>
                <button
                  onClick={handleRestartCamera}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </button>
              </div>
            )}
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
