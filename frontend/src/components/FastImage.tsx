import React, { useRef, useState, useEffect } from 'react';
import { useOptimizedImage } from '../hooks/useOptimizedImage';

interface FastImageProps {
  studentId: number | null;
  size?: 'thumbnail' | 'medium' | 'full';
  className?: string;
  alt?: string;
  fallbackIcon?: React.ReactNode;
  priority?: boolean;
  onImageError?: () => void;
}

export const FastImage: React.FC<FastImageProps> = ({
  studentId,
  size = 'medium',
  className = '',
  alt = 'Student photo',
  fallbackIcon,
  priority = false,
  onImageError
}) => {
  const { src, loading } = useOptimizedImage(studentId, { size });
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset states when src changes
  useEffect(() => {
    if (src) {
      setImageLoaded(false);
      setHasError(false);
    }
  }, [src]);

  // Preload image if priority is true
  useEffect(() => {
    if (priority && src && !loading) {
      const img = new Image();
      img.src = src;
      img.onload = () => setImageLoaded(true);
      img.onerror = () => {
        setHasError(true);
        onImageError?.();
      };
    }
  }, [priority, src, loading, onImageError]);

  // Container always has the same structure
  const renderContainer = (content: React.ReactNode, showLoading = false) => (
    <div className={`relative ${className} overflow-hidden`}>
      {showLoading && !imageLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse z-10" />
      )}
      {content}
    </div>
  );

  if (loading) {
    return renderContainer(
      <div className="w-full h-full" />,
      true
    );
  }

  if (!src || hasError) {
    return renderContainer(
      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
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

  return renderContainer(
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={`w-full h-full object-cover ${!imageLoaded ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setImageLoaded(true)}
      onError={() => {
        setHasError(true);
        onImageError?.();
      }}
    />,
    true
  );
};