/**
 * TASC IIoT Studio — Mitsubishi MELSEC / SLMP (MC Protocol) Address Parser
 *
 * Supports MC Protocol 3E / 1E Frame Device Register Syntaxes:
 *  - Data Registers: D100 (Decimal Word)
 *  - Link Registers: W0, W100, W1A0 (Hexadecimal Word)
 *  - File / Extension Registers: R100, ZR1000 (Decimal Word)
 *  - Internal Relays: M0, M100, M1024 (Decimal Bit)
 *  - Inputs & Outputs: X0, X10, X1F (Hex Bit), Y0, Y10, Y1A (Hex Bit)
 *  - Special Relays & Registers: SM400, SD0, SD200
 *  - Timers & Counters: TN0, CN0
 */

import { DriverTagDataType } from '../../types';

export interface ParsedMelsecAddress {
  valid: boolean;
  deviceType: 'D' | 'W' | 'M' | 'X' | 'Y' | 'R' | 'ZR' | 'SD' | 'SM' | 'TN' | 'CN';
  deviceCode: number; // MC Protocol 3E Binary Device Code (e.g. 0xA8 for D, 0x90 for M)
  isBitDevice: boolean;
  headDeviceNumber: number; // Integer offset (parsed from Decimal or Hex according to device type)
  suggestedDataType: DriverTagDataType;
  formattedAddress: string;
  error?: string;
}

export function parseMelsecAddress(rawAddress: string, defaultDataType: DriverTagDataType = 'float'): ParsedMelsecAddress {
  if (!rawAddress || !rawAddress.trim()) {
    return {
      valid: false,
      deviceType: 'D',
      deviceCode: 0xA8,
      isBitDevice: false,
      headDeviceNumber: 0,
      suggestedDataType: defaultDataType,
      formattedAddress: '',
      error: 'Address string is empty'
    };
  }

  const clean = rawAddress.trim().toUpperCase().replace(/\s+/g, '');

  // 1. Special Relays & Registers: SM400, SD200
  const smMatch = clean.match(/^SM(\d+)$/i);
  if (smMatch) {
    const num = parseInt(smMatch[1], 10);
    return {
      valid: true,
      deviceType: 'SM',
      deviceCode: 0x91,
      isBitDevice: true,
      headDeviceNumber: num,
      suggestedDataType: 'boolean',
      formattedAddress: `SM${num}`
    };
  }

  const sdMatch = clean.match(/^SD(\d+)$/i);
  if (sdMatch) {
    const num = parseInt(sdMatch[1], 10);
    return {
      valid: true,
      deviceType: 'SD',
      deviceCode: 0xA2,
      isBitDevice: false,
      headDeviceNumber: num,
      suggestedDataType: 'uint16',
      formattedAddress: `SD${num}`
    };
  }

  // 2. Timers & Counters: TN0, CN0
  const tnMatch = clean.match(/^TN(\d+)$/i);
  if (tnMatch) {
    const num = parseInt(tnMatch[1], 10);
    return {
      valid: true,
      deviceType: 'TN',
      deviceCode: 0xC2,
      isBitDevice: false,
      headDeviceNumber: num,
      suggestedDataType: 'uint16',
      formattedAddress: `TN${num}`
    };
  }

  const cnMatch = clean.match(/^CN(\d+)$/i);
  if (cnMatch) {
    const num = parseInt(cnMatch[1], 10);
    return {
      valid: true,
      deviceType: 'CN',
      deviceCode: 0xC5,
      isBitDevice: false,
      headDeviceNumber: num,
      suggestedDataType: 'uint16',
      formattedAddress: `CN${num}`
    };
  }

  // 3. Hexadecimal Bit Devices: X (Inputs), Y (Outputs), B (Link Relays)
  const bMatch = clean.match(/^B([0-9A-F]+)$/i);
  if (bMatch) {
    const num = parseInt(bMatch[1], 16);
    return {
      valid: true,
      deviceType: 'B' as any,
      deviceCode: 0xA0,
      isBitDevice: true,
      headDeviceNumber: num,
      suggestedDataType: 'boolean',
      formattedAddress: `B${bMatch[1].toUpperCase()}`
    };
  }

  const xMatch = clean.match(/^X([0-9A-F]+)$/i);
  if (xMatch) {
    const num = parseInt(xMatch[1], 16);
    return {
      valid: true,
      deviceType: 'X',
      deviceCode: 0x9C,
      isBitDevice: true,
      headDeviceNumber: num,
      suggestedDataType: 'boolean',
      formattedAddress: `X${xMatch[1].toUpperCase()}`
    };
  }

  const yMatch = clean.match(/^Y([0-9A-F]+)$/i);
  if (yMatch) {
    const num = parseInt(yMatch[1], 16);
    return {
      valid: true,
      deviceType: 'Y',
      deviceCode: 0x9D,
      isBitDevice: true,
      headDeviceNumber: num,
      suggestedDataType: 'boolean',
      formattedAddress: `Y${yMatch[1].toUpperCase()}`
    };
  }

  // 4. Hexadecimal Word Devices: W (Link Registers)
  const wMatch = clean.match(/^W([0-9A-F]+)$/i);
  if (wMatch) {
    const num = parseInt(wMatch[1], 16);
    return {
      valid: true,
      deviceType: 'W',
      deviceCode: 0xB4,
      isBitDevice: false,
      headDeviceNumber: num,
      suggestedDataType: 'int16',
      formattedAddress: `W${wMatch[1].toUpperCase()}`
    };
  }

  // 5. Decimal Bit Devices: M (Internal Relays)
  const mMatch = clean.match(/^M(\d+)$/i);
  if (mMatch) {
    const num = parseInt(mMatch[1], 10);
    return {
      valid: true,
      deviceType: 'M',
      deviceCode: 0x90,
      isBitDevice: true,
      headDeviceNumber: num,
      suggestedDataType: 'boolean',
      formattedAddress: `M${num}`
    };
  }

  // 6. Decimal Word Devices & Bit-in-Word: D (Data Registers), R (File Registers), ZR (Extension Registers)
  const dBitMatch = clean.match(/^D(\d+)\.([0-9A-F]+)$/i);
  if (dBitMatch) {
    const num = parseInt(dBitMatch[1], 10);
    const bitIndex = parseInt(dBitMatch[2], 16);
    return {
      valid: true,
      deviceType: 'D',
      deviceCode: 0xA8,
      isBitDevice: true,
      headDeviceNumber: num,
      suggestedDataType: 'boolean',
      formattedAddress: `D${num}.${dBitMatch[2].toUpperCase()}`
    };
  }

  const dMatch = clean.match(/^D(\d+)$/i);
  if (dMatch) {
    const num = parseInt(dMatch[1], 10);
    return {
      valid: true,
      deviceType: 'D',
      deviceCode: 0xA8,
      isBitDevice: false,
      headDeviceNumber: num,
      suggestedDataType: defaultDataType || 'float',
      formattedAddress: `D${num}`
    };
  }

  const rMatch = clean.match(/^R(\d+)$/i);
  if (rMatch) {
    const num = parseInt(rMatch[1], 10);
    return {
      valid: true,
      deviceType: 'R',
      deviceCode: 0xAF,
      isBitDevice: false,
      headDeviceNumber: num,
      suggestedDataType: 'int16',
      formattedAddress: `R${num}`
    };
  }

  const zrMatch = clean.match(/^ZR(\d+)$/i);
  if (zrMatch) {
    const num = parseInt(zrMatch[1], 10);
    return {
      valid: true,
      deviceType: 'ZR',
      deviceCode: 0xB0,
      isBitDevice: false,
      headDeviceNumber: num,
      suggestedDataType: defaultDataType || 'float',
      formattedAddress: `ZR${num}`
    };
  }

  return {
    valid: false,
    deviceType: 'D',
    deviceCode: 0xA8,
    isBitDevice: false,
    headDeviceNumber: 0,
    suggestedDataType: defaultDataType,
    formattedAddress: clean,
    error: `Unrecognized MELSEC address format: "${rawAddress}". Examples: D100, M100, X0, Y0, W100, ZR1000`
  };
}
