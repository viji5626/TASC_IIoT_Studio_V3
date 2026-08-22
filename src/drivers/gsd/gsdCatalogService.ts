import { GsdDeviceProfile, GsdModule, GsdSubmodule, GsdDataItem } from '../../types/gsd';
import { DriverTag } from '../../types/driver';
import { parseProfibusGsd, generateTagsFromGsdProfile } from './gsdParser';
import { parseProfinetGsdml } from './gsdmlParser';

const STORAGE_KEY = 'tasc_gsd_device_catalog_v1';

// ─── PRE-LOADED INDUSTRIAL DEVICE PROFILES ──────────────────────────────────

export const PRELOADED_GSD_CATALOG: GsdDeviceProfile[] = [
  // 1. Cognex DataMan 280 / 370 PROFINET Barcode Scanner
  {
    profileId: 'gsd_cognex_dataman_280',
    standard: 'profinet_gsdml',
    category: 'barcode_scanner',
    vendorName: 'Cognex Corporation',
    modelName: 'DataMan 280 Series Code Reader',
    orderNumber: 'DMR-280Q-00',
    vendorIdHex: '0x011A',
    deviceIdHex: '0x0001',
    gsdmlVersion: 'V2.35',
    dapList: [
      { dapId: 'DAP_DM280', dapName: 'DataMan 280 PROFINET Interface', isDefault: true }
    ],
    selectedDapId: 'DAP_DM280',
    totalInputBytes: 68,
    totalOutputBytes: 4,
    description: 'Industrial 1D/2D Code Reader with dynamic string result, trigger handshake, and quality metrics.',
    createdAt: '2026-08-23T00:00:00.000Z',
    modules: [
      {
        slot: 1,
        moduleId: 'MOD_USER_DATA',
        moduleName: 'User Data 64 Bytes',
        inputLengthBytes: 64,
        outputLengthBytes: 0,
        submodules: [
          {
            subslot: 1,
            submoduleId: 'SUB_STRING_RESULT',
            submoduleName: 'Result String Buffer',
            inputLengthBytes: 64,
            outputLengthBytes: 0,
            dataItems: [
              {
                itemId: 'dm_result_str',
                name: 'Barcode Result String',
                dataType: 'string',
                direction: 'input',
                byteOffset: 0,
                lengthBytes: 64,
                isLengthTrimmedString: true,
                description: 'Decoded barcode or 2D QR ASCII string'
              }
            ]
          }
        ]
      },
      {
        slot: 2,
        moduleId: 'MOD_STATUS_CONTROL',
        moduleName: 'Status & Control Block',
        inputLengthBytes: 4,
        outputLengthBytes: 4,
        submodules: [
          {
            subslot: 1,
            submoduleId: 'SUB_STATUS',
            submoduleName: 'Scanner Handshake',
            inputLengthBytes: 4,
            outputLengthBytes: 4,
            dataItems: [
              { itemId: 'dm_trig_ack', name: 'Trigger Ack Bit', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 0, bitLength: 1, bitMask: 0x01 },
              { itemId: 'dm_read_ok', name: 'Read Completed (Good Read)', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 1, bitLength: 1, bitMask: 0x02 },
              { itemId: 'dm_no_read', name: 'No Read Alarm', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 2, bitLength: 1, bitMask: 0x04 },
              { itemId: 'dm_result_len', name: 'Result Length Bytes', dataType: 'uint16', direction: 'input', byteOffset: 2, lengthBytes: 2, unit: 'bytes' },
              { itemId: 'dm_trig_cmd', name: 'Software Trigger Command', dataType: 'boolean', direction: 'output', byteOffset: 0, bitOffset: 0, bitLength: 1, bitMask: 0x01 },
              { itemId: 'dm_result_ack', name: 'Result Processed Ack', dataType: 'boolean', direction: 'output', byteOffset: 0, bitOffset: 1, bitLength: 1, bitMask: 0x02 }
            ]
          }
        ]
      }
    ]
  },

  // 2. KUKA KRC4 / KRC5 PROFINET Robot Controller
  {
    profileId: 'gsd_kuka_krc4_profinet',
    standard: 'profinet_gsdml',
    category: 'robot',
    vendorName: 'KUKA Roboter GmbH',
    modelName: 'KUKA.Profinet IO Device 64/128B',
    orderNumber: 'KRC4-PN-IO',
    vendorIdHex: '0x00A1',
    deviceIdHex: '0x0002',
    gsdmlVersion: 'V2.35',
    dapList: [
      { dapId: 'DAP_KRC', dapName: 'KUKA KRC4/KRC5 PROFINET Controller', isDefault: true }
    ],
    selectedDapId: 'DAP_KRC',
    totalInputBytes: 64,
    totalOutputBytes: 32,
    description: '6-Axis Industrial Robot Kinematics, Cartesian Coordinates X..C, Joints J1..J6, and Motion Control.',
    createdAt: '2026-08-23T00:00:00.000Z',
    modules: [
      {
        slot: 1,
        moduleId: 'MOD_KINEMATICS',
        moduleName: 'Cartesian Kinematics X-Y-Z-A-B-C',
        inputLengthBytes: 24,
        outputLengthBytes: 0,
        submodules: [
          {
            subslot: 1,
            submoduleId: 'SUB_CARTESIAN',
            submoduleName: 'TCP Coordinates',
            inputLengthBytes: 24,
            outputLengthBytes: 0,
            dataItems: [
              { itemId: 'kuka_x', name: 'TCP X Position', dataType: 'float', direction: 'input', byteOffset: 0, lengthBytes: 4, unit: 'mm', isKinematicCoordinate: true, axisName: 'X' },
              { itemId: 'kuka_y', name: 'TCP Y Position', dataType: 'float', direction: 'input', byteOffset: 4, lengthBytes: 4, unit: 'mm', isKinematicCoordinate: true, axisName: 'Y' },
              { itemId: 'kuka_z', name: 'TCP Z Position', dataType: 'float', direction: 'input', byteOffset: 8, lengthBytes: 4, unit: 'mm', isKinematicCoordinate: true, axisName: 'Z' },
              { itemId: 'kuka_a', name: 'Orientation A (Yaw)', dataType: 'float', direction: 'input', byteOffset: 12, lengthBytes: 4, unit: 'deg', isKinematicCoordinate: true, axisName: 'A' },
              { itemId: 'kuka_b', name: 'Orientation B (Pitch)', dataType: 'float', direction: 'input', byteOffset: 16, lengthBytes: 4, unit: 'deg', isKinematicCoordinate: true, axisName: 'B' },
              { itemId: 'kuka_c', name: 'Orientation C (Roll)', dataType: 'float', direction: 'input', byteOffset: 20, lengthBytes: 4, unit: 'deg', isKinematicCoordinate: true, axisName: 'C' }
            ]
          }
        ]
      },
      {
        slot: 2,
        moduleId: 'MOD_ROBOT_STATUS',
        moduleName: 'Robot Signals & Program Control',
        inputLengthBytes: 4,
        outputLengthBytes: 4,
        submodules: [
          {
            subslot: 1,
            submoduleId: 'SUB_SIGNALS',
            submoduleName: 'Supervisory Signals',
            inputLengthBytes: 4,
            outputLengthBytes: 4,
            dataItems: [
              { itemId: 'kuka_prog_running', name: 'Program Running', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 0, bitLength: 1, bitMask: 0x01 },
              { itemId: 'kuka_drives_on', name: 'Drives Enabled', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 1, bitLength: 1, bitMask: 0x02 },
              { itemId: 'kuka_in_home', name: 'Robot In Home Position', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 2, bitLength: 1, bitMask: 0x04 },
              { itemId: 'kuka_alarm_active', name: 'Robot General Alarm', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 3, bitLength: 1, bitMask: 0x08 },
              { itemId: 'kuka_prog_num_act', name: 'Active Program Number', dataType: 'uint16', direction: 'input', byteOffset: 2, lengthBytes: 2 },
              { itemId: 'kuka_start_cmd', name: 'Start Program Command', dataType: 'boolean', direction: 'output', byteOffset: 0, bitOffset: 0, bitLength: 1, bitMask: 0x01 },
              { itemId: 'kuka_reset_cmd', name: 'Reset Faults Command', dataType: 'boolean', direction: 'output', byteOffset: 0, bitOffset: 1, bitLength: 1, bitMask: 0x02 },
              { itemId: 'kuka_prog_select', name: 'Select Program Number', dataType: 'uint16', direction: 'output', byteOffset: 2, lengthBytes: 2 }
            ]
          }
        ]
      }
    ]
  },

  // 3. Siemens SIMATIC ET 200SP PROFINET Modular I/O
  {
    profileId: 'gsd_siemens_et200sp_pn',
    standard: 'profinet_gsdml',
    category: 'io_slice',
    vendorName: 'Siemens AG',
    modelName: 'SIMATIC ET 200SP (IM 155-6 PN ST)',
    orderNumber: '6ES7 155-6AU01-0BN0',
    vendorIdHex: '0x002A',
    deviceIdHex: '0x0301',
    gsdmlVersion: 'V2.35',
    dapList: [
      { dapId: 'DAP_IM155_6_ST', dapName: 'IM 155-6 PN ST V4.2', orderNumber: '6ES7 155-6AU01-0BN0', isDefault: true },
      { dapId: 'DAP_IM155_6_HF', dapName: 'IM 155-6 PN HF V4.2', orderNumber: '6ES7 155-6AU00-0CN0' }
    ],
    selectedDapId: 'DAP_IM155_6_ST',
    totalInputBytes: 16,
    totalOutputBytes: 8,
    description: 'High performance PROFINET IO Modular Slice system with Digital and Analog I/O modules.',
    createdAt: '2026-08-23T00:00:00.000Z',
    modules: [
      {
        slot: 1,
        moduleId: 'MOD_8DI_DC24V',
        moduleName: '8xDI DC 24V ST',
        orderNumber: '6ES7 131-6BF00-0BA0',
        inputLengthBytes: 1,
        outputLengthBytes: 0,
        submodules: [
          {
            subslot: 1,
            submoduleId: 'SUB_8DI',
            submoduleName: '8 Digital Inputs',
            inputLengthBytes: 1,
            outputLengthBytes: 0,
            dataItems: [
              { itemId: 'et200_di_0', name: 'DI Channel 0', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 0, bitLength: 1, bitMask: 0x01 },
              { itemId: 'et200_di_1', name: 'DI Channel 1', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 1, bitLength: 1, bitMask: 0x02 },
              { itemId: 'et200_di_2', name: 'DI Channel 2', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 2, bitLength: 1, bitMask: 0x04 },
              { itemId: 'et200_di_3', name: 'DI Channel 3', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 3, bitLength: 1, bitMask: 0x08 },
              { itemId: 'et200_di_4', name: 'DI Channel 4', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 4, bitLength: 1, bitMask: 0x10 },
              { itemId: 'et200_di_5', name: 'DI Channel 5', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 5, bitLength: 1, bitMask: 0x20 },
              { itemId: 'et200_di_6', name: 'DI Channel 6', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 6, bitLength: 1, bitMask: 0x40 },
              { itemId: 'et200_di_7', name: 'DI Channel 7', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 7, bitLength: 1, bitMask: 0x80 }
            ]
          }
        ]
      },
      {
        slot: 2,
        moduleId: 'MOD_8DQ_DC24V',
        moduleName: '8xDQ DC 24V/0.5A ST',
        orderNumber: '6ES7 132-6BF00-0BA0',
        inputLengthBytes: 0,
        outputLengthBytes: 1,
        submodules: [
          {
            subslot: 1,
            submoduleId: 'SUB_8DQ',
            submoduleName: '8 Digital Outputs',
            inputLengthBytes: 0,
            outputLengthBytes: 1,
            dataItems: [
              { itemId: 'et200_dq_0', name: 'DQ Channel 0', dataType: 'boolean', direction: 'output', byteOffset: 0, bitOffset: 0, bitLength: 1, bitMask: 0x01 },
              { itemId: 'et200_dq_1', name: 'DQ Channel 1', dataType: 'boolean', direction: 'output', byteOffset: 0, bitOffset: 1, bitLength: 1, bitMask: 0x02 },
              { itemId: 'et200_dq_2', name: 'DQ Channel 2', dataType: 'boolean', direction: 'output', byteOffset: 0, bitOffset: 2, bitLength: 1, bitMask: 0x04 },
              { itemId: 'et200_dq_3', name: 'DQ Channel 3', dataType: 'boolean', direction: 'output', byteOffset: 0, bitOffset: 3, bitLength: 1, bitMask: 0x08 }
            ]
          }
        ]
      },
      {
        slot: 3,
        moduleId: 'MOD_4AI_U_I',
        moduleName: '4xAI 2-wire U/I 2-, 4-wire ST',
        orderNumber: '6ES7 134-6GD00-0BA1',
        inputLengthBytes: 8,
        outputLengthBytes: 0,
        submodules: [
          {
            subslot: 1,
            submoduleId: 'SUB_4AI',
            submoduleName: '4 Analog Inputs',
            inputLengthBytes: 8,
            outputLengthBytes: 0,
            dataItems: [
              { itemId: 'et200_ai_0', name: 'AI Channel 0 Value', dataType: 'int16', direction: 'input', byteOffset: 0, lengthBytes: 2, unit: 'raw (0..27648)' },
              { itemId: 'et200_ai_1', name: 'AI Channel 1 Value', dataType: 'int16', direction: 'input', byteOffset: 2, lengthBytes: 2, unit: 'raw (0..27648)' },
              { itemId: 'et200_ai_2', name: 'AI Channel 2 Value', dataType: 'int16', direction: 'input', byteOffset: 4, lengthBytes: 2, unit: 'raw (0..27648)' },
              { itemId: 'et200_ai_3', name: 'AI Channel 3 Value', dataType: 'int16', direction: 'input', byteOffset: 6, lengthBytes: 2, unit: 'raw (0..27648)' }
            ]
          }
        ]
      }
    ]
  },

  // 4. Danfoss VLT FC 302 PROFINET / PROFIBUS Drive
  {
    profileId: 'gsd_danfoss_vlt_fc302',
    standard: 'profinet_gsdml',
    category: 'drive',
    vendorName: 'Danfoss Drives A/S',
    modelName: 'VLT AutomationDrive FC 302 (MCA 120)',
    orderNumber: '130B1135',
    vendorIdHex: '0x0001',
    deviceIdHex: '0x0402',
    gsdmlVersion: 'V2.35',
    dapList: [
      { dapId: 'DAP_VLT_FC302', dapName: 'VLT FC 302 PROFINET Adapter', isDefault: true }
    ],
    selectedDapId: 'DAP_VLT_FC302',
    totalInputBytes: 8,
    totalOutputBytes: 8,
    description: 'Industrial Frequency Inverter with Profidrive Standard Telegram 1 & 20 and full speed/torque monitoring.',
    createdAt: '2026-08-23T00:00:00.000Z',
    modules: [
      {
        slot: 1,
        moduleId: 'MOD_PROFIDRIVE_TEL1',
        moduleName: 'Standard Telegram 1 (PZD 2/2)',
        inputLengthBytes: 4,
        outputLengthBytes: 4,
        submodules: [
          {
            subslot: 1,
            submoduleId: 'SUB_TEL1',
            submoduleName: 'Speed Control PZD',
            inputLengthBytes: 4,
            outputLengthBytes: 4,
            dataItems: [
              { itemId: 'vlt_status_word', name: 'Drive Status Word (ZSW1)', dataType: 'uint16', direction: 'input', byteOffset: 0, lengthBytes: 2 },
              { itemId: 'vlt_speed_act', name: 'Speed Feedback Actual (NIST_A)', dataType: 'int16', direction: 'input', byteOffset: 2, lengthBytes: 2, unit: 'RPM / %' },
              { itemId: 'vlt_control_word', name: 'Drive Control Word (STW1)', dataType: 'uint16', direction: 'output', byteOffset: 0, lengthBytes: 2 },
              { itemId: 'vlt_speed_ref', name: 'Speed Reference Setpoint (NSOLL_A)', dataType: 'int16', direction: 'output', byteOffset: 2, lengthBytes: 2, unit: 'RPM / %' }
            ]
          }
        ]
      }
    ]
  },

  // 5. Siemens SIMATIC ET 200M (IM 153-1) PROFIBUS DP Slave
  {
    profileId: 'gsd_siemens_et200m_dp',
    standard: 'profibus_gsd',
    category: 'io_slice',
    vendorName: 'Siemens AG',
    modelName: 'SIMATIC ET 200M (IM 153-1)',
    orderNumber: '6ES7 153-1AA03-0XB0',
    identNumberHex: '0x8054',
    gsdRevision: 'Rev 5.0',
    supportedBaudRates: ['9.6k', '19.2k', '93.75k', '187.5k', '500k', '1.5M', '3M', '6M', '12M'],
    totalInputBytes: 8,
    totalOutputBytes: 4,
    description: 'Classic PROFIBUS DP Modular Station with S7-300 Digital and Analog I/O modules.',
    createdAt: '2026-08-23T00:00:00.000Z',
    modules: [
      {
        slot: 1,
        moduleId: 'MOD_16DI_DC24V',
        moduleName: '16 DI DC24V',
        orderNumber: '6ES7 321-1BH02-0AA0',
        inputLengthBytes: 2,
        outputLengthBytes: 0,
        submodules: [
          {
            subslot: 1,
            submoduleId: 'SUB_16DI',
            submoduleName: '16 Digital Inputs',
            inputLengthBytes: 2,
            outputLengthBytes: 0,
            dataItems: [
              { itemId: 'et200m_di_0', name: 'DI Bit 0.0', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 0, bitLength: 1, bitMask: 0x01 },
              { itemId: 'et200m_di_1', name: 'DI Bit 0.1', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 1, bitLength: 1, bitMask: 0x02 },
              { itemId: 'et200m_di_8', name: 'DI Bit 1.0', dataType: 'boolean', direction: 'input', byteOffset: 1, bitOffset: 0, bitLength: 1, bitMask: 0x01 }
            ]
          }
        ]
      },
      {
        slot: 2,
        moduleId: 'MOD_16DO_DC24V',
        moduleName: '16 DO DC24V/0.5A',
        orderNumber: '6ES7 322-1BH01-0AA0',
        inputLengthBytes: 0,
        outputLengthBytes: 2,
        submodules: [
          {
            subslot: 1,
            submoduleId: 'SUB_16DO',
            submoduleName: '16 Digital Outputs',
            inputLengthBytes: 0,
            outputLengthBytes: 2,
            dataItems: [
              { itemId: 'et200m_do_0', name: 'DO Bit 0.0', dataType: 'boolean', direction: 'output', byteOffset: 0, bitOffset: 0, bitLength: 1, bitMask: 0x01 },
              { itemId: 'et200m_do_1', name: 'DO Bit 0.1', dataType: 'boolean', direction: 'output', byteOffset: 0, bitOffset: 1, bitLength: 1, bitMask: 0x02 }
            ]
          }
        ]
      }
    ]
  },

  // 6. Festo CPX Valve Terminal / MPA PROFINET
  {
    profileId: 'gsd_festo_cpx_pn',
    standard: 'profinet_gsdml',
    category: 'valve_manifold',
    vendorName: 'Festo AG & Co. KG',
    modelName: 'CPX Terminal Modular Pneumatics',
    orderNumber: 'CPX-FB34',
    vendorIdHex: '0x014D',
    deviceIdHex: '0x0101',
    gsdmlVersion: 'V2.35',
    dapList: [
      { dapId: 'DAP_CPX_FB34', dapName: 'CPX-FB34 PROFINET IO Node', isDefault: true }
    ],
    selectedDapId: 'DAP_CPX_FB34',
    totalInputBytes: 8,
    totalOutputBytes: 8,
    description: 'Pneumatic Solenoid Valve Manifold with digital input sensors and solenoid coil outputs.',
    createdAt: '2026-08-23T00:00:00.000Z',
    modules: [
      {
        slot: 1,
        moduleId: 'MOD_MPA1_VALVES',
        moduleName: 'MPA1S VMPA1-FB-EMG-8 (8 Solenoid Coils)',
        inputLengthBytes: 0,
        outputLengthBytes: 1,
        submodules: [
          {
            subslot: 1,
            submoduleId: 'SUB_VALVES',
            submoduleName: 'Solenoid Coils 0..7',
            inputLengthBytes: 0,
            outputLengthBytes: 1,
            dataItems: [
              { itemId: 'valve_0', name: 'Valve Solenoid Coil 0', dataType: 'boolean', direction: 'output', byteOffset: 0, bitOffset: 0, bitLength: 1, bitMask: 0x01 },
              { itemId: 'valve_1', name: 'Valve Solenoid Coil 1', dataType: 'boolean', direction: 'output', byteOffset: 0, bitOffset: 1, bitLength: 1, bitMask: 0x02 },
              { itemId: 'valve_2', name: 'Valve Solenoid Coil 2', dataType: 'boolean', direction: 'output', byteOffset: 0, bitOffset: 2, bitLength: 1, bitMask: 0x04 },
              { itemId: 'valve_3', name: 'Valve Solenoid Coil 3', dataType: 'boolean', direction: 'output', byteOffset: 0, bitOffset: 3, bitLength: 1, bitMask: 0x08 }
            ]
          }
        ]
      }
    ]
  },

  // 7. SICK MicroScan3 Safety Laser Scanner PROFINET
  {
    profileId: 'gsd_sick_microscan3_pn',
    standard: 'profinet_gsdml',
    category: 'safety_controller',
    vendorName: 'SICK AG',
    modelName: 'microScan3 Core PROFINET',
    orderNumber: 'MICS3-ABAZ40AZ1P01',
    vendorIdHex: '0x0103',
    deviceIdHex: '0x0024',
    gsdmlVersion: 'V2.35',
    dapList: [
      { dapId: 'DAP_MICS3', dapName: 'microScan3 PROFINET Interface', isDefault: true }
    ],
    selectedDapId: 'DAP_MICS3',
    totalInputBytes: 12,
    totalOutputBytes: 2,
    description: 'Industrial Safety Laser Scanner with protective field status, warning zones, and contour distance data.',
    createdAt: '2026-08-23T00:00:00.000Z',
    modules: [
      {
        slot: 1,
        moduleId: 'MOD_SAFETY_STATUS',
        moduleName: 'Protective & Warning Fields',
        inputLengthBytes: 4,
        outputLengthBytes: 0,
        submodules: [
          {
            subslot: 1,
            submoduleId: 'SUB_FIELDS',
            submoduleName: 'Field Interlock Bits',
            inputLengthBytes: 4,
            outputLengthBytes: 0,
            dataItems: [
              { itemId: 'sick_prot_field_ok', name: 'Protective Field Clear (Safe)', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 0, bitLength: 1, bitMask: 0x01, isSafeSignal: true },
              { itemId: 'sick_warn_field_1', name: 'Warning Field 1 Intruding', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 1, bitLength: 1, bitMask: 0x02 },
              { itemId: 'sick_warn_field_2', name: 'Warning Field 2 Intruding', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 2, bitLength: 1, bitMask: 0x04 },
              { itemId: 'sick_contamination', name: 'Optics Contamination Warning', dataType: 'boolean', direction: 'input', byteOffset: 0, bitOffset: 7, bitLength: 1, bitMask: 0x80 }
            ]
          }
        ]
      }
    ]
  }
];

// ─── GSD CATALOG SERVICE ────────────────────────────────────────────────────

export class GsdCatalogService {
  private customProfiles: GsdDeviceProfile[] = [];

  constructor() {
    this.loadCustomProfiles();
  }

  private loadCustomProfiles(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.customProfiles = JSON.parse(data);
      }
    } catch {
      this.customProfiles = [];
    }
  }

  private saveCustomProfiles(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customProfiles));
    } catch (err) {
      console.error('Failed to persist custom GSD profiles:', err);
    }
  }

  public getAllProfiles(): GsdDeviceProfile[] {
    return [...PRELOADED_GSD_CATALOG, ...this.customProfiles];
  }

  public getProfileById(profileId: string): GsdDeviceProfile | undefined {
    return this.getAllProfiles().find(p => p.profileId === profileId);
  }

  public registerCustomProfile(profile: GsdDeviceProfile): void {
    profile.isCustom = true;
    this.customProfiles = this.customProfiles.filter(p => p.profileId !== profile.profileId);
    this.customProfiles.unshift(profile);
    this.saveCustomProfiles();
  }

  public deleteCustomProfile(profileId: string): boolean {
    const prevLen = this.customProfiles.length;
    this.customProfiles = this.customProfiles.filter(p => p.profileId !== profileId);
    if (this.customProfiles.length !== prevLen) {
      this.saveCustomProfiles();
      return true;
    }
    return false;
  }

  /**
   * Auto-detects whether the content is GSDML (XML) or classic GSD (ASCII) and parses it
   */
  public parseAndRegisterGsdText(fileContent: string, fileName: string): GsdDeviceProfile {
    const isXml = fileContent.trim().startsWith('<') || fileContent.includes('<ISO15745Profile') || fileContent.includes('<DeviceIdentity');
    
    let profile: GsdDeviceProfile;
    if (isXml) {
      profile = parseProfinetGsdml(fileContent, fileName);
    } else {
      profile = parseProfibusGsd(fileContent, fileName);
    }

    this.registerCustomProfile(profile);
    return profile;
  }

  public generateTagsForProfile(profile: GsdDeviceProfile, connectionId?: string): DriverTag[] {
    const protocol = profile.standard === 'profibus_gsd' ? 'profibus' : 'profinet';
    return generateTagsFromGsdProfile(profile, connectionId || '', protocol);
  }
}

export const gsdCatalogService = new GsdCatalogService();
