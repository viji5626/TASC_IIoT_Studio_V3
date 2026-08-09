import React, { useState, useEffect } from 'react';

interface AppLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  accentColor?: string;
  isCommunity?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({ 
  className = '', 
  size = 'md',
  accentColor = '#0ea5e9',
  isCommunity = false
}) => {
  const communityCandidates = [
    '/Community_logo.png',
    '/community_logo.png',
    '/Community_Logo.png',
    '/Community_logo.svg',
    '/logo.png',
    '/logo.svg'
  ];

  const defaultCandidates = [
    '/logo.png',
    '/logo.svg',
    '/Community_logo.png',
    '/community_logo.png'
  ];

  const candidates = isCommunity ? communityCandidates : defaultCandidates;

  const [srcIndex, setSrcIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setSrcIndex(0);
    setHasError(false);
  }, [isCommunity]);

  const currentSrc = candidates[srcIndex] || '';
  const isCommunityLogo = isCommunity || currentSrc.toLowerCase().includes('community');

  const dimMap = {
    sm: isCommunityLogo ? 'w-11 h-11 text-xs' : 'w-7 h-7 text-xs',
    md: isCommunityLogo ? 'w-16 h-16 text-sm' : 'w-10 h-10 text-sm',
    lg: isCommunityLogo ? 'w-24 h-24 text-xl' : 'w-12 h-12 text-base'
  };

  const iconDimMap = {
    sm: isCommunityLogo ? 'w-6 h-6' : 'w-4 h-4',
    md: isCommunityLogo ? 'w-8 h-8' : 'w-5 h-5',
    lg: isCommunityLogo ? 'w-12 h-12' : 'w-7 h-7'
  };

  const heightClass = isCommunityLogo 
    ? (size === 'sm' ? 'h-11 max-h-12' : size === 'md' ? 'h-16 max-h-16' : 'h-24 max-h-28') 
    : (size === 'sm' ? 'h-7 max-h-7' : size === 'md' ? 'h-9 max-h-9' : 'h-11 max-h-11');

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {!hasError ? (
        <img 
          src={candidates[srcIndex]} 
          alt={isCommunityLogo ? 'TASC Community Logo' : 'TASC Logo'} 
          referrerPolicy="no-referrer"
          className={`${heightClass} w-auto object-contain transition-all drop-shadow-md`}
          onError={() => {
            if (srcIndex + 1 < candidates.length) {
              setSrcIndex(prev => prev + 1);
            } else {
              setHasError(true);
            }
          }}
        />
      ) : (
        <div 
          className={`${dimMap[size]} rounded-xl flex items-center justify-center font-black shadow-lg transition-all text-white relative overflow-hidden`}
          style={{ 
            backgroundColor: isCommunity ? '#10b981' : accentColor, 
            boxShadow: `0 8px 20px -4px ${isCommunity ? '#10b981' : accentColor}50` 
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-black/30 to-transparent pointer-events-none" />
          <svg className={`${iconDimMap[size]} relative z-10 text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
      )}
    </div>
  );
};

export default AppLogo;
