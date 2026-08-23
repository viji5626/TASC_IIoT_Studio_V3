import {
  MachineLineConfig,
  MachineState,
  DowntimeEvent,
  OeeMetrics,
  SixBigLossesBreakdown,
  DowntimeCategory
} from '../types/production';

/**
 * Helper class for tracking monotonic counter values across PLC resets,
 * 16/32-bit rollovers, and shift changes without producing negative deltas.
 */
export class CumulativeDeltaTracker {
  private lastRawValue: number | null = null;
  private accumulatedDelta = 0;
  private rolloverThreshold: number;

  constructor(rolloverThreshold = 65535) {
    this.rolloverThreshold = rolloverThreshold;
  }

  /**
   * Ingests a new raw counter reading from PLC / MQTT.
   * Detects resets and rollover, returning the total accumulated count since reset.
   */
  public update(currentRaw: number): number {
    if (typeof currentRaw !== 'number' || isNaN(currentRaw) || currentRaw < 0) {
      return this.accumulatedDelta;
    }

    if (this.lastRawValue === null) {
      this.lastRawValue = currentRaw;
      return this.accumulatedDelta;
    }

    if (currentRaw >= this.lastRawValue) {
      // Normal monotonic increment
      const delta = currentRaw - this.lastRawValue;
      this.accumulatedDelta += delta;
    } else {
      // Counter Rollover or Shift Zero-Reset Detected
      // If close to 16-bit / 32-bit threshold, compute wrapped delta, else assume zero-reset
      if (this.lastRawValue > this.rolloverThreshold * 0.9) {
        const wrappedDelta = (this.rolloverThreshold - this.lastRawValue) + currentRaw;
        this.accumulatedDelta += Math.max(0, wrappedDelta);
      } else {
        // Plain zero reset
        this.accumulatedDelta += currentRaw;
      }
    }

    this.lastRawValue = currentRaw;
    return this.accumulatedDelta;
  }

  public getAccumulated(): number {
    return this.accumulatedDelta;
  }

  public reset(baseline = 0): void {
    this.lastRawValue = null;
    this.accumulatedDelta = baseline;
  }
}

/**
 * State Transition Debounce & Anti-Chatter Filter.
 * Requires a stop bit or running bit to persist for N seconds before switching states.
 */
export class StateDebounceFilter {
  private candidateState: MachineState | null = null;
  private candidateStartTime = 0;
  private currentState: MachineState = MachineState.IDLE_MICRO_STOP;
  private debounceMs: number;

  constructor(debounceSeconds = 3, initialState = MachineState.IDLE_MICRO_STOP) {
    this.debounceMs = debounceSeconds * 1000;
    this.currentState = initialState;
  }

  public process(rawTargetState: MachineState, now = Date.now()): MachineState {
    if (rawTargetState === this.currentState) {
      this.candidateState = null;
      return this.currentState;
    }

    if (this.candidateState !== rawTargetState) {
      this.candidateState = rawTargetState;
      this.candidateStartTime = now;
      return this.currentState;
    }

    // Candidate has persisted for debounce duration
    if (now - this.candidateStartTime >= this.debounceMs) {
      this.currentState = this.candidateState;
      this.candidateState = null;
    }

    return this.currentState;
  }

  public getCurrentState(): MachineState {
    return this.currentState;
  }

  public forceState(state: MachineState): void {
    this.currentState = state;
    this.candidateState = null;
  }
}

/**
 * OEE Calculation Engine conforming to TPM Standards.
 */
export class OeeCalculationEngine {
  /**
   * Calculates instantaneous and accumulated OEE (Availability, Performance, Quality).
   */
  public static calculateOee(
    lineConfig: MachineLineConfig,
    plannedProductionSec: number,
    unplannedDowntimeSec: number,
    plannedDowntimeSec: number,
    microStopsSec: number,
    totalCount: number,
    rejectCount: number
  ): OeeMetrics {
    // 1. Availability Calculation
    // Operating Time = Planned Production Time - Unplanned Downtime
    const safePlannedSec = Math.max(1, plannedProductionSec);
    const operatingSec = Math.max(0, safePlannedSec - unplannedDowntimeSec);
    const rawAvailability = (operatingSec / safePlannedSec) * 100;
    const availabilityPct = Math.min(100, Math.max(0, Number(rawAvailability.toFixed(2))));

    // 2. Performance Calculation
    // Performance = (Ideal Cycle Time * Total Parts Produced) / Operating Time
    const safeOperatingSec = Math.max(1, operatingSec);
    const safeTotalCount = Math.max(0, totalCount);
    const idealProductionSec = safeTotalCount * lineConfig.idealCycleTimeSec;
    const rawPerformance = operatingSec > 0 
      ? (idealProductionSec / safeOperatingSec) * 100 
      : 0;
    const performancePct = Math.min(100, Math.max(0, Number(rawPerformance.toFixed(2))));

    // 3. Quality Calculation
    // Quality = (Good Parts / Total Parts)
    const safeRejectCount = Math.max(0, Math.min(safeTotalCount, rejectCount));
    const goodCount = Math.max(0, safeTotalCount - safeRejectCount);
    const rawQuality = safeTotalCount > 0 
      ? (goodCount / safeTotalCount) * 100 
      : 100;
    const qualityPct = Math.min(100, Math.max(0, Number(rawQuality.toFixed(2))));

    // 4. World-Class OEE Calculation
    // OEE = Availability * Performance * Quality
    const rawOee = (availabilityPct * performancePct * qualityPct) / 10000;
    const oeePct = Math.min(100, Math.max(0, Number(rawOee.toFixed(2))));

    const scrapRatePct = safeTotalCount > 0 
      ? Number(((safeRejectCount / safeTotalCount) * 100).toFixed(2)) 
      : 0;

    // Rates in Parts Per Minute (PPM)
    const actualRunRatePpm = operatingSec > 0 
      ? Number(((safeTotalCount / (operatingSec / 60))).toFixed(1)) 
      : 0;
    const targetRunRatePpm = lineConfig.idealCycleTimeSec > 0 
      ? Number((60 / lineConfig.idealCycleTimeSec).toFixed(1)) 
      : 0;

    return {
      availabilityPct,
      performancePct,
      qualityPct,
      oeePct,
      plannedProductionTimeSec: safePlannedSec,
      operatingTimeSec: operatingSec,
      unplannedDowntimeSec,
      plannedDowntimeSec,
      microStopsSec,
      totalCount: safeTotalCount,
      goodCount,
      rejectCount: safeRejectCount,
      scrapRatePct,
      actualRunRatePpm,
      targetRunRatePpm
    };
  }

  /**
   * Decomposes plant losses into TPM Six Big Losses.
   */
  public static calculateSixBigLosses(
    events: DowntimeEvent[],
    metrics: OeeMetrics,
    idealCycleTimeSec: number
  ): SixBigLossesBreakdown {
    let unplannedBreakdownsSec = 0;
    let setupAndAdjustmentsSec = 0;
    let smallStopsAndIdlingSec = 0;

    events.forEach(evt => {
      if (evt.category === DowntimeCategory.CHANGEOVER_SETUP) {
        setupAndAdjustmentsSec += evt.durationSec;
      } else if (evt.durationSec < 300 && evt.state === MachineState.IDLE_MICRO_STOP) {
        smallStopsAndIdlingSec += evt.durationSec;
      } else if (!evt.isPlanned) {
        unplannedBreakdownsSec += evt.durationSec;
      }
    });

    // Speed Loss = Operating Time - (Total Count * Ideal Cycle Time)
    const expectedOperatingSec = metrics.totalCount * idealCycleTimeSec;
    const reducedSpeedLossSec = Math.max(0, metrics.operatingTimeSec - expectedOperatingSec);

    // Rejects Breakdown
    const startupRejectsCount = Math.round(metrics.rejectCount * 0.25); // Estimated startup scrap
    const productionRejectsCount = metrics.rejectCount - startupRejectsCount;

    // Total lost hours equivalent
    const totalLostSec = unplannedBreakdownsSec + setupAndAdjustmentsSec + smallStopsAndIdlingSec + reducedSpeedLossSec;
    const totalLostHours = Number((totalLostSec / 3600).toFixed(2));

    return {
      unplannedBreakdownsSec,
      setupAndAdjustmentsSec,
      smallStopsAndIdlingSec,
      reducedSpeedLossSec,
      startupRejectsCount,
      productionRejectsCount,
      totalLostHours
    };
  }

  /**
   * Generates a Pareto 80/20 breakdown of downtime reasons.
   */
  public static getParetoLosses(events: DowntimeEvent[]): {
    category: DowntimeCategory;
    totalSeconds: number;
    count: number;
    percentage: number;
    cumulativePercentage: number;
  }[] {
    const map = new Map<DowntimeCategory, { totalSeconds: number; count: number }>();

    events.forEach(evt => {
      if (evt.isPlanned) return; // Only unplanned losses in Pareto
      const existing = map.get(evt.category) || { totalSeconds: 0, count: 0 };
      existing.totalSeconds += evt.durationSec;
      existing.count += 1;
      map.set(evt.category, existing);
    });

    const totalDowntime = Array.from(map.values()).reduce((sum, item) => sum + item.totalSeconds, 0);

    const sorted = Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        totalSeconds: data.totalSeconds,
        count: data.count,
        percentage: totalDowntime > 0 ? Number(((data.totalSeconds / totalDowntime) * 100).toFixed(1)) : 0,
        cumulativePercentage: 0
      }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);

    let cumulative = 0;
    sorted.forEach(item => {
      cumulative += item.percentage;
      item.cumulativePercentage = Math.min(100, Number(cumulative.toFixed(1)));
    });

    return sorted;
  }
}
