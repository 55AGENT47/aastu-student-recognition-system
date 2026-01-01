import { useState, useEffect } from 'react';
import { Clock, Save, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface MealSchedule {
  ScheduleID: number;
  MealName: string;
  StartTime: string;
  EndTime: string;
  IsActive: boolean;
}

export default function MealScheduleConfig() {
  const [schedules, setSchedules] = useState<MealSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState('');

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/meal-schedules/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchedules(response.data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (schedule: MealSchedule) => {
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ScheduleID: schedule.ScheduleID,
        MealName: schedule.MealName,
        StartTime: schedule.StartTime.length === 5 ? schedule.StartTime + ':00' : schedule.StartTime,
        EndTime: schedule.EndTime.length === 5 ? schedule.EndTime + ':00' : schedule.EndTime,
        IsActive: schedule.IsActive
      };
      await axios.post(`${API_BASE}/api/meal-schedules/`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Schedule saved successfully!');
      fetchSchedules();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all cafeteria entries for today?')) return;
    
    setResetting(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/api/meal-schedules/reset-daily-entries`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Daily entries reset successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error resetting entries');
    } finally {
      setResetting(false);
    }
  };

  const updateSchedule = (index: number, field: string, value: string) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };
    setSchedules(updated);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Meal Schedule Configuration</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Set time intervals for breakfast, lunch, and dinner</p>
        </div>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${resetting ? 'animate-spin' : ''}`} />
          <span>Reset Daily Entries</span>
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('Error') ? 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-200' : 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200'}`}>
          {message}
        </div>
      )}

      <div className="grid gap-6">
        {schedules.map((schedule, index) => (
          <div key={schedule.ScheduleID} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{schedule.MealName}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Time</label>
                <input
                  type="time"
                  value={schedule.StartTime.substring(0, 5)}
                  onChange={(e) => updateSchedule(index, 'StartTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Time</label>
                <input
                  type="time"
                  value={schedule.EndTime.substring(0, 5)}
                  onChange={(e) => updateSchedule(index, 'EndTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => handleSave(schedule)}
                disabled={saving}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>Save {schedule.MealName}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
