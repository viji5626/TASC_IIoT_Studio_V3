/**
 * TASC IIoT Studio — Mitsubishi MELSEC Little-Endian (Intel Format) Codec
 *
 * Implements strict Little-Endian byte packing and unpacking for MC Protocol / SLMP:
 *  - Real Float32 (IEEE 754 Little-Endian 4-bytes / 2 Words)
 *  - Int16 (Signed 16-bit Little-Endian 2-bytes / 1 Word)
 *  - DInt32 (Signed 32-bit Little-Endian 4-bytes / 2 Words)
 *  - UInt16 (Unsigned 16-bit Little-Endian 2-bytes / 1 Word)
 *  - UInt32 (Unsigned 32-bit Little-Endian 4-bytes / 2 Words)
 *  - Boolean (Bit devices e.g. M/X/Y or Bit-in-Word e.g. D100.4)
 *  - ASCII String packed in 16-bit word pairs
 */

import { DriverTagDataType } from '../../types';

export class MelsecCodec {
  /**
   * Decodes a Little-Endian buffer slice into a JavaScript value according to the specified data type.
   */
  public static decodeValue(buffer: Buffer, dataType: DriverTagDataType, bitIndex: number = 0, isBitDevice: boolean = false): any {
    if (!buffer || buffer.length === 0) return 0;

    if (isBitDevice) {
      return (buffer[0] & 0x01) !== 0 || buffer[0] > 0;
    }

    switch (dataType) {
      case 'boolean': {
        const word = buffer.readUInt16LE(0);
        const bit = (bitIndex >= 0 && bitIndex <= 15) ? bitIndex : 0;
        return (word & (1 << bit)) !== 0;
      }
      case 'int16': {
        if (buffer.length < 2) return 0;
        return buffer.readInt16LE(0);
      }
      case 'uint16': {
        if (buffer.length < 2) return 0;
        return buffer.readUInt16LE(0);
      }
      case 'int32': {
        if (buffer.length < 4) return 0;
        return buffer.readInt32LE(0);
      }
      case 'uint32': {
        if (buffer.length < 4) return 0;
        return buffer.readUInt32LE(0);
      }
      case 'float': {
        if (buffer.length < 4) return 0.0;
        const val = buffer.readFloatLE(0);
        return Math.round(val * 1000) / 1000;
      }
      case 'string': {
        return buffer.toString('ascii').replace(/\0/g, '').trim();
      }
      default:
        return buffer.readFloatLE(0);
    }
  }

  /**
   * Encodes a JavaScript value into a Little-Endian buffer according to the data type.
   */
  public static encodeValue(value: any, dataType: DriverTagDataType, bitIndex: number = 0, isBitDevice: boolean = false, existingWord: number = 0): Buffer {
    if (isBitDevice) {
      const buf = Buffer.alloc(1);
      buf[0] = (Boolean(value) || value === 1 || value === '1') ? 0x01 : 0x00;
      return buf;
    }

    switch (dataType) {
      case 'boolean': {
        const boolVal = Boolean(value);
        const bit = (bitIndex >= 0 && bitIndex <= 15) ? bitIndex : 0;
        let w = existingWord;
        if (boolVal) {
          w |= (1 << bit);
        } else {
          w &= ~(1 << bit);
        }
        const buf = Buffer.alloc(2);
        buf.writeUInt16LE(w, 0);
        return buf;
      }
      case 'int16': {
        const buf = Buffer.alloc(2);
        buf.writeInt16LE(Number(value) || 0, 0);
        return buf;
      }
      case 'uint16': {
        const buf = Buffer.alloc(2);
        buf.writeUInt16LE(Math.max(0, Math.min(65535, Number(value) || 0)), 0);
        return buf;
      }
      case 'int32': {
        const buf = Buffer.alloc(4);
        buf.writeInt32LE(Number(value) || 0, 0);
        return buf;
      }
      case 'uint32': {
        const buf = Buffer.alloc(4);
        buf.writeUInt32LE(Math.max(0, Number(value) || 0), 0);
        return buf;
      }
      case 'float': {
        const buf = Buffer.alloc(4);
        buf.writeFloatLE(Number(value) || 0.0, 0);
        return buf;
      }
      case 'string': {
        const str = String(value || '');
        const len = Math.ceil(str.length / 2) * 2; // Word-aligned
        const buf = Buffer.alloc(len);
        buf.write(str, 0, 'ascii');
        return buf;
      }
      default: {
        const buf = Buffer.alloc(4);
        buf.writeFloatLE(Number(value) || 0.0, 0);
        return buf;
      }
    }
  }

  /**
   * Returns the word count (16-bit points) required for a MELSEC data type.
   */
  public static getWordPoints(dataType: DriverTagDataType, isBitDevice: boolean = false): number {
    if (isBitDevice) return 1;
    switch (dataType) {
      case 'boolean':
      case 'int16':
      case 'uint16': return 1;
      case 'int32':
      case 'uint32':
      case 'float': return 2;
      case 'string': return 16;
      default: return 2;
    }
  }
}
