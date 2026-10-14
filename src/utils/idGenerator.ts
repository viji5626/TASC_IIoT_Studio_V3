/**
 * High-performance, collision-resistant unique ID generator using native Web Crypto UUID.
 * Backwards compatible with legacy environments.
 */
export function generateUniqueId(prefix: string = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Deep clones an object using native structuredClone if available,
 * with standard JSON fallback for environments lacking structuredClone.
 */
export function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Fallback if value contains non-cloneable objects (functions, etc.)
    }
  }
  return JSON.parse(JSON.stringify(value));
}
