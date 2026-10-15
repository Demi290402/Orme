import { useState, useEffect } from 'react';

export interface SmartwatchInfo {
  isSmartwatch: boolean;
  isRound: boolean;
  isAppleWatch: boolean;
  viewMode: 'watch' | 'full' | 'auto';
  toggleViewMode: (mode: 'watch' | 'full' | 'auto') => void;
}

export function useSmartwatch(): SmartwatchInfo {
  const [viewMode, setViewModeState] = useState<'watch' | 'full' | 'auto'>(() => {
    try {
      const saved = localStorage.getItem('orme_view_mode');
      if (saved === 'watch' || saved === 'full' || saved === 'auto') return saved;
    } catch {
      // Ignore localStorage errors
    }
    return 'auto';
  });

  const [isSmartwatchDevice, setIsSmartwatchDevice] = useState<boolean>(() => checkSmartwatchDevice());
  const [isRound, setIsRound] = useState<boolean>(() => checkIsRound());
  const [isAppleWatch, setIsAppleWatch] = useState<boolean>(() => checkIsAppleWatch());

  function checkSmartwatchDevice(): boolean {
    if (typeof window === 'undefined') return false;

    // URL parameter override (?watch=true)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('watch') === 'true') return true;

    // Direct /watch route
    if (window.location.pathname === '/watch') return true;

    // 1. (shape: round) media query. Smartwatches (Wear OS / Tizen) are the ONLY round screen devices!
    try {
      if (window.matchMedia && window.matchMedia('(shape: round)').matches) {
        return true;
      }
    } catch {
      // ignore
    }

    // 2. Physical Screen dimensions: Smartwatches have screen dimensions <= 500px
    const maxScreen = Math.max(window.screen.width || 0, window.screen.height || 0);
    const minScreen = Math.min(window.screen.width || 0, window.screen.height || 0);
    const minWindow = Math.min(window.innerWidth || 0, window.innerHeight || 0);

    // Any device with physical screen width/height <= 500px is an Apple Watch or Wear OS watch
    if (maxScreen > 0 && maxScreen <= 500) {
      return true;
    }

    // 3. 1:1 or nearly 1:1 aspect ratio with screen <= 540px
    if (minScreen > 0 && maxScreen > 0 && (maxScreen / minScreen) < 1.18 && maxScreen <= 540) {
      return true;
    }

    // 4. Viewport width <= 320px
    if (minWindow > 0 && minWindow <= 320) {
      return true;
    }

    // 5. User-agent detection
    const ua = navigator.userAgent || '';
    if (/(watchOS|AppleWatch|Apple Watch|Tizen|Wear\s*OS|WearOS|Galaxy\s*Watch|SM-R[0-9]+|SM-L[0-9]+|Watch[0-9,]+)/i.test(ua)) {
      return true;
    }

    // 6. SamsungBrowser on Android with small screen
    if (/SamsungBrowser/i.test(ua) && maxScreen <= 520) {
      return true;
    }

    return false;
  }

  function checkIsRound(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      if (window.matchMedia && window.matchMedia('(shape: round)').matches) {
        return true;
      }
    } catch {
      // matchMedia not supported
    }

    const ua = navigator.userAgent || '';
    if (/(Galaxy\s*Watch|SM-R[0-9]+|SM-L[0-9]+|Tizen|Pixel\s*Watch)/i.test(ua)) {
      return true;
    }

    const sw = window.screen.width || 0;
    const sh = window.screen.height || 0;
    if (sw > 0 && sh > 0 && Math.abs(sw - sh) < 25 && sw <= 500) {
      return true;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    if (Math.abs(w - h) < 25 && w <= 420) {
      return true;
    }

    return false;
  }

  function checkIsAppleWatch(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    if (/(watchOS|AppleWatch|Apple Watch)/i.test(ua)) return true;
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    const maxScreen = Math.max(window.screen.width || 0, window.screen.height || 0);
    return /(iPhone|iPod)/i.test(ua) && (minDim <= 220 || maxScreen <= 502);
  }

  useEffect(() => {
    const handleResize = () => {
      setIsSmartwatchDevice(checkSmartwatchDevice());
      setIsRound(checkIsRound());
      setIsAppleWatch(checkIsAppleWatch());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleViewMode = (mode: 'watch' | 'full' | 'auto') => {
    setViewModeState(mode);
    try {
      localStorage.setItem('orme_view_mode', mode);
    } catch {
      // Ignore
    }
  };

  // Determine final isSmartwatch based on preference
  const isSmartwatch = viewMode === 'watch' 
    ? true 
    : viewMode === 'full' 
      ? false 
      : isSmartwatchDevice;

  return {
    isSmartwatch,
    isRound,
    isAppleWatch,
    viewMode,
    toggleViewMode,
  };
}
