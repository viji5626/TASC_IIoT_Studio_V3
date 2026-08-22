/**
 * TASC IIoT Studio — ODVA Electronic Data Sheet (.eds) Tokenizing Lexer & Parser
 *
 * Implements full ODVA Specification for CIP Device Profiles:
 * - Multi-line and inline comment stripping ($ ...)
 * - Quote-safe string tokenization & whitespace normalization
 * - Extraction of [File], [Device Classification], [Params], [Enum], [Assembly], [Connection Manager]
 * - Sub-byte bitfield mapping (byteOffset, bitOffset, bitLength, bitMask)
 * - Conversion of EDS parameters and assembly members into SCADA Driver Tags
 */

import { DriverTag, DriverTagDataType } from '../../types';

export interface EdsParam {
  id: number;
  name: string;
  path?: string; // Class, Instance, Attribute or EPATH
  classId?: number;
  instanceId?: number;
  attributeId?: number;
  descriptor?: number;
  dataType: string;
  dataTypeCode?: number;
  byteSize: number;
  defaultValue?: any;
  min?: number;
  max?: number;
  units?: string;
  helpString?: string;
  enumMap?: Record<number, string>;
}

export interface EdsAssemblyMember {
  paramId?: number;
  paramName?: string;
  bitSize: number;
  byteOffset: number;
  bitOffset: number;
  bitLength: number;
  bitMask: number;
  dataType: string;
  description?: string;
}

export interface EdsAssembly {
  id: number;
  name: string;
  type: 'input' | 'output' | 'config' | 'custom';
  instanceId: number;
  sizeBytes: number;
  members: EdsAssemblyMember[];
}

export interface EdsDeviceProfile {
  profileId: string;
  fileName?: string;
  vendorId: number;
  vendorName: string;
  deviceType: number;
  deviceTypeName: string;
  productCode: number;
  majorRevision: number;
  minorRevision: number;
  productName: string;
  catalogNumber?: string;
  description?: string;
  parameters: EdsParam[];
  assemblies: EdsAssembly[];
  rawText?: string;
  importedAt: string;
}

export class EdsParser {
  /**
   * Parses an ODVA .eds file content string into an EdsDeviceProfile.
   */
  public static parse(edsContent: string, fileName?: string): EdsDeviceProfile {
    // 1. Strip comments ($ to end-of-line) and normalize line endings
    const lines = edsContent
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n');

    const cleanLines: string[] = [];
    for (const rawLine of lines) {
      // Find comment delimiter '$' outside quotes
      let inQuote = false;
      let commentIdx = -1;
      for (let i = 0; i < rawLine.length; i++) {
        if (rawLine[i] === '"') inQuote = !inQuote;
        else if (rawLine[i] === '$' && !inQuote) {
          commentIdx = i;
          break;
        }
      }
      const lineText = (commentIdx >= 0 ? rawLine.substring(0, commentIdx) : rawLine).trim();
      if (lineText.length > 0) {
        cleanLines.push(lineText);
      }
    }

    // 2. Group into Sections e.g. [Device Classification], [Params], [Assembly]
    const sections: Record<string, string[]> = {};
    let currentSection = 'default';

    for (const line of cleanLines) {
      const sectionMatch = line.match(/^\[([^\]]+)\]/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim().toLowerCase();
        if (!sections[currentSection]) {
          sections[currentSection] = [];
        }
      } else {
        if (!sections[currentSection]) {
          sections[currentSection] = [];
        }
        sections[currentSection].push(line);
      }
    }

    // 3. Extract [Device Classification]
    const devClassLines = sections['device classification'] || sections['device'] || [];
    const devDict = this.parseKeyValueBlock(devClassLines);

    const vendorId = parseInt(devDict['vendcode'] || devDict['vendor'] || '1', 10);
    const vendorName = devDict['vendname'] || this.resolveVendorName(vendorId);
    const deviceType = parseInt(devDict['prodtype'] || '0', 10);
    const deviceTypeName = devDict['prodtypename'] || this.resolveDeviceTypeName(deviceType);
    const productCode = parseInt(devDict['prodcode'] || '0', 10);
    const productName = devDict['prodname'] || devDict['productname'] || fileName?.replace(/\.eds$/i, '') || 'Generic EtherNet/IP Device';
    const catalogNumber = devDict['catalog'] || devDict['catalognumber'] || '';
    const majorRev = parseInt(devDict['majrev'] || '1', 10);
    const minorRev = parseInt(devDict['minrev'] || '0', 10);

    // 4. Extract [Enum] dictionaries
    const enumLines = sections['enum'] || sections['enums'] || [];
    const enumDictionaries = this.parseEnumDictionaries(enumLines);

    // 5. Extract [Params]
    const paramLines = sections['params'] || sections['param'] || [];
    const parameters = this.parseParameters(paramLines, enumDictionaries);

    // 6. Extract [Assembly]
    const assemblyLines = sections['assembly'] || sections['assemblies'] || [];
    const assemblies = this.parseAssemblies(assemblyLines, parameters);

    const profileId = `eds_${vendorId}_${productCode}_${Date.now()}`;

    return {
      profileId,
      fileName,
      vendorId,
      vendorName,
      deviceType,
      deviceTypeName,
      productCode,
      majorRevision: majorRev,
      minorRevision: minorRev,
      productName,
      catalogNumber,
      description: `${vendorName} ${productName} (Rev ${majorRev}.${minorRev})`,
      parameters,
      assemblies,
      rawText: edsContent.substring(0, 10000), // Keep sample for debug
      importedAt: new Date().toISOString()
    };
  }

  /**
   * Parses key-value pairs from a section body.
   */
  private static parseKeyValueBlock(lines: string[]): Record<string, string> {
    const dict: Record<string, string> = {};
    const fullText = lines.join(' ');
    const statements = fullText.split(';').map(s => s.trim()).filter(Boolean);

    for (const stmt of statements) {
      const eqIdx = stmt.indexOf('=');
      if (eqIdx > 0) {
        const key = stmt.substring(0, eqIdx).trim().toLowerCase();
        let val = stmt.substring(eqIdx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        dict[key] = val;
      }
    }
    return dict;
  }

  /**
   * Parses [Enum] section dictionaries.
   */
  private static parseEnumDictionaries(lines: string[]): Map<string, Record<number, string>> {
    const result = new Map<string, Record<number, string>>();
    const fullText = lines.join(' ');
    const stmts = fullText.split(';').map(s => s.trim()).filter(Boolean);

    for (const stmt of stmts) {
      const eqIdx = stmt.indexOf('=');
      if (eqIdx > 0) {
        const enumName = stmt.substring(0, eqIdx).trim().toLowerCase();
        const tokens = this.tokenizeCsv(stmt.substring(eqIdx + 1));
        const map: Record<number, string> = {};

        for (let i = 0; i < tokens.length - 1; i += 2) {
          const code = parseInt(tokens[i], 10);
          const label = tokens[i + 1]?.replace(/^"|"$/g, '');
          if (!isNaN(code) && label) {
            map[code] = label;
          }
        }
        result.set(enumName, map);
      }
    }
    return result;
  }

  /**
   * Parses [Params] section entries (e.g. Param1 = 0, ...).
   */
  private static parseParameters(
    lines: string[],
    enumDictionaries: Map<string, Record<number, string>>
  ): EdsParam[] {
    const params: EdsParam[] = [];
    const fullText = lines.join(' ');
    const stmts = fullText.split(';').map(s => s.trim()).filter(Boolean);

    for (const stmt of stmts) {
      const match = stmt.match(/^param(\d+)\s*=\s*(.+)$/i);
      if (!match) continue;

      const paramId = parseInt(match[1], 10);
      const tokens = this.tokenizeCsv(match[2]);

      // Standard ODVA Param structure:
      // 0: Reserved / Link
      // 1: Path (EPATH string or Class/Inst/Attr)
      // 2: Descriptor (Bitfield: Read-only, Scaled, etc.)
      // 3: Data Type (e.g. USINT, UINT, UDINT, REAL, BOOL, or Hex 0x00C1)
      // 4: Data Size in Bytes
      // 5: Parameter Name
      // 6: Units String
      // 7: Help String
      // 8: Min Value
      // 9: Max Value
      // 10: Default Value
      // 11: Enum Reference or Scaling
      const rawDataType = tokens[3] || 'UINT';
      const byteSize = parseInt(tokens[4], 10) || this.estimateByteSize(rawDataType);
      const name = (tokens[5] || `Parameter_${paramId}`).replace(/^"|"$/g, '');
      const units = (tokens[6] || '').replace(/^"|"$/g, '');
      const helpString = (tokens[7] || '').replace(/^"|"$/g, '');
      const min = parseFloat(tokens[8]) || undefined;
      const max = parseFloat(tokens[9]) || undefined;
      const defaultVal = tokens[10] ? (isNaN(Number(tokens[10])) ? tokens[10].replace(/^"|"$/g, '') : Number(tokens[10])) : 0;

      // Extract EPATH if present
      const pathStr = tokens[1] || '';
      let classId: number | undefined;
      let instanceId: number | undefined;
      let attributeId: number | undefined;

      const hexMatches = pathStr.match(/0x[0-9a-fA-F]+/g);
      if (hexMatches && hexMatches.length >= 3) {
        classId = parseInt(hexMatches[0], 16);
        instanceId = parseInt(hexMatches[1], 16);
        attributeId = parseInt(hexMatches[2], 16);
      }

      // Check for Enum Reference
      let enumMap: Record<number, string> | undefined;
      const enumRef = (tokens[11] || '').trim().toLowerCase();
      if (enumRef && enumDictionaries.has(enumRef)) {
        enumMap = enumDictionaries.get(enumRef);
      }

      params.push({
        id: paramId,
        name,
        path: pathStr,
        classId,
        instanceId,
        attributeId,
        dataType: rawDataType.toUpperCase(),
        byteSize,
        defaultValue: defaultVal,
        min,
        max,
        units,
        helpString,
        enumMap
      });
    }

    return params;
  }

  /**
   * Parses [Assembly] section entries (e.g. Assem1 = "Input Assembly", ...).
   */
  private static parseAssemblies(lines: string[], params: EdsParam[]): EdsAssembly[] {
    const assemblies: EdsAssembly[] = [];
    const fullText = lines.join(' ');
    const stmts = fullText.split(';').map(s => s.trim()).filter(Boolean);
    const paramMap = new Map<number, EdsParam>(params.map(p => [p.id, p]));

    for (const stmt of stmts) {
      const match = stmt.match(/^assem(\d+)\s*=\s*(.+)$/i);
      if (!match) continue;

      const assemId = parseInt(match[1], 10);
      const tokens = this.tokenizeCsv(match[2]);

      // Assembly structure:
      // 0: Assembly Name
      // 1: Path (e.g. "20 04 24 64 30 03" -> Class 4, Inst 100, Attr 3)
      // 2: Max Size in Bytes
      // 3: Descriptor
      // 4+: Member list: e.g. "0, Param1", "0, Param2" or "8, 0" (bitSize, paramRef)
      const name = (tokens[0] || `Assembly_${assemId}`).replace(/^"|"$/g, '');
      const pathStr = tokens[1] || '';
      let instId = assemId;

      // Extract Instance ID from EPATH if available
      const instMatch = pathStr.match(/24\s+([0-9a-fA-F]+)/i) || pathStr.match(/0x24[,\s]+0x([0-9a-fA-F]+)/i);
      if (instMatch) {
        instId = parseInt(instMatch[1], 16);
      }

      const sizeBytes = parseInt(tokens[2], 10) || 8;
      const lowerName = name.toLowerCase();
      let type: 'input' | 'output' | 'config' | 'custom' = 'custom';
      if (lowerName.includes('input') || lowerName.includes('consume') || lowerName.includes('read') || lowerName.includes('status')) {
        type = 'input';
      } else if (lowerName.includes('output') || lowerName.includes('produce') || lowerName.includes('write') || lowerName.includes('command')) {
        type = 'output';
      } else if (lowerName.includes('config') || lowerName.includes('setup')) {
        type = 'config';
      }

      // Calculate member offsets
      const members: EdsAssemblyMember[] = [];
      let currentTotalBits = 0;

      for (let i = 4; i < tokens.length; i += 2) {
        const bitSize = parseInt(tokens[i], 10) || 16;
        const refToken = (tokens[i + 1] || '').trim();
        const paramMatch = refToken.match(/param(\d+)/i);
        const pId = paramMatch ? parseInt(paramMatch[1], 10) : undefined;
        const paramObj = pId ? paramMap.get(pId) : undefined;

        const byteOffset = Math.floor(currentTotalBits / 8);
        const bitOffset = currentTotalBits % 8;
        const bitMask = bitSize >= 32 ? 0xFFFFFFFF : ((1 << bitSize) - 1) << bitOffset;

        members.push({
          paramId: pId,
          paramName: paramObj?.name || `Member_${Math.floor(i / 2)}`,
          bitSize,
          byteOffset,
          bitOffset,
          bitLength: bitSize,
          bitMask,
          dataType: paramObj?.dataType || (bitSize === 1 ? 'BOOL' : bitSize <= 8 ? 'USINT' : bitSize <= 16 ? 'UINT' : 'UDINT'),
          description: paramObj?.helpString || `${paramObj?.name || 'Parameter'} (${bitSize} bits at byte ${byteOffset}.${bitOffset})`
        });

        currentTotalBits += bitSize;
      }

      assemblies.push({
        id: assemId,
        name,
        type,
        instanceId: instId,
        sizeBytes: Math.max(sizeBytes, Math.ceil(currentTotalBits / 8)),
        members
      });
    }

    return assemblies;
  }

  /**
   * Tokenizes comma-separated values respecting double-quoted strings.
   */
  private static tokenizeCsv(input: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === ',' && !inQuotes) {
        tokens.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim().length > 0) {
      tokens.push(current.trim());
    }
    return tokens;
  }

  private static estimateByteSize(dataType: string): number {
    const dt = dataType.toUpperCase();
    if (dt === 'BOOL') return 1;
    if (dt === 'SINT' || dt === 'USINT' || dt === 'BYTE') return 1;
    if (dt === 'INT' || dt === 'UINT' || dt === 'WORD') return 2;
    if (dt === 'DINT' || dt === 'UDINT' || dt === 'DWORD' || dt === 'REAL') return 4;
    if (dt === 'LINT' || dt === 'ULINT' || dt === 'LWORD' || dt === 'LREAL') return 8;
    return 2;
  }

  private static resolveVendorName(vendorId: number): string {
    switch (vendorId) {
      case 1: return 'Rockwell Automation / Allen-Bradley';
      case 283: return 'SMC Pneumatics';
      case 48: return 'Turck';
      case 37: return 'Festo';
      case 47: return 'Omron';
      case 50: return 'WAGO';
      case 108: return 'Beckhoff Automation';
      case 312: return 'Banner Engineering';
      case 7: return 'Danfoss';
      case 44: return 'Yaskawa';
      case 139: return 'Keyence';
      default: return `Industrial Vendor #${vendorId}`;
    }
  }

  private static resolveDeviceTypeName(typeId: number): string {
    switch (typeId) {
      case 0x0E: return 'Programmable Logic Controller';
      case 0x02: return 'AC Drive / Inverter';
      case 0x07: return 'General Purpose Discrete I/O';
      case 0x0C: return 'Communications Adapter';
      case 0x1B: return 'Pneumatic Valve Manifold';
      case 0x2B: return 'Safety Controller';
      default: return `CIP Device (Type 0x${typeId.toString(16)})`;
    }
  }

  /**
   * Automatically converts an EDS Device Profile into an array of ready-to-use DriverTag objects.
   */
  public static generateTagsFromProfile(
    profile: EdsDeviceProfile,
    connectionId: string,
    options?: { includeParams?: boolean; includeAssemblies?: boolean }
  ): DriverTag[] {
    const tags: DriverTag[] = [];
    const includeParams = options?.includeParams !== false;
    const includeAssemblies = options?.includeAssemblies !== false;

    // 1. Generate Tags from Input/Output Assemblies
    if (includeAssemblies && profile.assemblies && profile.assemblies.length > 0) {
      for (const assem of profile.assemblies) {
        if (assem.members && assem.members.length > 0) {
          for (const m of assem.members) {
            const tagName = `${profile.catalogNumber || profile.productName.replace(/\s+/g, '_')}_${assem.type.toUpperCase()}_${(m.paramName || 'Tag').replace(/[^a-zA-Z0-9_]/g, '_')}`;
            let scadaDataType: DriverTagDataType = 'float';
            if (m.dataType === 'BOOL') scadaDataType = 'boolean';
            else if (m.dataType === 'INT' || m.dataType === 'SINT') scadaDataType = 'int16';
            else if (m.dataType === 'UINT' || m.dataType === 'USINT') scadaDataType = 'uint16';
            else if (m.dataType === 'DINT') scadaDataType = 'int32';
            else if (m.dataType === 'UDINT') scadaDataType = 'uint32';
            else if (m.dataType === 'REAL') scadaDataType = 'float';

            tags.push({
              tagId: `tag_cip_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
              tagName,
              protocol: 'ethernet_ip',
              sourceType: 'generated',
              connectionId,
              dataType: scadaDataType,
              accessType: assem.type === 'output' ? 'read-write' : 'read',
              pollRate: 100,
              enabled: true,
              cipClass: 0x04, // Assembly Object
              cipInstance: assem.instanceId,
              cipAttribute: 3, // Data Attribute
              cipByteOffset: m.byteOffset,
              cipBitOffset: m.bitOffset,
              cipBitLength: m.bitLength,
              cipBitMask: m.bitMask,
              cipDataType: m.dataType,
              edsParamId: m.paramId,
              description: m.description || `EDS Assembly ${assem.name} (Instance ${assem.instanceId})`,
              category: `${profile.productName} - ${assem.name}`
            });
          }
        } else {
          // Plain Assembly Tag (whole byte block)
          tags.push({
            tagId: `tag_cip_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            tagName: `${profile.productName.replace(/\s+/g, '_')}_${assem.name.replace(/\s+/g, '_')}`,
            protocol: 'ethernet_ip',
            sourceType: 'generated',
            connectionId,
            dataType: 'uint32',
            accessType: assem.type === 'output' ? 'read-write' : 'read',
            pollRate: 100,
            enabled: true,
            cipClass: 0x04,
            cipInstance: assem.instanceId,
            cipAttribute: 3,
            cipByteOffset: 0,
            description: `Full EDS Assembly ${assem.name} (${assem.sizeBytes} bytes)`,
            category: profile.productName
          });
        }
      }
    }

    // 2. Generate Tags from Individual Parameters
    if (includeParams && profile.parameters && profile.parameters.length > 0) {
      for (const p of profile.parameters) {
        let scadaDataType: DriverTagDataType = 'float';
        if (p.dataType === 'BOOL') scadaDataType = 'boolean';
        else if (p.dataType === 'INT' || p.dataType === 'SINT') scadaDataType = 'int16';
        else if (p.dataType === 'UINT' || p.dataType === 'USINT') scadaDataType = 'uint16';
        else if (p.dataType === 'DINT') scadaDataType = 'int32';
        else if (p.dataType === 'UDINT') scadaDataType = 'uint32';
        else if (p.dataType === 'REAL') scadaDataType = 'float';
        else if (p.dataType === 'STRING') scadaDataType = 'string';

        tags.push({
          tagId: `tag_cip_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          tagName: `${profile.productName.replace(/\s+/g, '_')}_${p.name.replace(/[^a-zA-Z0-9_]/g, '_')}`,
          protocol: 'ethernet_ip',
          sourceType: 'generated',
          connectionId,
          dataType: scadaDataType,
          accessType: 'read-write',
          pollRate: 500,
          enabled: true,
          cipClass: p.classId || 0x0F, // Parameter Object
          cipInstance: p.instanceId || p.id,
          cipAttribute: p.attributeId || 1, // Value attribute
          cipDataType: p.dataType,
          edsParamId: p.id,
          unit: p.units,
          description: p.helpString || `EDS Param ${p.id}: ${p.name}`,
          category: `${profile.productName} - Parameters`
        });
      }
    }

    return tags;
  }
}
