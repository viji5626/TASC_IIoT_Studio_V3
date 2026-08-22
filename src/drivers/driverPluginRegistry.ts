/**
 * TASC IIoT Studio — Unified Industrial Driver Plugin Registry
 *
 * Provides a decoupled, enterprise-grade driver abstraction layer.
 * All communication protocols (Modbus, OPC UA, IEC 61850, Siemens S7, Mitsubishi MELSEC)
 * register here with clean, non-destructive lifecycle interfaces.
 */

import { DriverConnection, DriverProtocol, DriverTag } from '../types';
import { Iec61850Driver } from './iec61850/iec61850Driver';
import { SiemensS7Driver } from './siemens_s7/siemensS7Driver';
import { MelsecDriver } from './mitsubishi_melsec/melsecDriver';
import { EthernetIpDriver } from './ethernet_ip/ethernetIpDriver';
import { ProfinetDriver } from './profinet/profinetDriver';
import { ProfibusDriver } from './profibus/profibusDriver';

export interface IDriverPlugin {
  protocol: DriverProtocol;
  testConnection(connection: DriverConnection): Promise<{ success: boolean; message: string }>;
  readTag(tag: DriverTag, connection: DriverConnection): Promise<any>;
  writeTag(tag: DriverTag, connection: DriverConnection, value: any): Promise<void>;
  browse?(connection: DriverConnection): Promise<any[]>;
}

export class DriverPluginRegistry {
  private static instance: DriverPluginRegistry | null = null;
  private plugins: Map<DriverProtocol, IDriverPlugin> = new Map();

  private constructor() {
    this.registerCorePlugins();
  }

  public static getInstance(): DriverPluginRegistry {
    if (!DriverPluginRegistry.instance) {
      DriverPluginRegistry.instance = new DriverPluginRegistry();
    }
    return DriverPluginRegistry.instance;
  }

  private registerCorePlugins() {
    // 1. IEC 61850 Substation Driver
    const iecDriver = Iec61850Driver.getInstance();
    this.registerPlugin({
      protocol: 'iec61850',
      testConnection: (conn) => iecDriver.testConnection(conn),
      readTag: (tag, conn) => iecDriver.readTag(tag, conn),
      writeTag: (tag, conn, val) => iecDriver.writeTag(tag, conn, val),
      browse: (conn) => iecDriver.browseIedModel(conn)
    });

    // 2. Siemens S7 Snap7 Driver
    const s7Driver = SiemensS7Driver.getInstance();
    this.registerPlugin({
      protocol: 's7',
      testConnection: (conn) => s7Driver.testConnection(conn),
      readTag: (tag, conn) => s7Driver.readTag(tag, conn),
      writeTag: (tag, conn, val) => s7Driver.writeTag(tag, conn, val),
      browse: (conn) => s7Driver.browseS7Blocks(conn)
    });

    // 3. Mitsubishi MELSEC MC Protocol Driver
    const melsecDriver = MelsecDriver.getInstance();
    this.registerPlugin({
      protocol: 'melsec',
      testConnection: (conn) => melsecDriver.testConnection(conn),
      readTag: (tag, conn) => melsecDriver.readTag(tag, conn),
      writeTag: (tag, conn, val) => melsecDriver.writeTag(tag, conn, val),
      browse: (conn) => melsecDriver.browseMelsecDevices(conn)
    });

    // 4. Ethernet/IP (CIP) Industrial Driver
    const eipDriver = EthernetIpDriver.getInstance();
    this.registerPlugin({
      protocol: 'ethernet_ip',
      testConnection: (conn) => eipDriver.testConnection(conn),
      readTag: (tag, conn) => eipDriver.readTag(tag, conn),
      writeTag: (tag, conn, val) => eipDriver.writeTag(tag, conn, val),
      browse: (conn) => eipDriver.browseCipTags(conn)
    });

    // 5. PROFINET (IO) Industrial Driver
    const pnDriver = ProfinetDriver.getInstance();
    this.registerPlugin({
      protocol: 'profinet',
      testConnection: async (conn) => {
        const res = await pnDriver.testProfinetConnection(conn);
        return {
          success: res.success,
          message: res.success
            ? `PROFINET Node "${res.stationName}" online. DeviceID: ${res.deviceId}, Serial: ${res.serialNumber || 'N/A'}`
            : res.error || 'Connection failed'
        };
      },
      readTag: async (tag, conn) => pnDriver.readTag(conn, tag, 'default').value,
      writeTag: async (tag, conn, val) => { await pnDriver.writeTag(conn, tag, val); },
      browse: async () => pnDriver.performDcpScan()
    });

    // 6. PROFIBUS (DP) Industrial Driver
    const pbDriver = ProfibusDriver.getInstance();
    this.registerPlugin({
      protocol: 'profibus',
      testConnection: async (conn) => {
        const res = await pbDriver.testProfibusNode(conn);
        return {
          success: res.success,
          message: res.success
            ? `PROFIBUS Node ${res.nodeAddress} online at ${res.baudRate}. ${res.gatewayStatus}`
            : res.error || 'Connection failed'
        };
      },
      readTag: async (tag, conn) => pbDriver.readTag(conn, tag, 'default').value,
      writeTag: async (tag, conn, val) => { await pbDriver.writeTag(conn, tag, val); }
    });
  }

  public registerPlugin(plugin: IDriverPlugin): void {
    this.plugins.set(plugin.protocol, plugin);
  }

  public getPlugin(protocol: DriverProtocol): IDriverPlugin | undefined {
    return this.plugins.get(protocol);
  }

  public hasPlugin(protocol: DriverProtocol): boolean {
    return this.plugins.has(protocol);
  }
}
