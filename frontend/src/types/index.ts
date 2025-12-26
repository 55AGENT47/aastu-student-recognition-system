export interface Student {
  StudentID: number;
  StudentIdentifier: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Department: string | null;
  EnrollmentYear?: number | null;
  PhotoPath: string | null;
  FaceImagePath?: string | null;
  EnrollmentDate: string;
  CafeAccess: boolean;
  IsActive: boolean;
}

export interface EventLog {
  LogID: number;
  StudentID: number | null;
  CameraID: number;
  MatchScore: number | null;
  Decision: boolean | null;
  EventTime: string;
  FirstName?: string;
  LastName?: string;
  CameraLocation?: string;
}

export interface CafeteriaLog {
  LogID: number;
  StudentID: number | null;
  CameraID: number | null;
  AccessTime: string;
  MatchScore: number | null;
  Decision: boolean;
  MealStatus: string;
  Notes: string | null;
  FirstName?: string;
  LastName?: string;
  CameraLocation?: string;
}

export interface Camera {
  CameraID: number;
  Location: string;
  Resolution: string | null;
  IP_Address: string | null;
  Status: string;
}

export interface FacialProfile {
  ProfileID: number;
  StudentID: number;
  FeatureVector: string;
  DateAdded: string;
}

export interface VerificationResult {
  success: boolean;
  student?: Student;
  confidence: number;
  timestamp: string;
  access_granted: boolean;
}

export interface Administrator {
  id: number;
  username: string;
  password_hash: string;
  last_login: string | null;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'cafeteria' | 'student' | 'main_gate' | 'registrar';
  name: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role?: 'admin' | 'cafeteria' | 'student' | 'main_gate' | 'registrar') => Promise<void>;
  logout: () => void;
}


export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface StatsResponse {
  totalStudents: number;
  todayAccess: number;
  todayCafeteriaAccess?: number;
  successRate: number;
  activePoints: number;
  recentTrend: number;
  recentHistory?: any[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}