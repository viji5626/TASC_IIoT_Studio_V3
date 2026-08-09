import React from 'react';

export interface IconItem {
  name: string;
  label: string;
  category: 'Industrial' | 'Audio/Alarm' | 'Lighting' | 'Fluid/Plumbing' | 'Thermal/HVAC' | 'Electrical' | 'Network' | 'Safety' | 'Hardware';
  animType: 'rotate' | 'soundwave' | 'strobe' | 'drip' | 'flame' | 'spark' | 'wifi' | 'alert' | 'glow' | 'wind' | 'dual_gears';
}

export const ICON_LIBRARY: IconItem[] = [
  // Industrial Machinery, Fans, Pumps, Motors
  { name: 'fa-fan', label: 'Cooling Fan', category: 'Industrial', animType: 'rotate' },
  { name: 'fa-gear', label: 'Single Gear', category: 'Industrial', animType: 'rotate' },
  { name: 'fa-gears', label: 'Dual Gears (Self-Axis Rotation)', category: 'Industrial', animType: 'dual_gears' },
  { name: 'fa-spinner', label: 'Spinning Rotor', category: 'Industrial', animType: 'rotate' },
  { name: 'fa-atom', label: 'Turbine / Reactor', category: 'Industrial', animType: 'rotate' },
  { name: 'fa-wind', label: 'Blower / Air Flow Stream', category: 'Industrial', animType: 'wind' },
  { name: 'fa-arrows-rotate', label: 'Recirculator', category: 'Industrial', animType: 'rotate' },
  { name: 'fa-wrench', label: 'Actuator / Tool', category: 'Industrial', animType: 'rotate' },
  { name: 'fa-industry', label: 'Plant Factory', category: 'Industrial', animType: 'glow' },
  { name: 'fa-robot', label: 'Robotic Arm', category: 'Industrial', animType: 'rotate' },

  // Audio, Sirens, Speakers, Horns, Alarms
  { name: 'fa-volume-high', label: 'Speaker / Annunciator', category: 'Audio/Alarm', animType: 'soundwave' },
  { name: 'fa-volume-low', label: 'Low Audio Speaker', category: 'Audio/Alarm', animType: 'soundwave' },
  { name: 'fa-bullhorn', label: 'Megaphone / Horn', category: 'Audio/Alarm', animType: 'soundwave' },
  { name: 'fa-bell', label: 'Alarm Bell', category: 'Audio/Alarm', animType: 'soundwave' },
  { name: 'fa-triangle-exclamation', label: 'Warning Hazard', category: 'Audio/Alarm', animType: 'alert' },
  { name: 'fa-circle-exclamation', label: 'Alert Notice', category: 'Audio/Alarm', animType: 'alert' },

  // Tower Lamps, Beacons, Lightbulbs, Indicators
  { name: 'fa-tower-cell', label: 'Tower Lamp / Signal Column', category: 'Lighting', animType: 'strobe' },
  { name: 'fa-lightbulb', label: 'Status Lightbulb', category: 'Lighting', animType: 'strobe' },
  { name: 'fa-sun', label: 'High Intensity Beacon', category: 'Lighting', animType: 'strobe' },
  { name: 'fa-star', label: 'Indicator Star', category: 'Lighting', animType: 'strobe' },
  { name: 'fa-circle-dot', label: 'Status LED Dot', category: 'Lighting', animType: 'strobe' },
  { name: 'fa-eye', label: 'Optical Sensor', category: 'Lighting', animType: 'strobe' },

  // Fluid, Water Taps, Valves, Pipes, Showers
  { name: 'fa-faucet', label: 'Water Tap', category: 'Fluid/Plumbing', animType: 'drip' },
  { name: 'fa-faucet-drip', label: 'Dripping Faucet', category: 'Fluid/Plumbing', animType: 'drip' },
  { name: 'fa-droplet', label: 'Liquid Droplet', category: 'Fluid/Plumbing', animType: 'drip' },
  { name: 'fa-fill-drip', label: 'Fluid Dispenser', category: 'Fluid/Plumbing', animType: 'drip' },
  { name: 'fa-water', label: 'Liquid Flow Waves', category: 'Fluid/Plumbing', animType: 'wifi' },
  { name: 'fa-shower', label: 'Spray Nozzle', category: 'Fluid/Plumbing', animType: 'drip' },
  { name: 'fa-oil-can', label: 'Lube Oil Can', category: 'Fluid/Plumbing', animType: 'drip' },
  { name: 'fa-filter', label: 'Fluid Strainer Filter', category: 'Fluid/Plumbing', animType: 'glow' },

  // Thermal, Heat, Flames, Coolers, Boilers
  { name: 'fa-fire', label: 'Burner Flame', category: 'Thermal/HVAC', animType: 'flame' },
  { name: 'fa-temperature-high', label: 'High Temp Sensor', category: 'Thermal/HVAC', animType: 'flame' },
  { name: 'fa-temperature-low', label: 'Low Temp Chiller', category: 'Thermal/HVAC', animType: 'strobe' },
  { name: 'fa-snowflake', label: 'Chiller / Frost', category: 'Thermal/HVAC', animType: 'strobe' },
  { name: 'fa-flask', label: 'Chemical Reactor Flask', category: 'Thermal/HVAC', animType: 'flame' },
  { name: 'fa-vial', label: 'Dosing Vial', category: 'Thermal/HVAC', animType: 'drip' },

  // Electrical, Power, Lightning, Batteries
  { name: 'fa-bolt', label: 'High Voltage Spark', category: 'Electrical', animType: 'spark' },
  { name: 'fa-power-off', label: 'Main Power Switch', category: 'Electrical', animType: 'spark' },
  { name: 'fa-plug', label: 'Electrical Plug', category: 'Electrical', animType: 'spark' },
  { name: 'fa-plug-circle-bolt', label: 'Generator Charger', category: 'Electrical', animType: 'spark' },
  { name: 'fa-battery-full', label: 'Battery Storage', category: 'Electrical', animType: 'spark' },
  { name: 'fa-battery-half', label: 'Battery Backup', category: 'Electrical', animType: 'spark' },
  { name: 'fa-solar-panel', label: 'Solar Inverter', category: 'Electrical', animType: 'strobe' },
  { name: 'fa-microchip', label: 'PLC Processor Chip', category: 'Electrical', animType: 'spark' },

  // Network, Wireless, Sensors, Communication
  { name: 'fa-wifi', label: 'Wireless Antenna', category: 'Network', animType: 'wifi' },
  { name: 'fa-rss', label: 'Radio Frequency Transmitter', category: 'Network', animType: 'wifi' },
  { name: 'fa-network-wired', label: 'Ethernet Bus', category: 'Network', animType: 'wifi' },
  { name: 'fa-gauge-high', label: 'Pressure Transmitter', category: 'Network', animType: 'alert' },
  { name: 'fa-gauge', label: 'Standard Pressure Gauge', category: 'Network', animType: 'alert' },
  { name: 'fa-server', label: 'SCADA Server', category: 'Network', animType: 'wifi' },
  { name: 'fa-terminal', label: 'HMI Terminal', category: 'Network', animType: 'glow' },

  // Safety, Locks, Emergency
  { name: 'fa-shield-halved', label: 'Interlock Guard', category: 'Safety', animType: 'alert' },
  { name: 'fa-lock', label: 'Safety Locked', category: 'Safety', animType: 'glow' },
  { name: 'fa-unlock', label: 'Safety Released', category: 'Safety', animType: 'alert' },
  { name: 'fa-circle-check', label: 'System Normal', category: 'Safety', animType: 'glow' },
  { name: 'fa-circle-xmark', label: 'Trip Cutout', category: 'Safety', animType: 'alert' }
];

export function getSmartIconAnimationClass(iconName: string, isAnimateEnabled: boolean, isFlashEnabled: boolean): string {
  let classes = '';

  if (isFlashEnabled) {
    classes += ' animate-pulse-glow';
  }

  if (isAnimateEnabled) {
    const cleanName = iconName ? iconName.trim().replace(/^fa-s\s+/, '') : '';
    const item = ICON_LIBRARY.find(i => cleanName.includes(i.name.replace(/^fa-/, '')));

    const animType = item ? item.animType : (
      cleanName.includes('gears')
        ? 'dual_gears'
        : cleanName.includes('wind')
        ? 'wind'
        : cleanName.includes('fan') || cleanName.includes('gear') || cleanName.includes('spin') || cleanName.includes('rotor') || cleanName.includes('atom')
        ? 'rotate'
        : cleanName.includes('volume') || cleanName.includes('bullhorn') || cleanName.includes('bell') || cleanName.includes('speaker') || cleanName.includes('siren')
        ? 'soundwave'
        : cleanName.includes('faucet') || cleanName.includes('drop') || cleanName.includes('water') || cleanName.includes('shower') || cleanName.includes('oil')
        ? 'drip'
        : cleanName.includes('bulb') || cleanName.includes('lamp') || cleanName.includes('tower') || cleanName.includes('sun') || cleanName.includes('light')
        ? 'strobe'
        : cleanName.includes('fire') || cleanName.includes('flame') || cleanName.includes('heat') || cleanName.includes('temp') || cleanName.includes('flask')
        ? 'flame'
        : cleanName.includes('bolt') || cleanName.includes('power') || cleanName.includes('plug') || cleanName.includes('battery') || cleanName.includes('chip')
        ? 'spark'
        : cleanName.includes('wifi') || cleanName.includes('rss') || cleanName.includes('signal') || cleanName.includes('network')
        ? 'wifi'
        : 'rotate'
    );

    switch (animType) {
      case 'dual_gears':
        // Handled specially by SmartIcon component for dual-axis rotation
        break;
      case 'wind':
        classes += ' animate-icon-wind';
        break;
      case 'rotate':
        classes += ' animate-icon-spin';
        break;
      case 'soundwave':
        classes += ' animate-icon-soundwave';
        break;
      case 'strobe':
        classes += ' animate-icon-strobe';
        break;
      case 'drip':
        classes += ' animate-icon-drip';
        break;
      case 'flame':
        classes += ' animate-icon-flame';
        break;
      case 'spark':
        classes += ' animate-icon-spark';
        break;
      case 'wifi':
        classes += ' animate-icon-wifi';
        break;
      case 'alert':
        classes += ' animate-icon-alert';
        break;
      case 'glow':
        classes += ' animate-pulse-glow';
        break;
      default:
        classes += ' animate-icon-spin';
    }
  }

  return classes.trim();
}

export function getAnimationSpeedClass(speed?: 'slow' | 'medium' | 'fast' | string): string {
  if (speed === 'slow') return 'anim-speed-slow';
  if (speed === 'fast') return 'anim-speed-fast';
  return 'anim-speed-medium';
}

/**
 * Universal SmartIcon component that renders FontAwesome icons OR custom inline SVGs
 * for special cases like Dual Gears (rotating each gear on its own axis) and Wind Streams.
 */
export const SmartIcon: React.FC<{
  icon: string;
  isAnimate?: boolean;
  isFlash?: boolean;
  speed?: 'slow' | 'medium' | 'fast';
  className?: string;
}> = ({ icon, isAnimate = false, isFlash = false, speed = 'medium', className = '' }) => {
  const cleanName = (icon || 'fa-fan').trim().replace(/^fa-/, '');
  const animClasses = getSmartIconAnimationClass(cleanName, isAnimate, isFlash);
  const speedClass = isAnimate ? getAnimationSpeedClass(speed) : '';

  // Special Case 1: Dual Gears (rotate each gear on its own axis!)
  if (cleanName === 'gears' || cleanName === 'fa-gears') {
    return (
      <svg 
        viewBox="0 0 32 32" 
        className={`w-[1em] h-[1em] fill-current inline-block align-middle overflow-visible ${isFlash ? 'animate-pulse-glow' : ''} ${className}`}
      >
        {/* Left/Bottom Gear: Rotating Clockwise around its own axis (10, 20) */}
        <g 
          className={isAnimate ? `animate-icon-spin ${speedClass}` : ''} 
          style={{ transformOrigin: '10px 20px' }}
        >
          <path d="M 10 13 L 11.5 13 L 12 15 L 13.5 15.5 L 15 14.5 L 16 15.5 L 15 17 L 15.5 18.5 L 17 19 L 17 20.5 L 15.5 21 L 15 22.5 L 16 24 L 15 25 L 13.5 24 L 12 24.5 L 11.5 26.5 L 10 26.5 L 9.5 24.5 L 8 24 L 6.5 25 L 5.5 24 L 6.5 22.5 L 6 21 L 4.5 20.5 L 4.5 19 L 6 18.5 L 6.5 17 L 5.5 15.5 L 6.5 14.5 L 8 15.5 L 9.5 15 Z M 10 17 A 3 3 0 1 0 10 23 A 3 3 0 1 0 10 17" />
        </g>
        {/* Right/Top Gear: Rotating Counter-Clockwise around its own axis (21, 11) */}
        <g 
          className={isAnimate ? `animate-spin-reverse ${speedClass}` : ''} 
          style={{ transformOrigin: '21px 11px' }}
        >
          <path d="M 21 4 L 22.5 4 L 23 6.2 L 24.5 6.8 L 26 5.8 L 27 6.8 L 26 8.3 L 26.6 9.8 L 28.5 10.3 L 28.5 11.8 L 26.6 12.3 L 26 13.8 L 27 15.3 L 26 16.3 L 24.5 15.3 L 23 15.9 L 22.5 18.1 L 21 18.1 L 20.5 15.9 L 19 15.3 L 17.5 16.3 L 16.5 15.3 L 17.5 13.8 L 16.9 12.3 L 15 11.8 L 15 10.3 L 16.9 9.8 L 17.5 8.3 L 16.5 6.8 L 17.5 5.8 L 19 6.8 L 20.5 6.2 Z M 21 8.5 A 2.5 2.5 0 1 0 21 13.5 A 2.5 2.5 0 1 0 21 8.5" />
        </g>
      </svg>
    );
  }

  // Special Case 2: Centrifugal Volute Pump (Impeller spins on center shaft axis 16px 16px)
  if (cleanName === 'pump_centrifugal' || cleanName === 'pump-centrifugal' || cleanName === 'pump' || cleanName === 'fa-pump') {
    return (
      <svg 
        viewBox="0 0 32 32" 
        className={`w-[1em] h-[1em] fill-current inline-block align-middle overflow-visible ${isFlash ? 'animate-pulse-glow' : ''} ${className}`}
      >
        {/* Base Stand */}
        <path d="M 6 28 L 26 28 L 23 25 L 9 25 Z" />
        {/* Discharge Top Flange Nozzle */}
        <rect x="18" y="2" width="10" height="3" rx="0.5" />
        <rect x="19.5" y="5" width="7" height="6" />
        {/* Main Outer Snail Volute Casing */}
        <path d="M 16 7 C 22 7 26.5 11 26.5 17 C 26.5 23 21.5 25 16 25 C 10.5 25 5.5 20.5 5.5 15 C 5.5 9.5 11 7 16 7 Z" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="16" r="5.5" fill="none" stroke="currentColor" strokeWidth="1" />
        {/* Center Shaft Hub & Rotating Curved Blades Impeller Centered on (16px, 16px) */}
        <g 
          className={isAnimate ? `animate-icon-spin ${speedClass}` : ''} 
          style={{ transformOrigin: '16px 16px' }}
        >
          <circle cx="16" cy="16" r="2" />
          <path d="M 16 14 C 18 11.5, 20.5 12, 20.5 14 C 18.5 14.8, 17 15, 16 14 Z" />
          <path d="M 18 16 C 20.5 18, 20 20.5, 18 20.5 C 17.2 18.5, 17 17, 18 16 Z" />
          <path d="M 16 18 C 14 20.5, 11.5 20, 11.5 18 C 13.5 17.2, 15 17, 16 18 Z" />
          <path d="M 14 16 C 11.5 14, 12 11.5, 14 11.5 C 14.8 13.5, 15 15, 14 16 Z" />
        </g>
      </svg>
    );
  }

  // Standard FontAwesome Icon Rendering
  const iconClass = cleanName.startsWith('fa-') ? cleanName : `fa-${cleanName}`;
  return <i className={`fas ${iconClass} ${animClasses} ${speedClass} ${className}`}></i>;
};
