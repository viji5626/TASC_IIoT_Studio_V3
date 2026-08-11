import React, { useState, useEffect, useRef } from 'react';
import { Panel } from '../types';
import { getAnimationSpeedClass } from '../utils/iconAnimator';
import { isPanelTripped } from '../utils/tripHelper';
import { getPanelTelemetryStatus } from '../utils/staleHelper';

interface DynamicIndustrialSymbolProps {
  symbolId?: string;
  panel: Panel;
  liveValue: any;
  latestValues?: Record<string, { val: any; time: string }>;
  className?: string;
}

export const DynamicIndustrialSymbol: React.FC<DynamicIndustrialSymbolProps> = ({
  symbolId,
  panel,
  liveValue,
  latestValues = {},
  className = "w-full h-full"
}) => {
  // Trip Evaluation
  const tripResult = isPanelTripped(panel, latestValues);
  const isTripped = tripResult.isTripped;
  const tripColor = tripResult.tripColor;

  const numVal = typeof liveValue === 'number' && !isNaN(liveValue) 
    ? liveValue 
    : (liveValue !== undefined && liveValue !== null ? parseFloat(String(liveValue)) : NaN);

  const targetNumValue = isNaN(numVal) ? 0 : numVal;
  const [displayVal, setDisplayVal] = useState<number>(targetNumValue);
  const requestRef = useRef<number>();

  useEffect(() => {
    const startValue = displayVal;
    const targetValue = targetNumValue;
    
    if (Math.abs(startValue - targetValue) < 0.01) {
      setDisplayVal(targetValue);
      return;
    }

    const duration = 500; // 500ms smooth transition duration
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (targetValue - startValue) * easeProgress;

      setDisplayVal(currentValue);

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayVal(targetValue);
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [targetNumValue]);

  const min = panel.payloadMin ?? 0;
  const max = panel.payloadMax ?? 100;
  const range = max - min || 1;
  const pct = isNaN(numVal) ? 50 : Math.max(0, Math.min(100, ((displayVal - min) / range) * 100));

  const lowTh = panel.lowThreshold !== undefined ? panel.lowThreshold : min + range * 0.25;
  const highTh = panel.highThreshold !== undefined ? panel.highThreshold : min + range * 0.75;

  const isLowZone = !isNaN(numVal) && numVal <= lowTh;
  const isHighZone = !isNaN(numVal) && numVal > highTh;
  const isMidZone = !isNaN(numVal) && !isLowZone && !isHighZone;

  const isLowAlarm = isLowZone && !!panel.enableLowAlarm;
  const isMidAlarm = isMidZone && !!panel.enableMidAlarm;
  const isHighAlarm = isHighZone && !!panel.enableHighAlarm;

  // Zone Colors (Low, Mid, High)
  const lowColor = panel.firstColor || '#10b981';     // Low Zone Color
  const midColor = panel.secondColor || '#f59e0b';    // Mid Zone Color
  const highColor = panel.thirdColor || '#f43f5e';   // High Zone Color

  const currentLevelColor = isHighZone ? highColor : isLowZone ? lowColor : midColor;
  const isAlarmActive = isLowAlarm || isMidAlarm || isHighAlarm;

  // Digital On/Off State
  const payloadOnStr = String(panel.payloadOn ?? '1');
  const payloadOffStr = panel.payloadOff !== undefined ? String(panel.payloadOff) : undefined;
  const liveStr = String(liveValue !== undefined && liveValue !== null ? liveValue : '');
  
  const isOn = payloadOffStr !== undefined 
    ? liveStr !== payloadOffStr 
    : (liveStr === payloadOnStr || liveValue === true || liveValue === 1);

  // If Tripped, override status color with Trip Hazard Color
  const statusColor = isTripped ? tripColor : (isOn ? (panel.iconColorOn || '#10b981') : (panel.iconColorOff || '#ef4444'));

  // Telemetry Timeout / Disconnection Watchdog Evaluation
  const telemetryStatus = getPanelTelemetryStatus(panel, latestValues);
  const isOffline = telemetryStatus.isOffline;

  // Animation Condition Evaluation (If TRIPPED or OFFLINE, stop animation!)
  const isSymbolAnimated = !isTripped && !isOffline && (() => {
    // 1. Explicit pipe/symbol anim condition overrides:
    if (panel.pipeAnimCondition === 'always') return true;
    if (panel.pipeAnimCondition === 'tag_condition') {
      const targetVal = String(panel.pipeAnimValue !== undefined ? panel.pipeAnimValue : '1').trim();
      const op = panel.pipeAnimOperator || '=';
      const liveTrim = liveStr.trim();
      const liveNum = parseFloat(liveTrim);
      const targetNum = parseFloat(targetVal);

      if (!isNaN(liveNum) && !isNaN(targetNum)) {
        if (op === '=') return liveNum === targetNum;
        if (op === '!=') return liveNum !== targetNum;
        if (op === '>') return liveNum > targetNum;
        if (op === '<') return liveNum < targetNum;
        if (op === '>=') return liveNum >= targetNum;
        if (op === '<=') return liveNum <= targetNum;
      }
      if (op === '!=') return liveTrim !== targetVal;
      return liveTrim.toLowerCase() === targetVal.toLowerCase();
    }

    // 2. Standard ON vs OFF state evaluation (same concept as Lamp Icon animation):
    // When ON (running state): animate if panel.rotateOn is enabled (defaults to true)
    // When OFF (stopped state): animate ONLY if panel.rotateOff is explicitly enabled (defaults to false)!
    if (isOn || (!isNaN(numVal) && numVal > 0)) {
      return panel.rotateOn !== false;
    } else {
      return panel.rotateOff === true;
    }
  })();

  const symbolAnimSpeed = isOn ? (panel.animSpeedOn || 'medium') : (panel.animSpeedOff || 'medium');
  const symbolSpeedClass = isSymbolAnimated ? getAnimationSpeedClass(symbolAnimSpeed) : '';

  // Control Valve Angle (0° to 90°)
  const valveAngle = (pct / 100) * 90;
  // Stem travel (top = 21, bottom = 33)
  const stemY = 33 - (pct / 100) * 12;

  const id = symbolId || panel.symbolId || 'tank_vertical';

  // Centrifugal Volute Water/Industrial Pump
  if (id === 'pump_centrifugal' || id === 'pump_water' || id.includes('pump_centrifugal')) {
    return (
      <svg className={className} viewBox="0 0 150 140" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`voluteGrad_${panel.panelId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155"/>
            <stop offset="50%" stopColor="#475569"/>
            <stop offset="100%" stopColor="#0f172a"/>
          </linearGradient>
        </defs>

        {/* Heavy Base Plate Stand */}
        <rect x="15" y="115" width="130" height="15" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5"/>
        <rect x="25" y="110" width="110" height="6" fill="#475569"/>

        {/* Top Discharge Nozzle Flange */}
        <rect x="45" y="8" width="22" height="30" fill="#334155" stroke="#0f172a" strokeWidth="1.2"/>
        <rect x="38" y="5" width="36" height="6" rx="1.5" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1"/>

        {/* Main Volute Spiral Snail Pump Casing */}
        <path 
          d="M 56 30 C 95 30, 115 50, 115 80 C 115 110, 88 115, 56 115 C 28 115, 6 92, 6 64 C 6 36, 28 30, 56 30 Z" 
          fill={`url(#voluteGrad_${panel.panelId})`} 
          stroke={isSymbolAnimated ? (panel.iconColorOn || '#10b981') : '#0f172a'} 
          strokeWidth="2.5"
        />

        {/* Shaft Coupling Guard (Right Side) */}
        <rect x="110" y="60" width="20" height="28" fill="#f59e0b" stroke="#0f172a" strokeWidth="1"/>
        <line x1="115" y1="60" x2="115" y2="88" stroke="#0f172a" strokeWidth="1"/>
        <line x1="120" y1="60" x2="120" y2="88" stroke="#0f172a" strokeWidth="1"/>

        {/* Suction Inlet Center Ring */}
        <circle cx="56" cy="72" r="30" fill="#0f172a" stroke="#64748b" strokeWidth="2"/>
        <circle cx="56" cy="72" r="25" fill="#1e293b" />

        {/* Internal Curved Multi-Blade Rotating Impeller (Locked precisely at 56px, 72px) */}
        <g 
          className={isSymbolAnimated ? `animate-icon-spin ${symbolSpeedClass}` : ''} 
          style={{ transformOrigin: '56px 72px' }}
        >
          <circle cx="56" cy="72" r="6" fill={statusColor} stroke="#f8fafc" strokeWidth="1"/>
          
          {/* Curved Impeller Vane Blades drawn centered on (56, 72) */}
          <path d="M 56 66 C 64 54, 76 60, 74 70 C 66 66, 60 68, 56 66 Z" fill={statusColor} opacity="0.95"/>
          <path d="M 63 72 C 74 80, 68 92, 58 90 C 62 82, 60 76, 63 72 Z" fill={statusColor} opacity="0.95"/>
          <path d="M 56 78 C 48 90, 36 84, 38 74 C 46 78, 52 76, 56 78 Z" fill={statusColor} opacity="0.95"/>
          <path d="M 49 72 C 38 64, 44 52, 54 54 C 50 62, 52 68, 49 72 Z" fill={statusColor} opacity="0.95"/>
        </g>

        {/* Status Indicator LED Light */}
        <circle cx="56" cy="72" r="4" fill="#0f172a"/>
        <circle cx="56" cy="72" r="2.5" fill={statusColor} className={isSymbolAnimated ? 'animate-pulse' : ''}/>
      </svg>
    );
  }

  // Render SVG based on symbol type
  if (id === 'valve_control') {
    return (
      <svg className={className} viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`bodyGrad_${panel.panelId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#334155"/>
            <stop offset="30%" stopColor="#64748b"/>
            <stop offset="70%" stopColor="#cbd5e1"/>
            <stop offset="100%" stopColor="#1e293b"/>
          </linearGradient>
        </defs>

        {/* Bonnet Neck Collar */}
        <rect x="44" y="32" width="12" height="42" fill="#334155" stroke="#0f172a" strokeWidth="1.2"/>

        {/* Top Pneumatic Actuator Dome */}
        <path d="M 25 25 C 25 10, 75 10, 75 25 Z" fill={currentLevelColor} stroke="#0f172a" strokeWidth="1.5"/>
        <rect x="20" y="25" width="60" height="8" rx="2" fill="#0284c7" stroke="#0f172a" strokeWidth="1.5"/>
        
        {/* Dynamic Stem Shaft */}
        <rect x="47" y={stemY} width="6" height={85 - stemY} fill="#cbd5e1" stroke="#1e293b" strokeWidth="0.8" className="transition-all duration-700 ease-out"/>
        <circle cx="50" cy={stemY + 8} r="3.5" fill={currentLevelColor} stroke="#f8fafc" strokeWidth="1" className="transition-all duration-700 ease-out"/>
        
        {/* Position Readout Dial */}
        <rect x="62" y="38" width="26" height="14" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1"/>
        <text x="75" y="48" fontSize="8" fill="#10b981" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          {Math.round(pct)}%
        </text>

        {/* Valve Body Flanges & Triangles */}
        <rect x="10" y="70" width="8" height="30" rx="1.5" fill="#475569" stroke="#0f172a" strokeWidth="1.2"/>
        <rect x="82" y="70" width="8" height="30" rx="1.5" fill="#475569" stroke="#0f172a" strokeWidth="1.2"/>
        <polygon points="18,70 50,85 18,100" fill={`url(#bodyGrad_${panel.panelId})`} stroke="#0f172a" strokeWidth="1.5"/>
        <polygon points="82,70 50,85 82,100" fill={`url(#bodyGrad_${panel.panelId})`} stroke="#0f172a" strokeWidth="1.5"/>
        
        {/* Rotating Internal Valve Disc */}
        <circle cx="50" cy="85" r="8" fill="#0f172a" stroke={currentLevelColor} strokeWidth="1.5" className="transition-colors duration-700"/>
        <line x1="50" y1="77" x2="50" y2="93" stroke={currentLevelColor} strokeWidth="2.5" transform={`rotate(${valveAngle} 50 85)`} className="transition-all duration-700 ease-out"/>
      </svg>
    );
  }

  if (id === 'valve_solenoid' || id === 'valve_butterfly' || id === 'valve_ball') {
    return (
      <svg className={className} viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        {/* Solenoid Neck Collar */}
        <rect x="44" y="42" width="12" height="35" fill="#475569" stroke="#0f172a" strokeWidth="1.2"/>

        {/* Solenoid Coil Housing */}
        <rect x="35" y="10" width="30" height="35" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5"/>
        <circle cx="50" cy="22" r="6" fill={statusColor} className={isOn ? 'animate-pulse' : ''}/>
        <text x="50" y="38" fontSize="8" fill="#f8fafc" fontWeight="bold" textAnchor="middle">{isOn ? 'OPEN' : 'CLOSED'}</text>
        
        {/* Valve Body */}
        <polygon points="15,70 50,85 15,100" fill={isOn ? '#10b981' : '#ef4444'} opacity={isOn ? 0.9 : 0.6} stroke="#0f172a" strokeWidth="1.5" className="transition-all duration-700"/>
        <polygon points="85,70 50,85 85,100" fill={isOn ? '#10b981' : '#ef4444'} opacity={isOn ? 0.9 : 0.6} stroke="#0f172a" strokeWidth="1.5" className="transition-all duration-700"/>
        <rect x="10" y="70" width="7" height="30" rx="1" fill="#475569"/>
        <rect x="83" y="70" width="7" height="30" rx="1" fill="#475569"/>
        <circle cx="50" cy="85" r="6" fill="#0f172a" stroke={statusColor} strokeWidth="2" className="transition-colors duration-700"/>
      </svg>
    );
  }

  if (id === 'tank_vertical' || id === 'tank_conical' || id === 'silo_grain') {
    const liquidY = 145 - (pct / 100) * 110;
    const liquidH = (pct / 100) * 110;

    return (
      <svg className={className} viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg">
        {/* Support Legs */}
        <rect x="22" y="136" width="9" height="38" fill="#475569" stroke="#0f172a" strokeWidth="1"/>
        <rect x="89" y="136" width="9" height="38" fill="#475569" stroke="#0f172a" strokeWidth="1"/>

        {/* Top Dish Head Cap */}
        <path d="M 15 35 Q 60 10, 105 35 Z" fill="#334155" stroke="#0f172a" strokeWidth="1.5"/>
        {/* Main Tank Cylinder */}
        <rect x="15" y="35" width="90" height="110" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5"/>
        
        {/* Dynamic Fluid Level Fill inside Tank with Smooth Transition */}
        <rect 
          x="17" 
          y={liquidY} 
          width="86" 
          height={liquidH} 
          fill={currentLevelColor} 
          opacity="0.45" 
          className="transition-all duration-700 ease-out"
        />

        {/* Sleek Liquid Surface Meniscus Line (100% clipped inside tank shell) */}
        {pct > 0 && (
          <line
            x1="17"
            y1={liquidY}
            x2="103"
            y2={liquidY}
            stroke={currentLevelColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.95"
            className="transition-all duration-700 ease-out"
          />
        )}
        
        {/* Bottom Dish Head Cap */}
        <path d="M 15 145 Q 60 170, 105 145 Z" fill="#334155" stroke="#0f172a" strokeWidth="1.5"/>
        
        {/* Glass Sight Gauge Level Indicator Bar */}
        <rect x="98" y="45" width="7" height="90" rx="3.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.2"/>
        <rect 
          x="99.5" 
          y={133 - (pct / 100) * 84} 
          width="4" 
          height={(pct / 100) * 84} 
          rx="2" 
          fill={currentLevelColor} 
          className={`transition-all duration-700 ease-out ${isAlarmActive ? 'animate-pulse' : ''}`}
        />
        
        {/* Level Percentage Readout */}
        <rect x="35" y="70" width="50" height="22" rx="4" fill="#0f172a" opacity="0.9" stroke={currentLevelColor} strokeWidth="1.5" className="transition-colors duration-700"/>
        <text x="60" y="85" fontSize="11" fill={currentLevelColor} fontFamily="monospace" fontWeight="extrabold" textAnchor="middle" className="transition-colors duration-700">
          {Math.round(pct)}%
        </text>

        {/* Alarm Warning Badge */}
        {isAlarmActive && (
          <g transform="translate(60, 48)">
            <circle cx="0" cy="0" r="7" fill={currentLevelColor} />
            <text x="0" y="3" fontSize="9" fill="#0f172a" fontStyle="bold" textAnchor="middle">!</text>
          </g>
        )}
      </svg>
    );
  }

  if (id === 'tank_horizontal') {
    const liquidW = (pct / 100) * 106;
    return (
      <svg className={className} viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg">
        {/* Saddle Legs */}
        <path d="M 40 55 L 34 105 L 56 105 L 50 55 Z" fill="#334155" stroke="#0f172a" strokeWidth="1"/>
        <path d="M 140 55 L 134 105 L 156 105 L 150 55 Z" fill="#334155" stroke="#0f172a" strokeWidth="1"/>
        
        {/* Shell & Liquid Fill with Smooth Transition */}
        <rect x="35" y="30" width="110" height="55" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5"/>
        <rect 
          x="37" 
          y="32" 
          width={liquidW} 
          height="51" 
          fill={currentLevelColor} 
          opacity="0.4" 
          className="transition-all duration-700 ease-out"
        />

        {/* Sleek Liquid Surface Line (100% clipped inside tank shell) */}
        {pct > 0 && (
          <line
            x1={37 + liquidW}
            y1="32"
            x2={37 + liquidW}
            y2="83"
            stroke={currentLevelColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.95"
            className="transition-all duration-700 ease-out"
          />
        )}
        
        <path d="M 35 30 C 15 30, 15 85, 35 85 Z" fill="#334155" stroke="#0f172a" strokeWidth="1.5"/>
        <path d="M 145 30 C 165 30, 165 85, 145 85 Z" fill="#334155" stroke="#0f172a" strokeWidth="1.5"/>
        
        {/* Digital Level Strip Bar */}
        <rect x="45" y="52" width="90" height="12" rx="4" fill="#0f172a" stroke={currentLevelColor} strokeWidth="1.2" className="transition-colors duration-700"/>
        <rect 
          x="47" 
          y="54" 
          width={(pct / 100) * 86} 
          height="8" 
          rx="2" 
          fill={currentLevelColor} 
          className={`transition-all duration-700 ease-out ${isAlarmActive ? 'animate-pulse' : ''}`}
        />
        <text x="90" y="62" fontSize="8" fill="#f8fafc" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          {Math.round(pct)}%
        </text>
      </svg>
    );
  }

  if (id.startsWith('agitator_') || id.includes('mixer')) {
    return (
      <svg className={className} viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg">
        {/* Motor Drive on Top */}
        <rect x="42" y="10" width="36" height="30" rx="3" fill="#0284c7" stroke="#0f172a" strokeWidth="1.5"/>
        <rect x="48" y="40" width="24" height="18" fill="#475569" stroke="#0f172a" strokeWidth="1"/>
        {/* Mounting Flange Plate */}
        <rect x="30" y="58" width="60" height="8" rx="2" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.5"/>
        
        {/* Long Central Mixer Shaft */}
        <rect x="57" y="66" width="6" height="105" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1"/>
        
        {/* Rotating Impeller Blades Centered on (60px, 162px) */}
        <g 
          className={isSymbolAnimated ? `animate-icon-spin ${symbolSpeedClass}` : ''} 
          style={{ transformOrigin: '60px 162px' }}
        >
          <path d="M 60 144 L 66 158 L 60 162 L 54 158 Z" fill={statusColor}/>
          <path d="M 78 162 L 64 168 L 60 162 L 64 156 Z" fill={statusColor}/>
          <path d="M 60 180 L 54 166 L 60 162 L 66 166 Z" fill={statusColor}/>
          <path d="M 42 162 L 56 156 L 60 162 L 56 168 Z" fill={statusColor}/>
          <circle cx="60" cy="162" r="5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1"/>
        </g>
      </svg>
    );
  }

  if (id.startsWith('motor_') || id.startsWith('pump_')) {
    return (
      <svg className={className} viewBox="0 0 150 120" xmlns="http://www.w3.org/2000/svg">
        {/* Mounting Feet */}
        <rect x="25" y="78" width="20" height="26" rx="2" fill="#334155" stroke="#0f172a" strokeWidth="1.2"/>
        <rect x="85" y="78" width="20" height="26" rx="2" fill="#334155" stroke="#0f172a" strokeWidth="1.2"/>
        
        {/* Motor Casing */}
        <rect x="30" y="30" width="75" height="62" rx="6" fill={isOn ? '#0284c7' : '#334155'} stroke="#0f172a" strokeWidth="1.5"/>
        
        {/* Shaft Coupling */}
        <rect x="98" y="54" width="18" height="14" fill="#64748b" stroke="#0f172a" strokeWidth="1"/>

        {/* Fins */}
        <line x1="42" y1="30" x2="42" y2="92" stroke="#0f172a" strokeWidth="1.5"/>
        <line x1="54" y1="30" x2="54" y2="92" stroke="#0f172a" strokeWidth="1.5"/>
        <line x1="66" y1="30" x2="66" y2="92" stroke="#0f172a" strokeWidth="1.5"/>
        <line x1="78" y1="30" x2="78" y2="92" stroke="#0f172a" strokeWidth="1.5"/>
        
        <rect x="50" y="14" width="35" height="16" rx="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.2"/>
        <circle cx="67" cy="22" r="4" fill={statusColor} className={isSymbolAnimated ? 'animate-pulse' : ''}/>
        
        {/* Rotating Impeller / Fan Icon Centered on (115px, 61px) */}
        <circle cx="115" cy="61" r="14" fill="#0f172a" stroke={statusColor} strokeWidth="1.5"/>
        <g 
          className={isSymbolAnimated ? `animate-icon-spin ${symbolSpeedClass}` : ''} 
          style={{ transformOrigin: '115px 61px' }}
        >
          <path d="M 115 51 L 119 59 L 115 61 L 111 59 Z" fill={statusColor}/>
          <path d="M 125 61 L 117 65 L 115 61 L 117 57 Z" fill={statusColor}/>
          <path d="M 115 71 L 111 63 L 115 61 L 119 63 Z" fill={statusColor}/>
          <path d="M 105 61 L 113 57 L 115 61 L 113 65 Z" fill={statusColor}/>
        </g>
      </svg>
    );
  }

  // Fallback default SVG rendering for other symbols
  if (panel.imageUrl && panel.imageUrl.startsWith('data:image/svg')) {
    return (
      <div 
        className={className}
        dangerouslySetInnerHTML={{ __html: panel.staticText || decodeURIComponent(panel.imageUrl.replace(/^data:image\/svg\+xml;utf8,/, '')) }}
      />
    );
  }

  return (
    <img 
      src={panel.imageUrl} 
      alt={panel.panelName || 'Symbol Asset'}
      className={`${className} object-${panel.imageFit || 'contain'}`}
    />
  );
};
