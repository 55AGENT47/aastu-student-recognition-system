import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, CheckCircle, XCircle, User, Square, Smartphone } from 'lucide-react';
import { apiService } from '../services/api';
import { Student } from '../types';
import IPCameraConfig from './IPCameraConfig';

import { OptimizedStudentImage } from '../hooks/useOptimizedImage.tsx';

interface VerificationDisplay {
  success: boolean;
  student: Student | null;
  confidence: number;
  timestamp: string;
  access_granted: boolean;
  error?: string;
}

interface LiveVerificationProps {
  cameraId?: number;
  isActive?: boolean;
  ipCameraOnly?: boolean;
  webcamOnly?: boolean;
}

interface DetectedFace {
  box: { x: number; y: number; width: number; height: number };
  identified: boolean;
  confidence: number;
  student_id: number | null;
  name: string;
  color: string;
}

export default function LiveVerification({ cameraId = 1, isActive = true, ipCameraOnly = false, webcamOnly = false }: LiveVerificationProps) {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerificationDisplay | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [isImageUpload, setIsImageUpload] = useState(false);

  const [cameraMode, setCameraMode] = useState<'webcam' | 'ip'>('webcam');
  const [ipCameraUrl, setIpCameraUrl] = useState<string>('');
  const [showIPConfig, setShowIPConfig] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const [ipCameraActive, setIpCameraActive] = useState(false);
  const [ipCameraConnected, setIpCameraConnected] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const autoCaptureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }

    const mediaElement = videoRef.current;
    if (mediaElement instanceof HTMLVideoElement) {
      mediaElement.srcObject = null;
      mediaElement.src = '';
      mediaElement.load();
    }

    setWebcamActive(false);
    if (cameraMode === 'webcam') {
      setCameraActive(false);
      setCameraError(null);
      setDetectedFaces([]);
      setDetectionMessage(null);
    }
  }, [cameraMode]);

  const stopIpCamera = useCallback(() => {
    const mediaElement = videoRef.current;
    if (mediaElement instanceof HTMLImageElement) {
      // Clear refresh interval
      if ((mediaElement as any).refreshInterval) {
        clearInterval((mediaElement as any).refreshInterval);
        (mediaElement as any).refreshInterval = null;
      }
      mediaElement.src = '';
    }

    setIpCameraActive(false);
    setIpCameraConnected(false);
    if (cameraMode === 'ip') {
      setCameraActive(false);
      setCameraError(null);
      setDetectedFaces([]);
      setDetectionMessage(null);
    }
  }, [cameraMode]);

  const stopCamera = useCallback(() => {
    stopWebcam();
    stopIpCamera();
  }, [stopWebcam, stopIpCamera]);

  const startWebcam = useCallback(async () => {
    if (streamRef.current && webcamActive) {
      setCameraActive(true);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      streamRef.current = mediaStream;
      setWebcamActive(true);
      setCameraActive(true);
      setCameraError(null);
      const mediaElement = videoRef.current;
      if (mediaElement instanceof HTMLVideoElement) {
        mediaElement.srcObject = mediaStream;
        mediaElement.onloadedmetadata = () => {
          mediaElement.play().catch(() => {});
        };
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
      setCameraError('Unable to access webcam. Please allow camera permissions and try again.');
      setWebcamActive(false);
    }
  }, [webcamActive]);

  const startIpCamera = useCallback(async () => {
    console.log('Starting IP camera with URL:', ipCameraUrl);
    if (!ipCameraUrl) {
      setCameraError('Please configure IP camera URL first.');
      return;
    }

    try {
      // Test connection first
      const img = new Image();
      
      const connected = await new Promise<boolean>((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = ipCameraUrl + '?t=' + Date.now();
        setTimeout(() => resolve(false), 5000);
      });

      console.log('IP camera connection test result:', connected);
      if (connected) {
        if (videoRef.current instanceof HTMLVideoElement) {
          videoRef.current.srcObject = null;
        }
        setCameraMode('ip');
        setIpCameraActive(true);
        setIpCameraConnected(true);
        setCameraActive(true);
        setCameraError(null);
        console.log('IP camera activated - ipCameraActive:', true, 'cameraActive:', true);
      } else {
        throw new Error('Failed to connect to IP camera');
      }
    } catch (error) {
      console.error('Error accessing IP camera:', error);
      setCameraError('Unable to connect to IP camera. Please check the IP address and ensure the camera app is running.');
      setIpCameraActive(false);
      setIpCameraConnected(false);
    }
  }, [ipCameraUrl, ipCameraActive]);

  const startCamera = useCallback(async () => {
    if (cameraMode === 'ip') {
      await startIpCamera();
    } else {
      await startWebcam();
    }
  }, [cameraMode, startIpCamera, startWebcam]);



  const handleVerify = useCallback(async (imageData: string) => {
    setVerifying(true);
    setResult(null);
    setDetectionMessage(null);

    try {
      const detection = await apiService.detectFaces(imageData);
      const faces = detection.faces || [];
      const count = faces.length;
      
      if (!count) {
        setDetectionMessage('No face detected. Adjust lighting or move closer to the camera.');
        if (!isImageUpload) setDetectedFaces([]);
        setResult({
          success: false,
          error: 'Unable to detect a face. Please ensure your face is clearly visible.',
          confidence: 0,
          student: null,
          timestamp: new Date().toISOString(),
          access_granted: false
        });
        return;
      }
      
      setDetectionMessage(`Detected ${count} face${count > 1 ? 's' : ''}.`);
      if (!isImageUpload) setDetectedFaces(faces);

      const data = await apiService.verifyFace(imageData, cameraId);
      const confidence = (data as any).confidence || 0;
      const isConfident = confidence >= 0.55;
      
      setResult({
        ...data,
        success: data.success && isConfident,
        student: isConfident ? ((data as any).student ?? null) : null,
        confidence: confidence,
        access_granted: isConfident && ((data as any).access_granted || false),
        timestamp: data.timestamp || new Date().toISOString(),
        error: data.success && isConfident ? undefined : ((data as any).message || 'Unable to identify student')
      });

    } catch (error) {
      console.error('Verification failed:', error);
      const message = error instanceof Error ? error.message : 'Face verification failed.';
      setResult({
        success: false,
        error: `${message} Please ensure the face is clearly visible and try again.`,
        confidence: 0,
        student: null,
        timestamp: new Date().toISOString(),
        access_granted: false
      });
    } finally {
      setVerifying(false);
    }
  }, [cameraId, isImageUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Stop camera when uploading image
      stopCamera();
      setIsImageUpload(true);
      setDetectedFaces([]); // Clear any existing face overlays
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        handleVerify(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const captureFrame = useCallback(() => {
    console.log('captureFrame called - cameraActive:', cameraActive, 'ipCameraActive:', ipCameraActive, 'verifying:', verifying);
    if ((!cameraActive && !ipCameraActive) || verifying) return;
    
    setIsImageUpload(false);

    const mediaElement = videoRef.current;
    const canvas = canvasRef.current;
    console.log('mediaElement:', mediaElement, 'canvas:', canvas);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (cameraMode === 'webcam' && mediaElement instanceof HTMLVideoElement && mediaElement.readyState >= 2) {
      canvas.width = mediaElement.videoWidth;
      canvas.height = mediaElement.videoHeight;
      ctx.drawImage(mediaElement, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      handleVerify(imageData);
    } else if (cameraMode === 'ip') {
      console.log('Fetching IP camera image as blob');
      fetch(ipCameraUrl + '?t=' + Date.now())
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const imageData = reader.result as string;
            console.log('Calling handleVerify with fetched imageData');
            handleVerify(imageData);
          };
          reader.readAsDataURL(blob);
        })
        .catch(err => console.error('Failed to fetch IP camera image:', err));
      return;
    } else {
      console.log('Capture conditions not met - cameraMode:', cameraMode, 'isImage:', mediaElement instanceof HTMLImageElement);
    }
  }, [cameraActive, ipCameraActive, verifying, handleVerify, cameraMode]);

  useEffect(() => {
    if (ipCameraOnly) {
      setCameraMode('ip');
    } else if (webcamOnly) {
      setCameraMode('webcam');
      startWebcam();
    } else if (cameraMode === 'webcam') {
      startWebcam();
    }
    
    // Listen for student profile updates to refresh verification results
    const handleProfileUpdate = () => {
      // If we have a current result, we might want to refresh it
      if (result && result.student) {
        // Optionally refresh the result or just let the OptimizedStudentImage handle it
      }
    };
    
    window.addEventListener('studentProfileUpdated', handleProfileUpdate);
    window.addEventListener('studentImageUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('studentProfileUpdated', handleProfileUpdate);
      window.removeEventListener('studentImageUpdated', handleProfileUpdate);
      
      if (autoCaptureIntervalRef.current) {
        clearInterval(autoCaptureIntervalRef.current);
        autoCaptureIntervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }
      const mediaElement = videoRef.current;
      if (mediaElement instanceof HTMLVideoElement) {
        mediaElement.srcObject = null;
        mediaElement.src = '';
      } else if (mediaElement instanceof HTMLImageElement) {
        if ((mediaElement as any).refreshInterval) {
          clearInterval((mediaElement as any).refreshInterval);
          (mediaElement as any).refreshInterval = null;
        }
        mediaElement.src = '';
      }
      setCameraActive(false);
    };
  }, [startCamera]);

  useEffect(() => {
    if (ipCameraActive && ipCameraUrl) {
      const updateImage = () => {
        if (videoRef.current instanceof HTMLImageElement) {
          videoRef.current.src = ipCameraUrl + '?t=' + Date.now();
        }
      };
      
      const refreshInterval = setInterval(updateImage, 200);
      
      return () => {
        clearInterval(refreshInterval);
      };
    }
  }, [ipCameraActive, ipCameraUrl]);

  useEffect(() => {
    if (ipCameraActive && ipCameraUrl) {
      console.log('Setting up image refresh for:', ipCameraUrl);
      const updateImage = () => {
        if (videoRef.current instanceof HTMLImageElement) {
          videoRef.current.src = ipCameraUrl + '?t=' + Date.now();
        } else {
          console.log('videoRef is not an image element:', videoRef.current);
        }
      };
      
      updateImage();
      const refreshInterval = setInterval(updateImage, 200);
      
      return () => {
        clearInterval(refreshInterval);
      };
    }
  }, [ipCameraActive, ipCameraUrl]);

  useEffect(() => {
    if ((cameraActive || ipCameraActive) && !verifying) {
      autoCaptureIntervalRef.current = setInterval(() => {
        captureFrame();
      }, 4000);
    } else {
      if (autoCaptureIntervalRef.current) {
        clearInterval(autoCaptureIntervalRef.current);
        autoCaptureIntervalRef.current = null;
      }
    }
    return () => {
      if (autoCaptureIntervalRef.current) {
        clearInterval(autoCaptureIntervalRef.current);
        autoCaptureIntervalRef.current = null;
      }
    };
  }, [cameraActive, ipCameraActive, verifying, captureFrame]);

  useEffect(() => {
    if (!isActive) {
      stopCamera();
      if (autoCaptureIntervalRef.current) {
        clearInterval(autoCaptureIntervalRef.current);
        autoCaptureIntervalRef.current = null;
      }
    }
  }, [isActive, stopCamera]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      stopCamera();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      stopCamera();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCamera();
      }
    };

    const handlePageHide = () => {
      stopCamera();
    };

    const handlePopState = () => {
      stopCamera();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopCamera();
    };
  }, [stopCamera]);
  const getMediaDimensions = () => {
    const mediaElement = videoRef.current;
    if (!mediaElement) return null;
    if (cameraMode === 'ip' && mediaElement instanceof HTMLImageElement) {
      const width = mediaElement.naturalWidth || mediaElement.width;
      const height = mediaElement.naturalHeight || mediaElement.height;
      if (!width || !height) return null;
      return { width, height };
    }
    if (mediaElement instanceof HTMLVideoElement) {
      const width = mediaElement.videoWidth || mediaElement.clientWidth;
      const height = mediaElement.videoHeight || mediaElement.clientHeight;
      if (!width || !height) return null;
      return { width, height };
    }
    return null;
  };

  const renderFaceOverlays = () => {
    if (!detectedFaces.length || !videoRef.current || isImageUpload) return null;
    const dimensions = getMediaDimensions();
    if (!dimensions) return null;

    return detectedFaces.map((face, index) => {
      // Calculate responsive positioning and sizing
      const left = Math.max(0, Math.min(95, (face.box.x / dimensions.width) * 100));
      const top = Math.max(0, Math.min(95, (face.box.y / dimensions.height) * 100));
      const width = Math.max(5, Math.min(50, (face.box.width / dimensions.width) * 100));
      const height = Math.max(5, Math.min(50, (face.box.height / dimensions.height) * 100));
      
      const colorClass = face.color === 'green'
        ? 'border-green-400 shadow-[0_0_0_2px_rgba(34,197,94,0.25)] bg-green-400/10'
        : 'border-red-400 shadow-[0_0_0_2px_rgba(248,113,113,0.5)] bg-red-400/10';
      return (
        <div
          key={`${face.student_id}-${index}`}
          className={`absolute border-2 rounded-lg transition-all duration-300 ease-in-out ${colorClass}`}
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: `${width}%`,
            height: `${height}%`,
            minWidth: '60px',
            minHeight: '60px',
          }}
        >
          <div className={`absolute -top-7 left-0 px-2 py-1 text-xs font-semibold rounded-md whitespace-nowrap ${face.color === 'green' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            {face.identified ? (face.name || 'Recognized') : 'Unknown'}
            {typeof face.confidence === 'number' && (
              <span className="ml-1 opacity-75">
                {Math.round(face.confidence * 100)}%
              </span>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">{ipCameraOnly ? 'IP Camera Verification' : 'Live Verification'}</h2>
        <p className="mt-2 text-gray-600">{ipCameraOnly ? 'Verify student identity using IP camera' : 'Verify student identity using camera or uploaded images'}</p>
      </div>

      <div className={`grid grid-cols-1 gap-6 items-stretch ${ipCameraOnly ? 'lg:grid-cols-[1fr_1.5fr]' : 'lg:grid-cols-[1fr_1fr_1.5fr]'}`}>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 h-full flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-semibold !text-black mb-3">{ipCameraOnly ? 'IP Camera Verification' : webcamOnly ? 'Webcam Verification' : 'Camera Verification'}</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  (cameraActive || ipCameraActive) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    (cameraActive || ipCameraActive) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`}></div>
                  {(cameraActive || ipCameraActive) ? 'Live' : 'Offline'}
                </span>
                {(ipCameraOnly || cameraMode === 'ip') && !webcamOnly && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    ipCameraConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      ipCameraConnected ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    WiFi
                  </span>
                )}
              </div>
              {(ipCameraOnly || !webcamOnly) && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowIPConfig(!showIPConfig)}
                    className="inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    <Smartphone className="h-3 w-3" />
                    <span>Config</span>
                  </button>
                </div>
              )}
            </div>
          </div>


          {showIPConfig && (
            <div className="mb-4">
              <IPCameraConfig 
                onCameraUrlChange={(url, connected) => {
                  setIpCameraUrl(url);
                  setCameraMode('ip');
                  if (connected) {
                    setIpCameraConnected(true);
                  }
                  setShowIPConfig(false);
                }} 
              />
            </div>
          )}


          {!ipCameraOnly && !webcamOnly && (
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-1 gap-2">
                {cameraMode === 'ip' ? (
                  ipCameraActive ? (
                    <button
                      onClick={() => {
                        stopIpCamera();
                        setCameraActive(false);
                      }}
                      className={`w-full inline-flex items-center justify-center space-x-1 px-2 py-1.5 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-700`}
                    >
                      <Square className="h-4 w-4" />
                      <span>Stop IP Camera</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setCameraMode('ip');
                        startIpCamera();
                      }}
                      className={`w-full inline-flex items-center justify-center space-x-1 px-2 py-1.5 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700`}
                    >
                      <Camera className="h-4 w-4" />
                      <span>Start IP Camera</span>
                    </button>
                  )
                ) : (
                  webcamActive ? (
                    <button
                      onClick={() => {
                        stopWebcam();
                        setCameraActive(false);
                      }}
                      className={`w-full inline-flex items-center justify-center space-x-1 px-2 py-1.5 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-700`}
                    >
                      <Square className="h-4 w-4" />
                      <span>Stop Webcam</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setCameraMode('webcam');
                        startWebcam();
                      }}
                      className={`w-full inline-flex items-center justify-center space-x-1 px-2 py-1.5 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700`}
                    >
                      <Camera className="h-4 w-4" />
                      <span>Start Webcam</span>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {ipCameraOnly && (
            <div className="mb-4">
              {ipCameraActive ? (
                <button
                  onClick={() => {
                    stopIpCamera();
                    setCameraActive(false);
                  }}
                  className={`w-full inline-flex items-center justify-center space-x-2 px-4 py-2 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-700`}
                >
                  <Square className="h-4 w-4" />
                  <span>Stop IP Camera</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setCameraMode('ip');
                    startIpCamera();
                  }}
                  className={`w-full inline-flex items-center justify-center space-x-2 px-4 py-2 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700`}
                >
                  <Camera className="h-4 w-4" />
                  <span>Start IP Camera</span>
                </button>
              )}
            </div>
          )}

          {webcamOnly && (
            <div className="mb-4">
              <button
                onClick={() => {
                  stopWebcam();
                  setCameraActive(false);
                }}
                className={`w-full inline-flex items-center justify-center space-x-2 px-4 py-2 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-700`}
              >
                <Square className="h-4 w-4" />
                <span>Stop Webcam</span>
              </button>
            </div>
          )}

          {cameraError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {cameraError}
            </div>
          )}

          <div className="space-y-4">
            {(cameraActive || ipCameraActive) ? (
              <div className="space-y-4">
                <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                  {cameraMode === 'ip' ? (
                    <img
                      ref={(node) => { videoRef.current = node; }}
                      src={ipCameraUrl}
                      alt="IP Camera Feed"
                      className="w-full h-64 object-cover"
                    />
                  ) : (
                    <video
                      ref={(node) => { videoRef.current = node; }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-64 object-cover"
                      style={{ display: 'block' }}
                    />
                  )}
                  {renderFaceOverlays()}
                  <canvas ref={canvasRef} className="hidden" />

                </div>
                <div className="text-center text-sm p-3 rounded-lg bg-blue-50 text-gray-600">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span>Auto-detecting faces every 4 seconds...</span>
                  </div>
                </div>
                
              </div>
            ) : (
              <div className="text-center text-gray-500 py-10 border border-dashed border-gray-200 rounded-lg">
                {cameraMode === 'ip' ? (
                  <Smartphone className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                ) : (
                  <Camera className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                )}
                <p className="text-sm font-medium">
                  {cameraMode === 'ip' ? 'IP Camera is currently off' : 'Camera is currently off'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {cameraMode === 'ip' && !ipCameraUrl ? (
                    <>Configure IP camera settings to start verification.</>
                  ) : (
                    <>Click Start to begin.</>
                  )}
                </p>
              </div>
            )}

            {detectionMessage && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                {detectionMessage}
              </div>
            )}

            {verifying && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </div>


        {!ipCameraOnly && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 h-full flex flex-col">
            <h3 className="text-lg font-semibold !text-black mb-6">Upload Image</h3>

            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-900">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  PNG, JPG up to 10MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {verifying && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          </div>
        )}


        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 h-full flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Verification Result</h3>

          {!result && !verifying && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Camera className="h-16 w-16 mb-4" />
              <p className="text-sm">{ipCameraOnly ? 'Connect to IP camera to start verification' : 'Use camera or upload an image to start verification'}</p>
            </div>
          )}

          {result && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Student Profile Image */}
                  <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0">
                    <div className="relative">
                      <div className="aspect-square rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100">
                        {result.student ? (
                          <OptimizedStudentImage
                            studentId={result.student.StudentID}
                            size="medium"
                            className="w-full h-full object-cover"
                            alt={`${result.student.FirstName} ${result.student.LastName}`}
                            fallbackIcon={<User className="h-24 w-24 text-gray-400" />}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <User className="h-24 w-24 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -top-2 -right-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          result.success 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.success ? 'Verified' : 'Verification Failed'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Student Details */}
                  <div className="flex-1 min-w-0">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {result.student && result.confidence >= 0.55 ? `${result.student.FirstName} ${result.student.LastName}` : 'Unknown Student'}
                        </h3>
                        <p className="text-sm text-gray-500">Student ID: {result.student && result.confidence >= 0.55 ? ((result.student as any)?.StudentIdentifier || result.student?.StudentID) : 'N/A'}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Department</p>
                          <p className="text-sm text-gray-900">
                            {(result.student as any)?.Department || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Enrollment Date</p>
                          <p className="text-sm text-gray-900">
                            {result.student?.EnrollmentDate 
                              ? new Date(result.student.EnrollmentDate).toLocaleDateString() 
                              : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Confidence</p>
                            <p className="text-lg font-semibold">
                              <span className={`${
                                result.confidence >= 0.9 ? 'text-green-600' :
                                result.confidence >= 0.7 ? 'text-blue-600' :
                                result.confidence >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {Math.round(result.confidence * 100)}%
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Access</p>
                            <div className="flex items-center">
                              {result.access_granted ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Granted
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Denied
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {result.student && (
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Cafeteria Access</p>
                          <div className="flex items-center">
                            {(result.student as any).CafeAccess ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Access Allowed
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                <XCircle className="h-4 w-4 mr-1" />
                                No Access
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}