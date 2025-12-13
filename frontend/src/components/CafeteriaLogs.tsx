// src/components/CafeteriaLogs.tsx
import { useEffect, useState } from 'react';
import { Filter, Download, XCircle, Trash2 } from 'lucide-react';
import { CafeteriaLog, Student, Camera } from '../types';
import { apiService } from '../services/api';

const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

export default function CafeteriaLogs() {
  const [cafeteriaLogs, setCafeteriaLogs] = useState<CafeteriaLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showClearLogsModal, setShowClearLogsModal] = useState(false);
  const [clearDaysOld, setClearDaysOld] = useState<number | ''>('');
  const [isClearing, setIsClearing] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');
  const SUCCESS_CONFIDENCE_THRESHOLD = 0.6;

  useEffect(() => {
    fetchLogs();
    // Get user role from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || 'user');
      } catch (e) {
        console.error('Failed to parse token:', e);
      }
    }
    
    const handleProfileUpdate = () => {
      fetchLogs();
    };
    
    window.addEventListener('studentProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('studentProfileUpdated', handleProfileUpdate);
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const [cafeteriaResult, studentsResult, camerasResult] = await Promise.allSettled([
        apiService.getCafeteriaLogs(),
        apiService.getStudents(),
        apiService.getCameras(),
      ]);

      if (cafeteriaResult.status === 'fulfilled') {
        setCafeteriaLogs(cafeteriaResult.value);
      } else {
        console.error('Failed to fetch cafeteria logs:', cafeteriaResult.reason);
        if (cafeteriaResult.reason instanceof Error) {
          setError(cafeteriaResult.reason.message);
        } else {
          setError('Failed to load cafeteria logs. Please try again.');
        }
        setCafeteriaLogs([]);
      }

      if (studentsResult.status === 'fulfilled') {
        setStudents(studentsResult.value);
      } else {
        console.error('Failed to fetch students for logs:', studentsResult.reason);
        setStudents([]);
      }

      if (camerasResult.status === 'fulfilled') {
        setCameras(camerasResult.value);
      } else {
        console.error('Failed to fetch cameras for logs:', camerasResult.reason);
        setCameras([]);
      }
    } catch (error) {
      console.error('Unexpected error while fetching logs:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStudentInfo = (studentId: number | null): { name: string; identifier: string } => {
    if (!studentId) return { name: 'Unknown', identifier: 'N/A' };
    const student = students.find(s => s.StudentID === studentId);
    return student 
      ? { name: `${student.FirstName} ${student.LastName}`, identifier: String(studentId) }
      : { name: 'Unknown', identifier: String(studentId) };
  };

  const getCameraLocation = (cameraId: number | null): string => {
    if (!cameraId) return 'N/A';
    const camera = cameras.find(c => c.CameraID === cameraId);
    return camera ? camera.Location : 'Unknown';
  };

  const allLogs = cafeteriaLogs
    .map(log => {
      const studentInfo = log.FirstName && log.LastName 
        ? { name: `${log.FirstName} ${log.LastName}`, identifier: log.StudentID || 'N/A' }
        : getStudentInfo(log.StudentID);
      return {
        ...log,
        studentName: studentInfo.name,
        studentIdentifier: studentInfo.identifier,
        cameraLocation: log.CameraLocation || getCameraLocation(log.CameraID),
        timestamp: log.AccessTime,
        confidence: log.MatchScore || 0,
        decision: log.Decision !== null ? log.Decision : false,
        isSuccess: (log.Decision === true && ((log.MatchScore || 0) >= SUCCESS_CONFIDENCE_THRESHOLD)),
        formattedTime: new Date(log.AccessTime).toLocaleString(),
        timeAgo: getTimeAgo(log.AccessTime),
        confidencePercentage: Math.round((log.MatchScore || 0) * 100)
      };
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredLogs = allLogs.filter(log => {
    if (filter === 'success' && !log.isSuccess) return false;
    if (filter === 'failed' && log.isSuccess) return false;
    if (dateFilter.start) {
      const logDate = new Date(log.timestamp);
      const startDate = new Date(dateFilter.start);
      if (logDate < startDate) return false;
    }
    if (dateFilter.end) {
      const logDate = new Date(log.timestamp);
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999);
      if (logDate > endDate) return false;
    }
    if (locationFilter !== 'all' && log.cameraLocation !== locationFilter) return false;
    return true;
  });

  const totalCount = allLogs.length;
  const successCount = allLogs.filter(log => log.isSuccess).length;
  const failedCount = totalCount - successCount;
  const isAdmin = userRole === 'admin';

  const handleClearLogs = async () => {
    if (!isAdmin) return;
    
    setIsClearing(true);
    try {
      const days = clearDaysOld === '' ? undefined : clearDaysOld;
      await apiService.clearLogs('cafeteria', days);
      setShowClearLogsModal(false);
      setClearDaysOld('');
      fetchLogs(); // Refresh logs after clearing
    } catch (error) {
      console.error('Failed to clear logs:', error);
      setError(error instanceof Error ? error.message : 'Failed to clear logs');
    } finally {
      setIsClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={fetchLogs}
              className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Cafeteria Logs</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilterModal(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Filter className="-ml-0.5 mr-2 h-4 w-4" />
            Filter
          </button>
          <button
            onClick={() => {
              const csv = [
                ['Student', 'Student ID', 'Time', 'Location', 'Status', 'Confidence'],
                ...filteredLogs.map(log => [
                  log.studentName,
                  log.studentIdentifier,
                  log.formattedTime,
                  log.cameraLocation,
                  log.isSuccess ? 'Success' : 'Failed',
                  `${log.confidencePercentage}%`
                ])
              ].map(row => row.join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `cafeteria-logs-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="-ml-0.5 mr-2 h-4 w-4" />
            Export
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowClearLogsModal(true)}
              className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              disabled={allLogs.length === 0}
            >
              <Trash2 className="-ml-0.5 mr-2 h-4 w-4" />
              Clear Logs
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium">{filteredLogs.length}</span> of{' '}
                <span className="font-medium">{allLogs.length}</span> logs
              </p>
            </div>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <span className="h-3 w-3 rounded-full bg-green-500 mr-1"></span>
                <span className="text-sm text-gray-500">
                  Success: <span className="font-medium">{successCount}</span>
                </span>
              </div>
              <div className="flex items-center">
                <span className="h-3 w-3 rounded-full bg-red-500 mr-1"></span>
                <span className="text-sm text-gray-500">
                  Failed: <span className="font-medium">{failedCount}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No logs found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Student
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Time
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Location
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.LogID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {log.StudentID ? (
                          <img
                            src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/images/student/${log.StudentID}?size=thumbnail`}
                            alt={log.studentName}
                            className="h-10 w-10 rounded-full object-cover mr-3"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 mr-3" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.studentName}</div>
                          <div className="text-sm text-gray-500">ID: {log.studentIdentifier}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{log.formattedTime}</div>
                      <div className="text-sm text-gray-500">{log.timeAgo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Cafeteria
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.isSuccess ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Success
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.confidencePercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clear Logs Modal */}
      {showClearLogsModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowClearLogsModal(false)}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Clear Cafeteria Logs</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-4">
                      Choose to clear all logs or logs older than a specific number of days.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Clear logs older than (days)
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="Leave empty to clear all"
                          value={clearDaysOld}
                          onChange={(e) => setClearDaysOld(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleClearLogs}
                  disabled={isClearing}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {isClearing ? 'Clearing...' : 'Clear Logs'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowClearLogsModal(false);
                    setClearDaysOld('');
                  }}
                  disabled={isClearing}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Filter Logs</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as 'all' | 'success' | 'failed')}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="all">All</option>
                        <option value="success">Success</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">From</label>
                          <input
                            type="date"
                            value={dateFilter.start}
                            onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">To</label>
                          <input
                            type="date"
                            value={dateFilter.end}
                            onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="all">All Locations</option>
                        {Array.from(new Set(cameras.map(c => c.Location))).map((location) => (
                          <option key={location} value={location}>
                            {location}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilter('all');
                    setDateFilter({ start: '', end: '' });
                    setLocationFilter('all');
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}