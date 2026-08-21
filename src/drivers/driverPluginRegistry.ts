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
