/**
 * SCADA-Style Process Point Subscription Hook: useSqlTag
 * 
 * Non-blocking React hook for subscribing to a specific cell/column in an SQL Server table.
 * Supports syntax such as "db.Sensors[0].ActualTemp" or "Sensors.ActualTemp".
 * Exposes live value, loading state, and industrial tag quality without crashing the UI.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { sqlTagManager, TagDataSnapshot } from '../services/sql/sqlTagManager';
import { UseSqlTagOptions, UseSqlTagResult, TagQuality } from '../types/sql';

export function useSqlTag<T = any>(
  tagPath: string,
  options: UseSqlTagOptions<T> = {}
): UseSqlTagResult<T> {
  const {
    pollIntervalMs = 2000,
    autoPoll = true,
    schema = 'dbo',
    filters,
    defaultValue,
    transform,
  } = options;

  const [value, setValue] = useState<T | undefined>(defaultValue);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [quality, setQuality] = useState<TagQuality>('UNCERTAIN');
  const [timestamp, setTimestamp] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawRecord, setRawRecord] = useState<Record<string, any> | null>(null);

  // Store options in ref to avoid unnecessary resubscriptions
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!tagPath || !tagPath.trim()) {
      setIsLoading(false);
      setQuality('BAD');
      setError('Empty or invalid tag path provided');
      return;
    }

    setIsLoading(true);

    const unsubscribe = sqlTagManager.subscribe(
      tagPath,
      {
        pollIntervalMs,
        autoPoll,
        schema,
        filters,
        transform,
      },
      (snapshot: TagDataSnapshot) => {
        setValue(snapshot.value !== undefined ? (snapshot.value as T) : defaultValue);
        setQuality(snapshot.quality);
        setRawRecord(snapshot.rawRecord);
        setTimestamp(snapshot.timestamp);
        setError(snapshot.error);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [tagPath, pollIntervalMs, autoPoll, schema, JSON.stringify(filters)]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    const parsed = sqlTagManager.parseTagPath(tagPath, schema);
    const groupKey = `${parsed.schema}.${parsed.table}:${JSON.stringify(filters || [])}:${Math.max(500, pollIntervalMs)}`;
    // Trigger group fetch if present
    const group = (sqlTagManager as any).groups?.get?.(groupKey);
    if (group) {
      await sqlTagManager.fetchGroupData(group);
    }
    setIsLoading(false);
  }, [tagPath, schema, filters, pollIntervalMs]);

  const updateValue = useCallback(
    async (newValue: any): Promise<boolean> => {
      const res = await sqlTagManager.writeTagValue(tagPath, newValue, 'id', { schema });
      if (res.success) {
        await refetch();
        return true;
      } else {
        setError(res.error || 'Failed to update value');
        return false;
      }
    },
    [tagPath, schema, refetch]
  );

  return {
    value,
    isLoading,
    quality,
    timestamp,
    error,
    rawRecord,
    refetch,
    updateValue,
  };
}

export default useSqlTag;
