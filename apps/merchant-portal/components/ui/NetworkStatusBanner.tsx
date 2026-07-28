import React, { useEffect, useRef, useState } from 'react';
import { Alert } from './Alert';

export const NetworkStatusBanner: React.FC = () => {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [showRecovered, setShowRecovered] = useState(false);
  const wasOffline = useRef(!online);

  useEffect(() => {
    const handleOffline = () => {
      wasOffline.current = true;
      setShowRecovered(false);
      setOnline(false);
    };
    const handleOnline = () => {
      setOnline(true);
      if (wasOffline.current) {
        setShowRecovered(true);
        wasOffline.current = false;
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (!showRecovered) return;
    const timeoutId = window.setTimeout(() => setShowRecovered(false), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [showRecovered]);

  if (!online) {
    return (
      <Alert className="mb-4" tone="warning" title="You’re offline">
        Changes may not save until your connection returns. Existing information remains available where cached.
      </Alert>
    );
  }

  if (showRecovered) {
    return (
      <Alert className="mb-4" tone="success" title="Back online">
        Your connection has been restored. You can continue working.
      </Alert>
    );
  }

  return null;
};

export default NetworkStatusBanner;
