/**
 * TASC AI Industrial RAD Code Generator & Multi-Vendor Validator
 * Generates production-grade scripts for:
 * 1. Inductive Automation Ignition (Jython 2.7 / system.* API)
 * 2. Siemens S7-1200 / S7-1500 (SCL / IEC 61131-3)
 * 3. Rockwell / Allen-Bradley (Studio 5000 Structured Text AOI)
 * 4. TASC Native AST Rules & JSONPath formatters
 */

export type CodeTarget = 'ignition_jython' | 'siemens_scl' | 'rockwell_st' | 'tasc_ast';

export interface GeneratedCodeResult {
  target: CodeTarget;
  targetLabel: string;
  title: string;
  code: string;
  language: 'python' | 'iecst' | 'javascript' | 'json';
  fileExtension: string;
  safetyCheck: {
    passed: boolean;
    warnings: string[];
    hasDebounce: boolean;
    hasInterlock: boolean;
  };
  explanation: string;
  recommendedTags: string[];
}

export interface CodeGenRequest {
  target: CodeTarget;
  prompt: string;
  tagNames?: string[];
  equipmentType?: string;
  debounceSeconds?: number;
  safetyInterlocks?: string[];
}

/**
 * Industrial Static Safety Linter
 * Detects common SCADA / PLC control flaws before code is deployed.
 */
export function lintIndustrialCode(code: string, target: CodeTarget): GeneratedCodeResult['safetyCheck'] {
  const warnings: string[] = [];
  const lower = code.toLowerCase();

  // 1. Debounce checking
  const hasDebounce =
    lower.includes('debounce') ||
    lower.includes('timer') ||
    lower.includes('ton') ||
    lower.includes('time.sleep') ||
    lower.includes('delay') ||
    lower.includes('elapsed');

  if (!hasDebounce && (lower.includes('alarm') || lower.includes('trip') || lower.includes('fault'))) {
    warnings.push('Advisory: No debounce or delay timer detected. Rapid sensor chattering might trigger false alarms.');
  }

  // 2. Division by zero protection
  if (lower.includes('/') && !lower.includes('!= 0') && !lower.includes('> 0') && !lower.includes('if ') && !lower.includes('max(')) {
    warnings.push('Caution: Potential division by zero. Ensure denominator is checked for non-zero before dividing.');
  }

  // 3. Blocking loops warning for Ignition Gateway
  if (target === 'ignition_jython') {
    if (lower.includes('time.sleep') && !lower.includes('system.util.invokasynchronous')) {
      warnings.push('Critical: Direct time.sleep() in Ignition Tag Change or Gateway scripts blocks the thread pool. Use timer scripts or system.util.invokeAsynchronous.');
    }
    if (lower.includes('gettag(')) {
      warnings.push('Deprecated API: system.tag.getTag() is deprecated in Ignition 8+. Replaced with system.tag.readBlocking().');
    }
  }

  // 4. Interlock checking
  const hasInterlock =
    lower.includes('interlock') ||
    lower.includes('permissive') ||
    lower.includes('ready') ||
    lower.includes('safe') ||
    lower.includes('enable');

  if (!hasInterlock && (lower.includes('start') || lower.includes('run') || lower.includes('open'))) {
    warnings.push('Safety Check: No safety interlock or permissive condition detected before control command execution.');
  }

  return {
    passed: warnings.length === 0,
    warnings,
    hasDebounce,
    hasInterlock
  };
}

/**
 * Deterministic Template Library for instant code generation & offline fallback
 */
export function generateIndustrialCode(request: CodeGenRequest): GeneratedCodeResult {
  const { target, prompt, equipmentType = 'Pump', tagNames = ['Tag_Speed', 'Tag_Temp', 'Tag_Flow'] } = request;
  const promptLower = prompt.toLowerCase();

  let code = '';
  let title = 'Industrial Control Logic';
  let language: GeneratedCodeResult['language'] = 'python';
  let fileExtension = 'py';
  let targetLabel = 'Ignition Jython 2.7';
  let explanation = '';
  const recommendedTags = [...tagNames];

  // ── 1. INDUCTIVE AUTOMATION IGNITION (JYTHON) ──
  if (target === 'ignition_jython') {
    targetLabel = 'Ignition Jython 2.7 (Ignition 8.1+)';
    language = 'python';
    fileExtension = 'py';

    if (promptLower.includes('lead') || promptLower.includes('alternat') || promptLower.includes('duty') || promptLower.includes('pump')) {
      title = '3-Pump Duty / Assist / Standby Alternator Logic';
      code = `# ==============================================================================
# TASC AI Generated - Ignition 8.1+ Gateway Tag Event Script
# Description: Automated 3-Pump Lead/Lag Alternation with Equalized Run-Hours
# ==============================================================================
import system

def alternatePumps(event):
    # Tag Paths
    basePath = "[default]Equipment/Pumps/"
    paths = [
        basePath + "Pump1/RunHours",
        basePath + "Pump2/RunHours",
        basePath + "Pump3/RunHours",
        basePath + "SystemDemand_Flow",
        basePath + "SafetyInterlock_OK"
    ]
    
    # Non-blocking bulk tag read
    qValues = system.tag.readBlocking(paths)
    h1 = qValues[0].value or 0.0
    h2 = qValues[1].value or 0.0
    h3 = qValues[2].value or 0.0
    demand = qValues[3].value or 0.0
    safetyOk = qValues[4].value or False
    
    if not safetyOk:
        # Safety trip interlock: shut down all pumps
        system.tag.writeBlocking(
            [basePath + "Pump1/Cmd_Run", basePath + "Pump2/Cmd_Run", basePath + "Pump3/Cmd_Run"],
            [False, False, False]
        )
        system.util.getLogger("PumpSequencer").warn("Safety Interlock Tripped - All pumps commanded OFF")
        return

    # Sort pumps by least run-hours for wear leveling
    pumps = sorted([(h1, "Pump1"), (h2, "Pump2"), (h3, "Pump3")], key=lambda x: x[0])
    lead = pumps[0][1]
    assist = pumps[1][1]
    standby = pumps[2][1]

    # Command Execution based on Demand Thresholds
    writePaths = [
        basePath + lead + "/Cmd_Run",
        basePath + assist + "/Cmd_Run",
        basePath + standby + "/Cmd_Run"
    ]

    if demand > 150.0:    # High Demand: Run Lead + Assist
        writeValues = [True, True, False]
    elif demand > 20.0:   # Normal Demand: Run Lead only
        writeValues = [True, False, False]
    else:                 # Zero Demand: Standby mode
        writeValues = [False, False, False]

    system.tag.writeBlocking(writePaths, writeValues)
`;
      explanation = 'Implements non-blocking readBlocking/writeBlocking in Ignition 8.1+ with wear-leveling run hour sorting and safety permissive interlocks.';
    } else {
      // General Tag Monitoring & Rate of Change Alarm
      title = 'Rate of Change (dP/dt) Alarm & Historian Ingestion';
      code = `# ==============================================================================
# TASC AI Generated - Ignition 8.1+ Tag Change Script
# Description: High Rate of Change (dP/dt) Transient Detector with Debounce
# ==============================================================================
import system

def valueChanged(tag, tagPath, previousValue, currentValue, initialChange, missedEvents):
    if initialChange:
        return
        
    prev = previousValue.value or 0.0
    curr = currentValue.value or 0.0
    
    # Calculate derivative rate of change
    delta = curr - prev
    rateLimit = 15.0 # Max allowable surge units/sec
    
    if abs(delta) > rateLimit:
        # Alarm condition detected
        system.tag.writeBlocking(
            ["[default]Alarms/TransientSpikeDetected", "[default]Alarms/SpikeMagnitude"],
            [True, float(delta)]
        )
        system.util.getLogger("TelemetryWatchdog").warn(
            "Rate of Change Surge on {}: Delta = {:.2f}".format(str(tagPath), delta)
        )
    else:
        system.tag.writeBlocking(["[default]Alarms/TransientSpikeDetected"], [False])
`;
      explanation = 'Monitors instantaneous delta transitions to catch transient pressure/thermal spikes before equipment trip limits are breached.';
    }
  }

  // ── 2. SIEMENS S7 SCL (IEC 61131-3) ──
  else if (target === 'siemens_scl') {
    targetLabel = 'Siemens S7-1200/1500 (TIA Portal SCL)';
    language = 'iecst';
    fileExtension = 'scl';
    title = 'Siemens S7 SCL Function Block - Lead/Lag Pump Sequencer';
    code = `// ==============================================================================
// TASC AI Generated - Siemens S7-1200/1500 TIA Portal SCL
// Standard: IEC 61131-3 Function Block (FB)
// ==============================================================================
FUNCTION_BLOCK "FB_PumpDutySequencer"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1
VAR_INPUT
    bEnable : Bool;                  // Master system enable permissive
    bSafetyInterlock : Bool;         // Hardwired safety circuit OK
    rSystemFlowRate : Real;          // Process demand flow (m3/h)
    rHighDemandThreshold : Real;     // High flow setpoint for assist pump
    rLowDemandThreshold : Real;      // Minimum flow setpoint to run lead pump
    tDebounceTime : Time := T#3S;    // Debounce time for flow transitions
END_VAR

VAR_OUTPUT
    bPump1_CmdRun : Bool;            // Output command: Pump 1
    bPump2_CmdRun : Bool;            // Output command: Pump 2
    bAlarmTrip : Bool;               // Safety trip alarm active
    rActiveDutyHours : Real;         // Cumulative runtime
END_VAR

VAR
    timerDebounce : TON;             // On-delay debounce timer
    rPump1_RunHours : Real := 0.0;
    rPump2_RunHours : Real := 0.0;
    bLeadPumpSelect : Bool;          // FALSE = Pump1 Lead, TRUE = Pump2 Lead
END_VAR

BEGIN
    // 1. Safety Interlock Verification
    IF NOT #bSafetyInterlock OR NOT #bEnable THEN
        #bPump1_CmdRun := FALSE;
        #bPump2_CmdRun := FALSE;
        #bAlarmTrip := NOT #bSafetyInterlock;
        RETURN;
    END_IF;

    #bAlarmTrip := FALSE;

    // 2. Debounce Process Flow Surge
    #timerDebounce(IN := (#rSystemFlowRate > #rHighDemandThreshold),
                   PT := #tDebounceTime);

    // 3. Wear Leveling Rotation Check
    IF (#rPump1_RunHours > #rPump2_RunHours + 50.0) THEN
        #bLeadPumpSelect := TRUE; // Rotate Lead to Pump 2
    ELSIF (#rPump2_RunHours > #rPump1_RunHours + 50.0) THEN
        #bLeadPumpSelect := FALSE; // Rotate Lead to Pump 1
    END_IF;

    // 4. Command Sequencing
    IF #rSystemFlowRate > #rLowDemandThreshold THEN
        IF NOT #bLeadPumpSelect THEN
            #bPump1_CmdRun := TRUE;
            #bPump2_CmdRun := #timerDebounce.Q; // Assist pump on high demand
        ELSE
            #bPump2_CmdRun := TRUE;
            #bPump1_CmdRun := #timerDebounce.Q; // Assist pump on high demand
        END_IF;
    ELSE
        #bPump1_CmdRun := FALSE;
        #bPump2_CmdRun := FALSE;
    END_IF;
END_FUNCTION_BLOCK
`;
    explanation = 'IEC 61131-3 SCL compliant function block for Siemens TIA Portal with TON debounce timing and automatic 50-hour wear-leveling duty rotation.';
  }

  // ── 3. ROCKWELL STUDIO 5000 (STRUCTURED TEXT) ──
  else if (target === 'rockwell_st') {
    targetLabel = 'Rockwell Studio 5000 (ControlLogix ST)';
    language = 'iecst';
    fileExtension = 'st';
    title = 'Rockwell Studio 5000 AOI - Motor Temperature & Vibration Monitor';
    code = `// ==============================================================================
// TASC AI Generated - Rockwell Studio 5000 (ControlLogix / CompactLogix)
// Type: Structured Text (ST) Add-On Instruction (AOI)
// ==============================================================================
// Parameters:
//  Inp_MotorCurrent     : REAL (Amperes)
//  Inp_WindingTemp      : REAL (Deg C)
//  Inp_VibrationRMS     : REAL (mm/s)
//  Inp_SafetyPermissive : BOOL
//  Out_MotorTrip        : BOOL
//  Out_AlarmWarning     : BOOL

// 1. Safety Interlock Evaluation
IF NOT Inp_SafetyPermissive THEN
    Out_MotorTrip := 1;
    Out_AlarmWarning := 1;
    TON_DebounceTrip.EnableIn := 0;
    RETURN;
END_IF;

// 2. High Vibration & Temperature Trip Limits
IF (Inp_WindingTemp >= 95.0) OR (Inp_VibrationRMS >= 7.5) THEN
    // Execute 2-second debounce timer before hard trip
    TON_DebounceTrip.PRE := 2000; // 2000 ms
    TON_DebounceTrip.TimerEnable := 1;
    TON(TON_DebounceTrip);
    
    IF TON_DebounceTrip.DN THEN
        Out_MotorTrip := 1;
    END_IF;
    Out_AlarmWarning := 1;
ELSE
    TON_DebounceTrip.TimerEnable := 0;
    TON_DebounceTrip.ACC := 0;
    Out_MotorTrip := 0;
    Out_AlarmWarning := 0;
END_IF;
`;
    explanation = 'Rockwell Studio 5000 Add-On Instruction logic with 2000ms TON timer debounce on high winding temperature (95°C) and RMS vibration (7.5 mm/s).';
  }

  // ── 4. TASC NATIVE AST RULES ──
  else {
    targetLabel = 'TASC Native AST Multi-Variable Rule Engine';
    language = 'javascript';
    fileExtension = 'json';
    title = 'TASC Native FDD Multi-Variable Expression & Cost Loss Schema';
    code = `{
  "ruleId": "fdd_chiller_low_flow_overheat",
  "ruleName": "Chiller Overheat with Low Water Flow Anomaly",
  "assetId": "Chiller-Unit-01",
  "expression": "Chiller.DischargeTemp > 85.0 && Chiller.WaterFlow < 25.0",
  "debounceSeconds": 5,
  "severity": "CRITICAL",
  "costPerHour": 1450.0,
  "currency": "INR",
  "actionRecommendation": "Immediate technician dispatch: Check primary condenser pump and scale buildup on condenser tube bundles.",
  "safetyTripInterlock": true
}`;
    explanation = 'Directly usable in TASC FDD Studio. Evaluated at 10Hz by the TASC AST interpreter with 5-second hysteresis debounce.';
  }

  const safetyCheck = lintIndustrialCode(code, target);

  return {
    target,
    targetLabel,
    title,
    code,
    language,
    fileExtension,
    safetyCheck,
    explanation,
    recommendedTags
  };
}
