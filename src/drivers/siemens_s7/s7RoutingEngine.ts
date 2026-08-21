/**
 * TASC IIoT Studio — Siemens S7 Model-Specific Routing & Address Translation Engine
 *
 * Implements architectural routing for:
 *  1. SIMATIC S7-1200 / S7-1500 (Rack 0, Slot 1, PUT/GET Enabled)
 *  2. SIMATIC S7-300 / S7-400 (Rack 0, Slot 2)
 *  3. SIMATIC S7-200 / CP243-1 (Explicit Local & Remote TSAP handshake, V-Memory -> DB1 mapping)
 *  4. Siemens LOGO! 0BA7 / 0BA8 (Virtual DB1 Variable Memory translation layer)
 */

import { DriverTagDataType } from '../../types';
import { ParsedS7Address, parseS7Address } from './s7AddressParser';

export type S7CpuModel = 's7_1500' | 's7_1200' | 's7_300' | 's7_400' | 's7_200' | 'logo';

export interface S7ConnectionProfile {
  model: S7CpuModel;
  rack: number;
  slot: number;
  localTsap: number;   // 16-bit integer (e.g. 0x0100, 0x1000)
  remoteTsap: number;  // 16-bit integer (e.g. 0x0100, 0x0200, 0x1000)
  defaultPduSize: number;
  requiresPutGetNotice: boolean;
  requiresVirtualDb1: boolean;
}

export interface S7TranslatedAddress extends ParsedS7Address {
  originalAddress: string;
  isVirtualTranslated: boolean;
  translationNotice?: string;
}

export class S7RoutingEngine {
  /**
   * Resolves the hardware connection profile (Rack, Slot, TSAP, PDU) based on CPU model and custom overrides.
   */
  public static resolveProfile(
    model: S7CpuModel = 's7_1500',
    customRack?: number,
    customSlot?: number,
    customLocalTsap?: string,
    customRemoteTsap?: string
  ): S7ConnectionProfile {
    switch (model) {
      case 's7_1200':
      case 's7_1500': {
        const rack = customRack ?? 0;
        const slot = customSlot ?? 1;
        return {
          model,
          rack,
          slot,
          localTsap: 0x0100,
          remoteTsap: 0x0100 | (rack << 5) | slot,
          defaultPduSize: model === 's7_1500' ? 960 : 480,
          requiresPutGetNotice: true,
          requiresVirtualDb1: false
        };
      }
      case 's7_300':
      case 's7_400': {
        const rack = customRack ?? 0;
        const slot = customSlot ?? 2;
        return {
          model,
          rack,
          slot,
          localTsap: 0x0100,
          remoteTsap: 0x0100 | (rack << 5) | slot,
          defaultPduSize: model === 's7_400' ? 480 : 240,
          requiresPutGetNotice: false,
          requiresVirtualDb1: false
        };
      }
      case 's7_200': {
        const localTsap = S7RoutingEngine.parseTsap(customLocalTsap || '0x1000');
        const remoteTsap = S7RoutingEngine.parseTsap(customRemoteTsap || '0x1000');
        return {
          model,
          rack: 0,
          slot: 0,
          localTsap,
          remoteTsap,
          defaultPduSize: 240,
          requiresPutGetNotice: false,
          requiresVirtualDb1: true
        };
      }
      case 'logo': {
        return {
          model,
          rack: 0,
          slot: 1,
          localTsap: 0x0100,
          remoteTsap: 0x0100,
          defaultPduSize: 480,
          requiresPutGetNotice: false,
          requiresVirtualDb1: true
        };
      }
      default:
        return {
          model: 's7_1500',
          rack: customRack ?? 0,
          slot: customSlot ?? 1,
          localTsap: 0x0100,
          remoteTsap: 0x0102,
          defaultPduSize: 480,
          requiresPutGetNotice: true,
          requiresVirtualDb1: false
        };
    }
  }

  /**
   * Robustly parses a TSAP string in hex ("0x1000"), dotted decimal ("10.00"), or integer ("4096") format.
   */
  public static parseTsap(tsapStr: string): number {
    if (!tsapStr) return 0x0100;
    const clean = tsapStr.trim();

    // Dotted format: "10.00" -> 0x1000, "01.00" -> 0x0100
    if (clean.includes('.')) {
      const parts = clean.split('.');
      const b1 = parseInt(parts[0], 16) || 0;
      const b2 = parseInt(parts[1], 16) || 0;
      return (b1 << 8) | b2;
    }

    // Hex format: "0x1000" or "1000"
    if (clean.toLowerCase().startsWith('0x')) {
      return parseInt(clean, 16) || 0x0100;
    }

    // Hex or numeric integer
    const parsedHex = parseInt(clean, 16);
    if (!isNaN(parsedHex) && clean.length === 4) {
      return parsedHex;
    }

    const parsedDec = parseInt(clean, 10);
    return isNaN(parsedDec) ? 0x0100 : parsedDec;
  }

  /**
   * Translates model-specific notation (LOGO! Soft Comfort I/Q/M/AI/AQ/V, S7-200 V-Memory) into standard S7Comm DB1 addresses.
   */
  public static translateAddress(rawAddress: string, model: S7CpuModel = 's7_1500', defaultDataType: DriverTagDataType = 'float'): S7TranslatedAddress {
    const clean = (rawAddress || '').trim().toUpperCase().replace(/\s+/g, '');

    // 1. LOGO! 0BA7 / 0BA8 Address Translation Layer
    if (model === 'logo') {
      // Digital Inputs: I1..I24 -> DB1.DBX923.0 .. DB1.DBX925.7
      const logoInputMatch = clean.match(/^I(\d+)$/i);
      if (logoInputMatch) {
        const inputNum = parseInt(logoInputMatch[1], 10); // 1-indexed (I1..I24)
        if (inputNum >= 1 && inputNum <= 24) {
          const zeroIdx = inputNum - 1;
          const byteOffset = 923 + Math.floor(zeroIdx / 8);
          const bitOffset = zeroIdx % 8;
          return {
            valid: true,
            area: 'DB',
            areaCode: 0x84,
            dbNumber: 1,
            byteOffset,
            bitOffset,
            suggestedDataType: 'boolean',
            formattedAddress: `DB1.DBX${byteOffset}.${bitOffset}`,
            originalAddress: rawAddress,
            isVirtualTranslated: true,
            translationNotice: `LOGO! Digital Input I${inputNum} mapped to VM DB1.DBX${byteOffset}.${bitOffset} (VB${byteOffset})`
          };
        }
      }

      // Digital Outputs: Q1..Q20 -> DB1.DBX942.0 .. DB1.DBX944.3
      const logoOutputMatch = clean.match(/^Q(\d+)$/i);
      if (logoOutputMatch) {
        const outputNum = parseInt(logoOutputMatch[1], 10); // 1-indexed (Q1..Q20)
        if (outputNum >= 1 && outputNum <= 20) {
          const zeroIdx = outputNum - 1;
          const byteOffset = 942 + Math.floor(zeroIdx / 8);
          const bitOffset = zeroIdx % 8;
          return {
            valid: true,
            area: 'DB',
            areaCode: 0x84,
            dbNumber: 1,
            byteOffset,
            bitOffset,
            suggestedDataType: 'boolean',
            formattedAddress: `DB1.DBX${byteOffset}.${bitOffset}`,
            originalAddress: rawAddress,
            isVirtualTranslated: true,
            translationNotice: `LOGO! Digital Output Q${outputNum} mapped to VM DB1.DBX${byteOffset}.${bitOffset} (VB${byteOffset})`
          };
        }
      }

      // Flags / Merkers: M1..M64 -> DB1.DBX948.0 .. DB1.DBX955.7
      const logoFlagMatch = clean.match(/^M(\d+)$/i);
      if (logoFlagMatch) {
        const flagNum = parseInt(logoFlagMatch[1], 10); // 1-indexed (M1..M64)
        if (flagNum >= 1 && flagNum <= 64) {
          const zeroIdx = flagNum - 1;
          const byteOffset = 948 + Math.floor(zeroIdx / 8);
          const bitOffset = zeroIdx % 8;
          return {
            valid: true,
            area: 'DB',
            areaCode: 0x84,
            dbNumber: 1,
            byteOffset,
            bitOffset,
            suggestedDataType: 'boolean',
            formattedAddress: `DB1.DBX${byteOffset}.${bitOffset}`,
            originalAddress: rawAddress,
            isVirtualTranslated: true,
            translationNotice: `LOGO! Flag M${flagNum} mapped to VM DB1.DBX${byteOffset}.${bitOffset} (VB${byteOffset})`
          };
        }
      }

      // Analog Inputs: AI1..AI8 -> DB1.DBW926..DB1.DBW940 (VW926..VW940)
      const logoAiMatch = clean.match(/^AI(\d+)$/i);
      if (logoAiMatch) {
        const aiNum = parseInt(logoAiMatch[1], 10); // 1-indexed (AI1..AI8)
        if (aiNum >= 1 && aiNum <= 8) {
          const byteOffset = 926 + (aiNum - 1) * 2;
          return {
            valid: true,
            area: 'DB',
            areaCode: 0x84,
            dbNumber: 1,
            byteOffset,
            bitOffset: 0,
            suggestedDataType: 'int16',
            formattedAddress: `DB1.DBW${byteOffset}`,
            originalAddress: rawAddress,
            isVirtualTranslated: true,
            translationNotice: `LOGO! Analog Input AI${aiNum} mapped to VM DB1.DBW${byteOffset} (VW${byteOffset})`
          };
        }
      }

      // Analog Outputs: AQ1..AQ8 -> DB1.DBW944..DB1.DBW958 (VW944..VW958)
      const logoAqMatch = clean.match(/^AQ(\d+)$/i);
      if (logoAqMatch) {
        const aqNum = parseInt(logoAqMatch[1], 10); // 1-indexed (AQ1..AQ8)
        if (aqNum >= 1 && aqNum <= 8) {
          const byteOffset = 944 + (aqNum - 1) * 2;
          return {
            valid: true,
            area: 'DB',
            areaCode: 0x84,
            dbNumber: 1,
            byteOffset,
            bitOffset: 0,
            suggestedDataType: 'int16',
            formattedAddress: `DB1.DBW${byteOffset}`,
            originalAddress: rawAddress,
            isVirtualTranslated: true,
            translationNotice: `LOGO! Analog Output AQ${aqNum} mapped to VM DB1.DBW${byteOffset} (VW${byteOffset})`
          };
        }
      }

      // Direct VM memory: VW100, VD100, VB100, V100.0
      const logoVmMatch = clean.match(/^V([BWDX])?(\d+)(?:\.(\d+))?$/i);
      if (logoVmMatch) {
        const typeChar = (logoVmMatch[1] || 'D').toUpperCase();
        const byteOffset = parseInt(logoVmMatch[2], 10);
        const bitOffset = logoVmMatch[3] ? parseInt(logoVmMatch[3], 10) : 0;
        let suggestedDataType: DriverTagDataType = 'float';

        if (typeChar === 'X' || clean.includes('.')) suggestedDataType = 'boolean';
        else if (typeChar === 'B') suggestedDataType = 'uint16';
        else if (typeChar === 'W') suggestedDataType = 'int16';
        else suggestedDataType = 'float';

        const dbTypeChar = typeChar === 'X' ? 'X' : typeChar === 'B' ? 'B' : typeChar === 'W' ? 'W' : 'D';

        return {
          valid: true,
          area: 'DB',
          areaCode: 0x84,
          dbNumber: 1,
          byteOffset,
          bitOffset,
          suggestedDataType,
          formattedAddress: `DB1.DB${dbTypeChar}${byteOffset}${dbTypeChar === 'X' ? `.${bitOffset}` : ''}`,
          originalAddress: rawAddress,
          isVirtualTranslated: true,
          translationNotice: `LOGO! VM Variable Memory ${clean} mapped to DB1.DB${dbTypeChar}${byteOffset}`
        };
      }
    }

    // 2. S7-200 V-Memory Address Translation (VB100, VW100, VD100, V100.0 -> DB1)
    if (model === 's7_200') {
      const s7200VMatch = clean.match(/^V([BWDX])?(\d+)(?:\.(\d+))?$/i);
      if (s7200VMatch) {
        const typeChar = (s7200VMatch[1] || 'D').toUpperCase();
        const byteOffset = parseInt(s7200VMatch[2], 10);
        const bitOffset = s7200VMatch[3] ? parseInt(s7200VMatch[3], 10) : 0;
        let suggestedDataType: DriverTagDataType = 'float';

        if (typeChar === 'X' || clean.includes('.')) suggestedDataType = 'boolean';
        else if (typeChar === 'B') suggestedDataType = 'uint16';
        else if (typeChar === 'W') suggestedDataType = 'int16';
        else suggestedDataType = 'float';

        const dbTypeChar = typeChar === 'X' ? 'X' : typeChar === 'B' ? 'B' : typeChar === 'W' ? 'W' : 'D';

        return {
          valid: true,
          area: 'DB',
          areaCode: 0x84,
          dbNumber: 1,
          byteOffset,
          bitOffset,
          suggestedDataType,
          formattedAddress: `DB1.DB${dbTypeChar}${byteOffset}${dbTypeChar === 'X' ? `.${bitOffset}` : ''}`,
          originalAddress: rawAddress,
          isVirtualTranslated: true,
          translationNotice: `S7-200 V-Memory ${clean} mapped to DB1.DB${dbTypeChar}${byteOffset}`
        };
      }
    }

    // 3. Standard S7-1200 / S7-1500 / S7-300 / S7-400 parser passthrough
    const parsed = parseS7Address(rawAddress, defaultDataType);
    return {
      ...parsed,
      originalAddress: rawAddress,
      isVirtualTranslated: false
    };
  }
}
