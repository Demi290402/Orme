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

    // Screen dimensions: Virtually all modern smartwatches have CSS width <= 320px
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    const screenMin = Math.min(window.screen.width || 9999, window.screen.height || 9999);
    const hasSmallScreen = minDim <= 320 || screenMin <= 320;

    // User-agent detection for Samsung Galaxy Watch, Wear OS, Tizen, Apple Watch
    const ua = navigator.userAgent || '';
    const hasWatchUA = /(watchOS|AppleWatch|Tizen|Wear\s*OS|Galaxy\s*Watch|SM-R[0-9]+|SM-L[0-9]+)/i.test(ua);
    
    // Apple Watch WebKit sends iPhone/iPod UA but with microscopic screen width
    const isTinyAppleDevice = /(iPhone|iPod)/i.test(ua) && minDim <= 220;

    return hasWatchUA || isTinyAppleDevice || (hasSmallScreen && !/iPad|Tablet|Android(?!.*Mobile)/i.test(ua) && minDim <= 300);
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
    // Most Samsung Watches (Tizen / Wear OS) and Pixel Watches are round
    if (/(Galaxy\s*Watch|SM-R[0-9]+|SM-L[0-9]+|Tizen)/i.test(ua)) {
      return true;
    }

    // Almost 1:1 aspect ratio with small screen often indicates round bezel
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (Math.abs(w - h) < 15 && w <= 320) {
      return true;
    }

    return false;
  }

  function checkIsAppleWatch(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    if (/(watchOS|AppleWatch)/i.test(ua)) return true;
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    return /(iPhone|iPod)/i.test(ua) && minDim <= 220;
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
