/**
 * Curated directory of telecom Email-to-SMS carrier gateways.
 * Modernized for industrial telemetry and alert delivery.
 */

export interface CarrierInfo {
  id: string;
  name: string;
  region: 'US' | 'Canada' | 'India' | 'UK/Europe' | 'International';
  smsGateway: string;       // %s replaced with normalized digits
  mmsGateway?: string;      // %s replaced with normalized digits
  maxChars?: number;        // default: 160
  notes?: string;
}

export const CARRIER_DIRECTORY: Record<string, CarrierInfo> = {
  // --- United States ---
  verizon: {
    id: 'verizon',
    name: 'Verizon Wireless',
    region: 'US',
    smsGateway: '%s@vtext.com',
    mmsGateway: '%s@vzwpix.com',
    maxChars: 160
  },
  att: {
    id: 'att',
    name: 'AT&T Wireless',
    region: 'US',
    smsGateway: '%s@txt.att.net',
    mmsGateway: '%s@mms.att.net',
    maxChars: 160
  },
  tmobile: {
    id: 'tmobile',
    name: 'T-Mobile',
    region: 'US',
    smsGateway: '%s@tmomail.net',
    mmsGateway: '%s@tmomail.net',
    maxChars: 160
  },
  uscellular: {
    id: 'uscellular',
    name: 'US Cellular',
    region: 'US',
    smsGateway: '%s@email.uscc.net',
    mmsGateway: '%s@mms.uscc.net',
    maxChars: 160
  },
  cricket: {
    id: 'cricket',
    name: 'Cricket Wireless',
    region: 'US',
    smsGateway: '%s@mms.cricketwireless.net',
    mmsGateway: '%s@mms.cricketwireless.net',
    maxChars: 160
  },
  boost: {
    id: 'boost',
    name: 'Boost Mobile',
    region: 'US',
    smsGateway: '%s@myboostmobile.com',
    maxChars: 160
  },
  googlefi: {
    id: 'googlefi',
    name: 'Google Fi',
    region: 'US',
    smsGateway: '%s@msg.fi.google.com',
    maxChars: 160
  },
  metropcs: {
    id: 'metropcs',
    name: 'Metro PCS',
    region: 'US',
    smsGateway: '%s@mymetropcs.com',
    maxChars: 160
  },
  mint: {
    id: 'mint',
    name: 'Mint Mobile',
    region: 'US',
    smsGateway: '%s@mailmymobile.net',
    maxChars: 160
  },
  visible: {
    id: 'visible',
    name: 'Visible',
    region: 'US',
    smsGateway: '%s@vtext.com',
    maxChars: 160
  },

  // --- Canada ---
  bell: {
    id: 'bell',
    name: 'Bell Canada',
    region: 'Canada',
    smsGateway: '%s@txt.bell.ca',
    mmsGateway: '%s@txt.bell.ca',
    maxChars: 160
  },
  rogers: {
    id: 'rogers',
    name: 'Rogers Wireless',
    region: 'Canada',
    smsGateway: '%s@pcs.rogers.com',
    mmsGateway: '%s@mms.rogers.com',
    maxChars: 160
  },
  telus: {
    id: 'telus',
    name: 'Telus Mobility',
    region: 'Canada',
    smsGateway: '%s@msg.telus.com',
    mmsGateway: '%s@msg.telus.com',
    maxChars: 160
  },
  fido: {
    id: 'fido',
    name: 'Fido',
    region: 'Canada',
    smsGateway: '%s@fido.ca',
    maxChars: 160
  },
  koodo: {
    id: 'koodo',
    name: 'Koodo Mobile',
    region: 'Canada',
    smsGateway: '%s@msg.koodomobile.com',
    maxChars: 160
  },
  freedommobile: {
    id: 'freedommobile',
    name: 'Freedom Mobile',
    region: 'Canada',
    smsGateway: '%s@txt.freedommobile.ca',
    maxChars: 160
  },
  virginplus_ca: {
    id: 'virginplus_ca',
    name: 'Virgin Plus (Canada)',
    region: 'Canada',
    smsGateway: '%s@vmobile.ca',
    maxChars: 160
  },

  // --- India ---
  // Note: TRAI (Telecom Regulatory Authority of India) DLT mandates have caused Indian
  // telecom operators (Airtel, Jio, BSNL, Vi) to decommission open, unauthenticated Email-to-SMS domains.
  airtel_in: {
    id: 'airtel_in',
    name: 'Airtel (India - Legacy/DLT Restricted)',
    region: 'India',
    smsGateway: '%s@airtelmail.com',
    maxChars: 160,
    notes: 'Blocked by TRAI DLT regulations. Use SMS API or GSM Modem for India.'
  },
  bsnl_in: {
    id: 'bsnl_in',
    name: 'BSNL (India - Legacy/DLT Restricted)',
    region: 'India',
    smsGateway: '%s@bsnl.in',
    maxChars: 160,
    notes: 'Blocked by TRAI DLT regulations. Returns 550 User not found.'
  },
  vi_in: {
    id: 'vi_in',
    name: 'Vodafone Idea / Vi (India - Legacy/DLT Restricted)',
    region: 'India',
    smsGateway: '%s@vodafone.in',
    maxChars: 160,
    notes: 'Blocked by TRAI DLT regulations. Use SMS API or GSM Modem for India.'
  },

  // --- UK / Europe ---
  o2_uk: {
    id: 'o2_uk',
    name: 'O2 (UK)',
    region: 'UK/Europe',
    smsGateway: '%s@o2imail.co.uk',
    maxChars: 160
  },
  vodafone_uk: {
    id: 'vodafone_uk',
    name: 'Vodafone (UK)',
    region: 'UK/Europe',
    smsGateway: '%s@vodafone.net',
    maxChars: 160
  },
  ee_uk: {
    id: 'ee_uk',
    name: 'EE / T-Mobile (UK)',
    region: 'UK/Europe',
    smsGateway: '%s@t-mobile.uk.net',
    maxChars: 160
  },
  sfr_fr: {
    id: 'sfr_fr',
    name: 'SFR (France)',
    region: 'UK/Europe',
    smsGateway: '%s@sfr.fr',
    maxChars: 160
  },
  movistar_es: {
    id: 'movistar_es',
    name: 'Movistar (Spain)',
    region: 'UK/Europe',
    smsGateway: '%s@movistar.net',
    maxChars: 160
  }
};

/**
 * Normalizes phone number into clean numeric digits.
 * For US/Canada, removes leading '1' or '+1' to yield 10 digits for carrier gateways.
 */
export function normalizePhoneNumber(raw: string): { valid: boolean; digits: string; error?: string } {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, digits: '', error: 'Phone number is required.' };
  }

  // Remove non-digit characters
  let digits = raw.replace(/\D/g, '');

  // If 11 digits starting with 1 (standard US/Canada international prefix)
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }

  if (digits.length < 9) {
    return { valid: false, digits, error: `Phone number is too short (${digits.length} digits). Minimum 9 required.` };
  }

  if (digits.length > 15) {
    return { valid: false, digits, error: `Phone number exceeds maximum length (${digits.length} digits).` };
  }

  return { valid: true, digits };
}

/**
 * Resolves the destination email gateway address.
 */
export function resolveCarrierGatewayEmail(phone: string, carrierId: string): { email?: string; error?: string } {
  const norm = normalizePhoneNumber(phone);
  if (!norm.valid) {
    return { error: norm.error };
  }

  const carrier = CARRIER_DIRECTORY[carrierId.toLowerCase()];
  if (!carrier) {
    return { error: `Unsupported carrier ID: '${carrierId}'. Please select a valid carrier.` };
  }

  const email = carrier.smsGateway.replace('%s', norm.digits);
  return { email };
}
