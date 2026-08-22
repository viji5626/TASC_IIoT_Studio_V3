import { DriverTagDataType, DriverAccessType } from './driver';

export type GsdStandardType = 'profibus_gsd' | 'profinet_gsdml';

export type GsdDeviceCategory =
  | 'io_slice'
  | 'drive'
  | 'robot'
  | 'barcode_scanner'
  | 'vision_sensor'
  | 'safety_controller'
  | 'valve_manifold'
  | 'general_fieldbus';

export interface GsdDapItem {
  dapId: string;
  dapName: string;
  orderNumber?: string;
  deviceAccessPointType?: string;
  maxSubslots?: number;
  physicalPorts?: number;
  description?: string;
  isDefault?: boolean;
}

export interface GsdDataItem {
  itemId: string;
  name: string;
  dataType: DriverTagDataType;
  direction: 'input' | 'output';
  byteOffset: number;
  bitOffset?: number;
  bitLength?: number;
  bitMask?: number;
  lengthBytes?: number;
  unit?: string;
  description?: string;
  // Specialized 3rd-party attributes
  isLengthTrimmedString?: boolean;
  lengthHeaderOffset?: number;
  isKinematicCoordinate?: boolean;
  axisName?: 'X' | 'Y' | 'Z' | 'A' | 'B' | 'C' | 'J1' | 'J2' | 'J3' | 'J4' | 'J5' | 'J6';
  isSafeSignal?: boolean;
}

export interface GsdSubmodule {
  subslot: number;
  submoduleId: string;
  submoduleName: string;
  orderNumber?: string;
  inputLengthBytes: number;
  outputLengthBytes: number;
  dataItems: GsdDataItem[];
}

export interface GsdModule {
  slot: number;
  moduleId: string;
  moduleName: string;
  orderNumber?: string;
  inputLengthBytes: number;
  outputLengthBytes: number;
  submodules: GsdSubmodule[];
}

export interface GsdDeviceProfile {
  profileId: string;
  standard: GsdStandardType;
  category: GsdDeviceCategory;
  vendorName: string;
  modelName: string;
  orderNumber?: string;
  gsdRevision?: string;
  // PROFIBUS specific
  identNumberHex?: string;      // e.g. "0x8054"
  supportedBaudRates?: string[]; // e.g. ["9.6k", "19.2k", "1.5M", "12M"]
  // PROFINET specific
  vendorIdHex?: string;         // e.g. "0x002A"
  deviceIdHex?: string;         // e.g. "0x0301"
  gsdmlVersion?: string;        // e.g. "V2.35"
  dapList?: GsdDapItem[];
  selectedDapId?: string;
  // Module & Tag Structure
  modules: GsdModule[];
  totalInputBytes: number;
  totalOutputBytes: number;
  // Metadata & Icon
  iconBase64?: string;
  iconSvg?: string;
  description?: string;
  sourceFileName?: string;
  createdAt: string;
  isCustom?: boolean;
}

export interface ProfinetDcpDevice {
  stationName: string;
  ipAddress: string;
  subnetMask: string;
  gateway: string;
  macAddress: string;
  vendorId: string;
  deviceId: string;
  deviceRole?: 'io_device' | 'io_controller' | 'io_supervisor';
  deviceTypeDescription?: string;
  orderNumber?: string;
  responseTimestampMs: number;
}
