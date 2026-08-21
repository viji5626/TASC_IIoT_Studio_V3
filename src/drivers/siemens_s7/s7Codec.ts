/**
 * TASC IIoT Studio — Siemens S7 Big-Endian (Motorola Format) Codec
 *
 * Implements strict Big-Endian byte packing and unpacking for S7Comm data types:
 *  - Real Float32 (IEEE 754 Big-Endian 4-bytes)
 *  - Int16 (Signed 16-bit Big-Endian 2-bytes)
 *  - DInt32 (Signed 32-bit Big-Endian 4-bytes)
 *  - UInt16 / Word (Unsigned 16-bit Big-Endian 2-bytes)
 *  - UInt32 / DWord (Unsigned 32-bit Big-Endian 4-bytes)
 *  - Byte / Char
 *  - Boolean (Bit in Byte at offset 0..7)
 *  - S7 String (Byte 0: max length, Byte 1: actual length, Byte 2..N: ASCII characters)
 */

import { DriverTagDataType } from '../../types';

export class S7Codec {
  /**
   * Decodes a buffer slice into a JavaScript value according to the specified data type (Big-Endian).
   */
  public static decodeValue(buffer: Buffer, dataType: DriverTagDataType, bitOffset: number = 0): any {
    if (!buffer || buffer.length === 0) return 0;

    switch (dataType) {
      case 'boolean': {
        const byte = buffer[0] || 0;
        const bit = (bitOffset >= 0 && bitOffset <= 7) ? bitOffset : 0;
        return (byte & (1 << bit)) !== 0;
      }
      case 'int16': {
        if (buffer.length < 2) return 0;
        return buffer.readInt16BE(0);
      }
      case 'uint16': {
        if (buffer.length < 2) return 0;
        return buffer.readUInt16BE(0);
      }
      case 'int32': {
        if (buffer.length < 4) return 0;
        return buffer.readInt32BE(0);
      }
      case 'uint32': {
        if (buffer.length < 4) return 0;
        return buffer.readUInt32BE(0);
      }
      case 'float': {
        if (buffer.length < 4) return 0.0;
        const val = buffer.readFloatBE(0);
        return Math.round(val * 1000) / 1000;
      }
      case 'string': {
        if (buffer.length < 2) return buffer.toString('ascii');
        // S7 String format: Byte 0 = MaxLen, Byte 1 = ActualLen
        const actualLen = buffer[1];
        if (actualLen > 0 && buffer.length >= 2 + actualLen) {
          return buffer.subarray(2, 2 + actualLen).toString('ascii');
        }
        return buffer.toString('ascii').replace(/\0/g, '').trim();
      }
      default:
        return buffer.readFloatBE(0);
    }
  }

  /**
   * Encodes a JavaScript value into a Big-Endian buffer according to the data type.
   */
  public static encodeValue(value: any, dataType: DriverTagDataType, bitOffset: number = 0, existingByte: number = 0): Buffer {
    switch (dataType) {
      case 'boolean': {
        const boolVal = Boolean(value);
        const bit = (bitOffset >= 0 && bitOffset <= 7) ? bitOffset : 0;
        let b = existingByte;
        if (boolVal) {
          b |= (1 << bit);
        } else {
          b &= ~(1 << bit);
        }
        const buf = Buffer.alloc(1);
        buf[0] = b;
        return buf;
      }
      case 'int16': {
        const buf = Buffer.alloc(2);
        buf.writeInt16BE(Number(value) || 0, 0);
        return buf;
      }
      case 'uint16': {
        const buf = Buffer.alloc(2);
        buf.writeUInt16BE(Math.max(0, Math.min(65535, Number(value) || 0)), 0);
        return buf;
      }
      case 'int32': {
        const buf = Buffer.alloc(4);
        buf.writeInt32BE(Number(value) || 0, 0);
        return buf;
      }
      case 'uint32': {
        const buf = Buffer.alloc(4);
        buf.writeUInt32BE(Math.max(0, Number(value) || 0), 0);
        return buf;
      }
      case 'float': {
        const buf = Buffer.alloc(4);
        buf.writeFloatBE(Number(value) || 0.0, 0);
        return buf;
      }
      case 'string': {
        const str = String(value || '');
        const maxLen = 254;
        const actualLen = Math.min(maxLen, str.length);
        const buf = Buffer.alloc(2 + actualLen);
        buf[0] = maxLen;
        buf[1] = actualLen;
        buf.write(str.substring(0, actualLen), 2, 'ascii');
        return buf;
      }
      default: {
        const buf = Buffer.alloc(4);
        buf.writeFloatBE(Number(value) || 0.0, 0);
        return buf;
      }
    }
  }

  /**
   * Calculates the required byte size for an S7 data type.
   */
  public static getByteLength(dataType: DriverTagDataType): number {
    switch (dataType) {
      case 'boolean': return 1;
      case 'int16':
      case 'uint16': return 2;
      case 'int32':
      case 'uint32':
      case 'float': return 4;
      case 'string': return 256;
      default: return 4;
    }
  }
}
