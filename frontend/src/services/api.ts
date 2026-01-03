import { Student, Camera, EventLog, CafeteriaLog, StatsResponse, VerificationResult } from '../types';

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL ?? 'http://localhost:8001';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const parseErrorMessage = async (response: Response, fallbackMessage: string) => {
  try {
    const errorData = await response.json();
    const detail = errorData?.detail ?? errorData?.message ?? fallbackMessage;
    if (typeof detail === 'string') return detail;
    try {
      return JSON.stringify(detail);
    } catch {
      return String(detail);
    }
  } catch {
    return fallbackMessage;
  }
};

const handleJsonResponse = async <T>(response: Response, fallbackMessage: string): Promise<T> => {
  if (response.status === 401) {
    // Handle unauthorized - redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Your session has expired. Please log in again.');
  }

  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response, fallbackMessage);
    throw new Error(errorMessage);
  }

  try {
    return await response.json() as T;
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    throw new Error('Failed to parse server response');
  }
};

export const apiService = {
  async login(username: string, password: string, role: string = 'admin') {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role }),
    });
    
    if (!response.ok) {
      let errorMessage = 'Login failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {}
      throw new Error(errorMessage);
    }
    return response.json();
  },

  async getStudents(): Promise<Student[]> {
    const response = await fetch(`${API_BASE}/api/students`, { headers: getAuthHeaders() });
    return handleJsonResponse<Student[]>(response, 'Failed to fetch students');
  },

  async createStudent(student: Omit<Student, 'StudentID' | 'EnrollmentDate' | 'IsActive'>): Promise<Student> {
    const response = await fetch(`${API_BASE}/api/students`, { 
      method: 'POST', 
      headers: getAuthHeaders(), 
      body: JSON.stringify(student) 
    });
    return handleJsonResponse<Student>(response, 'Failed to create student');
  },

  async updateStudent(studentId: string | number, data: any): Promise<Student> {
    const response = await fetch(`${API_BASE}/api/students/${studentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleJsonResponse<Student>(response, 'Failed to update student');
  },

  async uploadStudentPhoto(studentId: string | number, formData: FormData): Promise<Student> {
    const response = await fetch(`${API_BASE}/api/students/${studentId}/upload-photo`, {
      method: 'POST',
      headers: {
        'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
      },
      body: formData,
    });
    return handleJsonResponse<Student>(response, 'Failed to upload student photo');
  },

  async deleteStudent(studentId: string | number): Promise<void> {
    const response = await fetch(`${API_BASE}/api/students/${studentId}`, { 
      method: 'DELETE', 
      headers: getAuthHeaders() 
    });
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, 'Failed to delete student'));
    }
  },

  async getMainGateLogs(): Promise<EventLog[]> {
    const response = await fetch(`${API_BASE}/api/main-logs`, {
      headers: getAuthHeaders(),
    });
    return handleJsonResponse<EventLog[]>(response, 'Failed to fetch main logs');
  },

  async getCafeteriaLogs(): Promise<CafeteriaLog[]> {
    const response = await fetch(`${API_BASE}/api/cafeteria-logs`, {
      headers: getAuthHeaders(),
    });
    return handleJsonResponse<CafeteriaLog[]>(response, 'Failed to fetch cafeteria logs');
  },

  async clearLogs(logType: 'access' | 'cafeteria' | 'all', daysOld?: number): Promise<{ message: string }> {
    const params = new URLSearchParams({ log_type: logType });
    if (daysOld) {
      params.append('days_old', daysOld.toString());
    }
    
    const response = await fetch(`${API_BASE}/api/clear-logs?${params}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleJsonResponse<{ message: string }>(response, 'Failed to clear logs');
  },

  async getCameraLocations(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/api/camera-locations`, {
      headers: getAuthHeaders(),
    });
    return handleJsonResponse<string[]>(response, 'Failed to fetch camera locations');
  },

  async getCameras(): Promise<Camera[]> {
    const response = await fetch(`${API_BASE}/api/cameras`, { headers: getAuthHeaders() });
    return handleJsonResponse<Camera[]>(response, 'Failed to fetch cameras');
  },

  async getDepartments(): Promise<string[]> {
    const defaultDepartments = [
      'Architecture',
      'Civil Engineering',
      'Chemical Engineering',
      'Electrical & Computer Engineering',
      'Electromechanical Engineering',
      'Environmental Engineering',
      'Mechanical Engineering',
      'Mining Engineering',
      'Software Engineering',
      'Biotechnology',
      'Industrial Chemistry',
      'Geology',
      'Food Science & Applied Nutrition',
      'Mathematics',
      'Physics',
      'Statistics',
      'Social Science',
      'Business & Management',
      'Humanities Division'
    ];

    try {
      const response = await fetch(`${API_BASE}/api/registration/departments`, { headers: getAuthHeaders() });
      const data = await handleJsonResponse<any>(response, 'Failed to fetch departments');
      const list = Array.isArray(data) ? data : data?.departments || [];
      return list && list.length ? list : defaultDepartments;
    } catch (err) {
      // If the backend is unreachable or returns an error, return the default list
      console.warn('Using default departments list due to error fetching from API:', err);
      return defaultDepartments;
    }
  },

  async createCamera(camera: Omit<Camera, 'CameraID' | 'Status'>): Promise<Camera> {
    const response = await fetch(`${API_BASE}/api/cameras`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(camera),
    });
    return handleJsonResponse<Camera>(response, 'Failed to create camera');
  },

  async updateCamera(cameraId: number, data: Partial<Omit<Camera, 'CameraID'>>): Promise<Camera> {
    const response = await fetch(`${API_BASE}/api/cameras/${cameraId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleJsonResponse<Camera>(response, 'Failed to update camera');
  },

  async deleteCamera(cameraId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/api/cameras/${cameraId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, 'Failed to delete camera'));
    }
  },

  async toggleCamera(cameraId: number): Promise<Camera> {
    const response = await fetch(`${API_BASE}/api/cameras/${cameraId}/toggle`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleJsonResponse<Camera>(response, 'Failed to toggle camera');
  },

  async getPublicStats(): Promise<StatsResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/stats/overview`, { 
        headers: { 'Content-Type': 'application/json' } 
      });
      let stats = await handleJsonResponse<StatsResponse>(response, 'Failed to fetch stats');
      return stats;
    } catch (error) {
      console.error('Failed to fetch public stats:', error);
      return {
        totalStudents: 0,
        todayAccess: 0,
        todayCafeteriaAccess: 0,
        successRate: 0,
        activePoints: 0,
        recentTrend: 0,
        recentHistory: []
      };
    }
  },

  async getOverviewStats(): Promise<StatsResponse> {
    const response = await fetch(`${API_BASE}/api/stats/overview`, { headers: getAuthHeaders() });
    let stats = await handleJsonResponse<StatsResponse>(response, 'Failed to fetch overview stats');

    // If backend doesn't provide cafeteria access or recentHistory, try to derive them from logs
    try {
      const needsCafe = (stats as any).todayCafeteriaAccess === undefined;
      const needsHistory = (stats as any).recentHistory === undefined;

      if (needsCafe || needsHistory) {
        const headers = getAuthHeaders();
        const [accessRes, cafeRes] = await Promise.all([
          fetch(`${API_BASE}/api/main-logs`, { headers }),
          fetch(`${API_BASE}/api/cafeteria-logs`, { headers }),
        ]);

        const accessLogs = accessRes.ok ? await accessRes.json() : [];
        const cafeLogs = cafeRes.ok ? await cafeRes.json() : [];

        if (needsCafe) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const cafeCount = Array.isArray(cafeLogs)
            ? cafeLogs.filter((l: any) => {
                const t = new Date(l.AccessTime || l.EventTime || 0);
                return t >= today;
              }).length
            : 0;
          (stats as any).todayCafeteriaAccess = cafeCount;
        }

        if (needsHistory) {
          const normalized: any[] = [];
          if (Array.isArray(accessLogs)) {
            normalized.push(...accessLogs.map((a: any) => ({
              ...a,
              EventTime: a.EventTime,
            })));
          }
          if (Array.isArray(cafeLogs)) {
            normalized.push(...cafeLogs.map((c: any) => ({
              LogID: c.LogID,
              StudentID: c.StudentID,
              CameraID: c.CameraID,
              MatchScore: c.MatchScore,
              Decision: c.Decision,
              EventTime: c.AccessTime,
              FirstName: c.FirstName,
              LastName: c.LastName,
              CameraLocation: c.CameraLocation,
            })));
          }

          normalized.sort((a, b) => new Date(b.EventTime).getTime() - new Date(a.EventTime).getTime());
          (stats as any).recentHistory = normalized.slice(0, 50);
        }
      }
    } catch (err) {
      console.warn('Could not derive additional overview stats from logs:', err);
    }

    return stats;
  },

  async detectFaces(imageData: string): Promise<any> {
    const response = await fetch(`${API_BASE}/api/face/detect`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ image_data: imageData }),
    });
    return handleJsonResponse<any>(response, 'Failed to detect faces');
  },

  async verifyFace(imageData: string, cameraId: number = 1, cameraType: string = "Webcam"): Promise<VerificationResult> {
    const response = await fetch(`${API_BASE}/api/face/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ image_data: imageData, camera_id: cameraId, camera_type: cameraType }),
    });
    return handleJsonResponse<VerificationResult>(response, 'Failed to verify face');
  },

  async validateFace(imageData: string): Promise<{ face_detected: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/api/face/validate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ image_data: imageData }),
    });
    return handleJsonResponse<{ face_detected: boolean; message: string }>(response, 'Failed to validate face');
  },

  async getPendingStudents(): Promise<Student[]> {
    const response = await fetch(`${API_BASE}/api/registration/pending-students`, {
      headers: getAuthHeaders(),
    });
    return handleJsonResponse<Student[]>(response, 'Failed to fetch pending students');
  },

  async getNotifications(): Promise<any[]> {
    const response = await fetch(`${API_BASE}/api/notifications/`, {
      headers: getAuthHeaders(),
    });
    return handleJsonResponse<any[]>(response, 'Failed to fetch notifications');
  },

  async markNotificationRead(notificationId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/api/notifications/${notificationId}/mark-read`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, 'Failed to mark notification as read'));
    }
  },

  async handleNotificationAction(notificationId: number, action: string): Promise<any> {
    const response = await fetch(`${API_BASE}/api/notifications/${notificationId}/action?action=${action}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleJsonResponse<any>(response, 'Failed to handle notification action');
  },

  async forgotPassword(email: string) {
    const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async verifyOTP(email: string, otp_code: string) {
    const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp_code })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async resetPassword(email: string, otp_code: string, new_password: string) {
    const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp_code, new_password })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async approveStudent(studentId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/api/registration/approve/${studentId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleJsonResponse<{ message: string }>(response, 'Failed to approve student');
  },

  async rejectStudent(studentId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/api/registration/reject/${studentId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleJsonResponse<{ message: string }>(response, 'Failed to reject student');
  }
};