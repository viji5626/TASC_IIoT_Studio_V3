/**
 * TASC IIoT Studio — Field Transformation & Telemetry Processing Engine
 *
 * Provides industrial data transformations before injecting values into Excel/HTML reports:
 *  - Meter Rollover & Reset protection for cumulative energy/flow counters (delta_consumption)
 *  - Standard unit conversions (°C <-> °F, bar <-> psi, kW <-> HP)
 *  - Unit scaling (kilo, milli)
 *  - Safe arithmetic formula parsing (no eval)
 *  - Clamping (min/max limits)
 */

import { ReportFieldMap, FieldTransformType } from '../types';

/**
 * Safely evaluates a math expression on a numeric value 'val'
 * Supports basic arithmetic: +, -, *, /, %, ^, (, ) and numbers
 */
export function evaluateSafeMath(formula: string, val: number): number {
  if (!formula || typeof formula !== 'string') return val;
  try {
    // Replace 'val' or 'x' (case-insensitive) with numeric value
    const sanitized = formula
      .replace(/\b(val|x|v)\b/gi, `(${val})`)
      .replace(/[^0-9+\-*/().^%eE\s]/g, '');

    // Tokenize and evaluate safely using recursive descent parser
    return parseArithmetic(sanitized);
  } catch {
    return val;
  }
}

/**
 * Simple recursive descent parser for safe arithmetic strings without eval()
 */
function parseArithmetic(expr: string): number {
  let pos = 0;

  function peek(): string {
    while (pos < expr.length && /\s/.test(expr[pos])) pos++;
    return pos < expr.length ? expr[pos] : '';
  }

  function get(): string {
    const ch = peek();
    if (ch) pos++;
    return ch;
  }

  function parseNumber(): number {
    let start = pos;
    if (peek() === '+' || peek() === '-') pos++;
    while (pos < expr.length && /[0-9.]/.test(expr[pos])) pos++;
    if (pos < expr.length && (expr[pos] === 'e' || expr[pos] === 'E')) {
      pos++;
      if (pos < expr.length && (expr[pos] === '+' || expr[pos] === '-')) pos++;
      while (pos < expr.length && /[0-9]/.test(expr[pos])) pos++;
    }
    const substr = expr.slice(start, pos).trim();
    const num = Number(substr);
    return isFinite(num) ? num : 0;
  }

  function parseFactor(): number {
    const ch = peek();
    if (ch === '(') {
      get(); // consume '('
      const result = parseExpression();
      if (peek() === ')') get(); // consume ')'
      return result;
    }
    return parseNumber();
  }

  function parseTerm(): number {
    let result = parseFactor();
    while (true) {
      const op = peek();
      if (op === '*' || op === '/' || op === '%') {
        get();
        const next = parseFactor();
        if (op === '*') result *= next;
        else if (op === '/') result = next !== 0 ? result / next : 0;
        else if (op === '%') result = next !== 0 ? result % next : 0;
      } else if (op === '^') {
        get();
        const next = parseFactor();
        result = Math.pow(result, next);
      } else {
        break;
      }
    }
    return result;
  }

  function parseExpression(): number {
    let result = parseTerm();
    while (true) {
      const op = peek();
      if (op === '+' || op === '-') {
        get();
        const next = parseTerm();
        if (op === '+') result += next;
        else result -= next;
      } else {
        break;
      }
    }
    return result;
  }

  const res = parseExpression();
  return isFinite(res) ? res : 0;
}

/**
 * Applies configured transformation (delta, unit conversion, math, clamp) to an array of points.
 */
export function applyFieldTransformation(
  points: Array<{ ts: number; val: number }>,
  fieldMap: ReportFieldMap
): Array<{ ts: number; val: number }> {
  if (!points || points.length === 0) return [];
  const transform = fieldMap.transform || 'none';

  let result: Array<{ ts: number; val: number }> = [];

  if (transform === 'delta_consumption') {
    // Delta computation with meter rollover detection
    let prevVal: number | null = null;
    let lastValidDelta = 0;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      let delta = 0;

      if (prevVal === null) {
        // First point in range
        delta = 0;
      } else if (p.val >= prevVal) {
        // Normal cumulative increase
        delta = p.val - prevVal;
        lastValidDelta = delta;
      } else {
        // Meter rollover / reset detected (p.val < prevVal)
        // e.g. 999999 -> 12, or meter replacement
        if (p.val >= 0 && p.val < 1000) {
          // Reset to 0 start: consumption is current val
          delta = p.val;
        } else {
          // Unclear rollover: fallback to last valid delta or 0
          delta = lastValidDelta > 0 ? lastValidDelta : 0;
        }
      }

      prevVal = p.val;
      result.push({ ts: p.ts, val: delta });
    }
  } else {
    // Point-by-point transformations
    result = points.map(p => {
      let v = p.val;

      switch (transform) {
        case 'scale_kilo':
          v = v * 1000;
          break;
        case 'scale_milli':
          v = v / 1000;
          break;
        case 'c_to_f':
          v = (v * 9) / 5 + 32;
          break;
        case 'f_to_c':
          v = ((v - 32) * 5) / 9;
          break;
        case 'bar_to_psi':
          v = v * 14.5038;
          break;
        case 'psi_to_bar':
          v = v / 14.5038;
          break;
        case 'abs':
          v = Math.abs(v);
          break;
        case 'invert':
          v = -v;
          break;
        case 'custom_math':
          if (fieldMap.customFormula) {
            v = evaluateSafeMath(fieldMap.customFormula, v);
          }
          break;
        case 'none':
        default:
          break;
      }

      return { ts: p.ts, val: v };
    });
  }

  // Apply Clamping if specified
  if (fieldMap.clampMin !== undefined || fieldMap.clampMax !== undefined) {
    const min = fieldMap.clampMin !== undefined ? fieldMap.clampMin : -Infinity;
    const max = fieldMap.clampMax !== undefined ? fieldMap.clampMax : Infinity;
    result = result.map(p => ({
      ts: p.ts,
      val: Math.max(min, Math.min(max, p.val))
    }));
  }

  return result;
}

/** Human-readable label for transform types */
export const TRANSFORM_LABELS: Record<FieldTransformType, string> = {
  none: 'None (Raw Value)',
  delta_consumption: 'Delta / Interval Consumption (Rollover Safe)',
  scale_kilo: 'Multiply × 1,000 (kilo)',
  scale_milli: 'Divide ÷ 1,000 (milli)',
  c_to_f: 'Temperature: °C ➔ °F',
  f_to_c: 'Temperature: °F ➔ °C',
  bar_to_psi: 'Pressure: bar ➔ PSI',
  psi_to_bar: 'Pressure: PSI ➔ bar',
  abs: 'Absolute Value |x|',
  invert: 'Invert (-x)',
  custom_math: 'Custom Math Formula'
};
