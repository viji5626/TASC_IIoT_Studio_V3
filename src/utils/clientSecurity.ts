import { MqttConnection, Dashboard, Panel, ClientRuntimeFeatures, ClientSecuritySettings } from '../types';
import type { PackagedOperatorCredentials } from '../types/auth';

export interface ClientPackageData {
  connections: MqttConnection[];
  dashboards: Dashboard[];
  panels: Panel[];
}

export interface ClientPackage {
  packageType: 'TASC_CLIENT_PACKAGE_V1';
  clientName: string;
  notes?: string;
  generatedAt: string;
  expiresAt?: string;
  clearPassword?: string;
  preferredWorkstationMode?: 'hmi';
  connections: MqttConnection[];
  dashboards: Dashboard[];
  panels: Panel[];
  signature: string;
  version: string;
  /** Optional operator credentials block — independently signed. Client Edition imports this on package load. */
  operatorCredentials?: PackagedOperatorCredentials;
  clientFeatures?: ClientRuntimeFeatures;
  clientSecurity?: ClientSecuritySettings;
  editPin?: string;
  runtimePinTimeoutMinutes?: number;
}

// Master secret salt used for HMAC/SHA-256 integrity verification
const SIGNATURE_SALT = 'TASC_MQTT_ENTERPRISE_KEY_2026_SECURE_SALT_v2';

/**
 * Computes a SHA-256 hash string using standard Web Crypto API
 */
export async function computeSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates canonical string representation of payload for hash comparison
 */
function getCanonicalString(
  data: ClientPackageData,
  clientName: string,
  generatedAt: string,
  expiresAt?: string,
  clearPassword?: string,
  clientFeatures?: ClientRuntimeFeatures,
  clientSecurity?: ClientSecuritySettings,
  editPin?: string,
  runtimePinTimeoutMinutes?: number
): string {
  const payload: Record<string, any> = {
    clientName: clientName.trim(),
    generatedAt,
    expiresAt: expiresAt || '',
    clearPassword: clearPassword || '',
    clientFeatures: clientFeatures || {}
  };

  if (clientSecurity) {
    payload.clientSecurity = clientSecurity;
  }
  if (editPin) {
    payload.editPin = editPin;
  }
  if (runtimePinTimeoutMinutes !== undefined) {
    payload.runtimePinTimeoutMinutes = runtimePinTimeoutMinutes;
  }

  payload.connections = data.connections.map(c => ({
    connectionId: c.connectionId,
    brokerAddress: c.brokerAddress,
    port: c.port,
    protocol: c.protocol,
    username: c.username || '',
    password: c.password || ''
  }));

  payload.dashboards = data.dashboards.map(d => ({
    dashboardId: d.dashboardId,
    dashboardName: d.dashboardName,
    connectionId: d.connectionId,
    prefixTopic: d.prefixTopic || ''
  }));

  payload.panels = data.panels.map(p => ({
    panelId: p.panelId,
    dashboardId: p.dashboardId,
    panelName: p.panelName,
    type: p.type,
    topic: p.topic || '',
    publishTopic: p.publishTopic || ''
  }));

  const payloadStr = JSON.stringify(payload);
  return `${payloadStr}::SALT::${SIGNATURE_SALT}`;
}

/**
 * Generates a cryptographically signed Client JSON Package
 */
export async function generateClientPackage(
  data: ClientPackageData,
  clientName: string,
  notes?: string,
  expiresAt?: string,
  preferredWorkstationMode?: 'hmi',
  clearPassword?: string,
  operatorCredentials?: PackagedOperatorCredentials | null,
  clientFeatures?: ClientRuntimeFeatures,
  clientSecurity?: ClientSecuritySettings,
  editPin?: string,
  runtimePinTimeoutMinutes?: number
): Promise<ClientPackage> {
  const generatedAt = new Date().toISOString();
  const canonicalStr = getCanonicalString(
    data,
    clientName,
    generatedAt,
    expiresAt,
    clearPassword,
    clientFeatures,
    clientSecurity,
    editPin,
    runtimePinTimeoutMinutes
  );
  const signature = await computeSHA256(canonicalStr);

  const pkg: ClientPackage = {
    packageType: 'TASC_CLIENT_PACKAGE_V1',
    version: '2.4.0',
    clientName: clientName.trim() || 'Enterprise Client',
    notes: notes || '',
    generatedAt,
    expiresAt: expiresAt || '',
    clearPassword: clearPassword || '',
    preferredWorkstationMode: preferredWorkstationMode || 'hmi',
    clientFeatures,
    clientSecurity,
    editPin,
    runtimePinTimeoutMinutes,
    connections: data.connections,
    dashboards: data.dashboards,
    panels: data.panels,
    signature
  };

  if (operatorCredentials) {
    pkg.operatorCredentials = operatorCredentials;
  }

  return pkg;
}

/**
 * Verifies if an imported Client JSON Package is authentic, untampered, and not expired.
 */
export async function verifyClientPackage(pkg: any): Promise<{
  isValid: boolean;
  error?: string;
  isSignedPackage?: boolean;
  packageData?: ClientPackageData;
  clientName?: string;
  notes?: string;
  generatedAt?: string;
  expiresAt?: string;
  clearPassword?: string;
  preferredWorkstationMode?: 'hmi';
  clientFeatures?: ClientRuntimeFeatures;
  clientSecurity?: ClientSecuritySettings;
  editPin?: string;
  runtimePinTimeoutMinutes?: number;
  /** Operator credentials block extracted from package — verified independently server-side on import */
  operatorCredentials?: PackagedOperatorCredentials;
}> {
  if (!pkg || typeof pkg !== 'object') {
    return { isValid: false, error: 'Invalid JSON file structure.' };
  }

  // Check if it's a signed client package
  if (pkg.packageType === 'TASC_CLIENT_PACKAGE_V1' && pkg.signature) {
    if (!pkg.clientName || !pkg.generatedAt || !Array.isArray(pkg.connections) || !Array.isArray(pkg.dashboards) || !Array.isArray(pkg.panels)) {
      return { isValid: false, error: 'Client package missing essential metadata or arrays.' };
    }

    // Check expiration date if set
    if (pkg.expiresAt) {
      const expDate = new Date(pkg.expiresAt);
      if (!isNaN(expDate.getTime()) && expDate < new Date()) {
        return { isValid: false, error: `Client package expired on ${expDate.toLocaleDateString()}. Please request an updated package from Admin.` };
      }
    }

    // Verify SHA-256 signature against payload to detect tampering
    const packageData: ClientPackageData = {
      connections: pkg.connections,
      dashboards: pkg.dashboards,
      panels: pkg.panels
    };

    const expectedCanonicalStr = getCanonicalString(
      packageData,
      pkg.clientName,
      pkg.generatedAt,
      pkg.expiresAt,
      pkg.clearPassword,
      pkg.clientFeatures,
      pkg.clientSecurity,
      pkg.editPin,
      pkg.runtimePinTimeoutMinutes
    );
    const expectedSignature = await computeSHA256(expectedCanonicalStr);

    if (pkg.signature !== expectedSignature) {
      return {
        isValid: false,
        error: 'Security Warning: Client Package signature mismatch! The JSON file has been manually modified or tampered with. Please obtain an authentic signed package from Admin.'
      };
    }

    return {
      isValid: true,
      isSignedPackage: true,
      clientName: pkg.clientName,
      notes: pkg.notes,
      generatedAt: pkg.generatedAt,
      expiresAt: pkg.expiresAt,
      clearPassword: pkg.clearPassword,
      preferredWorkstationMode: pkg.preferredWorkstationMode || 'hmi',
      clientFeatures: pkg.clientFeatures,
      clientSecurity: pkg.clientSecurity ?? { requireOperatorLogin: true, enableAuditTrail: true },
      editPin: pkg.editPin,
      runtimePinTimeoutMinutes: pkg.runtimePinTimeoutMinutes,
      packageData,
      operatorCredentials: pkg.operatorCredentials ?? undefined
    };
  }

  // Legacy or standard backup JSON fallback
  if (Array.isArray(pkg.connections) && Array.isArray(pkg.dashboards) && Array.isArray(pkg.panels)) {
    return {
      isValid: true,
      isSignedPackage: false,
      clientName: pkg.clientName || 'Imported Config',
      preferredWorkstationMode: pkg.preferredWorkstationMode || 'hmi',
      clientFeatures: pkg.clientFeatures,
      clientSecurity: pkg.clientSecurity,
      editPin: pkg.editPin,
      runtimePinTimeoutMinutes: pkg.runtimePinTimeoutMinutes,
      packageData: {
        connections: pkg.connections,
        dashboards: pkg.dashboards,
        panels: pkg.panels
      }
    };
  }

  return { isValid: false, error: 'Unrecognized JSON format. File must be a valid backup or signed client package.' };
}

/**
 * Default Master Admin Credentials for Engineering Studio
 */
export const DEFAULT_ADMIN_USERNAME = 'TASC_ENGG';
export const DEFAULT_ADMIN_PASSWORD = 'Tasc@071921';
export const DEFAULT_ADMIN_PIN = '1234';

