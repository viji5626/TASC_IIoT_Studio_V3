/**
 * TASC IIoT Studio — Ethernet/IP (CIP) Protocol Codec
 *
 * Implements ODVA Common Industrial Protocol (CIP) packet framing,
 * Encapsulation Layer (Port 44818), CIP Data Type converters,
 * and PCCC (Programmable Controller Communication Commands) encapsulation
 * for legacy Allen-Bradley controllers (MicroLogix / SLC 500).
 */

export enum CipCommand {
  NOP = 0x0000,
  ListServices = 0x0004,
  ListIdentity = 0x0063,
  ListInterfaces = 0x0064,
  RegisterSession = 0x0065,
  UnRegisterSession = 0x0066,
  SendRRData = 0x006F,
  SendUnitData = 0x0070,
  IndicateStatus = 0x0072,
  Cancel = 0x0073
}

export enum CipService {
  GetAttributesAll = 0x01,
  SetAttributesAll = 0x02,
  GetAttributeList = 0x03,
  SetAttributeList = 0x04,
  Reset = 0x05,
  Start = 0x06,
  Stop = 0x07,
  Create = 0x08,
  Delete = 0x09,
  MultipleServicePacket = 0x0A,
  ApplyAttributes = 0x0D,
  GetAttributeSingle = 0x0E,
  SetAttributeSingle = 0x10,
  FindNextObjectInstance = 0x11,
  ErrorResponse = 0x14,
  Restore = 0x15,
  Save = 0x16,
  NoOperation = 0x17,
  GetMember = 0x18,
  SetMember = 0x19,
  InsertMember = 0x1A,
  RemoveMember = 0x1B,
  GroupSync = 0x1C,
  // Rockwell Specific Services
  ReadTag = 0x4C,
  WriteTag = 0x4D,
  ReadTagFragmented = 0x52,
  WriteTagFragmented = 0x53,
  ReadModifyWriteTag = 0x4E,
  ExecutePCCC = 0x4B
}

export enum CipDataType {
  BOOL = 0x00C1,
  SINT = 0x00C2,
  INT = 0x00C3,
  DINT = 0x00C4,
  LINT = 0x00C5,
  USINT = 0x00C6,
  UINT = 0x00C7,
  UDINT = 0x00C8,
  ULINT = 0x00C9,
  REAL = 0x00CA,
  LREAL = 0x00CB,
  STIME = 0x00CC,
  DATE = 0x00CD,
  TIME_OF_DAY = 0x00CE,
  DATE_AND_TIME = 0x00CF,
  STRING = 0x00D0,
  BYTE = 0x00D1,
  WORD = 0x00D2,
  DWORD = 0x00D3,
  LWORD = 0x00D4,
  STRING2 = 0x00D5,
  FTIME = 0x00D6,
  LTIME = 0x00D7,
  ITIME = 0x00D8,
  STRINGN = 0x00D9,
  SHORT_STRING = 0x00DA,
  TIME = 0x00DB,
  EPATH = 0x00DC,
  ENGUNIT = 0x00DD,
  STRINGI = 0x00DE,
  STRUCT = 0x02A0
}

export interface CipIdentity {
  vendorId: number;
  vendorName?: string;
  deviceType: number;
  productCode: number;
  revision: { major: number; minor: number };
  status: number;
  serialNumber: string;
  productName: string;
  state: number;
}

export class CipCodec {
  private static sequenceCounter = 1;

  public static getNextSequence(): number {
    CipCodec.sequenceCounter = (CipCodec.sequenceCounter + 1) & 0xFFFF;
    return CipCodec.sequenceCounter;
  }

  /**
   * Builds an EtherNet/IP Encapsulation Header (24 Bytes).
   */
  public static buildEncapsulationHeader(
    command: CipCommand,
    sessionHandle: number = 0,
    payloadLength: number = 0,
    status: number = 0,
    senderContext: Buffer = Buffer.alloc(8),
    options: number = 0
  ): Buffer {
    const buf = Buffer.alloc(24);
    buf.writeUInt16LE(command, 0);         // Command (2 bytes)
    buf.writeUInt16LE(payloadLength, 2);    // Length of payload (2 bytes)
    buf.writeUInt32LE(sessionHandle, 4);    // Session Handle (4 bytes)
    buf.writeUInt32LE(status, 8);           // Status Code (4 bytes, 0 = Success)
    senderContext.copy(buf, 12, 0, 8);      // Sender Context (8 bytes)
    buf.writeUInt32LE(options, 20);         // Options (4 bytes, 0 = Reserved)
    return buf;
  }

  /**
   * Builds a Register Session Packet (Command 0x0065).
   */
  public static buildRegisterSessionPacket(): Buffer {
    const payload = Buffer.alloc(4);
    payload.writeUInt16LE(0x0001, 0); // Protocol Version (1)
    payload.writeUInt16LE(0x0000, 2); // Options Flag (0)

    const header = this.buildEncapsulationHeader(CipCommand.RegisterSession, 0, payload.length);
    return Buffer.concat([header, payload]);
  }

  /**
   * Builds an Unregister Session Packet (Command 0x0066).
   */
  public static buildUnregisterSessionPacket(sessionHandle: number): Buffer {
    return this.buildEncapsulationHeader(CipCommand.UnRegisterSession, sessionHandle, 0);
  }

  /**
   * Builds a List Identity Packet (Command 0x0063).
   */
  public static buildListIdentityPacket(): Buffer {
    return this.buildEncapsulationHeader(CipCommand.ListIdentity, 0, 0);
  }

  /**
   * Wraps a CIP Request PDU inside an Encapsulation SendRRData Packet (Command 0x006F).
   */
  public static buildSendRRDataPacket(
    sessionHandle: number,
    cipPayload: Buffer,
    timeoutSec: number = 2
  ): Buffer {
    // Common Packet Format (CPF) for Unconnected Message Manager (UCMM):
    // Interface Handle (4 bytes: 0x00000000)
    // Timeout (2 bytes)
    // Item Count (2 bytes: 2 items)
    // Item 1: Null Address (Type 0x0000, Length 0x0000)
    // Item 2: Unconnected Data (Type 0x00B2, Length = cipPayload.length)
    const cpfHeader = Buffer.alloc(16);
    cpfHeader.writeUInt32LE(0x00000000, 0);  // Interface Handle (CIP)
    cpfHeader.writeUInt16LE(timeoutSec, 4);   // Timeout in seconds
    cpfHeader.writeUInt16LE(2, 6);            // Item Count = 2
    cpfHeader.writeUInt16LE(0x0000, 8);       // Null Address Item Type
    cpfHeader.writeUInt16LE(0x0000, 10);      // Length = 0
    cpfHeader.writeUInt16LE(0x00B2, 12);      // Unconnected Data Item Type
    cpfHeader.writeUInt16LE(cipPayload.length, 14); // Length of CIP PDU

    const payload = Buffer.concat([cpfHeader, cipPayload]);
    const header = this.buildEncapsulationHeader(CipCommand.SendRRData, sessionHandle, payload.length);
    return Buffer.concat([header, payload]);
  }

  /**
   * Builds CIP Request PDU for Reading a Symbolic Tag (Service 0x4C).
   */
  public static buildReadTagPdu(encodedEPath: Buffer, elementCount: number = 1): Buffer {
    const pduHeader = Buffer.alloc(2 + encodedEPath.length + 2);
    pduHeader.writeUInt8(CipService.ReadTag, 0);                               // Service Code (0x4C)
    pduHeader.writeUInt8(Math.floor(encodedEPath.length / 2), 1);              // Request Path Size in 16-bit words
    encodedEPath.copy(pduHeader, 2);                                           // EPATH
    pduHeader.writeUInt16LE(elementCount, 2 + encodedEPath.length);             // Number of elements to read
    return pduHeader;
  }

  /**
   * Builds CIP Request PDU for Writing a Symbolic Tag (Service 0x4D).
   */
  public static buildWriteTagPdu(
    encodedEPath: Buffer,
    dataType: CipDataType,
    value: any,
    elementCount: number = 1
  ): Buffer {
    const encodedValue = this.encodeValue(value, dataType);
    const pdu = Buffer.alloc(2 + encodedEPath.length + 4 + encodedValue.length);
    
    pdu.writeUInt8(CipService.WriteTag, 0);                                   // Service Code (0x4D)
    pdu.writeUInt8(Math.floor(encodedEPath.length / 2), 1);                  // Path size (16-bit words)
    encodedEPath.copy(pdu, 2);
    const offset = 2 + encodedEPath.length;
    pdu.writeUInt16LE(dataType, offset);                                      // CIP Data Type
    pdu.writeUInt16LE(elementCount, offset + 2);                              // Element Count
    encodedValue.copy(pdu, offset + 4);                                       // Data Payload
    return pdu;
  }

  /**
   * Builds CIP Request PDU for Get Attribute Single (Explicit Messaging - Service 0x0E).
   */
  public static buildGetAttributeSinglePdu(classId: number, instanceId: number, attributeId: number = 3): Buffer {
    // EPATH for Class, Instance, Attribute (Logical Segments)
    const epath = Buffer.from([
      0x20, classId & 0xFF,                  // 8-bit Class Segment
      0x24, instanceId & 0xFF,               // 8-bit Instance Segment
      0x30, attributeId & 0xFF               // 8-bit Attribute Segment
    ]);

    const pdu = Buffer.alloc(2 + epath.length);
    pdu.writeUInt8(CipService.GetAttributeSingle, 0);
    pdu.writeUInt8(Math.floor(epath.length / 2), 1);
    epath.copy(pdu, 2);
    return pdu;
  }

  /**
   * Builds CIP Request PDU for Set Attribute Single (Service 0x10).
   */
  public static buildSetAttributeSinglePdu(
    classId: number,
    instanceId: number,
    attributeId: number,
    data: Buffer
  ): Buffer {
    const epath = Buffer.from([
      0x20, classId & 0xFF,
      0x24, instanceId & 0xFF,
      0x30, attributeId & 0xFF
    ]);

    const pdu = Buffer.alloc(2 + epath.length + data.length);
    pdu.writeUInt8(CipService.SetAttributeSingle, 0);
    pdu.writeUInt8(Math.floor(epath.length / 2), 1);
    epath.copy(pdu, 2);
    data.copy(pdu, 2 + epath.length);
    return pdu;
  }

  /**
   * Builds CIP PCCC Encapsulated Request PDU (Service 0x4B) for MicroLogix and SLC 500.
   */
  public static buildPcccExecutePdu(
    pcccCommand: Buffer,
    requesterId: number = 0x0007
  ): Buffer {
    // EPATH: Class 0x67 (PCCC Object), Instance 0x01
    const pcccEpath = Buffer.from([0x20, 0x67, 0x24, 0x01]);
    const header = Buffer.alloc(2 + pcccEpath.length + 7);

    header.writeUInt8(CipService.ExecutePCCC, 0);                             // Service 0x4B
    header.writeUInt8(Math.floor(pcccEpath.length / 2), 1);                   // EPATH length
    pcccEpath.copy(header, 2);

    const offset = 2 + pcccEpath.length;
    header.writeUInt8(7, offset);                                             // Requester ID length
    header.writeUInt16LE(0x0000, offset + 1);                                 // Vendor ID
    header.writeUInt32LE(requesterId, offset + 3);                            // Serial Number

    return Buffer.concat([header, pcccCommand]);
  }

  /**
   * Encodes a JS value into a binary Buffer matching the CIP Data Type.
   */
  public static encodeValue(value: any, dataType: CipDataType): Buffer {
    let buf: Buffer;
    const num = Number(value) || 0;

    switch (dataType) {
      case CipDataType.BOOL:
        buf = Buffer.alloc(1);
        buf.writeUInt8(Boolean(value) ? 1 : 0, 0);
        break;
      case CipDataType.SINT:
      case CipDataType.BYTE:
        buf = Buffer.alloc(1);
        buf.writeInt8(num, 0);
        break;
      case CipDataType.USINT:
        buf = Buffer.alloc(1);
        buf.writeUInt8(num & 0xFF, 0);
        break;
      case CipDataType.INT:
      case CipDataType.WORD:
        buf = Buffer.alloc(2);
        buf.writeInt16LE(num, 0);
        break;
      case CipDataType.UINT:
        buf = Buffer.alloc(2);
        buf.writeUInt16LE(num & 0xFFFF, 0);
        break;
      case CipDataType.DINT:
      case CipDataType.DWORD:
        buf = Buffer.alloc(4);
        buf.writeInt32LE(num, 0);
        break;
      case CipDataType.UDINT:
        buf = Buffer.alloc(4);
        buf.writeUInt32LE(num >>> 0, 0);
        break;
      case CipDataType.LINT:
      case CipDataType.LWORD:
        buf = Buffer.alloc(8);
        buf.writeBigInt64LE(BigInt(Math.floor(num)), 0);
        break;
      case CipDataType.REAL:
        buf = Buffer.alloc(4);
        buf.writeFloatLE(num, 0);
        break;
      case CipDataType.LREAL:
        buf = Buffer.alloc(8);
        buf.writeDoubleLE(num, 0);
        break;
      case CipDataType.STRING: {
        const str = String(value || '');
        const strBuf = Buffer.from(str, 'utf8');
        buf = Buffer.alloc(4 + strBuf.length);
        buf.writeUInt32LE(strBuf.length, 0); // String count
        strBuf.copy(buf, 4);
        break;
      }
      default:
        buf = Buffer.alloc(4);
        buf.writeFloatLE(num, 0);
        break;
    }
    return buf;
  }

  /**
   * Decodes a binary Buffer payload into a JS primitive based on CIP Data Type.
   */
  public static decodeValue(buffer: Buffer, dataType: CipDataType, offset: number = 0): any {
    if (!buffer || buffer.length <= offset) return 0;

    switch (dataType) {
      case CipDataType.BOOL:
        return buffer.readUInt8(offset) !== 0;
      case CipDataType.SINT:
      case CipDataType.BYTE:
        return buffer.readInt8(offset);
      case CipDataType.USINT:
        return buffer.readUInt8(offset);
      case CipDataType.INT:
      case CipDataType.WORD:
        return buffer.readInt16LE(offset);
      case CipDataType.UINT:
        return buffer.readUInt16LE(offset);
      case CipDataType.DINT:
      case CipDataType.DWORD:
        return buffer.readInt32LE(offset);
      case CipDataType.UDINT:
        return buffer.readUInt32LE(offset);
      case CipDataType.LINT:
      case CipDataType.LWORD:
        return Number(buffer.readBigInt64LE(offset));
      case CipDataType.REAL: {
        const f = buffer.readFloatLE(offset);
        return isNaN(f) ? 0 : Math.round(f * 1000) / 1000;
      }
      case CipDataType.LREAL: {
        const d = buffer.readDoubleLE(offset);
        return isNaN(d) ? 0 : Math.round(d * 10000) / 10000;
      }
      case CipDataType.STRING: {
        if (buffer.length < offset + 4) return '';
        const len = buffer.readUInt32LE(offset);
        const strBytes = buffer.subarray(offset + 4, offset + 4 + Math.min(len, buffer.length - (offset + 4)));
        return strBytes.toString('utf8').replace(/\0/g, '');
      }
      default: {
        if (buffer.length >= offset + 4) {
          const f = buffer.readFloatLE(offset);
          return isNaN(f) ? buffer.readInt32LE(offset) : Math.round(f * 100) / 100;
        } else if (buffer.length >= offset + 2) {
          return buffer.readInt16LE(offset);
        } else if (buffer.length >= offset + 1) {
          return buffer.readUInt8(offset);
        }
        return 0;
      }
    }
  }

  /**
   * Parses CIP Identity Object (Class 0x01, Instance 0x01) response buffer.
   */
  public static parseIdentityResponse(data: Buffer): CipIdentity {
    let offset = 0;
    const vendorId = data.readUInt16LE(offset); offset += 2;
    const deviceType = data.readUInt16LE(offset); offset += 2;
    const productCode = data.readUInt16LE(offset); offset += 2;
    const majorRev = data.readUInt8(offset); offset += 1;
    const minorRev = data.readUInt8(offset); offset += 1;
    const status = data.readUInt16LE(offset); offset += 2;
    const serialNum = data.readUInt32LE(offset).toString(16).toUpperCase().padStart(8, '0'); offset += 4;
    
    const nameLen = data.readUInt8(offset); offset += 1;
    const productName = data.subarray(offset, offset + nameLen).toString('utf8'); offset += nameLen;
    const state = offset < data.length ? data.readUInt8(offset) : 3;

    return {
      vendorId,
      vendorName: vendorId === 1 ? 'Rockwell Automation / Allen-Bradley' : vendorId === 283 ? 'SMC Pneumatics' : vendorId === 48 ? 'Turck' : `Vendor ID ${vendorId}`,
      deviceType,
      productCode,
      revision: { major: majorRev, minor: minorRev },
      status,
      serialNumber: `0x${serialNum}`,
      productName,
      state
    };
  }
}
