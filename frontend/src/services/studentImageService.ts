import { imageCache } from './imageCache';

class StudentImageService {
  /**
   * Handle student image update - clears cache and notifies components
   */
  handleImageUpdate(studentId: number): void {
    // Clear all cached images for this student
    imageCache.clearStudent(studentId);
    
    // Dispatch event to notify all components
    window.dispatchEvent(new CustomEvent('studentImageUpdated', { 
      detail: { studentId } 
    }));
  }

  /**
   * Handle student profile update - clears cache and notifies components
   */
  handleProfileUpdate(studentId: number): void {
    // Clear all cached images for this student
    imageCache.clearStudent(studentId);
    
    // Dispatch event to notify all components
    window.dispatchEvent(new CustomEvent('studentProfileUpdated', { 
      detail: { studentId } 
    }));
  }

  /**
   * Preload student images for better performance
   */
  preloadStudentImages(studentIds: number[], sizes: ('thumbnail' | 'medium' | 'full')[] = ['thumbnail']): void {
    const API_BASE = (import.meta as any).env.VITE_API_BASE_URL ?? '';
    const urls: string[] = [];
    
    studentIds.forEach(studentId => {
      sizes.forEach(size => {
        urls.push(`${API_BASE}/api/images/student/${studentId}?size=${size}&format=jpeg&t=${Date.now()}`);
      });
    });
    
    imageCache.preloadImages(urls);
  }

  /**
   * Clear all student images from cache
   */
  clearAllImages(): void {
    imageCache.clear();
  }
}

export const studentImageService = new StudentImageService();