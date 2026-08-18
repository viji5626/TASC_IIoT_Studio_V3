import { useState, useEffect } from 'react';

/**
 * Checks if the current client is a mobile device or small touch tablet
 * where heavy FDD background services and complex visualization should be auto-parked.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const isTouchSmallScreen = (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);

  return isMobileUa || isTouchSmallScreen;
}

/**
 * Checks if the current client is a desktop PC / workstation environment.
 */
export function isDesktopPc(): boolean {
  return !isMobileDevice();
}

/**
 * React hook to reactively track device capability (PC vs Mobile).
 */
export function useDeviceCapability(): { isDesktop: boolean; isMobile: boolean } {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => isDesktopPc());

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(isDesktopPc());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return {
    isDesktop,
    isMobile: !isDesktop
  };
}
