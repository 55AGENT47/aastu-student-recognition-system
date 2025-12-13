export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'cafeteria' | 'student' | 'main_gate';
  name?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role?: 'admin' | 'cafeteria' | 'student' | 'main_gate') => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export interface Student {
  StudentID: number;
  StudentIdentifier: string;
  FirstName: string;
  LastName: string;
  Email: string;
  PhoneNumber?: string;
  Department?: string;
  EnrollmentYear?: number;
  EnrollmentDate: string;
  IsActive: boolean;
  PhotoPath?: string;
  PhotoURL?: string;
  CafeAccess?: boolean;
}

export interface Camera {
  CameraID: number;
  Name: string;
  Location: string;
  StreamURL: string;
  IsActive: boolean;
  Type: 'main_gate' | 'cafeteria';
}

export interface EventLog {
  LogID: number;
  StudentID: number | null;
  FirstName?: string;
  LastName?: string;
  CameraID: number;
  CameraLocation?: string;
  MatchScore: number | null;
  Decision: boolean | null;
  EventTime: string;
  ImagePath?: string;
}

export interface CafeteriaLog {
  LogID: number;
  StudentID: number | null;
  FirstName?: string;
  LastName?: string;
  CameraID: number | null;
  CameraLocation?: string;
  MatchScore: number | null;
  Decision: boolean | null;
  AccessTime: string;
  ImagePath?: string;
}

export interface StatsResponse {
  totalStudents: number;
  activeStudents?: number;
  todayAccess: number;
  todayCafeteriaAccess?: number;
  totalLogs?: number;
  todayLogs?: number;
  successRate: number;
  activePoints: number;
  recentTrend: number;
  recentLogs?: (EventLog | CafeteriaLog)[];
  recentHistory?: any[];
}

export interface VerificationResult {
  success: boolean;
  studentId?: number;
  firstName?: string;
  lastName?: string;
  matchScore?: number;
  message: string;
  imagePath?: string;
  timestamp?: string;
}