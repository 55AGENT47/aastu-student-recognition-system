import React, { useState } from 'react';

import { GraduationCap, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import AastuLogo from './AastuLogo';
import StudentProfile from './StudentProfile';

type Tab = 'profile';

const StudentPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const { user, logout } = useAuth();

  const tabs = [
    { id: 'profile' as Tab, name: 'My Profile', icon: User },
  ];

  const renderStudentProfile = () => (
    <StudentProfile />
  );

  

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderStudentProfile();
      default:
        return renderStudentProfile();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex flex-1">
        
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <AastuLogo size="sm" className="mb-3" />
            <div className="flex items-center space-x-2 mt-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-medium text-gray-700">Student Portal</p>
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
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-700">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentPortal;