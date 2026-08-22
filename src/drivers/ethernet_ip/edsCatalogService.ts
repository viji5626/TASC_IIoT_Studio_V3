/**
 * TASC IIoT Studio — Electronic Data Sheet (EDS) Device Profile Catalog Service
 *
 * Manages built-in reference EDS profiles for standard industrial equipment
 * (PowerFlex 525 VFD, POINT I/O 1734-AENT, SMC EX260, Turck TBEN-S2, Banner SC10)
 * as well as user-imported .eds files with persistent browser storage.
 */

import { EdsDeviceProfile, EdsParser } from './edsParser';
import { DriverTag } from '../../types';

const STORAGE_KEY = 'tasc_eds_device_catalog_v1';

// ─── Built-in Reference EDS Profiles ───────────────────────────────────────────

const POWERFLEX_525_EDS = `
[File]
    DescText = "PowerFlex 525 Adjustable Frequency AC Drive EDS";
    CreateDate = 04-12-2013;
    CreateTime = 10:15:00;
    Revision = 1.1;

[Device Classification]
    VendCode = 1;
    VendName = "Rockwell Automation / Allen-Bradley";
    ProdType = 2;
    ProdTypeName = "AC Drive";
    ProdCode = 8203;
    MajRev = 5;
    MinRev = 1;
    ProdName = "PowerFlex 525 VFD";
    Catalog = "25B-D4P0N104";

[Enum]
    DriveStatusEnum = 0, "Ready", 1, "Active / Running", 2, "Command Direction", 3, "Rotating Forward", 4, "Accelerating", 5, "Decelerating", 6, "Faulted";
    DriveLogicCmdEnum = 0, "Stop", 1, "Start", 2, "Jog", 3, "Clear Faults", 4, "Forward", 5, "Reverse";

[Params]
    Param1 = 0, "20 04 24 64 30 03", 0x0000, 0x00C7, 2, "Output Frequency", "Hz", "Motor Output Frequency (0.01 Hz resolution)", 0, 50000, 0;
    Param2 = 0, "20 04 24 64 30 03", 0x0000, 0x00C7, 2, "Output Current", "Amps", "Motor Output Current (0.1 A resolution)", 0, 1000, 0;
    Param3 = 0, "20 04 24 64 30 03", 0x0000, 0x00C7, 2, "Output Voltage", "VAC", "Motor Output Voltage (0.1 VAC)", 0, 6000, 0;
    Param4 = 0, "20 04 24 64 30 03", 0x0000, 0x00C7, 2, "DC Bus Voltage", "VDC", "Internal DC Bus Voltage", 0, 1000, 650;
    Param5 = 0, "20 04 24 64 30 03", 0x0000, 0x00C1, 1, "Drive Ready Status", "", "Drive Ready Bit", 0, 1, 1, DriveStatusEnum;
    Param6 = 0, "20 04 24 64 30 03", 0x0000, 0x00C1, 1, "Drive Active Running", "", "Drive Running Feedback", 0, 1, 0, DriveStatusEnum;
    Param7 = 0, "20 04 24 64 30 03", 0x0000, 0x00C1, 1, "Drive Faulted", "", "Drive In Fault State", 0, 1, 0, DriveStatusEnum;
    Param8 = 0, "20 04 24 65 30 03", 0x0000, 0x00C7, 2, "Speed Command Reference", "Hz", "Frequency Reference to VFD (0.01 Hz)", 0, 6000, 5000;
    Param9 = 0, "20 04 24 65 30 03", 0x0000, 0x00C1, 1, "Start Command", "", "Start Drive Run", 0, 1, 0, DriveLogicCmdEnum;
    Param10 = 0, "20 04 24 65 30 03", 0x0000, 0x00C1, 1, "Stop Command", "", "Stop Drive", 0, 1, 0, DriveLogicCmdEnum;
    Param11 = 0, "20 04 24 65 30 03", 0x0000, 0x00C1, 1, "Clear Fault Command", "", "Reset Active Drive Faults", 0, 1, 0, DriveLogicCmdEnum;

[Assembly]
    Assem1 = "Logic Status & Feedback", "20 04 24 64 30 03", 8, 0x0000, 16, Param1, 16, Param2, 16, Param3, 1, Param5, 1, Param6, 1, Param7;
    Assem2 = "Logic Command & Speed Reference", "20 04 24 65 30 03", 4, 0x0000, 16, Param8, 1, Param9, 1, Param10, 1, Param11;
`;

const POINT_IO_EDS = `
[File]
    DescText = "Allen-Bradley 1734-AENT EtherNet/IP POINT I/O Adapter";
    Revision = 3.1;

[Device Classification]
    VendCode = 1;
    VendName = "Rockwell Automation / Allen-Bradley";
    ProdType = 12;
    ProdTypeName = "Communications Adapter";
    ProdCode = 98;
    MajRev = 3;
    MinRev = 1;
    ProdName = "POINT I/O 1734-AENT";
    Catalog = "1734-AENT/C";

[Params]
    Param1 = 0, "20 04 24 65 30 03", 0x0000, 0x00C1, 1, "Ch0 Discrete Input Status", "", "Slot 1 Input Bit 0", 0, 1, 0;
    Param2 = 0, "20 04 24 65 30 03", 0x0000, 0x00C1, 1, "Ch1 Discrete Input Status", "", "Slot 1 Input Bit 1", 0, 1, 0;
    Param3 = 0, "20 04 24 65 30 03", 0x0000, 0x00C7, 2, "Analog Input Channel 0", "mA", "4-20mA Flow Meter Input", 0, 32767, 16384;
    Param4 = 0, "20 04 24 65 30 03", 0x0000, 0x00C7, 2, "Analog Input Channel 1", "Deg C", "RTD Temperature Input", -50, 400, 25;
    Param5 = 0, "20 04 24 66 30 03", 0x0000, 0x00C1, 1, "Ch0 Discrete Output Command", "", "Slot 2 Output Relay 0", 0, 1, 0;
    Param6 = 0, "20 04 24 66 30 03", 0x0000, 0x00C1, 1, "Ch1 Discrete Output Command", "", "Slot 2 Output Relay 1", 0, 1, 0;

[Assembly]
    Assem101 = "Input Assembly 101", "20 04 24 65 30 03", 6, 0x0000, 1, Param1, 1, Param2, 16, Param3, 16, Param4;
    Assem102 = "Output Assembly 102", "20 04 24 66 30 03", 2, 0x0000, 1, Param5, 1, Param6;
`;

const SMC_EX260_EDS = `
[File]
    DescText = "SMC EX260-SEN1 EtherNet/IP Valve Manifold";
    Revision = 2.0;

[Device Classification]
    VendCode = 283;
    VendName = "SMC Pneumatics";
    ProdType = 27;
    ProdTypeName = "Pneumatic Valve Manifold";
    ProdCode = 120;
    MajRev = 2;
    MinRev = 0;
    ProdName = "SMC EX260 Valve Manifold";
    Catalog = "EX260-SEN1";

[Params]
    Param1 = 0, "20 04 24 96 30 03", 0x0000, 0x00C1, 1, "Valve 0 Coil 1 (Extend)", "", "Solenoid Valve 0 Output A", 0, 1, 0;
    Param2 = 0, "20 04 24 96 30 03", 0x0000, 0x00C1, 1, "Valve 0 Coil 2 (Retract)", "", "Solenoid Valve 0 Output B", 0, 1, 0;
    Param3 = 0, "20 04 24 96 30 03", 0x0000, 0x00C1, 1, "Valve 1 Coil 1 (Extend)", "", "Solenoid Valve 1 Output A", 0, 1, 0;
    Param4 = 0, "20 04 24 96 30 03", 0x0000, 0x00C1, 1, "Valve 1 Coil 2 (Retract)", "", "Solenoid Valve 1 Output B", 0, 1, 0;
    Param5 = 0, "20 04 24 64 30 03", 0x0000, 0x00C1, 1, "Power Supply Voltage Warning", "", "Valve Power < 21.6V", 0, 1, 0;
    Param6 = 0, "20 04 24 64 30 03", 0x0000, 0x00C1, 1, "Short Circuit Detection", "", "Solenoid Valve Short Circuit Flag", 0, 1, 0;

[Assembly]
    Assem100 = "Valve Diagnostic Input Assembly", "20 04 24 64 30 03", 2, 0x0000, 1, Param5, 1, Param6;
    Assem150 = "Valve Solenoid Output Assembly", "20 04 24 96 30 03", 4, 0x0000, 1, Param1, 1, Param2, 1, Param3, 1, Param4;
`;

const TURCK_TBEN_EDS = `
[File]
    DescText = "Turck TBEN-S2 Compact Multiprotocol I/O Module";
    Revision = 1.0;

[Device Classification]
    VendCode = 48;
    VendName = "Turck";
    ProdType = 7;
    ProdTypeName = "General Purpose Discrete I/O";
    ProdCode = 1845;
    MajRev = 1;
    MinRev = 0;
    ProdName = "Turck TBEN-S2-4AO";
    Catalog = "TBEN-S2-4AO";

[Params]
    Param1 = 0, "20 04 24 67 30 03", 0x0000, 0x00C7, 2, "Analog Output Channel 0", "mA", "4..20mA Output to Control Valve", 0, 20000, 12000;
    Param2 = 0, "20 04 24 67 30 03", 0x0000, 0x00C7, 2, "Analog Output Channel 1", "V", "0..10V Output to Damper Actuator", 0, 10000, 5000;
    Param3 = 0, "20 04 24 64 30 03", 0x0000, 0x00C1, 1, "Channel 0 Open Wire Fault", "", "Current Loop Open Detection", 0, 1, 0;

[Assembly]
    Assem100 = "Diagnostic Status Input", "20 04 24 64 30 03", 2, 0x0000, 1, Param3;
    Assem103 = "Analog Output Control", "20 04 24 67 30 03", 4, 0x0000, 16, Param1, 16, Param2;
`;

export class EdsCatalogService {
  private static instance: EdsCatalogService | null = null;
  private cachedProfiles: Map<string, EdsDeviceProfile> = new Map();

  private constructor() {
    this.initDefaultProfiles();
    this.loadUserProfiles();
  }

  public static getInstance(): EdsCatalogService {
    if (!EdsCatalogService.instance) {
      EdsCatalogService.instance = new EdsCatalogService();
    }
    return EdsCatalogService.instance;
  }

  private initDefaultProfiles() {
    try {
      const pf525 = EdsParser.parse(POWERFLEX_525_EDS, 'PowerFlex_525.eds');
      pf525.profileId = 'builtin_pf525';
      this.cachedProfiles.set(pf525.profileId, pf525);

      const pointIo = EdsParser.parse(POINT_IO_EDS, '1734-AENT.eds');
      pointIo.profileId = 'builtin_point_io';
      this.cachedProfiles.set(pointIo.profileId, pointIo);

      const smc = EdsParser.parse(SMC_EX260_EDS, 'SMC_EX260.eds');
      smc.profileId = 'builtin_smc_ex260';
      this.cachedProfiles.set(smc.profileId, smc);

      const turck = EdsParser.parse(TURCK_TBEN_EDS, 'Turck_TBEN_S2.eds');
      turck.profileId = 'builtin_turck_tben';
      this.cachedProfiles.set(turck.profileId, turck);
    } catch (e) {
      console.warn('[EdsCatalogService] Error loading default profiles:', e);
    }
  }

  private loadUserProfiles() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const list: EdsDeviceProfile[] = JSON.parse(stored);
        for (const item of list) {
          this.cachedProfiles.set(item.profileId, item);
        }
      }
    } catch (e) {
      console.warn('[EdsCatalogService] Error loading user profiles from storage:', e);
    }
  }

  private saveUserProfiles() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const userList = Array.from(this.cachedProfiles.values()).filter(p => !p.profileId.startsWith('builtin_'));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userList));
    } catch (e) {
      console.warn('[EdsCatalogService] Error saving profiles to storage:', e);
    }
  }

  /**
   * Returns all loaded EDS device profiles.
   */
  public getAllProfiles(): EdsDeviceProfile[] {
    return Array.from(this.cachedProfiles.values());
  }

  /**
   * Retrieves a specific EDS profile by ID.
   */
  public getProfile(profileId: string): EdsDeviceProfile | undefined {
    return this.cachedProfiles.get(profileId);
  }

  /**
   * Imports an EDS text string, parses it, and saves it into the catalog.
   */
  public importEdsFile(edsText: string, fileName?: string): EdsDeviceProfile {
    const profile = EdsParser.parse(edsText, fileName);
    this.cachedProfiles.set(profile.profileId, profile);
    this.saveUserProfiles();
    return profile;
  }

  /**
   * Deletes a user-imported EDS profile.
   */
  public deleteProfile(profileId: string): boolean {
    if (profileId.startsWith('builtin_')) {
      return false; // Prevent deletion of reference profiles
    }
    const res = this.cachedProfiles.delete(profileId);
    if (res) {
      this.saveUserProfiles();
    }
    return res;
  }

  /**
   * Generates DriverTag items from an EDS profile.
   */
  public generateDriverTags(
    profileId: string,
    connectionId: string,
    options?: { includeParams?: boolean; includeAssemblies?: boolean }
  ): DriverTag[] {
    const profile = this.getProfile(profileId);
    if (!profile) return [];
    return EdsParser.generateTagsFromProfile(profile, connectionId, options);
  }
}
