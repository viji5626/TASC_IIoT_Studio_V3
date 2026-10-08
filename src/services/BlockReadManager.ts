import { PollingTag } from './pollingManager';
import { parseMelsecAddress } from '../drivers/mitsubishi_melsec/melsecAddressParser';
import { parseS7Address } from '../drivers/siemens_s7/s7AddressParser';

export interface ModbusBlock {
  registerType: string;
  unitId: number;
  startAddress: number;
  count: number;
  tags: {
    tag: PollingTag;
    offset: number; // offset in WORDS (or BITS for coils) from startAddress
    byteSwap: boolean;
    wordSwap: boolean;
    dwordSwap: boolean;
  }[];
}

export interface MelsecBlock {
  deviceType: string;
  deviceCode: number;
  isBitDevice: boolean;
  startAddress: number;
  count: number;
  tags: {
    tag: PollingTag;
    offset: number;
    bitOffset: number;
    dataType: string;
    wordCount: number;
  }[];
}

export interface S7Block {
  area: 'DB' | 'I' | 'Q' | 'M' | 'T' | 'C';
  dbNumber: number;
  startByte: number;
  byteCount: number;
  tags: {
    tag: PollingTag;
    byteOffset: number;
    bitOffset: number;
    dataType: string;
    byteLength: number;
  }[];
}

export class BlockReadManager {
  
  static translateModbusAddress(address: number | string, zeroBased: boolean = true): number {
    const rawAddr = Number(address) || 0;
    if (rawAddr >= 400001 && rawAddr <= 499999) return rawAddr - 400001;
    if (rawAddr >= 300001 && rawAddr <= 399999) return rawAddr - 300001;
    if (rawAddr >= 100001 && rawAddr <= 199999) return rawAddr - 100001;
    if (rawAddr >= 40001 && rawAddr <= 49999) return rawAddr - 40001;
    if (rawAddr >= 30001 && rawAddr <= 39999) return rawAddr - 30001;
    if (rawAddr >= 10001 && rawAddr <= 19999) return rawAddr - 10001;
    if (rawAddr >= 40000 && rawAddr < 40001) return 0;
    
    if (!zeroBased && rawAddr > 0) {
      return rawAddr - 1;
    }
    return rawAddr;
  }

  static groupModbusTags(tags: PollingTag[]): ModbusBlock[] {
    const blocks: ModbusBlock[] = [];
    const MAX_REGISTERS = 120; // safe limit for TCP

    // Group by unitId + registerType
    const byGroup = new Map<string, PollingTag[]>();
    for (const t of tags) {
      const rType = t.tag.registerType || 'holding_register';
      const unitId = Number((t.tag?.slaveId !== undefined && t.tag?.slaveId !== null && t.tag?.slaveId !== 0) ? t.tag.slaveId : (t.connection?.unitId || 1));
      const key = `${unitId}_${rType}`;
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(t);
    }

    for (const [key, typeTags] of byGroup.entries()) {
      const [unitIdStr, regType] = key.split('_');
      const unitId = Number(unitIdStr);
      // Annotate each tag with its translated address and required word count
      const annotated = typeTags.map(t => {
        const zeroBased = t.tag?.zeroBasedAddressing !== undefined ? t.tag.zeroBasedAddressing : (t.connection?.zeroBasedAddressing !== false);
        const addr = this.translateModbusAddress(t.tag.address, zeroBased);
        const dataType = (t.tag.dataType || 'int16').toLowerCase();
        let wordCount = Number(t.tag.wordCount) || 1;
        if (dataType === 'int32' || dataType === 'uint32' || dataType === 'float') wordCount = 2;
        if (dataType === 'double') wordCount = 4;
        if (regType === 'coil' || regType === 'discrete_input') wordCount = 1; // 1 bit, but we sort by address
        return {
          tag: t,
          addr,
          wordCount,
          zeroBased,
          byteSwap: t.tag?.byteSwap !== undefined ? t.tag.byteSwap : (t.connection?.byteSwap || false),
          wordSwap: t.tag?.wordSwap !== undefined ? t.tag.wordSwap : (t.connection?.wordSwap || false),
          dwordSwap: t.tag?.dwordSwap !== undefined ? t.tag.dwordSwap : (t.connection?.dwordSwap || false),
        };
      });

      // Sort by address
      annotated.sort((a, b) => a.addr - b.addr);

      let currentBlock: ModbusBlock | null = null;

      for (const item of annotated) {
        if (!currentBlock) {
          currentBlock = {
            registerType: regType,
            unitId,
            startAddress: item.addr,
            count: item.wordCount,
            tags: [{
              tag: item.tag,
              offset: 0,
              byteSwap: item.byteSwap,
              wordSwap: item.wordSwap,
              dwordSwap: item.dwordSwap
            }]
          };
          blocks.push(currentBlock);
        } else {
          // Check if it fits in current block
          const isCoil = regType === 'coil' || regType === 'discrete_input';
          const maxGap = isCoil ? 800 : 10; // allow bigger gaps for coils
          const maxBlockSize = isCoil ? 1900 : MAX_REGISTERS;

          const distance = item.addr - (currentBlock.startAddress + currentBlock.count);
          const newTotalCount = (item.addr + item.wordCount) - currentBlock.startAddress;

          if (distance <= maxGap && newTotalCount <= maxBlockSize && item.addr >= currentBlock.startAddress) {
            // Merge into current block
            currentBlock.count = Math.max(currentBlock.count, newTotalCount);
            currentBlock.tags.push({
              tag: item.tag,
              offset: item.addr - currentBlock.startAddress, // offset in words/bits
              byteSwap: item.byteSwap,
              wordSwap: item.wordSwap,
              dwordSwap: item.dwordSwap
            });
          } else {
            // Create new block
            currentBlock = {
              registerType: regType,
              unitId,
              startAddress: item.addr,
              count: item.wordCount,
              tags: [{
                tag: item.tag,
                offset: 0,
                byteSwap: item.byteSwap,
                wordSwap: item.wordSwap,
                dwordSwap: item.dwordSwap
              }]
            };
            blocks.push(currentBlock);
          }
        }
      }
    }

    return blocks;
  }

  // -------------------------------------------------------------
  // MITSUBISHI MELSEC BLOCK GROUPING (MC Protocol / SLMP)
  // -------------------------------------------------------------
  static groupMelsecTags(tags: PollingTag[]): MelsecBlock[] {
    const blocks: MelsecBlock[] = [];
    const MAX_WORDS = 960; // 3E Binary frame limit
    const MAX_BITS = 7160;

    const byDevice = new Map<string, PollingTag[]>();
    for (const t of tags) {
      const rawAddr = t.tag?.melsecAddress || (t.tag?.address !== undefined ? `D${t.tag.address}` : '') || t.tag?.tagName || 'D0';
      const parsed = parseMelsecAddress(rawAddr, t.tag?.dataType);
      const key = `${parsed.deviceType}_${parsed.isBitDevice ? 'bit' : 'word'}`;
      if (!byDevice.has(key)) byDevice.set(key, []);
      byDevice.get(key)!.push(t);
    }

    for (const [key, devTags] of byDevice.entries()) {
      const annotated = devTags.map(t => {
        const rawAddr = t.tag?.melsecAddress || (t.tag?.address !== undefined ? `D${t.tag.address}` : '') || t.tag?.tagName || 'D0';
        const parsed = parseMelsecAddress(rawAddr, t.tag?.dataType);
        const dataType = (t.tag?.dataType || parsed.suggestedDataType || 'float').toLowerCase();
        let wordCount = 1;
        if (dataType === 'int32' || dataType === 'uint32' || dataType === 'float') wordCount = 2;
        if (dataType === 'double') wordCount = 4;
        if (parsed.isBitDevice) wordCount = 1;

        return {
          tag: t,
          parsed,
          addr: parsed.headDeviceNumber,
          wordCount,
          dataType
        };
      });

      annotated.sort((a, b) => a.addr - b.addr);

      let currentBlock: MelsecBlock | null = null;
      for (const item of annotated) {
        const maxBlockSize = item.parsed.isBitDevice ? MAX_BITS : MAX_WORDS;
        const maxGap = item.parsed.isBitDevice ? 100 : 10;

        if (!currentBlock) {
          currentBlock = {
            deviceType: item.parsed.deviceType,
            deviceCode: item.parsed.deviceCode,
            isBitDevice: item.parsed.isBitDevice,
            startAddress: item.addr,
            count: item.wordCount,
            tags: [{
              tag: item.tag,
              offset: 0,
              bitOffset: 0,
              dataType: item.dataType,
              wordCount: item.wordCount
            }]
          };
          blocks.push(currentBlock);
        } else {
          const distance = item.addr - (currentBlock.startAddress + currentBlock.count);
          const newTotalCount = (item.addr + item.wordCount) - currentBlock.startAddress;

          if (distance <= maxGap && newTotalCount <= maxBlockSize && item.addr >= currentBlock.startAddress) {
            currentBlock.count = Math.max(currentBlock.count, newTotalCount);
            currentBlock.tags.push({
              tag: item.tag,
              offset: item.addr - currentBlock.startAddress,
              bitOffset: 0,
              dataType: item.dataType,
              wordCount: item.wordCount
            });
          } else {
            currentBlock = {
              deviceType: item.parsed.deviceType,
              deviceCode: item.parsed.deviceCode,
              isBitDevice: item.parsed.isBitDevice,
              startAddress: item.addr,
              count: item.wordCount,
              tags: [{
                tag: item.tag,
                offset: 0,
                bitOffset: 0,
                dataType: item.dataType,
                wordCount: item.wordCount
              }]
            };
            blocks.push(currentBlock);
          }
        }
      }
    }

    return blocks;
  }

  // -------------------------------------------------------------
  // SIEMENS S7 BLOCK GROUPING (S7Comm / ISO-on-TCP)
  // -------------------------------------------------------------
  static groupS7Tags(tags: PollingTag[], maxBlockBytes: number = 460): S7Block[] {
    const blocks: S7Block[] = [];

    const byArea = new Map<string, PollingTag[]>();
    for (const t of tags) {
      const rawAddr = t.tag?.s7Address || `${t.tag?.s7Area || 'DB'}${t.tag?.dbNumber || 1}.DBD${t.tag?.byteOffset || 0}`;
      const parsed = parseS7Address(rawAddr, t.tag?.dataType);
      const key = `${parsed.area}_${parsed.dbNumber}`;
      if (!byArea.has(key)) byArea.set(key, []);
      byArea.get(key)!.push(t);
    }

    for (const [key, areaTags] of byArea.entries()) {
      const annotated = areaTags.map(t => {
        const rawAddr = t.tag?.s7Address || `${t.tag?.s7Area || 'DB'}${t.tag?.dbNumber || 1}.DBD${t.tag?.byteOffset || 0}`;
        const parsed = parseS7Address(rawAddr, t.tag?.dataType);
        const dataType = (t.tag?.dataType || parsed.suggestedDataType || 'float').toLowerCase();
        let byteLength = 4;
        if (dataType === 'boolean' || dataType === 'bool') byteLength = 1;
        else if (dataType === 'int16' || dataType === 'uint16') byteLength = 2;
        else if (dataType === 'int32' || dataType === 'uint32' || dataType === 'float') byteLength = 4;
        else if (dataType === 'double') byteLength = 8;
        else if (dataType === 'string') byteLength = Number(t.tag?.stringLength) || 256;

        return {
          tag: t,
          parsed,
          startByte: parsed.byteOffset,
          bitOffset: parsed.bitOffset,
          byteLength,
          dataType
        };
      });

      annotated.sort((a, b) => a.startByte - b.startByte);

      let currentBlock: S7Block | null = null;
      for (const item of annotated) {
        if (!currentBlock) {
          currentBlock = {
            area: item.parsed.area,
            dbNumber: item.parsed.dbNumber,
            startByte: item.startByte,
            byteCount: item.byteLength,
            tags: [{
              tag: item.tag,
              byteOffset: 0,
              bitOffset: item.bitOffset,
              dataType: item.dataType,
              byteLength: item.byteLength
            }]
          };
          blocks.push(currentBlock);
        } else {
          const distance = item.startByte - (currentBlock.startByte + currentBlock.byteCount);
          const newTotalBytes = (item.startByte + item.byteLength) - currentBlock.startByte;

          if (distance <= 16 && newTotalBytes <= maxBlockBytes && item.startByte >= currentBlock.startByte) {
            currentBlock.byteCount = Math.max(currentBlock.byteCount, newTotalBytes);
            currentBlock.tags.push({
              tag: item.tag,
              byteOffset: item.startByte - currentBlock.startByte,
              bitOffset: item.bitOffset,
              dataType: item.dataType,
              byteLength: item.byteLength
            });
          } else {
            currentBlock = {
              area: item.parsed.area,
              dbNumber: item.parsed.dbNumber,
              startByte: item.startByte,
              byteCount: item.byteLength,
              tags: [{
                tag: item.tag,
                byteOffset: 0,
                bitOffset: item.bitOffset,
                dataType: item.dataType,
                byteLength: item.byteLength
              }]
            };
            blocks.push(currentBlock);
          }
        }
      }
    }

    return blocks;
  }
}
