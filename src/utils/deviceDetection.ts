import { useState, useEffect } from 'react';

/**
 * TASC IIoT Studio — Unified Device Detection & Storage Profiler
 * 
 * Auto-detects device hardware class (Desktop PC / Laptop vs. Mobile / Tablet)
 * and determines responsive UI capability, historian retention, and safe storage limits.
 */

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export interface StorageProfile {
  deviceType: DeviceType;
  isPC: boolean;
  isMobile: boolean;
  maxRetentionSeconds: number;
  maxStorageCapMb: number;
  defaultRetentionValue: number;
  defaultRetentionUnit: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
  supportedRollupTiers: ('raw' | '1min' | '1hour' | '1day')[];
  batchSize: number;
  batchFlushIntervalMs: number;
  enableAggressivePrune: boolean;
  profileLabel: string;
}

/**
 * Detects whether the current client is a Mobile phone, Tablet, or Desktop/Laptop PC.
 */
export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'desktop';
  }

  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTabletUA = /iPad|Tablet|(Android(?!.*Mobile))/i.test(ua);

  // Touch & Pointer Checks
  const hasTouch = (navigator.maxTouchPoints || 0) > 1;
  const isCoarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const screenWidth = typeof window.screen !== 'undefined' ? window.screen.width : 1920;

  if (isTabletUA || (hasTouch && isCoarsePointer && screenWidth >= 600 && screenWidth <= 1024)) {
    return 'tablet';
  }

  if (isMobileUA || (hasTouch && isCoarsePointer && screenWidth < 600)) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Checks if the current client is a mobile device or small touch tablet
 * where heavy background services and complex visualization should be auto-parked.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return detectDeviceType() !== 'desktop';
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
export function useDeviceCapability(): { isDesktop: boolean; isMobile: boolean; deviceType: DeviceType } {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => detectDeviceType());

  useEffect(() => {
    const handleResize = () => {
      setDeviceType(detectDeviceType());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const isDesktop = deviceType === 'desktop';
  return {
    isDesktop,
    isMobile: !isDesktop,
    deviceType
  };
}

/**
 * Returns the comprehensive storage profile for the current device.
 */
export function getDeviceStorageProfile(): StorageProfile {
  const deviceType = detectDeviceType();
  const isPC = deviceType === 'desktop';
  const isMobile = !isPC;

  if (isPC) {
    return {
      deviceType: 'desktop',
      isPC: true,
      isMobile: false,
      maxRetentionSeconds: 10 * 365 * 86400, // Up to 10 Years on PC
      maxStorageCapMb: 50000,                // 50 GB Storage Cap on PC
      defaultRetentionValue: 5,
      defaultRetentionUnit: 'YEARS',
      supportedRollupTiers: ['raw', '1min', '1hour', '1day'],
      batchSize: 100,
      batchFlushIntervalMs: 5000,
      enableAggressivePrune: false,
      profileLabel: 'PC / Laptop Mode (Multi-Tier 5-Year Historian Active)'
    };
  }

  // Mobile / Tablet Profile
  return {
    deviceType,
    isPC: false,
    isMobile: true,
    maxRetentionSeconds: 30 * 86400,         // Max 30 Days on Mobile
    maxStorageCapMb: 400,                    // 400 MB Safe Mobile Cap
    defaultRetentionValue: 7,
    defaultRetentionUnit: 'DAYS',
    supportedRollupTiers: ['raw', '1min'],
    batchSize: 30,
    batchFlushIntervalMs: 5000,
    enableAggressivePrune: true,
    profileLabel: 'Mobile Safe Mode (30-Day Auto-Clamped Retention)'
  };
}

/**
 * Converts a retention value + unit to total seconds.
 */
export function retentionToSeconds(
  value: number,
  unit: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS'
): number {
  const v = Math.max(1, value);
  switch (unit) {
    case 'MINUTES': return v * 60;
    case 'HOURS':   return v * 3600;
    case 'DAYS':    return v * 86400;
    case 'WEEKS':   return v * 7 * 86400;
    case 'MONTHS':  return v * 30 * 86400;
    case 'YEARS':   return v * 365 * 86400;
    default:        return v * 86400;
  }
}

/**
 * Adaptively clamps the requested retention config to the current device's hardware capability.
 */
export function getAdaptiveRetention(
  requestedValue: number = 7,
  requestedUnit: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS' = 'DAYS'
): {
  effectiveValue: number;
  effectiveUnit: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
  effectiveSeconds: number;
  isClampedForMobile: boolean;
  originalLabel: string;
  effectiveLabel: string;
} {
  const profile = getDeviceStorageProfile();
  const requestedSeconds = retentionToSeconds(requestedValue, requestedUnit);
  const originalLabel = `${requestedValue} ${requestedUnit.toLowerCase()}`;

  if (requestedSeconds <= profile.maxRetentionSeconds) {
    return {
      effectiveValue: requestedValue,
      effectiveUnit: requestedUnit,
      effectiveSeconds: requestedSeconds,
      isClampedForMobile: false,
      originalLabel,
      effectiveLabel: originalLabel
    };
  }

  // Clamped for mobile device limits
  const clampedSeconds = profile.maxRetentionSeconds;
  const clampedDays = Math.floor(clampedSeconds / 86400);

  return {
    effectiveValue: clampedDays,
    effectiveUnit: 'DAYS',
    effectiveSeconds: clampedSeconds,
    isClampedForMobile: true,
    originalLabel,
    effectiveLabel: `${clampedDays} days (Mobile Safe Limit)`
  };
}
