import { useState, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, AlertTriangle, Filter, RefreshCw } from 'lucide-react';

interface IPCameraLog {
  LogID: number;
  StudentID?: number;
  CameraID: number;
  MatchScore?: number;
  Decision?: boolean;
  EventTime: string;
  CameraType?: string;
  VerificationStatus?: string;
  Notes?: string;
}

interface IPCameraStats {
  total_attempts: number;
  successful: number;
  failed: number;
  unknown_persons: number;
  success_rate: number;
  time_period_hours: number;
}

export default function IPCameraLogs() {
  const [logs, setLogs] = useState<IPCameraLog[]>([]);
  const [stats, setStats] = useState<IPCameraStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    cameraType: '',
    verificationStatus: '',
    hours: 24
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.cameraType) params.append('camera_type', filters.cameraType);
      if (filters.verificationStatus) params.append('verification_status', filters.verificationStatus);
      params.append('hours', filters.hours.toString());
      
      const response = await fetch(`/api/ip-camera-logs?${params}`);
      const logsData = await response.json();
      setLogs(logsData);

      const statsResponse = await fetch(`/api/ip-camera-logs/stats?hours=${filters.hours}`);
      const statsData = await statsResponse.json();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching IP camera logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const getStatusIcon = (status?: string, decision?: boolean) => {
    if (status === 'Success' && decision) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (status === 'Failed' || !decision) {
      return <XCircle className="h-5 w-5 text-red-600" />;
    } else {
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status?: string, decision?: boolean) => {
    if (status === 'Success' && decision) {
      return 'bg-green-100 text-green-800';
    } else if (status === 'Failed' || !decision) {
      return 'bg-red-100 text-red-800';
    } else {
      return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">IP Camera Logs</h2>
          <p className="mt-2 text-gray-600">Monitor IP camera verification attempts and results</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Camera className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Attempts</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total_attempts}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Successful</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.successful}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Failed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.failed}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Unknown</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.unknown_persons}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">%</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Success Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.success_rate}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex space-x-4">
            <select
              value={filters.cameraType}
              onChange={(e) => setFilters({ ...filters, cameraType: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Camera Types</option>
              <option value="IP Camera">IP Camera</option>
              <option value="Webcam">Webcam</option>
            </select>
            
            <select
              value={filters.verificationStatus}
              onChange={(e) => setFilters({ ...filters, verificationStatus: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
            </select>
            
            <select
              value={filters.hours}
              onChange={(e) => setFilters({ ...filters, hours: parseInt(e.target.value) })}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value={1}>Last Hour</option>
              <option value={6}>Last 6 Hours</option>
              <option value={24}>Last 24 Hours</option>
              <option value={168}>Last Week</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Verification Logs</h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Camera
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.LogID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.EventTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Camera className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{log.CameraType || 'Webcam'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(log.VerificationStatus, log.Decision)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.VerificationStatus, log.Decision)}`}>
                          {log.VerificationStatus || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.MatchScore ? `${Math.round(log.MatchScore * 100)}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {log.Notes || 'No notes'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {logs.length === 0 && (
              <div className="text-center py-12">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No IP camera logs found for the selected filters.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}