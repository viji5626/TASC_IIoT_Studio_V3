import { GsdDeviceProfile, GsdModule, GsdSubmodule, GsdDataItem, GsdDeviceCategory } from '../../types/gsd';
import { DriverTag, DriverTagDataType } from '../../types/driver';

/**
 * Parses classic PROFIBUS DP ASCII GSD files (.gsd, .gse, .gsg, .gsf)
 */
export function parseProfibusGsd(gsdContent: string, fileName?: string): GsdDeviceProfile {
  const lines = gsdContent.split(/\r?\n/);
  
  let vendorName = 'Unknown Vendor';
  let modelName = 'PROFIBUS DP Slave';
  let orderNumber = '';
  let identNumberHex = '0x0000';
  let gsdRevision = '1.0';
  let category: GsdDeviceCategory = 'general_fieldbus';
  const supportedBaudRates: string[] = [];

  const modules: GsdModule[] = [];
  let currentSlot = 1;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    // Strip comments
    const commentIdx = line.indexOf(';');
    if (commentIdx >= 0) {
      line = line.substring(0, commentIdx).trim();
    }
    if (!line) continue;

    const lowerLine = line.toLowerCase();

    // Vendor Name
    if (lowerLine.startsWith('vendor_name')) {
      const match = line.match(/vendor_name\s*=\s*["']?([^"']+)["']?/i);
      if (match) vendorName = match[1].trim();
    }
    // Model Name
    else if (lowerLine.startsWith('model_name')) {
      const match = line.match(/model_name\s*=\s*["']?([^"']+)["']?/i);
      if (match) modelName = match[1].trim();
    }
    // Order Number
    else if (lowerLine.startsWith('order_number') || lowerLine.startsWith('order_no')) {
      const match = line.match(/order_nu?m?b?e?r?\s*=\s*["']?([^"']+)["']?/i);
      if (match) orderNumber = match[1].trim();
    }
    // Ident Number
    else if (lowerLine.startsWith('ident_number')) {
      const match = line.match(/ident_number\s*=\s*(0x[0-9a-fA-F]+|\d+)/i);
      if (match) {
        const val = match[1].startsWith('0x') ? match[1] : `0x${parseInt(match[1], 10).toString(16).toUpperCase().padStart(4, '0')}`;
        identNumberHex = val.toUpperCase();
      }
    }
    // GSD Revision
    else if (lowerLine.startsWith('gsd_revision')) {
      const match = line.match(/gsd_revision\s*=\s*(\d+)/i);
      if (match) gsdRevision = `Rev ${match[1]}`;
    }
    // Baud Rates
    else if (lowerLine.includes('_supp') && lowerLine.includes('=') && lowerLine.includes('1')) {
      if (lowerLine.includes('9.6_supp')) supportedBaudRates.push('9.6k');
      if (lowerLine.includes('19.2_supp')) supportedBaudRates.push('19.2k');
      if (lowerLine.includes('93.75_supp')) supportedBaudRates.push('93.75k');
      if (lowerLine.includes('187.5_supp')) supportedBaudRates.push('187.5k');
      if (lowerLine.includes('500_supp')) supportedBaudRates.push('500k');
      if (lowerLine.includes('1.5m_supp')) supportedBaudRates.push('1.5M');
      if (lowerLine.includes('3m_supp')) supportedBaudRates.push('3M');
      if (lowerLine.includes('6m_supp')) supportedBaudRates.push('6M');
      if (lowerLine.includes('12m_supp')) supportedBaudRates.push('12M');
    }
    // Slave Family / Category heuristic
    else if (lowerLine.startsWith('slave_family')) {
      if (lowerLine.includes('drive') || lowerLine.includes('converter')) category = 'drive';
      else if (lowerLine.includes('robot')) category = 'robot';
      else if (lowerLine.includes('ident') || lowerLine.includes('scanner') || lowerLine.includes('barcode')) category = 'barcode_scanner';
      else if (lowerLine.includes('valve') || lowerLine.includes('pneumatic')) category = 'valve_manifold';
      else if (lowerLine.includes('io') || lowerLine.includes('modular') || lowerLine.includes('et 200')) category = 'io_slice';
    }
    // Module Definition: Module = "Name" 0x10, 0x20...
    else if (lowerLine.startsWith('module') && line.includes('=')) {
      const parsedModule = parseGsdModuleLine(line, currentSlot);
      if (parsedModule) {
        modules.push(parsedModule);
        currentSlot++;
      }
    }
  }

  // Fallback category heuristic from Model/Vendor name
  if (category === 'general_fieldbus') {
    const combined = `${vendorName} ${modelName} ${fileName || ''}`.toLowerCase();
    if (combined.includes('dataman') || combined.includes('lector') || combined.includes('barcode') || combined.includes('qr') || combined.includes('sr-')) {
      category = 'barcode_scanner';
    } else if (combined.includes('kuka') || combined.includes('fanuc') || combined.includes('robot') || combined.includes('yaskawa') || combined.includes('motoman')) {
      category = 'robot';
    } else if (combined.includes('vlt') || combined.includes('acs') || combined.includes('drive') || combined.includes('inverter') || combined.includes('powerflex')) {
      category = 'drive';
    } else if (combined.includes('cpx') || combined.includes('valve') || combined.includes('mpa') || combined.includes('manifold')) {
      category = 'valve_manifold';
    } else if (combined.includes('et 200') || combined.includes('wago') || combined.includes('slice') || combined.includes('block io') || combined.includes('tben')) {
      category = 'io_slice';
    }
  }

  let totalInputBytes = 0;
  let totalOutputBytes = 0;
  modules.forEach(m => {
    totalInputBytes += m.inputLengthBytes;
    totalOutputBytes += m.outputLengthBytes;
  });

  const profileId = `pb_gsd_${identNumberHex.toLowerCase().replace('0x', '')}_${Date.now()}`;

  return {
    profileId,
    standard: 'profibus_gsd',
    category,
    vendorName,
    modelName,
    orderNumber,
    identNumberHex,
    gsdRevision,
    supportedBaudRates: supportedBaudRates.length > 0 ? supportedBaudRates : ['9.6k', '19.2k', '93.75k', '187.5k', '500k', '1.5M', '12M'],
    modules,
    totalInputBytes,
    totalOutputBytes,
    sourceFileName: fileName || 'device.gsd',
    createdAt: new Date().toISOString()
  };
}

/**
 * Parses a DP Module line e.g.:
 * Module = "8 DI DC24V" 0x10
 * Module = "4 DO DC24V/0.5A" 0x20
 * Module = "PPO Type 1" 0x73, 0xF3
 */
function parseGsdModuleLine(line: string, slot: number): GsdModule | null {
  const match = line.match(/module\s*=\s*["']([^"']+)["']\s*(.*)/i);
  if (!match) return null;

  const moduleName = match[1].trim();
  const hexPart = match[2].trim();

  // Extract config hex bytes
  const hexTokens = hexPart.match(/0x[0-9a-fA-F]+|\d+/g) || [];
  const configBytes = hexTokens.map(t => t.startsWith('0x') ? parseInt(t, 16) : parseInt(t, 10));

  let inputLengthBytes = 0;
  let outputLengthBytes = 0;
  const dataItems: GsdDataItem[] = [];

  let inOffset = 0;
  let outOffset = 0;

  for (let i = 0; i < configBytes.length; i++) {
    const b = configBytes[i];

    // Simple 1-Byte Config Format
    // Bits 5-4: Direction (00: special/free, 01: Input, 10: Output, 11: In/Out)
    // Bit 6: Length format (0: Byte, 1: Word)
    // Bits 3-0: Length (0..15 represents 1..16 units)
    if ((b & 0xC0) === 0x00 || (b & 0xC0) === 0x40 || (b & 0xC0) === 0x80 || (b & 0xC0) === 0xC0) {
      const isWord = (b & 0x40) !== 0;
      const lengthCount = (b & 0x0F) + 1;
      const unitBytes = isWord ? 2 : 1;
      const totalBytes = lengthCount * unitBytes;

      const directionCode = (b & 0x30) >> 4;
      if (directionCode === 1) {
        // Input
        inputLengthBytes += totalBytes;
        for (let u = 0; u < lengthCount; u++) {
          dataItems.push({
            itemId: `item_s${slot}_in_${inOffset}`,
            name: `${moduleName} In_${isWord ? 'Word' : 'Byte'}_${u}`,
            dataType: isWord ? 'uint16' : (totalBytes === 1 ? 'boolean' : 'uint16'),
            direction: 'input',
            byteOffset: inOffset,
            lengthBytes: unitBytes
          });
          inOffset += unitBytes;
        }
      } else if (directionCode === 2) {
        // Output
        outputLengthBytes += totalBytes;
        for (let u = 0; u < lengthCount; u++) {
          dataItems.push({
            itemId: `item_s${slot}_out_${outOffset}`,
            name: `${moduleName} Out_${isWord ? 'Word' : 'Byte'}_${u}`,
            dataType: isWord ? 'uint16' : (totalBytes === 1 ? 'boolean' : 'uint16'),
            direction: 'output',
            byteOffset: outOffset,
            lengthBytes: unitBytes
          });
          outOffset += unitBytes;
        }
      } else if (directionCode === 3) {
        // In/Out
        inputLengthBytes += totalBytes;
        outputLengthBytes += totalBytes;
        inOffset += totalBytes;
        outOffset += totalBytes;
      }
    }
  }

  // If no config bytes parsed, default to 2 bytes In/Out
  if (inputLengthBytes === 0 && outputLengthBytes === 0) {
    inputLengthBytes = 2;
    outputLengthBytes = 2;
    dataItems.push({
      itemId: `item_s${slot}_in_0`,
      name: `${moduleName} Process Input`,
      dataType: 'uint16',
      direction: 'input',
      byteOffset: 0,
      lengthBytes: 2
    });
  }

  const submodule: GsdSubmodule = {
    subslot: 1,
    submoduleId: `sub_s${slot}_1`,
    submoduleName: moduleName,
    inputLengthBytes,
    outputLengthBytes,
    dataItems
  };

  return {
    slot,
    moduleId: `mod_s${slot}`,
    moduleName,
    inputLengthBytes,
    outputLengthBytes,
    submodules: [submodule]
  };
}

/**
 * Generates DriverTag definitions from a parsed GSD Device Profile
 */
export function generateTagsFromGsdProfile(
  profile: GsdDeviceProfile,
  connectionId: string,
  targetProtocol: 'profibus' | 'profinet',
  options?: {
    nodeAddress?: number;
    tagPrefix?: string;
  }
): DriverTag[] {
  const tags: DriverTag[] = [];
  const prefix = options?.tagPrefix ? `${options.tagPrefix}_` : '';
  const nodeAddress = options?.nodeAddress ?? 3;

  profile.modules.forEach(mod => {
    mod.submodules.forEach(sub => {
      sub.dataItems.forEach(item => {
        const cleanName = `${prefix}${mod.moduleName.replace(/[^a-zA-Z0-9_]/g, '_')}_${item.name.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        
        const tag: DriverTag = {
          tagId: `tag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          tagName: cleanName,
          protocol: targetProtocol,
          sourceType: 'generated',
          connectionId,
          dataType: item.dataType,
          accessType: item.direction === 'output' ? 'read-write' : 'read',
          pollRate: 100,
          enabled: true,
          unit: item.unit,
          description: item.description || `${profile.vendorName} ${profile.modelName} [Slot ${mod.slot}, Subslot ${sub.subslot}]`,
          // PROFINET / PROFIBUS properties
          pnSlot: mod.slot,
          pnSubslot: sub.subslot,
          pnIoDirection: item.direction,
          pnByteOffset: item.byteOffset,
          pnBitOffset: item.bitOffset,
          pnBitLength: item.bitLength,
          pnBitMask: item.bitMask,
          profibusNodeAddress: targetProtocol === 'profibus' ? nodeAddress : undefined,
          createdAt: new Date().toISOString()
        };

        tags.push(tag);
      });
    });
  });

  return tags;
}
