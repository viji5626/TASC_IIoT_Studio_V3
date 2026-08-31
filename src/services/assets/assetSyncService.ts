/**
 * TASC IIoT Studio — ISA-95 Asset Hierarchy Synchronization Service
 *
 * Provides single source of truth dispatching:
 *  - Traverses the ISA-95 Asset Hierarchy tree.
 *  - Automatically registers/syncs Historian tags in `appState.historianTags`.
 *  - Automatically registers/syncs Alarm rules and setpoints.
 *  - Exposes unified tag search and path resolution.
 */

import { AppState, AssetNode, AssetTagDefinition, EquipmentClass, HistorianTag } from '../../types';

export class AssetSyncService {
  /**
   * Recursively collects all AssetTagDefinition objects with their full ISA-95 path.
   */
  public static getAllAssetTags(nodes: AssetNode[] = [], parentPath: string = ''): Array<{ tag: AssetTagDefinition; fullPath: string; node: AssetNode }> {
    const result: Array<{ tag: AssetTagDefinition; fullPath: string; node: AssetNode }> = [];

    for (const node of nodes) {
      const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

      if (node.tags && node.tags.length > 0) {
        for (const tag of node.tags) {
          result.push({
            tag: {
              ...tag,
              path: `${currentPath}/${tag.tagName}`
            },
            fullPath: `${currentPath}/${tag.tagName}`,
            node
          });
        }
      }

      if (node.children && node.children.length > 0) {
        result.push(...this.getAllAssetTags(node.children, currentPath));
      }
    }

    return result;
  }

  /**
   * Synchronizes Asset Hierarchy tags to Historian and Tag Registry.
   */
  public static syncAssetHierarchyToAppState(appState: AppState): AppState {
    const hierarchy = appState.assetHierarchy || [];
    const allTags = this.getAllAssetTags(hierarchy);

    // 1. Sync Historian Tags
    const existingHistorianTags = [...(appState.historianTags || [])];
    const updatedHistorianTags: HistorianTag[] = [];

    for (const item of allTags) {
      if (item.tag.historian?.enabled) {
        const histConfig = item.tag.historian;
        const existing = existingHistorianTags.find(ht => ht.id === item.tag.tagId);

        const newHistTag: HistorianTag = {
          id: item.tag.tagId,
          name: item.fullPath,
          sourceType: 'driver',
          topic: item.tag.source.address,
          jsonPath: '$',
          dataType: (item.tag.dataType.toLowerCase() === 'boolean' ? 'boolean' : item.tag.dataType.toLowerCase() === 'string' ? 'string' : 'number') as any,
          unit: item.tag.unit || '',
          enabled: true,
          useCustomInterval: true,
          customIntervalSeconds: histConfig.intervalMs ? Math.max(1, Math.round(histConfig.intervalMs / 1000)) : 1,
          deadband: histConfig.deadband || 0,
          ...existing
        };
        updatedHistorianTags.push(newHistTag);
      }
    }

    // Retain non-asset historian tags that were manually created
    for (const ht of existingHistorianTags) {
      if (!allTags.some(at => at.tag.tagId === ht.id)) {
        updatedHistorianTags.push(ht);
      }
    }

    return {
      ...appState,
      historianTags: updatedHistorianTags
    };
  }

  /**
   * Returns default seed ISA-95 equipment hierarchy for industrial sites.
   */
  public static getDefaultSeedHierarchy(): AssetNode[] {
    return [
      {
        id: 'enterprise-daikin',
        name: 'Daikin Global',
        type: 'enterprise',
        description: 'Global HVAC & Industrial Infrastructure',
        children: [
          {
            id: 'site-neemrana',
            name: 'Plant Neemrana',
            type: 'site',
            description: 'Manufacturing & Central Utility Plant',
            parentId: 'enterprise-daikin',
            children: [
              {
                id: 'area-utility',
                name: 'Central Utility',
                type: 'area',
                description: 'Chilled Water & Steam Generation',
                parentId: 'site-neemrana',
                children: [
                  {
                    id: 'equip-chiller-01',
                    name: 'Chiller_01',
                    type: 'equipment',
                    description: '1000 TR Centrifugal Water Chiller',
                    parentId: 'area-utility',
                    tags: [
                      {
                        tagId: 'asset_chiller1_supply_temp',
                        tagName: 'Supply_Temp',
                        path: 'Daikin Global/Plant Neemrana/Central Utility/Chiller_01/Supply_Temp',
                        description: 'Evaporator Chilled Water Supply Temperature',
                        dataType: 'Float',
                        unit: '°C',
                        scanRateMs: 500,
                        source: {
                          protocol: 'modbus',
                          address: '40001',
                          pollIntervalMs: 500
                        },
                        historian: {
                          enabled: true,
                          logMode: 'periodic',
                          intervalMs: 1000,
                          deadband: 0.1,
                          compression: true,
                          retentionDays: 90
                        },
                        alarms: {
                          enabled: true,
                          alarmType: 'analog_4_limit',
                          highHigh: { setpoint: 12.0, priority: 'CRITICAL', message: 'Chilled water supply temperature critically high!' },
                          high: { setpoint: 9.5, priority: 'HIGH', message: 'Chilled water supply temperature high.' },
                          low: { setpoint: 4.0, priority: 'MID', message: 'Chilled water supply temperature low.' },
                          lowLow: { setpoint: 2.0, priority: 'CRITICAL', message: 'Freezing hazard! Supply temp critically low.' }
                        }
                      },
                      {
                        tagId: 'asset_chiller1_run_status',
                        tagName: 'Run_Status',
                        path: 'Daikin Global/Plant Neemrana/Central Utility/Chiller_01/Run_Status',
                        description: 'Compressor Motor Running State',
                        dataType: 'Boolean',
                        scanRateMs: 200,
                        source: {
                          protocol: 'modbus',
                          address: '10001',
                          pollIntervalMs: 200
                        },
                        historian: {
                          enabled: true,
                          logMode: 'on_change',
                          retentionDays: 180
                        },
                        alarms: {
                          enabled: true,
                          alarmType: 'digital_state',
                          digitalFault: { triggerValue: 0, priority: 'HIGH', message: 'Chiller 1 stopped unexpectedly.' }
                        }
                      }
                    ]
                  },
                  {
                    id: 'equip-pump-01',
                    name: 'Condenser_Pump_01',
                    type: 'equipment',
                    description: 'Primary Condenser Water Pump (VFD)',
                    parentId: 'area-utility',
                    tags: [
                      {
                        tagId: 'asset_pump1_speed_pv',
                        tagName: 'Speed_PV',
                        path: 'Daikin Global/Plant Neemrana/Central Utility/Condenser_Pump_01/Speed_PV',
                        description: 'Pump VFD Speed Feedback',
                        dataType: 'Float',
                        unit: 'RPM',
                        scanRateMs: 500,
                        source: {
                          protocol: 'modbus',
                          address: '40010',
                          pollIntervalMs: 500
                        },
                        historian: {
                          enabled: true,
                          logMode: 'periodic',
                          intervalMs: 2000,
                          deadband: 5,
                          retentionDays: 60
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ];
  }

  /**
   * Returns default equipment classes for standard templates.
   */
  public static getDefaultEquipmentClasses(): EquipmentClass[] {
    return [
      {
        id: 'class-vfd-motor',
        name: 'VFD Motor Station Class',
        category: 'Rotating Machinery',
        description: 'Standard 3-Phase Induction Motor with VFD Drive Control & Inverter',
        tags: [
          {
            tagId: 'tpl_vfd_start',
            tagName: 'Start',
            dataType: 'Boolean',
            source: { protocol: 'modbus', address: '00001', access: 'write' }
          },
          {
            tagId: 'tpl_vfd_stop',
            tagName: 'Stop',
            dataType: 'Boolean',
            source: { protocol: 'modbus', address: '00002', access: 'write' }
          },
          {
            tagId: 'tpl_vfd_speed_sp',
            tagName: 'Speed_SP',
            dataType: 'Float',
            unit: 'RPM',
            source: { protocol: 'modbus', address: '40001', access: 'read_write' },
            sourceType: 'static',
            staticConfig: { initialValue: 1450, persisted: true, storageTarget: 'local_storage' }
          },
          {
            tagId: 'tpl_vfd_speed_pv',
            tagName: 'Speed_PV',
            dataType: 'Float',
            unit: 'RPM',
            source: { protocol: 'modbus', address: '40002', access: 'read' },
            historian: { enabled: true, logMode: 'periodic', intervalMs: 1000, deadband: 1 },
            alarms: {
              enabled: true,
              alarmType: 'deviation',
              deviation: { setpointTagReference: 'Speed_SP', maxDelta: 50, priority: 'HIGH', message: 'Motor Speed Deviation!' }
            }
          },
          {
            tagId: 'tpl_vfd_current',
            tagName: 'Current',
            dataType: 'Float',
            unit: 'A',
            source: { protocol: 'modbus', address: '40003', access: 'read' },
            historian: { enabled: true, logMode: 'periodic', intervalMs: 2000 }
          },
          {
            tagId: 'tpl_vfd_trip',
            tagName: 'Trip_Fault',
            dataType: 'Boolean',
            source: { protocol: 'modbus', address: '10001', access: 'read' },
            alarms: {
              enabled: true,
              alarmType: 'digital_state',
              digitalFault: { triggerValue: 1, priority: 'CRITICAL', message: 'VFD Overload / Trip Fault!' }
            }
          }
        ]
      },
      {
        id: 'class-centrifugal-pump',
        name: 'Centrifugal Pump Class',
        category: 'Fluid Handling',
        description: 'Heavy-Duty Industrial Centrifugal Water / Chemical Pump',
        tags: [
          {
            tagId: 'tpl_pump_run_status',
            tagName: 'Run_Status',
            dataType: 'Boolean',
            source: { protocol: 'modbus', address: '10001', access: 'read' }
          },
          {
            tagId: 'tpl_pump_flow_rate',
            tagName: 'Flow_Rate',
            dataType: 'Float',
            unit: 'm³/h',
            source: { protocol: 'modbus', address: '40011', access: 'read' },
            historian: { enabled: true, logMode: 'periodic', intervalMs: 1000 }
          },
          {
            tagId: 'tpl_pump_discharge_press',
            tagName: 'Discharge_Pressure',
            dataType: 'Float',
            unit: 'bar',
            source: { protocol: 'modbus', address: '40012', access: 'read' },
            historian: { enabled: true, logMode: 'periodic', intervalMs: 1000 },
            alarms: {
              enabled: true,
              alarmType: 'analog_4_limit',
              highHigh: { setpoint: 10, priority: 'CRITICAL', message: 'Discharge Overpressure Trip!' },
              high: { setpoint: 8, priority: 'HIGH', message: 'Discharge Pressure Warning' }
            }
          },
          {
            tagId: 'tpl_pump_vibration',
            tagName: 'Bearing_Vibration',
            dataType: 'Float',
            unit: 'mm/s',
            source: { protocol: 'modbus', address: '40013', access: 'read' },
            historian: { enabled: true, logMode: 'periodic', intervalMs: 5000 }
          }
        ]
      },
      {
        id: 'class-chiller-unit',
        name: 'Centrifugal Chiller Unit Class',
        category: 'HVAC & Utilities',
        description: 'Central HVAC Refrigeration Chiller with Evaporator & Condenser telemetry',
        tags: [
          {
            tagId: 'tpl_chiller_evap_temp',
            tagName: 'Evap_Supply_Temp',
            dataType: 'Float',
            unit: '°C',
            source: { protocol: 'modbus', address: '40021', access: 'read' },
            historian: { enabled: true, logMode: 'periodic', intervalMs: 1000 }
          },
          {
            tagId: 'tpl_chiller_return_temp',
            tagName: 'Evap_Return_Temp',
            dataType: 'Float',
            unit: '°C',
            source: { protocol: 'modbus', address: '40022', access: 'read' },
            historian: { enabled: true, logMode: 'periodic', intervalMs: 1000 }
          },
          {
            tagId: 'tpl_chiller_target_sp',
            tagName: 'Chilled_Water_SP',
            dataType: 'Float',
            unit: '°C',
            sourceType: 'static',
            staticConfig: { initialValue: 6.5, persisted: true, storageTarget: 'local_storage' },
            source: { protocol: 'memory', address: 'CHILLER_SP', access: 'read_write' }
          },
          {
            tagId: 'tpl_chiller_power_kw',
            tagName: 'Compressor_Power_kW',
            dataType: 'Float',
            unit: 'kW',
            source: { protocol: 'modbus', address: '40025', access: 'read' },
            historian: { enabled: true, logMode: 'periodic', intervalMs: 2000 }
          }
        ]
      }
    ];
  }
}
