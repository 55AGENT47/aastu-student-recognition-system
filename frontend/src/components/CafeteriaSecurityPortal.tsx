import { useState } from 'react';
import { Camera, LogOut, ChefHat, LayoutDashboard, UtensilsCrossed, Smartphone, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LiveVerification from './LiveVerification';
import CafeteriaLogs from './CafeteriaLogs';
import Overview from './Overview';
import MealScheduleConfig from './MealScheduleConfig';

import AastuLogo from './AastuLogo';

type Tab = 'overview' | 'verification' | 'logs' | 'ip-camera' | 'meal-schedules';

export default function CafeteriaSecurityPortal() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { user, logout } = useAuth();

  const tabs = [
    { id: 'overview' as Tab, name: 'Overview', icon: LayoutDashboard },
    { id: 'verification' as Tab, name: 'Live Verification', icon: Camera },
    { id: 'ip-camera' as Tab, name: 'IP Camera Verification', icon: Smartphone },
    { id: 'logs' as Tab, name: 'Cafeteria Logs', icon: UtensilsCrossed },
    { id: 'meal-schedules' as Tab, name: 'Meal Schedules', icon: Calendar },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview />;
      case 'verification':
        return <LiveVerification key="live-verification" cameraId={2} isActive={activeTab === 'verification'} webcamOnly={true} />;
      case 'ip-camera':
        return <LiveVerification key="ip-camera-verification" cameraId={2} isActive={activeTab === 'ip-camera'} ipCameraOnly={true} />;
      case 'logs':
        return <CafeteriaLogs />;
      case 'meal-schedules':
        return <MealScheduleConfig />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
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
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
