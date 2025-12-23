import React, { useState, useEffect, useCallback } from 'react';
import { imageCache } from '../services/imageCache';

interface UseOptimizedImageOptions {
  size?: 'thumbnail' | 'medium' | 'full';
  fallback?: string;
}

interface UseOptimizedImageReturn {
  src: string | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
}


const supportsWebP = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
})();

export const useOptimizedImage = (studentId: number | null, options: UseOptimizedImageOptions = {}): UseOptimizedImageReturn => {
  const { size = 'medium', fallback } = options;
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadImage = useCallback(async () => {
    if (!studentId) {
      setSrc(fallback || null);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const API_BASE = (import.meta as any).env.VITE_API_BASE_URL ?? '';
      const imageUrl = `${API_BASE}/api/images/student/${studentId}?size=${size}&format=${supportsWebP ? 'webp' : 'jpeg'}&t=${Date.now()}`;
      
      try {
        setSrc(await imageCache.getImage(imageUrl));
      } catch (optimizedError) {
        if (supportsWebP) {
          const jpegUrl = `${API_BASE}/api/images/student/${studentId}?size=${size}&format=jpeg&t=${Date.now()}`;
          setSrc(await imageCache.getImage(jpegUrl));
        } else {
          throw optimizedError;
        }
      }
      
      setLoading(false);
    } catch (err) {
      setError(true);
      setSrc(fallback || null);
      setLoading(false);
    }
  }, [studentId, size, fallback, refreshKey]);

  const retry = useCallback(() => loadImage(), [loadImage]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  // Listen for student image updates
  useEffect(() => {
    const handleImageUpdate = (event: CustomEvent) => {
      if (event.detail.studentId === studentId) {
        setRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('studentImageUpdated', handleImageUpdate as EventListener);
    window.addEventListener('studentProfileUpdated', handleImageUpdate as EventListener);
    
    return () => {
      window.removeEventListener('studentImageUpdated', handleImageUpdate as EventListener);
      window.removeEventListener('studentProfileUpdated', handleImageUpdate as EventListener);
    };
  }, [studentId]);

  return { src, loading, error, retry };
};

interface OptimizedStudentImageProps {
  studentId: number | null;
  size?: 'thumbnail' | 'medium' | 'full';
  className?: string;
  alt?: string;
  fallbackIcon?: React.ReactNode;
}

export const OptimizedStudentImage: React.FC<OptimizedStudentImageProps> = ({ studentId, size = 'medium', className = '', alt = 'Student photo', fallbackIcon }) => {
  const { src, loading, error } = useOptimizedImage(studentId, { size });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${className} animate-pulse`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !src || imageError) {
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center ${className}`}>
        {fallbackIcon || (
          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} ${imageLoaded ? '' : 'opacity-0'}`}
      onLoad={() => setImageLoaded(true)}
      onError={() => setImageError(true)}
    />
  );
};
