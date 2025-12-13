import React, { useRef } from 'react';
import { useOptimizedImage } from '../hooks/useOptimizedImage';

interface FastImageProps {
  studentId: number | null;
  size?: 'thumbnail' | 'medium' | 'full';
  className?: string;
  alt?: string;
  fallbackIcon?: React.ReactNode;
  priority?: boolean;
}

export const FastImage: React.FC<FastImageProps> = ({
  studentId,
  size = 'medium',
  className = '',
  alt = 'Student photo',
  fallbackIcon,
  priority = false
}) => {
  const { src, loading } = useOptimizedImage(studentId, { size });
  const imgRef = useRef<HTMLImageElement>(null);

  // Preload image if priority is true
  if (priority && src) {
    const img = new Image();
    img.src = src;
  }

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  if (!src) {
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center rounded ${className}`}>
        {fallbackIcon || (
          <svg 
            className="h-6 w-6 text-blue-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
            />
          </svg>
        )}
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
};