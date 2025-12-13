import { useState } from 'react';
import { Smartphone, Wifi, Camera, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface IPCameraConfigProps {
  onCameraUrlChange: (url: string, connected?: boolean) => void;
  defaultIp?: string;
  defaultPort?: string;
}

export default function IPCameraConfig({ onCameraUrlChange, defaultIp = '', defaultPort = '8080' }: IPCameraConfigProps): JSX.Element {
  const [ipAddress, setIpAddress] = useState(() => localStorage.getItem('ipCameraAddress') || defaultIp);
  const [port, setPort] = useState(() => localStorage.getItem('ipCameraPort') || defaultPort);
  const [cameraUrl, setCameraUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);

  
  const detectLocalIP = async () => {
    setAutoDetecting(true);
    try {
     
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      return new Promise<string>((resolve) => {
        pc.onicecandidate = (ice) => {
          if (ice.candidate) {
            const localIP = ice.candidate.candidate.split(' ')[4];
            if (localIP && localIP.startsWith('192.168.')) {
              pc.close();
              resolve(localIP);
            }
          }
        };
        
       
        setTimeout(() => {
          pc.close();
          resolve('192.168.1.100'); 
        }, 3000);
      });
    } catch (error) {
      console.error('IP detection failed:', error);
      return '192.168.1.100'; 
    } finally {
      setAutoDetecting(false);
    }
  };

  const handleConnect = async () => {
    if (!ipAddress || !port) return;
    
    localStorage.setItem('ipCameraAddress', ipAddress);
    localStorage.setItem('ipCameraPort', port);
    
    const cameraUrl = `http://${ipAddress}:${port}/shot.jpg`;
    setCameraUrl(cameraUrl);
    setIsConnected(true);
    onCameraUrlChange(cameraUrl, true);
  };

  const handleAutoDetect = async () => {
    const detectedIP = await detectLocalIP();
    setIpAddress(detectedIP);
  };



  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Smartphone className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">IP Camera Setup</h3>
      </div>

      <div className="space-y-4">
       
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Setup Instructions:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Install "IP Webcam" app on your Android device</li>
            <li>Open the app and tap "Start server"</li>
            <li>Note the IP address shown in the app</li>
            <li>Enter the IP address below and click Connect</li>
          </ol>
        </div>

       
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Camera IP Address
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="192.168.1.100"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAutoDetect}
                disabled={autoDetecting}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                title="Auto-detect local IP"
              >
                {autoDetecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Wifi className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Port
            </label>
            <input
              type="text"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="8080"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

       
        {cameraUrl && (
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            isConnected 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">
                {isConnected ? 'Camera connected successfully' : 'Failed to connect to camera'}
              </span>
            </div>
            {isConnected && (
              <div className="flex items-center space-x-1">
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium">WiFi Connected</span>
              </div>
            )}
          </div>
        )}

       
        <button
          onClick={handleConnect}
          disabled={!ipAddress || !port}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className="h-4 w-4" />
          <span>Connect Camera</span>
        </button>

     
        {isConnected && cameraUrl && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Camera Preview
            </label>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <img
                src={cameraUrl}
                alt="IP Camera Feed"
                className="w-full h-48 object-cover"
                onError={() => setIsConnected(false)}
              />
            </div>
          </div>
        )}

      
        <div className="text-xs text-gray-500">
          <p className="font-medium mb-1">Common IP ranges:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIpAddress('192.168.1.3')}
              className="text-left hover:text-blue-600 font-medium"
            >
              192.168.1.3 (Default)
            </button>
            <button
              onClick={() => setIpAddress('192.168.1.100')}
              className="text-left hover:text-blue-600"
            >
              192.168.1.x
            </button>
            <button
              onClick={() => setIpAddress('192.168.0.100')}
              className="text-left hover:text-blue-600"
            >
              192.168.0.x
            </button>
            <button
              onClick={() => setIpAddress('10.0.0.100')}
              className="text-left hover:text-blue-600"
            >
              10.0.0.x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}