import {
  GsdDeviceProfile,
  GsdModule,
  GsdSubmodule,
  GsdDataItem,
  GsdDapItem,
  GsdDeviceCategory
} from '../../types/gsd';
import { DriverTag, DriverTagDataType } from '../../types/driver';

/**
 * Parses PROFINET XML GSDML files (V2.0 to V2.45)
 */
export function parseProfinetGsdml(xmlContent: string, fileName?: string): GsdDeviceProfile {
  let vendorName = 'Unknown Vendor';
  let modelName = 'PROFINET IO Device';
  let orderNumber = '';
  let vendorIdHex = '0x0000';
  let deviceIdHex = '0x0000';
  let gsdmlVersion = 'V2.35';
  let category: GsdDeviceCategory = 'general_fieldbus';

  // 1. Build Multi-Language Text Dictionary from <ExternalTextList>
  const textDict = buildExternalTextDictionary(xmlContent);

  // 2. Extract Device Identity
  const devIdMatch = xmlContent.match(/<DeviceIdentity\s+VendorID=["'](0x[0-9a-fA-F]+|\d+)["']\s+DeviceID=["'](0x[0-9a-fA-F]+|\d+)["']/i);
  if (devIdMatch) {
    vendorIdHex = devIdMatch[1].startsWith('0x') ? devIdMatch[1].toUpperCase() : `0x${parseInt(devIdMatch[1], 10).toString(16).toUpperCase()}`;
    deviceIdHex = devIdMatch[2].startsWith('0x') ? devIdMatch[2].toUpperCase() : `0x${parseInt(devIdMatch[2], 10).toString(16).toUpperCase()}`;
  }

  // Extract GSDML Scheme Version
  const schemaMatch = xmlContent.match(/GSDML-V(\d+\.\d+)/i) || xmlContent.match(/SchemaVersion=["']([^"']+)["']/i);
  if (schemaMatch) {
    gsdmlVersion = `V${schemaMatch[1]}`;
  }

  // Extract Vendor Name from <DeviceIdentity> -> <VendorName Value="..." />
  const vendorMatch = xmlContent.match(/<VendorName\s+Value=["']([^"']+)["']/i);
  if (vendorMatch) {
    vendorName = vendorMatch[1].trim();
  }

  // 3. Extract Device Access Points (DAP List)
  const dapList = extractDapList(xmlContent, textDict);
  if (dapList.length > 0) {
    modelName = dapList[0].dapName;
    orderNumber = dapList[0].orderNumber || '';
  }

  // 4. Extract Modules and Submodules
  const modules = extractModulesAndSubmodules(xmlContent, textDict);

  // 5. Categorize Device
  category = detectCategory(vendorName, modelName, modules, fileName);

  let totalInputBytes = 0;
  let totalOutputBytes = 0;
  modules.forEach(m => {
    totalInputBytes += m.inputLengthBytes;
    totalOutputBytes += m.outputLengthBytes;
  });

  const profileId = `pn_gsdml_${vendorIdHex.toLowerCase().replace('0x', '')}_${deviceIdHex.toLowerCase().replace('0x', '')}_${Date.now()}`;

  return {
    profileId,
    standard: 'profinet_gsdml',
    category,
    vendorName,
    modelName,
    orderNumber,
    vendorIdHex,
    deviceIdHex,
    gsdmlVersion,
    dapList,
    selectedDapId: dapList[0]?.dapId,
    modules,
    totalInputBytes,
    totalOutputBytes,
    sourceFileName: fileName || 'device.xml',
    createdAt: new Date().toISOString()
  };
}

/**
 * Builds text lookup dictionary from <ExternalTextList>
 */
function buildExternalTextDictionary(xml: string): Record<string, string> {
  const dict: Record<string, string> = {};
  const textMatches = xml.matchAll(/<Text\s+TextId=["']([^"']+)["']\s+Value=["']([^"']+)["']/gi);
  for (const m of textMatches) {
    dict[m[1]] = m[2].trim();
  }
  return dict;
}

function resolveText(textIdOrVal: string | undefined, dict: Record<string, string>, fallback: string): string {
  if (!textIdOrVal) return fallback;
  if (dict[textIdOrVal]) return dict[textIdOrVal];
  return textIdOrVal;
}

/**
 * Extracts all DeviceAccessPointItem (DAP) variants
 */
function extractDapList(xml: string, dict: Record<string, string>): GsdDapItem[] {
  const daps: GsdDapItem[] = [];
  const dapMatches = xml.matchAll(/<DeviceAccessPointItem\s+([^>]+)>([\s\S]*?)<\/DeviceAccessPointItem>/gi);

  for (const match of dapMatches) {
    const attrStr = match[1];
    const innerXml = match[2];

    const idMatch = attrStr.match(/ID=["']([^"']+)["']/i);
    const dapId = idMatch ? idMatch[1] : `DAP_${daps.length + 1}`;

    const orderMatch = innerXml.match(/<OrderNumber\s+Value=["']([^"']+)["']/i);
    const orderNumber = orderMatch ? orderMatch[1].trim() : '';

    const nameMatch = innerXml.match(/<Name\s+TextId=["']([^"']+)["']/i) || innerXml.match(/<Name\s+Value=["']([^"']+)["']/i);
    const rawName = nameMatch ? (nameMatch[1] || nameMatch[2]) : dapId;
    const dapName = resolveText(rawName, dict, dapId);

    const descMatch = innerXml.match(/<InfoText\s+TextId=["']([^"']+)["']/i);
    const description = descMatch ? resolveText(descMatch[1], dict, '') : undefined;

    daps.push({
      dapId,
      dapName,
      orderNumber,
      description,
      isDefault: daps.length === 0
    });
  }

  return daps;
}

/**
 * Extracts Modules, Submodules, and DataItems from GSDML
 */
function extractModulesAndSubmodules(xml: string, dict: Record<string, string>): GsdModule[] {
  const modules: GsdModule[] = [];
  const moduleItemMatches = xml.matchAll(/<ModuleItem\s+([^>]+)>([\s\S]*?)<\/ModuleItem>/gi);

  let slotCounter = 1;

  for (const mMatch of moduleItemMatches) {
    const mAttr = mMatch[1];
    const mInner = mMatch[2];

    const modIdMatch = mAttr.match(/ID=["']([^"']+)["']/i);
    const moduleId = modIdMatch ? modIdMatch[1] : `Module_${slotCounter}`;

    const nameMatch = mInner.match(/<Name\s+TextId=["']([^"']+)["']/i) || mInner.match(/<Name\s+Value=["']([^"']+)["']/i);
    const rawModName = nameMatch ? (nameMatch[1] || nameMatch[2]) : moduleId;
    const moduleName = resolveText(rawModName, dict, moduleId);

    const orderMatch = mInner.match(/<OrderNumber\s+Value=["']([^"']+)["']/i);
    const orderNumber = orderMatch ? orderMatch[1].trim() : '';

    // Extract Submodules
    const submodules: GsdSubmodule[] = [];
    const subMatches = mInner.matchAll(/<SubmoduleItem\s+([^>]+)>([\s\S]*?)<\/SubmoduleItem>/gi);

    let subslotCounter = 1;
    let modInBytes = 0;
    let modOutBytes = 0;

    for (const sMatch of subMatches) {
      const sAttr = sMatch[1];
      const sInner = sMatch[2];

      const subIdMatch = sAttr.match(/ID=["']([^"']+)["']/i);
      const submoduleId = subIdMatch ? subIdMatch[1] : `Sub_${slotCounter}_${subslotCounter}`;

      const sNameMatch = sInner.match(/<Name\s+TextId=["']([^"']+)["']/i) || sInner.match(/<Name\s+Value=["']([^"']+)["']/i);
      const rawSubName = sNameMatch ? (sNameMatch[1] || sNameMatch[2]) : submoduleId;
      const submoduleName = resolveText(rawSubName, dict, submoduleId);

      // Parse IOData -> Input & Output
      const { inputBytes, outputBytes, dataItems } = parseSubmoduleIoData(sInner, dict, slotCounter, subslotCounter, moduleName);

      modInBytes += inputBytes;
      modOutBytes += outputBytes;

      submodules.push({
        subslot: subslotCounter,
        submoduleId,
        submoduleName,
        inputLengthBytes: inputBytes,
        outputLengthBytes: outputBytes,
        dataItems
      });

      subslotCounter++;
    }

    // If no explicit SubmoduleItems found, look for direct <IOData> in ModuleItem
    if (submodules.length === 0) {
      const { inputBytes, outputBytes, dataItems } = parseSubmoduleIoData(mInner, dict, slotCounter, 1, moduleName);
      modInBytes = inputBytes;
      modOutBytes = outputBytes;
      submodules.push({
        subslot: 1,
        submoduleId: `Sub_${slotCounter}_1`,
        submoduleName: moduleName,
        inputLengthBytes: inputBytes,
        outputLengthBytes: outputBytes,
        dataItems
      });
    }

    modules.push({
      slot: slotCounter,
      moduleId,
      moduleName,
      orderNumber,
      inputLengthBytes: modInBytes,
      outputLengthBytes: modOutBytes,
      submodules
    });

    slotCounter++;
  }

  return modules;
}

/**
 * Parses <IOData> elements into structured GsdDataItem array
 */
function parseSubmoduleIoData(
  xml: string,
  dict: Record<string, string>,
  slot: number,
  subslot: number,
  moduleName: string
): { inputBytes: number; outputBytes: number; dataItems: GsdDataItem[] } {
  let inputBytes = 0;
  let outputBytes = 0;
  const dataItems: GsdDataItem[] = [];

  // Parse Inputs
  const inputBlockMatch = xml.match(/<Input>([\s\S]*?)<\/Input>/i);
  if (inputBlockMatch) {
    const inDataItems = parseDataItemList(inputBlockMatch[1], dict, 'input', slot, subslot, moduleName);
    dataItems.push(...inDataItems.items);
    inputBytes = inDataItems.totalBytes;
  }

  // Parse Outputs
  const outputBlockMatch = xml.match(/<Output>([\s\S]*?)<\/Output>/i);
  if (outputBlockMatch) {
    const outDataItems = parseDataItemList(outputBlockMatch[1], dict, 'output', slot, subslot, moduleName);
    dataItems.push(...outDataItems.items);
    outputBytes = outDataItems.totalBytes;
  }

  return { inputBytes, outputBytes, dataItems };
}

function parseDataItemList(
  xml: string,
  dict: Record<string, string>,
  direction: 'input' | 'output',
  slot: number,
  subslot: number,
  moduleName: string
): { items: GsdDataItem[]; totalBytes: number } {
  const items: GsdDataItem[] = [];
  const dataItemMatches = xml.matchAll(/<DataItem\s+([^>]+)(?:\/>|>([\s\S]*?)<\/DataItem>)/gi);

  let byteOffset = 0;

  for (const match of dataItemMatches) {
    const attr = match[1];
    const inner = match[2] || '';

    const dtMatch = attr.match(/DataType=["']([^"']+)["']/i);
    const rawDt = dtMatch ? dtMatch[1] : 'Unsigned8';
    const lengthMatch = attr.match(/Length=["'](\d+)["']/i);
    const length = lengthMatch ? parseInt(lengthMatch[1], 10) : 1;

    const textMatch = attr.match(/TextId=["']([^"']+)["']/i);
    const itemName = resolveText(textMatch ? textMatch[1] : undefined, dict, `${moduleName} ${direction === 'input' ? 'In' : 'Out'} Data`);

    const mappedType = mapGsdmlDataType(rawDt, length);
    const itemBytes = getDataTypeByteSize(rawDt, length);

    // Check for Bitfields
    const bitfieldMatches = inner.matchAll(/<Bit\s+BitOffset=["'](\d+)["']\s+TextId=["']([^"']+)["']/gi);
    let hasBits = false;

    for (const bMatch of bitfieldMatches) {
      hasBits = true;
      const bitOffset = parseInt(bMatch[1], 10);
      const bitName = resolveText(bMatch[2], dict, `Bit_${bitOffset}`);
      items.push({
        itemId: `item_s${slot}_sub${subslot}_${direction}_b${byteOffset}_bit${bitOffset}`,
        name: `${itemName} - ${bitName}`,
        dataType: 'boolean',
        direction,
        byteOffset,
        bitOffset,
        bitLength: 1,
        bitMask: 1 << bitOffset,
        lengthBytes: 1
      });
    }

    if (!hasBits) {
      // Check for specialized 3rd-party signatures
      const isDynamicString = rawDt.toLowerCase().includes('octetstring') || rawDt.toLowerCase().includes('visiblestring') || itemName.toLowerCase().includes('barcode') || itemName.toLowerCase().includes('result string');
      const isRobotAxis = itemName.match(/Cartesian|Joint|Axis\s*([X|Y|Z|A|B|C]|J[1-6])/i);

      items.push({
        itemId: `item_s${slot}_sub${subslot}_${direction}_b${byteOffset}`,
        name: itemName,
        dataType: mappedType,
        direction,
        byteOffset,
        lengthBytes: itemBytes,
        isLengthTrimmedString: isDynamicString,
        isKinematicCoordinate: !!isRobotAxis,
        axisName: isRobotAxis ? (isRobotAxis[1].toUpperCase() as any) : undefined
      });
    }

    byteOffset += itemBytes;
  }

  // Fallback if no explicit DataItem nodes
  if (items.length === 0) {
    items.push({
      itemId: `item_s${slot}_sub${subslot}_${direction}_b0`,
      name: `${moduleName} Process ${direction === 'input' ? 'Input' : 'Output'}`,
      dataType: 'uint16',
      direction,
      byteOffset: 0,
      lengthBytes: 2
    });
    byteOffset = 2;
  }

  return { items, totalBytes: byteOffset };
}

function mapGsdmlDataType(rawDt: string, length: number): DriverTagDataType {
  const dt = rawDt.toLowerCase();
  if (dt === 'bit' || dt === 'boolean') return 'boolean';
  if (dt === 'integer8' || dt === 'int8') return 'int16';
  if (dt === 'integer16' || dt === 'int16') return 'int16';
  if (dt === 'integer32' || dt === 'int32') return 'int32';
  if (dt === 'unsigned8' || dt === 'uint8') return 'uint16';
  if (dt === 'unsigned16' || dt === 'uint16') return 'uint16';
  if (dt === 'unsigned32' || dt === 'uint32') return 'uint32';
  if (dt === 'float32' || dt === 'real' || dt === 'float') return 'float';
  if (dt === 'float64' || dt === 'double') return 'double';
  if (dt === 'visiblestring' || dt === 'octetstring' || length > 4) return 'string';
  return 'uint16';
}

function getDataTypeByteSize(rawDt: string, length: number): number {
  const dt = rawDt.toLowerCase();
  if (dt === 'bit' || dt === 'boolean' || dt === 'unsigned8' || dt === 'integer8' || dt === 'octet') return 1;
  if (dt === 'unsigned16' || dt === 'integer16') return 2;
  if (dt === 'unsigned32' || dt === 'integer32' || dt === 'float32' || dt === 'real') return 4;
  if (dt === 'float64' || dt === 'double') return 8;
  if (dt === 'visiblestring' || dt === 'octetstring') return length || 1;
  return length || 2;
}

function detectCategory(vendor: string, model: string, modules: GsdModule[], fileName?: string): GsdDeviceCategory {
  const combined = `${vendor} ${model} ${fileName || ''}`.toLowerCase();
  if (combined.includes('dataman') || combined.includes('lector') || combined.includes('barcode') || combined.includes('qr') || combined.includes('sr-') || combined.includes('scanner')) {
    return 'barcode_scanner';
  }
  if (combined.includes('kuka') || combined.includes('fanuc') || combined.includes('robot') || combined.includes('yaskawa') || combined.includes('motoman') || combined.includes('abb irc') || combined.includes('omnicore')) {
    return 'robot';
  }
  if (combined.includes('vision') || combined.includes('camera') || combined.includes('insight') || combined.includes('smartcamera')) {
    return 'vision_sensor';
  }
  if (combined.includes('vlt') || combined.includes('acs') || combined.includes('drive') || combined.includes('inverter') || combined.includes('powerflex') || combined.includes('sinamics')) {
    return 'drive';
  }
  if (combined.includes('cpx') || combined.includes('valve') || combined.includes('mpa') || combined.includes('manifold') || combined.includes('ex260')) {
    return 'valve_manifold';
  }
  if (combined.includes('et 200') || combined.includes('wago') || combined.includes('slice') || combined.includes('block io') || combined.includes('tben')) {
    return 'io_slice';
  }
  return 'general_fieldbus';
}

/**
 * Generates DriverTag definitions from a parsed PROFINET GSDML Device Profile
 */
export function generateTagsFromGsdmlProfile(
  profile: GsdDeviceProfile,
  connectionId: string,
  options?: {
    tagPrefix?: string;
  }
): DriverTag[] {
  const tags: DriverTag[] = [];
  const prefix = options?.tagPrefix ? `${options.tagPrefix}_` : '';

  profile.modules.forEach(mod => {
    mod.submodules.forEach(sub => {
      sub.dataItems.forEach(item => {
        const cleanName = `${prefix}${mod.moduleName.replace(/[^a-zA-Z0-9_]/g, '_')}_${item.name.replace(/[^a-zA-Z0-9_]/g, '_')}`;

        const tag: DriverTag = {
          tagId: `tag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          tagName: cleanName,
          protocol: 'profinet',
          sourceType: 'generated',
          connectionId,
          dataType: item.dataType,
          accessType: item.direction === 'output' ? 'read-write' : 'read',
          pollRate: 100,
          enabled: true,
          unit: item.unit,
          description: item.description || `${profile.vendorName} ${profile.modelName} [Slot ${mod.slot}, Subslot ${sub.subslot}]`,
          // PROFINET properties
          pnSlot: mod.slot,
          pnSubslot: sub.subslot,
          pnIoDirection: item.direction,
          pnByteOffset: item.byteOffset,
          pnBitOffset: item.bitOffset,
          pnBitLength: item.bitLength,
          pnBitMask: item.bitMask,
          pnStringTrimLength: item.isLengthTrimmedString,
          createdAt: new Date().toISOString()
        };

        tags.push(tag);
      });
    });
  });

  return tags;
}
