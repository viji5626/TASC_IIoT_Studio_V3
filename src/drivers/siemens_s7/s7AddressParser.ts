/**
 * TASC IIoT Studio — Siemens S7 Address Syntax Parser & Normalizer
 *
 * Supports ISO-on-TCP (RFC 1006 / S7Comm) memory area syntax:
 *  - Data Blocks: DB1.DBD0 (Real/DInt), DB1.DBW4 (Int/Word), DB1.DBX0.0 (Bool), DB1.DBB10 (Byte)
 *  - Inputs: I0.0, IB0, IW2, ID4
 *  - Outputs: Q0.0, QB0, QW2, QD4
 *  - Merkers/Flags: M0.0, MB10, MW20, MD30
 *  - Timers & Counters: T1, C1
 */

import { DriverTagDataType } from '../../types';

export type S7AreaCode = 0x84 | 0x81 | 0x82 | 0x83 | 0x1D | 0x1C; // DB, I, Q, M, T, C

export interface ParsedS7Address {
  valid: boolean;
  area: 'DB' | 'I' | 'Q' | 'M' | 'T' | 'C';
  areaCode: S7AreaCode;
  dbNumber: number;
  byteOffset: number;
  bitOffset: number;
  bitLength?: number;
  suggestedDataType: DriverTagDataType;
  formattedAddress: string;
  error?: string;
}

export function parseS7Address(rawAddress: string, defaultDataType: DriverTagDataType = 'float'): ParsedS7Address {
  if (!rawAddress || !rawAddress.trim()) {
    return {
      valid: false,
      area: 'DB',
      areaCode: 0x84,
      dbNumber: 1,
      byteOffset: 0,
      bitOffset: 0,
      suggestedDataType: defaultDataType,
      formattedAddress: '',
      error: 'Address string is empty'
    };
  }

  const clean = rawAddress.trim().toUpperCase().replace(/\s+/g, '');

  // 1. Data Block Format: DB1.DBD0, DB1.DBW4, DB1.DBX0.0, DB1.DBB10, DB1,REAL0, DB1,INT4, DB1,X0.0
  const dbMatchDot = clean.match(/^DB(\d+)\.DB([BWDX])(\d+)(?:\.(\d+))?$/i);
  const dbMatchComma = clean.match(/^DB(\d+),(REAL|DINT|INT|WORD|DWORD|BYTE|BOOL|X|B|W|D)(\d+)(?:\.(\d+))?$/i);

  if (dbMatchDot) {
    const dbNumber = parseInt(dbMatchDot[1], 10);
    const typeChar = dbMatchDot[2].toUpperCase();
    const byteOffset = parseInt(dbMatchDot[3], 10);
    const bitOffset = dbMatchDot[4] ? parseInt(dbMatchDot[4], 10) : 0;

    let suggestedDataType: DriverTagDataType = 'float';
    if (typeChar === 'X') suggestedDataType = 'boolean';
    else if (typeChar === 'B') suggestedDataType = 'uint16';
    else if (typeChar === 'W') suggestedDataType = 'int16';
    else if (typeChar === 'D') suggestedDataType = 'float';

    return {
      valid: true,
      area: 'DB',
      areaCode: 0x84,
      dbNumber,
      byteOffset,
      bitOffset,
      suggestedDataType,
      formattedAddress: `DB${dbNumber}.DB${typeChar}${byteOffset}${typeChar === 'X' ? `.${bitOffset}` : ''}`
    };
  }

  if (dbMatchComma) {
    const dbNumber = parseInt(dbMatchComma[1], 10);
    const typeStr = dbMatchComma[2].toUpperCase();
    const byteOffset = parseInt(dbMatchComma[3], 10);
    const bitOffset = dbMatchComma[4] ? parseInt(dbMatchComma[4], 10) : 0;

    let suggestedDataType: DriverTagDataType = 'float';
    let typeChar = 'D';

    if (typeStr === 'BOOL' || typeStr === 'X') {
      suggestedDataType = 'boolean';
      typeChar = 'X';
    } else if (typeStr === 'BYTE' || typeStr === 'B') {
      suggestedDataType = 'uint16';
      typeChar = 'B';
    } else if (typeStr === 'INT' || typeStr === 'WORD' || typeStr === 'W') {
      suggestedDataType = 'int16';
      typeChar = 'W';
    } else if (typeStr === 'DINT') {
      suggestedDataType = 'int32';
      typeChar = 'D';
    } else if (typeStr === 'REAL' || typeStr === 'D' || typeStr === 'DWORD') {
      suggestedDataType = 'float';
      typeChar = 'D';
    }

    return {
      valid: true,
      area: 'DB',
      areaCode: 0x84,
      dbNumber,
      byteOffset,
      bitOffset,
      suggestedDataType,
      formattedAddress: `DB${dbNumber}.DB${typeChar}${byteOffset}${typeChar === 'X' ? `.${bitOffset}` : ''}`
    };
  }

  // 2. Inputs: I0.0, IB0, IW2, ID4, E0.0, EB0, EW2, ED4
  const inputMatch = clean.match(/^([IE])(?:([BWD])(\d+)|(\d+)\.(\d+))$/i);
  if (inputMatch) {
    if (inputMatch[2]) {
      const typeChar = inputMatch[2].toUpperCase();
      const byteOffset = parseInt(inputMatch[3], 10);
      const suggestedDataType: DriverTagDataType = typeChar === 'B' ? 'uint16' : typeChar === 'W' ? 'int16' : 'float';
      return {
        valid: true,
        area: 'I',
        areaCode: 0x81,
        dbNumber: 0,
        byteOffset,
        bitOffset: 0,
        suggestedDataType,
        formattedAddress: `I${typeChar}${byteOffset}`
      };
    } else {
      const byteOffset = parseInt(inputMatch[4], 10);
      const bitOffset = parseInt(inputMatch[5], 10);
      return {
        valid: true,
        area: 'I',
        areaCode: 0x81,
        dbNumber: 0,
        byteOffset,
        bitOffset,
        suggestedDataType: 'boolean',
        formattedAddress: `I${byteOffset}.${bitOffset}`
      };
    }
  }

  // 3. Outputs: Q0.0, QB0, QW2, QD4, A0.0, AB0, AW2, AD4
  const outputMatch = clean.match(/^([QA])(?:([BWD])(\d+)|(\d+)\.(\d+))$/i);
  if (outputMatch) {
    if (outputMatch[2]) {
      const typeChar = outputMatch[2].toUpperCase();
      const byteOffset = parseInt(outputMatch[3], 10);
      const suggestedDataType: DriverTagDataType = typeChar === 'B' ? 'uint16' : typeChar === 'W' ? 'int16' : 'float';
      return {
        valid: true,
        area: 'Q',
        areaCode: 0x82,
        dbNumber: 0,
        byteOffset,
        bitOffset: 0,
        suggestedDataType,
        formattedAddress: `Q${typeChar}${byteOffset}`
      };
    } else {
      const byteOffset = parseInt(outputMatch[4], 10);
      const bitOffset = parseInt(outputMatch[5], 10);
      return {
        valid: true,
        area: 'Q',
        areaCode: 0x82,
        dbNumber: 0,
        byteOffset,
        bitOffset,
        suggestedDataType: 'boolean',
        formattedAddress: `Q${byteOffset}.${bitOffset}`
      };
    }
  }

  // 4. Merkers / Flags: M0.0, MB10, MW20, MD30
  const merkerMatch = clean.match(/^M(?:([BWD])(\d+)|(\d+)\.(\d+))$/i);
  if (merkerMatch) {
    if (merkerMatch[1]) {
      const typeChar = merkerMatch[1].toUpperCase();
      const byteOffset = parseInt(merkerMatch[2], 10);
      const suggestedDataType: DriverTagDataType = typeChar === 'B' ? 'uint16' : typeChar === 'W' ? 'int16' : 'float';
      return {
        valid: true,
        area: 'M',
        areaCode: 0x83,
        dbNumber: 0,
        byteOffset,
        bitOffset: 0,
        suggestedDataType,
        formattedAddress: `M${typeChar}${byteOffset}`
      };
    } else {
      const byteOffset = parseInt(merkerMatch[3], 10);
      const bitOffset = parseInt(merkerMatch[4], 10);
      return {
        valid: true,
        area: 'M',
        areaCode: 0x83,
        dbNumber: 0,
        byteOffset,
        bitOffset,
        suggestedDataType: 'boolean',
        formattedAddress: `M${byteOffset}.${bitOffset}`
      };
    }
  }

  // 5. Timers: T1, T10
  const timerMatch = clean.match(/^T(\d+)$/i);
  if (timerMatch) {
    return {
      valid: true,
      area: 'T',
      areaCode: 0x1D,
      dbNumber: 0,
      byteOffset: parseInt(timerMatch[1], 10),
      bitOffset: 0,
      suggestedDataType: 'uint16',
      formattedAddress: `T${timerMatch[1]}`
    };
  }

  // 6. Counters: C1, C10
  const counterMatch = clean.match(/^C(\d+)$/i);
  if (counterMatch) {
    return {
      valid: true,
      area: 'C',
      areaCode: 0x1C,
      dbNumber: 0,
      byteOffset: parseInt(counterMatch[1], 10),
      bitOffset: 0,
      suggestedDataType: 'uint16',
      formattedAddress: `C${counterMatch[1]}`
    };
  }

  // 7. S7-200 / LOGO! Variable Memory: V100.0, VB100, VW100, VD100
  const vMatch = clean.match(/^V([BWDX])?(\d+)(?:\.(\d+))?$/i);
  if (vMatch) {
    const typeChar = (vMatch[1] || 'D').toUpperCase();
    const byteOffset = parseInt(vMatch[2], 10);
    const bitOffset = vMatch[3] ? parseInt(vMatch[3], 10) : 0;
    const suggestedDataType: DriverTagDataType = (typeChar === 'X' || clean.includes('.'))
      ? 'boolean'
      : typeChar === 'B' ? 'uint16' : typeChar === 'W' ? 'int16' : 'float';
    const dbTypeChar = typeChar === 'X' ? 'X' : typeChar === 'B' ? 'B' : typeChar === 'W' ? 'W' : 'D';

    return {
      valid: true,
      area: 'DB',
      areaCode: 0x84,
      dbNumber: 1,
      byteOffset,
      bitOffset,
      suggestedDataType,
      formattedAddress: `DB1.DB${dbTypeChar}${byteOffset}${dbTypeChar === 'X' ? `.${bitOffset}` : ''}`
    };
  }

  // 8. LOGO! Analog Inputs & Outputs: AI1..AI8, AQ1..AQ8
  const aiMatch = clean.match(/^AI(\d+)$/i);
  if (aiMatch) {
    const num = parseInt(aiMatch[1], 10);
    const byteOffset = 926 + (num - 1) * 2;
    return {
      valid: true,
      area: 'DB',
      areaCode: 0x84,
      dbNumber: 1,
      byteOffset,
      bitOffset: 0,
      suggestedDataType: 'int16',
      formattedAddress: `DB1.DBW${byteOffset}`
    };
  }

  const aqMatch = clean.match(/^AQ(\d+)$/i);
  if (aqMatch) {
    const num = parseInt(aqMatch[1], 10);
    const byteOffset = 944 + (num - 1) * 2;
    return {
      valid: true,
      area: 'DB',
      areaCode: 0x84,
      dbNumber: 1,
      byteOffset,
      bitOffset: 0,
      suggestedDataType: 'int16',
      formattedAddress: `DB1.DBW${byteOffset}`
    };
  }

  return {
    valid: false,
    area: 'DB',
    areaCode: 0x84,
    dbNumber: 1,
    byteOffset: 0,
    bitOffset: 0,
    suggestedDataType: defaultDataType,
    formattedAddress: clean,
    error: `Unrecognized S7 address format: "${rawAddress}". Examples: DB1.DBD0, DB1.DBW4, M0.0, IW0, Q0.0, VW100, AI1`
  };
}
