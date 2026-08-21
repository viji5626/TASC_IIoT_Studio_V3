import React, { useState, useEffect, useRef } from 'react';
import { Panel } from '../types';
import { getAnimationSpeedClass } from '../utils/iconAnimator';
import { isPanelTripped } from '../utils/tripHelper';
import { getPanelTelemetryStatus } from '../utils/staleHelper';
import { getJsonValue } from '../utils/mqttHelper';

interface DynamicIndustrialSymbolProps {
  symbolId?: string;
  panel: Panel;
  liveValue: any;
  latestValues?: Record<string, { val: any; time: string }>;
  className?: string;
  activeSubPartId?: string;
}

export const DynamicIndustrialSymbol: React.FC<DynamicIndustrialSymbolProps> = ({
  symbolId,
  panel,
  liveValue,
  latestValues = {},
  className = "w-full h-full",
  activeSubPartId
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
  const pct = isNaN(numVal) ? 0 : Math.max(0, Math.min(100, ((displayVal - min) / range) * 100));

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

  // Map to collect dynamic level fill linear gradients for SVG sub-parts
  const dynamicLevelGradients = new Map<string, {
    id: string;
    pct: number;
    direction: string;
    fillColor: string;
    emptyColor: string;
  }>();

  // Helper to resolve dynamic sub-part styling, stacked dynamics rules, and active selection outline
  const resolvePartStyle = (
    partId: string, 
    defaultFill: string, 
    defaultStroke: string = '#0f172a', 
    defaultStrokeWidth: number = 1.2
  ) => {
    const sub = panel.svgSubParts?.[partId];
    if (sub?.isHidden) return { style: { display: 'none' as const } };
    
    let effectiveFill = sub?.fill || defaultFill;
    let effectiveStroke = sub?.stroke || defaultStroke;
    let effectiveStrokeWidth = sub?.strokeWidth ?? defaultStrokeWidth;
    let effectiveOpacity = sub?.opacity ?? 1;
    let isBlinking = false;
    let blinkSpeed = 'medium';

    // 1. Evaluate Legacy sub-part telemetry threshold if present
    if (sub?.topic || sub?.driverTagId) {
      const subTagKey = sub.driverTagId || sub.topic;
      if (subTagKey && latestValues[subTagKey] !== undefined) {
        const subRaw = latestValues[subTagKey].val;
        const subNum = typeof subRaw === 'number' ? subRaw : parseFloat(String(subRaw));
        if (!isNaN(subNum) && sub.highThreshold !== undefined && subNum > sub.highThreshold) {
          effectiveFill = sub.alarmColor || '#ef4444';
        } else if (!isNaN(subNum) && sub.lowThreshold !== undefined && subNum <= sub.lowThreshold) {
          effectiveFill = sub.alarmColor || '#ef4444';
        }
      }
    }

    // 2. Evaluate Multiple Stacked Dynamics Rules
    const dynamicRules = sub?.dynamics || [];
    for (const rule of dynamicRules) {
      if (!rule.enabled) continue;

      // Resolve live raw value for this rule
      const tagKey = rule.dataSourceMode === 'driver' 
        ? (rule.driverTagId || (rule as any).driverTagName || (rule as any).tagName) 
        : (rule.topic || (rule as any).tagName);
      let rawVal: any = undefined;

      if (tagKey) {
        const cleanKey = String(tagKey).trim();
        if (latestValues[cleanKey] !== undefined) {
          rawVal = latestValues[cleanKey]?.val !== undefined ? latestValues[cleanKey].val : latestValues[cleanKey];
        } else {
          for (const [k, v] of Object.entries(latestValues)) {
            if (k.toLowerCase() === cleanKey.toLowerCase() || k === `tag_panel_${cleanKey}` || k.toLowerCase() === `tag_panel_${cleanKey.toLowerCase()}`) {
              const valObj = v as any;
              rawVal = valObj?.val !== undefined ? valObj.val : valObj;
              break;
            }
          }
        }
      }

      if (rawVal === undefined) {
        rawVal = liveValue;
      }

      // If MQTT mode and JSONPath query is specified, extract nested JSON value
      if (rule.dataSourceMode === 'mqtt' && rule.jsonPath && rule.jsonPath.trim() && rawVal !== undefined) {
        try {
          const parsed = typeof rawVal === 'string' && (rawVal.startsWith('{') || rawVal.startsWith('[')) 
            ? JSON.parse(rawVal) 
            : rawVal;
          const extracted = getJsonValue(parsed, rule.jsonPath);
          if (extracted !== undefined) rawVal = extracted;
        } catch {
          // Fallback to raw value if JSON parse fails
        }
      }

      const num = typeof rawVal === 'number' ? rawVal : (rawVal !== undefined && rawVal !== null ? parseFloat(String(rawVal)) : NaN);
      const str = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';

      const isDigitalMode = (rule.tagDataType || (rule.type === 'level_fill' ? 'analog' : 'digital')) === 'digital';

      if (isDigitalMode) {
        // ─── 2-STATE DIGITAL EVALUATION (DEFAULT VALUES 0 & 1) ───────
        const state1Val = String(rule.state1Value !== undefined ? rule.state1Value : '0').trim();
        const state2Val = String(rule.state2Value !== undefined ? rule.state2Value : '1').trim();

        const isMatchState1 = str === state1Val || (!isNaN(num) && num === parseFloat(state1Val));
        const isMatchState2 = str === state2Val || (!isNaN(num) && num === parseFloat(state2Val));

        if (isMatchState1) {
          // State 1 Actions
          if (rule.type === 'visibility_blink') {
            const vis = rule.state1Visibility || 'hide';
            if (vis === 'hide') return { style: { display: 'none' as const } };
            if (vis === 'blink') {
              isBlinking = true;
              blinkSpeed = rule.blinkSpeed || 'medium';
            }
          } else if (rule.type === 'color_shift') {
            if (rule.state1Fill) effectiveFill = rule.state1Fill;
            if (rule.state1Stroke) effectiveStroke = rule.state1Stroke;
          } else if (rule.type === 'opacity_fade') {
            if (rule.state1Opacity !== undefined) effectiveOpacity = rule.state1Opacity;
          }
        } else if (isMatchState2) {
          // State 2 Actions
          if (rule.type === 'visibility_blink') {
            const vis = rule.state2Visibility || 'show';
            if (vis === 'hide') return { style: { display: 'none' as const } };
            if (vis === 'blink') {
              isBlinking = true;
              blinkSpeed = rule.blinkSpeed || 'medium';
            }
          } else if (rule.type === 'color_shift') {
            if (rule.state2Fill) effectiveFill = rule.state2Fill;
            if (rule.state2Stroke) effectiveStroke = rule.state2Stroke;
          } else if (rule.type === 'opacity_fade') {
            if (rule.state2Opacity !== undefined) effectiveOpacity = rule.state2Opacity;
          }
        }
      } else {
        // ─── ANALOG / THRESHOLD / RANGE / LEVEL FILL EVALUATION ─────
        let isMatch = false;
        if (rule.conditionType === 'always' || rule.type === 'level_fill') {
          isMatch = true;
        } else if (rule.conditionType === 'threshold' && !isNaN(num)) {
          const targetVal = parseFloat(String(rule.conditionValue ?? '0'));
          const op = rule.operator || '>';
          if (op === '>') isMatch = num > targetVal;
          else if (op === '>=') isMatch = num >= targetVal;
          else if (op === '<') isMatch = num < targetVal;
          else if (op === '<=') isMatch = num <= targetVal;
          else if (op === '==') isMatch = num === targetVal;
          else if (op === '!=') isMatch = num !== targetVal;
        } else if (rule.conditionType === 'range' && !isNaN(num)) {
          const minVal = rule.minTagValue ?? 0;
          const maxVal = rule.maxTagValue ?? 100;
          isMatch = num >= minVal && num <= maxVal;
        }

        // Apply dynamic actions when matching
        if (rule.type === 'level_fill') {
          const min = rule.fillMin !== undefined ? Number(rule.fillMin) : (rule.minTagValue !== undefined ? Number(rule.minTagValue) : 0);
          const max = rule.fillMax !== undefined ? Number(rule.fillMax) : (rule.maxTagValue !== undefined ? Number(rule.maxTagValue) : 100);
          const range = max - min || 1;
          const fillPct = !isNaN(num) ? Math.max(0, Math.min(100, ((num - min) / range) * 100)) : 0;
          const gradId = `subGrad_levelfill_${panel.panelId}_${partId}`;

          dynamicLevelGradients.set(gradId, {
            id: gradId,
            pct: fillPct,
            direction: rule.fillDirection || 'bottom_to_top',
            fillColor: rule.fillColor || '#10b981',
            emptyColor: defaultFill !== 'transparent' && defaultFill ? defaultFill : 'rgba(15, 23, 42, 0.4)'
          });
          effectiveFill = `url(#${gradId})`;
        } else if (isMatch) {
          if (rule.type === 'color_shift') {
            if (rule.targetFill) effectiveFill = rule.targetFill;
            if (rule.targetStroke) effectiveStroke = rule.targetStroke;
          } else if (rule.type === 'visibility_blink') {
            const act = rule.actionOnMatch || (rule.isBlinking ? 'blink' : rule.targetVisible === false ? 'hide' : 'show');
            if (act === 'hide') {
              return { style: { display: 'none' as const } };
            } else if (act === 'blink') {
              isBlinking = true;
              blinkSpeed = rule.blinkSpeed || 'medium';
            }
          } else if (rule.type === 'opacity_fade') {
            if (rule.targetOpacity !== undefined) {
              effectiveOpacity = rule.targetOpacity;
            }
          }
        } else {
          // Analog Else Condition (for Hide/Show visibility)
          if (rule.type === 'visibility_blink' && rule.actionOnElse === 'hide') {
            return { style: { display: 'none' as const } };
          }
        }
      }
    }

    const isSelected = activeSubPartId === partId;
    const stroke = isSelected ? '#38bdf8' : effectiveStroke;
    const strokeWidth = isSelected ? Math.max(2.5, effectiveStrokeWidth + 1.2) : effectiveStrokeWidth;
    const strokeDasharray = isSelected ? '4 3' : undefined;

    let animClass = '';
    if (isSelected) {
      animClass = 'animate-pulse';
    } else if (isBlinking) {
      animClass = blinkSpeed === 'fast' ? 'animate-ping' : 'animate-pulse';
    }

    return {
      fill: effectiveFill,
      stroke,
      strokeWidth,
      opacity: effectiveOpacity,
      strokeDasharray,
      style: {
        filter: isSelected ? 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.9))' : undefined,
        transition: 'all 0.3s ease'
      },
      className: animClass
    };
  };

  const renderDynamicGradientsDefs = () => {
    if (dynamicLevelGradients.size === 0) return null;
    return (
      <defs>
        {Array.from(dynamicLevelGradients.values()).map(g => {
          const isBtoT = g.direction === 'bottom_to_top';
          const isTtoB = g.direction === 'top_to_bottom';
          const isLtoR = g.direction === 'left_to_right';
          const isRtoL = g.direction === 'right_to_left';

          return (
            <linearGradient
              key={g.id}
              id={g.id}
              x1={isRtoL ? '100%' : '0%'}
              y1={isBtoT ? '100%' : '0%'}
              x2={isLtoR ? '100%' : isRtoL ? '0%' : '0%'}
              y2={isTtoB ? '100%' : isBtoT ? '0%' : '0%'}
            >
              <stop offset="0%" stopColor={g.fillColor} />
              <stop offset={`${g.pct}%`} stopColor={g.fillColor} />
              <stop offset={`${g.pct}%`} stopColor={g.emptyColor} />
              <stop offset="100%" stopColor={g.emptyColor} />
            </linearGradient>
          );
        })}
      </defs>
    );
  };

  const wrapSvg = (svgElement: React.ReactElement) => {
    const defs = renderDynamicGradientsDefs();
    if (!defs) return svgElement;
    
    return React.cloneElement(
      svgElement,
      {},
      defs,
      svgElement.props.children
    );
  };

  const id = symbolId || panel.symbolId || 'tank_vertical';


  // Centrifugal Volute Water/Industrial Pump
  if (id === 'pump_centrifugal' || id === 'pump_water' || id.includes('pump_centrifugal')) {
    const baseStyle = resolvePartStyle('base_plate', '#1e293b', '#0f172a', 1.5);
    const flangeStyle = resolvePartStyle('flange_top', '#cbd5e1', '#0f172a', 1);
    const casingStyle = resolvePartStyle('casing', '#334155', isSymbolAnimated ? (panel.iconColorOn || '#10b981') : '#0f172a', 2.5);
    const shaftStyle = resolvePartStyle('shaft_guard', '#f59e0b', '#0f172a', 1);
    const impellerStyle = resolvePartStyle('impeller', statusColor, '#f8fafc', 1);
    const ledStyle = resolvePartStyle('status_led', statusColor, '#0f172a', 1);

    return wrapSvg(
      <svg className={className} viewBox="0 0 150 140" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`voluteGrad_${panel.panelId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155"/>
            <stop offset="50%" stopColor="#475569"/>
            <stop offset="100%" stopColor="#0f172a"/>
          </linearGradient>
        </defs>

        {/* Heavy Base Plate Stand */}
        <g data-part-id="base_plate" {...baseStyle}>
          <rect x="15" y="115" width="130" height="15" rx="3" fill={baseStyle.fill} stroke={baseStyle.stroke} strokeWidth={baseStyle.strokeWidth} strokeDasharray={baseStyle.strokeDasharray} style={baseStyle.style} />
          <rect x="25" y="110" width="110" height="6" fill="#475569"/>
        </g>

        {/* Top Discharge Nozzle Flange */}
        <g data-part-id="flange_top" {...flangeStyle}>
          <rect x="45" y="8" width="22" height="30" fill="#334155" stroke="#0f172a" strokeWidth="1.2"/>
          <rect x="38" y="5" width="36" height="6" rx="1.5" fill={flangeStyle.fill} stroke={flangeStyle.stroke} strokeWidth={flangeStyle.strokeWidth} strokeDasharray={flangeStyle.strokeDasharray} style={flangeStyle.style} />
        </g>

        {/* Main Volute Spiral Snail Pump Casing */}
        <path 
          data-part-id="casing"
          d="M 56 30 C 95 30, 115 50, 115 80 C 115 110, 88 115, 56 115 C 28 115, 6 92, 6 64 C 6 36, 28 30, 56 30 Z" 
          fill={casingStyle.fill !== '#334155' ? casingStyle.fill : `url(#voluteGrad_${panel.panelId})`} 
          stroke={casingStyle.stroke} 
          strokeWidth={casingStyle.strokeWidth}
          strokeDasharray={casingStyle.strokeDasharray}
          style={casingStyle.style}
          className={casingStyle.className}
        />

        {/* Shaft Coupling Guard (Right Side) */}
        <g data-part-id="shaft_guard" {...shaftStyle}>
          <rect x="110" y="60" width="20" height="28" fill={shaftStyle.fill} stroke={shaftStyle.stroke} strokeWidth={shaftStyle.strokeWidth} strokeDasharray={shaftStyle.strokeDasharray} style={shaftStyle.style}/>
          <line x1="115" y1="60" x2="115" y2="88" stroke="#0f172a" strokeWidth="1"/>
          <line x1="120" y1="60" x2="120" y2="88" stroke="#0f172a" strokeWidth="1"/>
        </g>

        {/* Suction Inlet Center Ring */}
        <circle cx="56" cy="72" r="30" fill="#0f172a" stroke="#64748b" strokeWidth="2"/>
        <circle cx="56" cy="72" r="25" fill="#1e293b" />

        {/* Internal Curved Multi-Blade Rotating Impeller (Locked precisely at 56px, 72px) */}
        <g 
          data-part-id="impeller"
          className={isSymbolAnimated ? `animate-icon-spin ${symbolSpeedClass}` : ''} 
          style={{ transformOrigin: '56px 72px', ...impellerStyle.style }}
        >
          <circle cx="56" cy="72" r="6" fill={impellerStyle.fill} stroke={impellerStyle.stroke} strokeWidth={impellerStyle.strokeWidth}/>
          
          {/* Curved Impeller Vane Blades drawn centered on (56, 72) */}
          <path d="M 56 66 C 64 54, 76 60, 74 70 C 66 66, 60 68, 56 66 Z" fill={impellerStyle.fill} opacity="0.95"/>
          <path d="M 63 72 C 74 80, 68 92, 58 90 C 62 82, 60 76, 63 72 Z" fill={impellerStyle.fill} opacity="0.95"/>
          <path d="M 56 78 C 48 90, 36 84, 38 74 C 46 78, 52 76, 56 78 Z" fill={impellerStyle.fill} opacity="0.95"/>
          <path d="M 49 72 C 38 64, 44 52, 54 54 C 50 62, 52 68, 49 72 Z" fill={impellerStyle.fill} opacity="0.95"/>
        </g>

        {/* Status Indicator LED Light */}
        <g data-part-id="status_led">
          <circle cx="56" cy="72" r="4" fill="#0f172a"/>
          <circle cx="56" cy="72" r="2.5" fill={ledStyle.fill} className={isSymbolAnimated ? 'animate-pulse' : ''} style={ledStyle.style}/>
        </g>
      </svg>
    );
  }

  // Render SVG based on symbol type
  if (id === 'valve_control') {
    const domeStyle = resolvePartStyle('actuator_dome', currentLevelColor, '#0f172a', 1.5);
    const stemStyle = resolvePartStyle('stem_shaft', '#cbd5e1', '#1e293b', 0.8);
    const bodyStyle = resolvePartStyle('valve_body', '#334155', '#0f172a', 1.5);
    const dialStyle = resolvePartStyle('positioner_dial', '#0f172a', '#38bdf8', 1);
    const discStyle = resolvePartStyle('internal_disc', currentLevelColor, currentLevelColor, 1.5);

    return wrapSvg(
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
        <g data-part-id="actuator_dome" {...domeStyle}>
          <path d="M 25 25 C 25 10, 75 10, 75 25 Z" fill={domeStyle.fill} stroke={domeStyle.stroke} strokeWidth={domeStyle.strokeWidth} strokeDasharray={domeStyle.strokeDasharray} style={domeStyle.style}/>
          <rect x="20" y="25" width="60" height="8" rx="2" fill="#0284c7" stroke="#0f172a" strokeWidth="1.5"/>
        </g>
        
        {/* Dynamic Stem Shaft */}
        <g data-part-id="stem_shaft" {...stemStyle}>
          <rect x="47" y={stemY} width="6" height={85 - stemY} fill={stemStyle.fill} stroke={stemStyle.stroke} strokeWidth={stemStyle.strokeWidth} strokeDasharray={stemStyle.strokeDasharray} style={stemStyle.style} className="transition-all duration-700 ease-out"/>
          <circle cx="50" cy={stemY + 8} r="3.5" fill={currentLevelColor} stroke="#f8fafc" strokeWidth="1" className="transition-all duration-700 ease-out"/>
        </g>
        
        {/* Position Readout Dial */}
        <g data-part-id="positioner_dial" {...dialStyle}>
          <rect x="62" y="38" width="26" height="14" rx="2" fill={dialStyle.fill} stroke={dialStyle.stroke} strokeWidth={dialStyle.strokeWidth} strokeDasharray={dialStyle.strokeDasharray} style={dialStyle.style}/>
          <text x="75" y="48" fontSize="8" fill="#10b981" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            {Math.round(pct)}%
          </text>
        </g>

        {/* Valve Body Flanges & Triangles */}
        <g data-part-id="valve_body" {...bodyStyle}>
          <rect x="10" y="70" width="8" height="30" rx="1.5" fill="#475569" stroke="#0f172a" strokeWidth="1.2"/>
          <rect x="82" y="70" width="8" height="30" rx="1.5" fill="#475569" stroke="#0f172a" strokeWidth="1.2"/>
          <polygon points="18,70 50,85 18,100" fill={bodyStyle.fill !== '#334155' ? bodyStyle.fill : `url(#bodyGrad_${panel.panelId})`} stroke={bodyStyle.stroke} strokeWidth={bodyStyle.strokeWidth} strokeDasharray={bodyStyle.strokeDasharray} style={bodyStyle.style}/>
          <polygon points="82,70 50,85 82,100" fill={bodyStyle.fill !== '#334155' ? bodyStyle.fill : `url(#bodyGrad_${panel.panelId})`} stroke={bodyStyle.stroke} strokeWidth={bodyStyle.strokeWidth} strokeDasharray={bodyStyle.strokeDasharray} style={bodyStyle.style}/>
        </g>
        
        {/* Rotating Internal Valve Disc */}
        <g data-part-id="internal_disc" {...discStyle}>
          <circle cx="50" cy="85" r="8" fill="#0f172a" stroke={discStyle.stroke} strokeWidth={discStyle.strokeWidth} strokeDasharray={discStyle.strokeDasharray} style={discStyle.style} className="transition-colors duration-700"/>
          <line x1="50" y1="77" x2="50" y2="93" stroke={discStyle.fill} strokeWidth="2.5" transform={`rotate(${valveAngle} 50 85)`} className="transition-all duration-700 ease-out"/>
        </g>
      </svg>
    );
  }

  if (id === 'valve_solenoid' || id === 'valve_butterfly' || id === 'valve_ball') {
    const coilStyle = resolvePartStyle('solenoid_coil', '#1e293b', '#0f172a', 1.5);
    const ledStyle = resolvePartStyle('status_indicator', statusColor, '#0f172a', 1);
    const bodyStyle = resolvePartStyle('valve_body', isOn ? '#10b981' : '#ef4444', '#0f172a', 1.5);

    return wrapSvg(
      <svg className={className} viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        {/* Solenoid Neck Collar */}
        <rect x="44" y="42" width="12" height="35" fill="#475569" stroke="#0f172a" strokeWidth="1.2"/>

        {/* Solenoid Coil Housing */}
        <g data-part-id="solenoid_coil" {...coilStyle}>
          <rect x="35" y="10" width="30" height="35" rx="3" fill={coilStyle.fill} stroke={coilStyle.stroke} strokeWidth={coilStyle.strokeWidth} strokeDasharray={coilStyle.strokeDasharray} style={coilStyle.style}/>
        </g>

        <g data-part-id="status_indicator">
          <circle cx="50" cy="22" r="6" fill={ledStyle.fill} className={isOn ? 'animate-pulse' : ''} style={ledStyle.style}/>
          <text x="50" y="38" fontSize="8" fill="#f8fafc" fontWeight="bold" textAnchor="middle">{isOn ? 'OPEN' : 'CLOSED'}</text>
        </g>
        
        {/* Valve Body */}
        <g data-part-id="valve_body" {...bodyStyle}>
          <polygon points="15,70 50,85 15,100" fill={bodyStyle.fill} opacity={isOn ? 0.9 : 0.6} stroke={bodyStyle.stroke} strokeWidth={bodyStyle.strokeWidth} strokeDasharray={bodyStyle.strokeDasharray} style={bodyStyle.style} className="transition-all duration-700"/>
          <polygon points="85,70 50,85 85,100" fill={bodyStyle.fill} opacity={isOn ? 0.9 : 0.6} stroke={bodyStyle.stroke} strokeWidth={bodyStyle.strokeWidth} strokeDasharray={bodyStyle.strokeDasharray} style={bodyStyle.style} className="transition-all duration-700"/>
          <rect x="10" y="70" width="7" height="30" rx="1" fill="#475569"/>
          <rect x="83" y="70" width="7" height="30" rx="1" fill="#475569"/>
          <circle cx="50" cy="85" r="6" fill="#0f172a" stroke={statusColor} strokeWidth="2" className="transition-colors duration-700"/>
        </g>
      </svg>
    );
  }

  if (id === 'tank_vertical' || id === 'tank_conical' || id === 'silo_grain') {
    const liquidY = 145 - (pct / 100) * 110;
    const liquidH = (pct / 100) * 110;

    const legsStyle = resolvePartStyle('legs', '#475569', '#0f172a', 1);
    const capStyle = resolvePartStyle('cap', '#334155', '#0f172a', 1.5);
    const bodyStyle = resolvePartStyle('body', '#1e293b', '#0f172a', 1.5);
    const liquidStyle = resolvePartStyle('liquid_level', currentLevelColor, currentLevelColor, 1);
    const sightStyle = resolvePartStyle('sight_glass', currentLevelColor, '#64748b', 1.2);

    return wrapSvg(
      <svg className={className} viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg">
        {/* Support Legs */}
        <g data-part-id="legs" {...legsStyle}>
          <rect x="22" y="136" width="9" height="38" fill={legsStyle.fill} stroke={legsStyle.stroke} strokeWidth={legsStyle.strokeWidth} strokeDasharray={legsStyle.strokeDasharray} style={legsStyle.style}/>
          <rect x="89" y="136" width="9" height="38" fill={legsStyle.fill} stroke={legsStyle.stroke} strokeWidth={legsStyle.strokeWidth} strokeDasharray={legsStyle.strokeDasharray} style={legsStyle.style}/>
        </g>

        {/* Top Dish Head Cap */}
        <path 
          data-part-id="cap"
          d="M 15 35 Q 60 10, 105 35 Z" 
          fill={capStyle.fill} 
          stroke={capStyle.stroke} 
          strokeWidth={capStyle.strokeWidth} 
          strokeDasharray={capStyle.strokeDasharray}
          style={capStyle.style}
        />

        {/* Main Tank Cylinder */}
        <rect 
          data-part-id="body"
          x="15" 
          y="35" 
          width="90" 
          height="110" 
          fill={bodyStyle.fill} 
          stroke={bodyStyle.stroke} 
          strokeWidth={bodyStyle.strokeWidth} 
          strokeDasharray={bodyStyle.strokeDasharray}
          style={bodyStyle.style}
        />
        
        {/* Dynamic Fluid Level Fill inside Tank with Smooth Transition */}
        <rect 
          data-part-id="liquid_level"
          x="17" 
          y={liquidY} 
          width="86" 
          height={liquidH} 
          fill={liquidStyle.fill} 
          opacity={liquidStyle.opacity !== 1 ? liquidStyle.opacity : 0.45} 
          stroke={liquidStyle.strokeDasharray ? liquidStyle.stroke : undefined}
          strokeWidth={liquidStyle.strokeDasharray ? liquidStyle.strokeWidth : undefined}
          strokeDasharray={liquidStyle.strokeDasharray}
          style={liquidStyle.style}
          className="transition-all duration-700 ease-out"
        />

        {/* Sleek Liquid Surface Meniscus Line (100% clipped inside tank shell) */}
        {pct > 0 && (
          <line
            x1="17"
            y1={liquidY}
            x2="103"
            y2={liquidY}
            stroke={liquidStyle.fill}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.95"
            className="transition-all duration-700 ease-out"
          />
        )}
        
        {/* Bottom Dish Head Cap */}
        <path d="M 15 145 Q 60 170, 105 145 Z" fill="#334155" stroke="#0f172a" strokeWidth="1.5"/>
        
        {/* Glass Sight Gauge Level Indicator Bar */}
        <g data-part-id="sight_glass" {...sightStyle}>
          <rect x="98" y="45" width="7" height="90" rx="3.5" fill="#0f172a" stroke={sightStyle.stroke} strokeWidth={sightStyle.strokeWidth} strokeDasharray={sightStyle.strokeDasharray} style={sightStyle.style}/>
          <rect 
            x="99.5" 
            y={133 - (pct / 100) * 84} 
            width="4" 
            height={(pct / 100) * 84} 
            rx="2" 
            fill={sightStyle.fill} 
            className={`transition-all duration-700 ease-out ${isAlarmActive ? 'animate-pulse' : ''}`}
          />
        </g>
        
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
    const legsStyle = resolvePartStyle('legs', '#334155', '#0f172a', 1);
    const bodyStyle = resolvePartStyle('body', '#1e293b', '#0f172a', 1.5);
    const liquidStyle = resolvePartStyle('liquid_level', currentLevelColor, currentLevelColor, 1);
    const sightStyle = resolvePartStyle('sight_glass', currentLevelColor, '#0f172a', 1.2);

    return wrapSvg(
      <svg className={className} viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg">
        {/* Saddle Legs */}
        <g data-part-id="legs" {...legsStyle}>
          <path d="M 40 55 L 34 105 L 56 105 L 50 55 Z" fill={legsStyle.fill} stroke={legsStyle.stroke} strokeWidth={legsStyle.strokeWidth} strokeDasharray={legsStyle.strokeDasharray} style={legsStyle.style}/>
          <path d="M 140 55 L 134 105 L 156 105 L 150 55 Z" fill={legsStyle.fill} stroke={legsStyle.stroke} strokeWidth={legsStyle.strokeWidth} strokeDasharray={legsStyle.strokeDasharray} style={legsStyle.style}/>
        </g>
        
        {/* Shell & Liquid Fill with Smooth Transition */}
        <rect 
          data-part-id="body"
          x="35" 
          y="30" 
          width="110" 
          height="55" 
          fill={bodyStyle.fill} 
          stroke={bodyStyle.stroke} 
          strokeWidth={bodyStyle.strokeWidth} 
          strokeDasharray={bodyStyle.strokeDasharray}
          style={bodyStyle.style}
        />
        <rect 
          data-part-id="liquid_level"
          x="37" 
          y="32" 
          width={liquidW} 
          height="51" 
          fill={liquidStyle.fill} 
          opacity={liquidStyle.opacity !== 1 ? liquidStyle.opacity : 0.4} 
          stroke={liquidStyle.strokeDasharray ? liquidStyle.stroke : undefined}
          strokeWidth={liquidStyle.strokeDasharray ? liquidStyle.strokeWidth : undefined}
          strokeDasharray={liquidStyle.strokeDasharray}
          style={liquidStyle.style}
          className="transition-all duration-700 ease-out"
        />

        {/* Sleek Liquid Surface Line (100% clipped inside tank shell) */}
        {pct > 0 && (
          <line
            x1={37 + liquidW}
            y1="32"
            x2={37 + liquidW}
            y2="83"
            stroke={liquidStyle.fill}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.95"
            className="transition-all duration-700 ease-out"
          />
        )}
        
        <path d="M 35 30 C 15 30, 15 85, 35 85 Z" fill="#334155" stroke="#0f172a" strokeWidth="1.5"/>
        <path d="M 145 30 C 165 30, 165 85, 145 85 Z" fill="#334155" stroke="#0f172a" strokeWidth="1.5"/>
        
        {/* Digital Level Strip Bar */}
        <g data-part-id="sight_glass" {...sightStyle}>
          <rect x="45" y="52" width="90" height="12" rx="4" fill="#0f172a" stroke={sightStyle.stroke} strokeWidth={sightStyle.strokeWidth} strokeDasharray={sightStyle.strokeDasharray} style={sightStyle.style} className="transition-colors duration-700"/>
          <rect 
            x="47" 
            y="54" 
            width={(pct / 100) * 86} 
            height="8" 
            rx="2" 
            fill={sightStyle.fill} 
            className={`transition-all duration-700 ease-out ${isAlarmActive ? 'animate-pulse' : ''}`}
          />
          <text x="90" y="62" fontSize="8" fill="#f8fafc" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            {Math.round(pct)}%
          </text>
        </g>
      </svg>
    );
  }

  if (id.startsWith('agitator_') || id.includes('mixer')) {
    const motorStyle = resolvePartStyle('drive_motor', '#0284c7', '#0f172a', 1.5);
    const flangeStyle = resolvePartStyle('flange_mount', '#cbd5e1', '#0f172a', 1.5);
    const shaftStyle = resolvePartStyle('mixer_shaft', '#e2e8f0', '#0f172a', 1);
    const bladeStyle = resolvePartStyle('impeller_blades', statusColor, '#cbd5e1', 1);

    return wrapSvg(
      <svg className={className} viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg">
        {/* Motor Drive on Top */}
        <g data-part-id="drive_motor" {...motorStyle}>
          <rect x="42" y="10" width="36" height="30" rx="3" fill={motorStyle.fill} stroke={motorStyle.stroke} strokeWidth={motorStyle.strokeWidth} strokeDasharray={motorStyle.strokeDasharray} style={motorStyle.style}/>
          <rect x="48" y="40" width="24" height="18" fill="#475569" stroke="#0f172a" strokeWidth="1"/>
        </g>

        {/* Mounting Flange Plate */}
        <rect data-part-id="flange_mount" x="30" y="58" width="60" height="8" rx="2" fill={flangeStyle.fill} stroke={flangeStyle.stroke} strokeWidth={flangeStyle.strokeWidth} strokeDasharray={flangeStyle.strokeDasharray} style={flangeStyle.style}/>
        
        {/* Long Central Mixer Shaft */}
        <rect data-part-id="mixer_shaft" x="57" y="66" width="6" height="105" fill={shaftStyle.fill} stroke={shaftStyle.stroke} strokeWidth={shaftStyle.strokeWidth} strokeDasharray={shaftStyle.strokeDasharray} style={shaftStyle.style}/>
        
        {/* Rotating Impeller Blades Centered on (60px, 162px) */}
        <g 
          data-part-id="impeller_blades"
          className={isSymbolAnimated ? `animate-icon-spin ${symbolSpeedClass}` : ''} 
          style={{ transformOrigin: '60px 162px', ...bladeStyle.style }}
        >
          <path d="M 60 144 L 66 158 L 60 162 L 54 158 Z" fill={bladeStyle.fill}/>
          <path d="M 78 162 L 64 168 L 60 162 L 64 156 Z" fill={bladeStyle.fill}/>
          <path d="M 60 180 L 54 166 L 60 162 L 66 166 Z" fill={bladeStyle.fill}/>
          <path d="M 42 162 L 56 156 L 60 162 L 56 168 Z" fill={bladeStyle.fill}/>
          <circle cx="60" cy="162" r="5" fill="#0f172a" stroke={bladeStyle.stroke} strokeWidth={bladeStyle.strokeWidth}/>
        </g>
      </svg>
    );
  }

  if (id.startsWith('motor_') || id.startsWith('pump_')) {
    const feetStyle = resolvePartStyle('base_feet', '#334155', '#0f172a', 1.2);
    const housingStyle = resolvePartStyle('stator_housing', isOn ? '#0284c7' : '#334155', '#0f172a', 1.5);
    const boxStyle = resolvePartStyle('terminal_box', '#1e293b', '#38bdf8', 1.2);
    const fanStyle = resolvePartStyle('cooling_fan', statusColor, statusColor, 1.5);

    return wrapSvg(
      <svg className={className} viewBox="0 0 150 120" xmlns="http://www.w3.org/2000/svg">
        {/* Mounting Feet */}
        <g data-part-id="base_feet" {...feetStyle}>
          <rect x="25" y="78" width="20" height="26" rx="2" fill={feetStyle.fill} stroke={feetStyle.stroke} strokeWidth={feetStyle.strokeWidth} strokeDasharray={feetStyle.strokeDasharray} style={feetStyle.style}/>
          <rect x="85" y="78" width="20" height="26" rx="2" fill={feetStyle.fill} stroke={feetStyle.stroke} strokeWidth={feetStyle.strokeWidth} strokeDasharray={feetStyle.strokeDasharray} style={feetStyle.style}/>
        </g>
        
        {/* Motor Casing */}
        <rect 
          data-part-id="stator_housing"
          x="30" 
          y="30" 
          width="75" 
          height="62" 
          rx="6" 
          fill={housingStyle.fill} 
          stroke={housingStyle.stroke} 
          strokeWidth={housingStyle.strokeWidth}
          strokeDasharray={housingStyle.strokeDasharray}
          style={housingStyle.style}
        />
        
        {/* Shaft Coupling */}
        <rect x="98" y="54" width="18" height="14" fill="#64748b" stroke="#0f172a" strokeWidth="1"/>

        {/* Fins */}
        <line x1="42" y1="30" x2="42" y2="92" stroke="#0f172a" strokeWidth="1.5"/>
        <line x1="54" y1="30" x2="54" y2="92" stroke="#0f172a" strokeWidth="1.5"/>
        <line x1="66" y1="30" x2="66" y2="92" stroke="#0f172a" strokeWidth="1.5"/>
        <line x1="78" y1="30" x2="78" y2="92" stroke="#0f172a" strokeWidth="1.5"/>
        
        <rect data-part-id="terminal_box" x="50" y="14" width="35" height="16" rx="3" fill={boxStyle.fill} stroke={boxStyle.stroke} strokeWidth={boxStyle.strokeWidth} strokeDasharray={boxStyle.strokeDasharray} style={boxStyle.style}/>
        <circle cx="67" cy="22" r="4" fill={statusColor} className={isSymbolAnimated ? 'animate-pulse' : ''}/>
        
        {/* Rotating Impeller / Fan Icon Centered on (115px, 61px) */}
        <g data-part-id="cooling_fan" style={fanStyle.style}>
          <circle cx="115" cy="61" r="14" fill="#0f172a" stroke={fanStyle.stroke} strokeWidth={fanStyle.strokeWidth} strokeDasharray={fanStyle.strokeDasharray}/>
          <g 
            className={isSymbolAnimated ? `animate-icon-spin ${symbolSpeedClass}` : ''} 
            style={{ transformOrigin: '115px 61px' }}
          >
            <path d="M 115 51 L 119 59 L 115 61 L 111 59 Z" fill={fanStyle.fill}/>
            <path d="M 125 61 L 117 65 L 115 61 L 117 57 Z" fill={fanStyle.fill}/>
            <path d="M 115 71 L 111 63 L 115 61 L 119 63 Z" fill={fanStyle.fill}/>
            <path d="M 105 61 L 113 57 L 115 61 L 113 65 Z" fill={fanStyle.fill}/>
          </g>
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
