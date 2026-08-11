import React, { useState, useEffect, useRef } from 'react';

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  unit: string;
  color1?: string;
  color2?: string;
  color3?: string;
  precision?: number;
  lowThreshold?: number;
  highThreshold?: number;
  hideText?: boolean;
  fontSize?: number | string;
}

const Gauge: React.FC<GaugeProps> = ({ 
  value, 
  min, 
  max, 
  unit, 
  color1 = '#38bdf8', 
  color2 = '#10b981', 
  color3 = '#f43f5e',
  precision = 1,
  lowThreshold,
  highThreshold,
  hideText = false,
  fontSize
}) => {
  const radius = 38;
  const strokeWidth = 7;
  const targetNumValue = isNaN(value) ? min : value;

  const [displayValue, setDisplayValue] = useState<number>(targetNumValue);
  const requestRef = useRef<number>();

  useEffect(() => {
    const startValue = displayValue;
    const targetValue = targetNumValue;
    
    if (Math.abs(startValue - targetValue) < 0.001) {
      setDisplayValue(targetValue);
      return;
    }

    const duration = 500; // ms transition duration
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Smooth cubic ease out
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (targetValue - startValue) * easeProgress;

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [targetNumValue, min]);

  const normalizedValue = Math.min(Math.max(displayValue, min), max);
  const range = max - min || 1;
  
  // Calculate threshold values with safe defaults
  const lowVal = lowThreshold !== undefined 
    ? Math.max(min, Math.min(max, lowThreshold)) 
    : min + range * 0.333;
  
  const highVal = highThreshold !== undefined 
    ? Math.max(lowVal, Math.min(max, highThreshold)) 
    : min + range * 0.666;

  const percentage = Math.max(0, Math.min(100, ((normalizedValue - min) / range) * 100));
  
  // Angle bounds from -180 deg to 0 deg
  const startAngle = -180;
  const endAngle = 0;
  const angle = startAngle + (percentage / 100) * (endAngle - startAngle);

  const angleFromVal = (val: number) => {
    const pct = Math.max(0, Math.min(100, ((val - min) / range) * 100));
    return startAngle + (pct / 100) * (endAngle - startAngle);
  };

  const lowAngle = angleFromVal(lowVal);
  const highAngle = angleFromVal(highVal);
  
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAng: number, endAng: number) => {
    if (Math.abs(endAng - startAng) < 0.1) return '';
    const start = polarToCartesian(x, y, radius, endAng);
    const end = polarToCartesian(x, y, radius, startAng);
    const largeArcFlag = endAng - startAng <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const trackPath = describeArc(50, 48, radius, -180, 0);
  const lowSegPath = describeArc(50, 48, radius, -180, lowAngle);
  const midSegPath = describeArc(50, 48, radius, lowAngle, highAngle);
  const highSegPath = describeArc(50, 48, radius, highAngle, 0);

  const activePath = describeArc(50, 48, radius, -180, angle);

  const getColor = () => {
    if (normalizedValue <= lowVal) return color1;
    if (normalizedValue <= highVal) return color2;
    return color3;
  };

  const currentColor = getColor();
  const needlePos = polarToCartesian(50, 48, radius - 4, angle);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-0.5 overflow-hidden">
      <svg viewBox="0 0 100 58" className="w-full h-auto max-h-[80%] max-w-full drop-shadow-md overflow-visible">
        <defs>
          <filter id={`glow-${currentColor.replace('#', '')}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Background Track */}
        <path d={trackPath} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} strokeLinecap="round" />

        {/* Segment Tracks with Subtle Color Tinting */}
        {lowSegPath && <path d={lowSegPath} fill="none" stroke={color1} strokeWidth={strokeWidth} strokeOpacity="0.25" strokeLinecap="round" />}
        {midSegPath && <path d={midSegPath} fill="none" stroke={color2} strokeWidth={strokeWidth} strokeOpacity="0.25" />}
        {highSegPath && <path d={highSegPath} fill="none" stroke={color3} strokeWidth={strokeWidth} strokeOpacity="0.25" strokeLinecap="round" />}

        {/* Active Arc with Smooth Animation & Dynamic Color */}
        <path 
          d={activePath} 
          fill="none" 
          stroke={currentColor} 
          strokeWidth={strokeWidth} 
          strokeLinecap="round" 
          style={{ filter: `drop-shadow(0 0 4px ${currentColor}88)` }}
        />

        {/* Needle Line */}
        <line 
          x1="50" y1="48" 
          x2={needlePos.x} 
          y2={needlePos.y}
          stroke="#ffffff" 
          strokeWidth="2.5" 
          strokeLinecap="round"
        />

        {/* Needle Base Circle */}
        <circle cx="50" cy="48" r="4" fill="#ffffff" className="drop-shadow-sm" />
        <circle cx="50" cy="48" r="2" fill={currentColor} />

        {/* Min / Max Labels */}
        <text x="10" y="56" fill="#64748b" fontSize="6" fontWeight="bold" textAnchor="middle">{min}</text>
        <text x="90" y="56" fill="#64748b" fontSize="6" fontWeight="bold" textAnchor="middle">{max}</text>
      </svg>

      {!hideText && (
        <div className="mt-[-4px] text-center flex items-baseline justify-center space-x-1 shrink-0">
          <span 
            className="font-bold tracking-tight text-white digital-font"
            style={{ fontSize: fontSize ? (typeof fontSize === 'number' ? `${fontSize}px` : `${parseInt(String(fontSize))}px`) : undefined }}
          >
            {displayValue.toFixed(precision)}
          </span>
          {unit && (
            <span 
              className="text-sky-400 font-semibold"
              style={{ fontSize: fontSize ? `${Math.max(10, Math.round((parseInt(String(fontSize)) || 18) * 0.55))}px` : undefined }}
            >
              {unit}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Gauge;
