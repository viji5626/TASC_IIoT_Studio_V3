/**
 * TASC IIoT Studio — CIP Routing & EPATH Segmentation Engine
 *
 * Implements ODVA Volume 1 EPATH encoding:
 * - ANSI Extended Symbol Segments (0x91) for Symbolic Tag Names & Program Scopes
 * - Member / Element Segments (0x28, 0x29, 0x2A) for Array Indices
 * - Connection Path encoding (Port 1 Backplane, Slot Number, Multi-Hop IP hops)
 * - PCCC Address Parser for legacy MicroLogix / SLC 500 registers
 */

import { CipDataType } from './cipCodec';

export interface TranslatedCipAddress {
  isPccc: boolean;
  isAssembly: boolean;
  rawAddress: string;
  formattedPath: string;
  encodedEPath: Buffer;
  suggestedDataType: CipDataType;
  pcccDetails?: {
    fileType: 'N' | 'F' | 'B' | 'T' | 'C' | 'S' | 'I' | 'O';
    fileNumber: number;
    elementNumber: number;
    subElement?: number;
    bitNumber?: number;
  };
}

export class CipRoutingEngine {
  /**
   * Encodes a Rockwell Symbolic Tag Path into an EPATH buffer.
   * Handles:
   *  - Simple tags: "Motor_Speed"
   *  - Program scope: "Program:MainProgram.SetPoint"
   *  - Array indexing: "Alarm_Word[2]"
   *  - Nested UDT members: "VFD_01.Status.Running"
   */
  public static encodeSymbolicPath(tagPath: string): Buffer {
    const cleanPath = tagPath.trim().replace(/\s+/g, '');
    const segments: Buffer[] = [];

    // Split by '.' while preserving array brackets
    const parts = cleanPath.split('.');

    for (let part of parts) {
      let isProgram = false;
      if (part.startsWith('Program:')) {
        isProgram = true;
        part = part.replace('Program:', '');
      }

      // Check for array index e.g. "Data_Array[5]"
      const arrayMatch = part.match(/^([^\[]+)\[(\d+)\]$/);
      let symbol = part;
      let arrayIndex: number | null = null;

      if (arrayMatch) {
        symbol = arrayMatch[1];
        arrayIndex = parseInt(arrayMatch[2], 10);
      }

      // 1. Encode ANSI Extended Symbol Segment (0x91)
      const symbolBytes = Buffer.from(symbol, 'utf8');
      const symbolLen = symbolBytes.length;
      const isEven = symbolLen % 2 === 0;
      const segmentLen = 2 + symbolLen + (isEven ? 0 : 1); // Pad with null byte if odd
      
      const symbolSeg = Buffer.alloc(segmentLen);
      symbolSeg.writeUInt8(0x91, 0);               // ANSI Extended Symbol Segment type
      symbolSeg.writeUInt8(symbolLen, 1);          // Length of string
      symbolBytes.copy(symbolSeg, 2);
      if (!isEven) {
        symbolSeg.writeUInt8(0x00, segmentLen - 1); // Even byte boundary padding
      }
      segments.push(symbolSeg);

      // 2. If array index is present, encode Element Segment
      if (arrayIndex !== null) {
        if (arrayIndex <= 255) {
          // 8-bit Element Segment (0x28)
          const elemSeg = Buffer.alloc(2);
          elemSeg.writeUInt8(0x28, 0);
          elemSeg.writeUInt8(arrayIndex, 1);
          segments.push(elemSeg);
        } else if (arrayIndex <= 65535) {
          // 16-bit Element Segment (0x29 + 1 null pad byte)
          const elemSeg = Buffer.alloc(4);
          elemSeg.writeUInt8(0x29, 0);
          elemSeg.writeUInt8(0x00, 1);             // Pad
          elemSeg.writeUInt16LE(arrayIndex, 2);
          segments.push(elemSeg);
        } else {
          // 32-bit Element Segment (0x2A + 1 null pad byte)
          const elemSeg = Buffer.alloc(6);
          elemSeg.writeUInt8(0x2A, 0);
          elemSeg.writeUInt8(0x00, 1);             // Pad
          elemSeg.writeUInt32LE(arrayIndex, 2);
          segments.push(elemSeg);
        }
      }
    }

    return Buffer.concat(segments);
  }

  /**
   * Encodes a CIP Connection Path (e.g. "1,0" -> Port 1 Backplane, Slot 0).
   */
  public static encodeConnectionPath(routePathStr?: string, slot: number = 0): Buffer {
    const pathStr = (routePathStr || `1,${slot}`).trim();
    const tokens = pathStr.split(',').map(s => s.trim()).filter(Boolean);
    const segments: Buffer[] = [];

    for (let i = 0; i < tokens.length; i += 2) {
      const port = parseInt(tokens[i], 10) || 1;
      const dest = tokens[i + 1] || '0';

      // Check if destination is IP address (multi-hop) or integer slot
      if (dest.includes('.')) {
        // Extended Port Segment with IP String
        const ipBytes = Buffer.from(dest, 'ascii');
        const padLen = ipBytes.length % 2 === 0 ? 0 : 1;
        const seg = Buffer.alloc(2 + ipBytes.length + padLen);
        seg.writeUInt8(0x1F, 0); // Extended Link Address Segment
        seg.writeUInt8(ipBytes.length, 1);
        ipBytes.copy(seg, 2);
        segments.push(seg);
      } else {
        const slotNum = parseInt(dest, 10) || 0;
        // Standard Port Segment (0x01 | port) + Link Address (slot)
        const seg = Buffer.alloc(2);
        seg.writeUInt8(0x01, 0); // Port 1 (Backplane)
        seg.writeUInt8(slotNum, 1); // Chassis Slot
        segments.push(seg);
      }
    }

    return Buffer.concat(segments);
  }

  /**
   * Parses legacy Allen-Bradley PCCC Address (e.g. "N7:0", "F8:2", "B3:0/1", "T4:0.ACC").
   */
  public static parsePcccAddress(addressStr: string): TranslatedCipAddress | null {
    const raw = addressStr.trim().toUpperCase();
    const pcccRegex = /^([NFBTCSDIO])(\d+)?(?::(\d+))(?:\.(\w+))?(?:\/(\d+))?$/;
    const match = raw.match(pcccRegex);

    if (!match) return null;

    const fileTypeLetter = match[1] as 'N' | 'F' | 'B' | 'T' | 'C' | 'S' | 'I' | 'O';
    const fileNumber = match[2] ? parseInt(match[2], 10) : (
      fileTypeLetter === 'N' ? 7 :
      fileTypeLetter === 'F' ? 8 :
      fileTypeLetter === 'B' ? 3 :
      fileTypeLetter === 'T' ? 4 :
      fileTypeLetter === 'C' ? 5 :
      fileTypeLetter === 'S' ? 2 :
      fileTypeLetter === 'I' ? 1 : 0
    );
    const elementNumber = parseInt(match[3], 10) || 0;
    const subField = match[4] || '';
    const bitNumber = match[5] !== undefined ? parseInt(match[5], 10) : undefined;

    let suggestedType = CipDataType.INT;
    if (fileTypeLetter === 'F') suggestedType = CipDataType.REAL;
    else if (fileTypeLetter === 'B' || bitNumber !== undefined) suggestedType = CipDataType.BOOL;
    else if (fileTypeLetter === 'N') suggestedType = CipDataType.INT;

    return {
      isPccc: true,
      isAssembly: false,
      rawAddress: addressStr,
      formattedPath: `${fileTypeLetter}${fileNumber}:${elementNumber}${subField ? '.' + subField : ''}${bitNumber !== undefined ? '/' + bitNumber : ''}`,
      encodedEPath: Buffer.alloc(0),
      suggestedDataType: suggestedType,
      pcccDetails: {
        fileType: fileTypeLetter,
        fileNumber,
        elementNumber,
        bitNumber
      }
    };
  }

  /**
   * Translates any input address (Symbolic, PCCC, or Explicit Class/Instance/Attr)
   * into a standardized CIP dispatch structure.
   */
  public static translateAddress(rawAddress: string, dataType?: string): TranslatedCipAddress {
    const clean = (rawAddress || '').trim();

    // 1. Check for legacy PCCC address
    const pccc = this.parsePcccAddress(clean);
    if (pccc) return pccc;

    // 2. Check for explicit Class/Instance/Attr format e.g. "0x04:100:3" or "Class:4,Inst:100,Attr:3"
    const explicitMatch = clean.match(/^(?:0x)?([0-9a-fA-F]+)[:,\s]+(?:0x)?([0-9a-fA-F]+)(?:[:,\s]+(?:0x)?([0-9a-fA-F]+))?$/);
    if (explicitMatch && clean.includes(':')) {
      const cls = parseInt(explicitMatch[1], explicitMatch[1].startsWith('0x') ? 16 : 10);
      const inst = parseInt(explicitMatch[2], explicitMatch[2].startsWith('0x') ? 16 : 10);
      const attr = explicitMatch[3] ? parseInt(explicitMatch[3], explicitMatch[3].startsWith('0x') ? 16 : 10) : 3;

      const epath = Buffer.from([0x20, cls & 0xFF, 0x24, inst & 0xFF, 0x30, attr & 0xFF]);
      return {
        isPccc: false,
        isAssembly: cls === 0x04,
        rawAddress: clean,
        formattedPath: `Class 0x${cls.toString(16).toUpperCase()} Inst ${inst} Attr ${attr}`,
        encodedEPath: epath,
        suggestedDataType: CipDataType.DINT
      };
    }

    // 3. Standard CIP Symbolic Tag Name (ControlLogix, CompactLogix, Micro800)
    const encoded = this.encodeSymbolicPath(clean);
    let cipType = CipDataType.REAL;
    const dt = (dataType || '').toLowerCase();
    if (dt === 'boolean' || dt === 'bool') cipType = CipDataType.BOOL;
    else if (dt === 'int16' || dt === 'int' || dt === 'short') cipType = CipDataType.INT;
    else if (dt === 'int32' || dt === 'dint' || dt === 'int') cipType = CipDataType.DINT;
    else if (dt === 'uint16' || dt === 'uint') cipType = CipDataType.UINT;
    else if (dt === 'uint32' || dt === 'udint') cipType = CipDataType.UDINT;
    else if (dt === 'string') cipType = CipDataType.STRING;

    return {
      isPccc: false,
      isAssembly: false,
      rawAddress: clean,
      formattedPath: clean,
      encodedEPath: encoded,
      suggestedDataType: cipType
    };
  }
}
