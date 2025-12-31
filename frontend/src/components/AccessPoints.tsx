import { useEffect, useState } from 'react';
import { MapPin, Plus, Power, X, Edit, Trash2, CheckCircle } from 'lucide-react';
import { Camera, EventLog, CafeteriaLog } from '../types';
import { apiService } from '../services/api';

export default function AccessPoints() {
  const [points, setPoints] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState<Camera | null>(null);
  const [mainGateLogs, setMainGateLogs] = useState<EventLog[]>([]);
  const [cafeteriaLogs, setCafeteriaLogs] = useState<CafeteriaLog[]>([]);
  const [newPoint, setNewPoint] = useState({
    Location: '',
    Resolution: '',
    IP_Address: ''
  });

  const accessPointOptions = ['Cafeteria', 'Main Gate'];
  const [locationSelect, setLocationSelect] = useState<string>('');
  const [ipMode, setIpMode] = useState<'manual' | 'mobile'>('manual');

  useEffect(() => {
    fetchAccessPoints();
    fetchLogs();
  }, []);

  const fetchAccessPoints = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCameras();
      setPoints(data);
    } catch (error) {
      console.error('Failed to fetch access points:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const [mainGateData, cafeteriaData] = await Promise.all([
        apiService.getMainGateLogs(),
        apiService.getCafeteriaLogs(),
      ]);
      setMainGateLogs(mainGateData);
      setCafeteriaLogs(cafeteriaData);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const getAccessStatus = (location: string) => {
    const locationLower = location.toLowerCase();
    
    const hasAccess = mainGateLogs.some(log => 
      log.CameraLocation?.toLowerCase() === locationLower && log.Decision === true
    ) || cafeteriaLogs.some(log => 
      log.CameraLocation?.toLowerCase() === locationLower && log.Decision === true
    );

    if (hasAccess) {
      if (locationLower.includes('main gate')) {
        return 'Main Gate Accessed!!!';
      }
      if (locationLower.includes('cafeteria')) {
        return 'Cafeteria Accessed!!!';
      }
    }
    return null;
  };

  const handleAddPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cameraData = {
        Location: newPoint.Location,
        Resolution: newPoint.Resolution || null,
        IP_Address: newPoint.IP_Address || null
      };
      const newCamera = await apiService.createCamera(cameraData as any);
      setPoints([...points, newCamera]);
      setShowAddModal(false);
      setNewPoint({ Location: '', Resolution: '', IP_Address: '' });
    } catch (error) {
      console.error('Failed to add access point:', error);
      const message = error instanceof Error ? error.message : 'Failed to add access point. Please check if IP address already exists.';
      alert(message);
    }
  };

  const toggleStatus = async (id: number) => {
    try {
      await apiService.toggleCamera(id);
      fetchAccessPoints(); 
    } catch (error) {
      console.error('Failed to toggle status:', error);
      alert('Failed to toggle camera status');
    }
  };

  const handleEdit = (point: Camera) => {
    setEditingPoint(point);
    setNewPoint({
      Location: point.Location,
      Resolution: (point as any).Resolution || '',
      IP_Address: (point as any).IP_Address || ''
    });
    setShowEditModal(true);
  };

  const handleUpdatePoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPoint) return;
    try {
      const cameraData = {
        Location: newPoint.Location,
        Resolution: newPoint.Resolution || null,
        IP_Address: newPoint.IP_Address || null
      };
      await apiService.updateCamera(editingPoint.CameraID, cameraData);
      setShowEditModal(false);
      setEditingPoint(null);
      setNewPoint({ Location: '', Resolution: '', IP_Address: '' });
      fetchAccessPoints();
      alert('Access point updated successfully!');
    } catch (error) {
      console.error('Failed to update access point:', error);
      const message = error instanceof Error ? error.message : 'Failed to update access point. Please try again.';
      alert(message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this access point? This action cannot be undone.')) {
      return;
    }
    try {
      await apiService.deleteCamera(id);
      fetchAccessPoints();
      alert('Access point deleted successfully!');
    } catch (error) {
      console.error('Failed to delete access point:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete access point';
      alert(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {showEditModal && editingPoint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit Access Point</h3>
              <button onClick={() => { setShowEditModal(false); setEditingPoint(null); setNewPoint({ Location: '', Resolution: '', IP_Address: '' }); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdatePoint} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                <input
                  type="text"
                  list="access-point-options-edit"
                  placeholder="e.g., Main Gate 1"
                  value={newPoint.Location}
                  onChange={(e) => setNewPoint({...newPoint, Location: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  required
                />
                <datalist id="access-point-options-edit">
                  {accessPointOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
                <input
                  type="text"
                  placeholder="e.g., 1920x1080"
                  value={newPoint.Resolution}
                  onChange={(e) => setNewPoint({...newPoint, Resolution: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                <input
                  type="text"
                  placeholder="e.g., 192.168.1.100"
                  value={newPoint.IP_Address}
                  onChange={(e) => setNewPoint({...newPoint, IP_Address: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div className="flex space-x-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg">
                  Update Access Point
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingPoint(null); setNewPoint({ Location: '', Resolution: '', IP_Address: '' }); }}
                  className="flex-1 bg-gray-300 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

     
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Add New Access Point</h3>
              <button onClick={() => { setShowAddModal(false); setNewPoint({ Location: '', Resolution: '', IP_Address: '' }); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddPoint} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                <div className="flex space-x-2">
                  <select
                    value={locationSelect}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocationSelect(val);
                      if (val && val !== 'other') {
                        setNewPoint({...newPoint, Location: val});
                      } else if (val === 'other') {
                        setNewPoint({...newPoint, Location: ''});
                      }
                    }}
                    className="p-2 border rounded-lg w-1/2"
                  >
                    <option value="">Select...</option>
                    {accessPointOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                    <option value="other">Other...</option>
                  </select>
                  {locationSelect === 'other' ? (
                    <input
                      type="text"
                      placeholder="Custom location (e.g., Main Gate 2)"
                      value={newPoint.Location}
                      onChange={(e) => setNewPoint({...newPoint, Location: e.target.value})}
                      className="w-1/2 p-2 border rounded-lg"
                      required
                    />
                  ) : null}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
                <input
                  type="text"
                  placeholder="e.g., 1920x1080"
                  value={newPoint.Resolution}
                  onChange={(e) => setNewPoint({...newPoint, Resolution: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <label className={`p-2 border rounded-lg cursor-pointer ${ipMode === 'manual' ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                      <input type="radio" name="ipMode" value="manual" checked={ipMode === 'manual'} onChange={() => setIpMode('manual')} className="mr-2" /> Manual IP
                    </label>
                    <label className={`p-2 border rounded-lg cursor-pointer ${ipMode === 'mobile' ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                      <input type="radio" name="ipMode" value="mobile" checked={ipMode === 'mobile'} onChange={() => setIpMode('mobile')} className="mr-2" /> Mobile IP Camera
                    </label>
                  </div>
                  {ipMode === 'mobile' ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="e.g., http://192.168.1.100:8080/video"
                        value={newPoint.IP_Address}
                        onChange={(e) => setNewPoint({...newPoint, IP_Address: e.target.value})}
                        className="w-full p-2 border rounded-lg"
                      />
                      <p className="text-xs text-gray-500">Use the IP Camera app on your Android device and paste the video stream URL here (include protocol and port). Ensure device and host are on the same network.</p>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g., 192.168.1.100"
                      value={newPoint.IP_Address}
                      onChange={(e) => setNewPoint({...newPoint, IP_Address: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                    />
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg">
                  Add Access Point
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setNewPoint({ Location: '', Resolution: '', IP_Address: '' }); }}
                  className="flex-1 bg-gray-300 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Access Points</h2>
          <p className="mt-2 text-gray-600">Manage physical access control points</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-5 w-5" />
          <span>Add Access Point</span>
        </button>
      </div>

      {points.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No access points found</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Your First Access Point
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {points.map((point) => (
          <div
            key={point.CameraID}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-lg ${
                  (point as any).Status === 'Active' ? 'bg-green-50' : 'bg-gray-50'
                }`}>
                  <MapPin className={`h-6 w-6 ${
                    (point as any).Status === 'Active' ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-black">{point.Location}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{(point as any).IP_Address || 'No IP'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  (point as any).Status === 'Active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {(point as any).Status}
                </span>
              </div>
              {(point as any).Resolution && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Resolution</span>
                  <span className="text-sm text-gray-900">{(point as any).Resolution}</span>
                </div>
              )}
              {getAccessStatus(point.Location) && (
                <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                  <span className="text-sm font-semibold text-green-700 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {getAccessStatus(point.Location)}
                  </span>
                </div>
              )}

              <div className="flex space-x-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => toggleStatus(point.CameraID)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    (point as any).Status === 'Active'
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  <Power className="h-4 w-4" />
                  <span>{(point as any).Status === 'Active' ? 'Disable' : 'Enable'}</span>
                </button>
                <button 
                  onClick={() => handleEdit(point)}
                  className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  title="Edit Access Point"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDelete(point.CameraID)}
                  className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                  title="Delete Access Point"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          ))}
        </div>
      )}
    </div>
  );
}
