# TASC IIoT Studio: SQL Database Connectivity & TASCGrid Integration Guide

This guide describes how to connect, query, subscribe to, and manipulate Microsoft SQL Server data using Windows Authentication in TASC IIoT Studio.

---

## 1. Architecture Overview

- **Backend Connector (`ScadaSqlService`)**: Standalone, singleton database service using `mssql` with connection pooling, Windows Authentication (Integrated Security / NTLM), auto-reconnect, 30s query timeout, and query deduplication.
- **REST Endpoints (`/api/scada-sql/...`)**: Dedicated Data Source polling (`/query`), Data Manipulator execution (`/execute`), schema introspection (`/tables`), and health diagnostics (`/status`).
- **Client-Side Polling Coordinator (`sqlTagManager`)**: Batches multiple process point tag subscriptions into single consolidated HTTP polling queries and automatically pauses during background tab inactivity.
- **Process Point Hook (`useSqlTag`)**: Non-blocking React hook for subscribing to individual cells (e.g. `db.Sensors[0].ActualTemp`).
- **Drop-In Grid Component (`<TASCGrid />`)**: Industrial grid featuring live Data Source streaming, alarm threshold conditional highlighting, and Data Manipulator Stored Procedure execution.

---

## 2. Backend Configuration & Windows Authentication

### Environment Variables

Configure connection settings in `.env` or system environment:

```env
SCADA_SQL_SERVER=localhost
SCADA_SQL_PORT=1433
SCADA_SQL_DATABASE=PlantOperations
SCADA_SQL_AUTH_TYPE=windows_integrated
# For Windows NTLM or Domain accounts:
SCADA_SQL_DOMAIN=CORP
SCADA_SQL_USER=scada_operator
SCADA_SQL_PASSWORD=SecretPassword123
```

### Importing into Existing Controllers / Backend Services

```typescript
import { scadaSqlService } from './src/services/sql/scadaSqlService';

// 1. Check health
const status = await scadaSqlService.getStatus();
console.log('SQL Connected:', status.connected, 'Latency:', status.lastPingLatencyMs);

// 2. Query a table with safe pagination & filters
const result = await scadaSqlService.queryTable({
  table: 'Sensors',
  schema: 'dbo',
  page: 1,
  limit: 50,
  filters: [{ column: 'Status', op: 'eq', value: 'ACTIVE' }],
  sortBy: 'Temperature',
  sortDir: 'DESC',
});

// 3. Execute a Stored Procedure
const spResult = await scadaSqlService.executeStoredProcedure('sp_UpdateMotorSetpoint', [
  { name: 'MotorId', type: 'int', value: 101 },
  { name: 'TargetRpm', type: 'float', value: 1450.5 },
  { name: 'ResultCode', type: 'int', isOutput: true, value: null },
]);
```

---

## 3. Frontend: Process Point Hook (`useSqlTag`)

Use `useSqlTag` inside any existing React component or dashboard widget to subscribe to a process point cell.

### Syntax Examples

```tsx
import React from 'react';
import { useSqlTag } from './src/hooks';

export const TemperatureWidget: React.FC = () => {
  // Subscribes to row 0, column 'ActualTemp' from table 'Sensors'
  const { value, isLoading, quality, timestamp, error, updateValue } = useSqlTag<number>(
    'db.Sensors[0].ActualTemp',
    {
      pollIntervalMs: 2000,
      defaultValue: 0,
    }
  );

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-white">
      <div className="flex justify-between items-center text-xs text-slate-400">
        <span>Actual Temperature</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            quality === 'GOOD'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/20 text-rose-400'
          }`}
        >
          {quality}
        </span>
      </div>

      <div className="text-2xl font-bold font-mono my-2">
        {isLoading ? '...' : `${value?.toFixed(1)} °C`}
      </div>

      <button
        type="button"
        onClick={() => updateValue(75.0)}
        className="px-2 py-1 bg-indigo-600 rounded text-xs"
      >
        Set Target 75°C
      </button>
    </div>
  );
};
```

---

## 4. Frontend: Drop-In Grid Component (`<TASCGrid />`)

Place `<TASCGrid />` in any dashboard layout, panel, or modal.

### Complete Example with Alarm Thresholds

```tsx
import React from 'react';
import { TASCGrid } from './src/components/sql';

export const LivePlantGridView: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white">Plant Floor Telemetry & Controls</h1>

      <TASCGrid
        table="MachineSensors"
        schema="dbo"
        title="Reactor Line 1 Sensors"
        pollIntervalMs={2500}
        pageSize={25}
        thresholdRules={[
          {
            column: 'Temperature',
            condition: 'gt',
            value: 90,
            severity: 'critical',
            badgeLabel: 'HIGH TEMP ALARM',
            pulse: true,
          },
          {
            column: 'Temperature',
            condition: 'gt',
            value: 80,
            severity: 'warning',
            badgeLabel: 'WARN',
          },
          {
            column: 'Pressure',
            condition: 'lt',
            value: 15,
            severity: 'warning',
            badgeLabel: 'LOW PRESS',
          },
        ]}
        actions={[
          {
            label: 'Ack Alarm',
            variant: 'warning',
            onClick: (row) => alert(`Acknowledged row ID: ${row.id}`),
          },
        ]}
      />
    </div>
  );
};
```

---

## 5. Summary of Files Added

| File | Purpose |
|---|---|
| [`src/types/sql.ts`](file:///d:/AI_ems/tasc-iiot-studio_AI/src/types/sql.ts) | Shared TypeScript definitions for configs, filters, quality, and TASCGrid props |
| [`src/services/sql/scadaSqlService.ts`](file:///d:/AI_ems/tasc-iiot-studio_AI/src/services/sql/scadaSqlService.ts) | Modular backend SQL Server service with Windows Auth & 30s query timeout |
| [`src/routes/scadaSqlRoutes.ts`](file:///d:/AI_ems/tasc-iiot-studio_AI/src/routes/scadaSqlRoutes.ts) | Data Source (`/query`) and Data Manipulator (`/execute`) REST endpoints |
| [`src/services/sql/sqlTagManager.ts`](file:///d:/AI_ems/tasc-iiot-studio_AI/src/services/sql/sqlTagManager.ts) | Client-side tag batching coordinator and visibility listener |
| [`src/hooks/useSqlTag.ts`](file:///d:/AI_ems/tasc-iiot-studio_AI/src/hooks/useSqlTag.ts) | Non-blocking React hook for subscribing to process points |
| [`src/components/sql/TASCGrid.tsx`](file:///d:/AI_ems/tasc-iiot-studio_AI/src/components/sql/TASCGrid.tsx) | Unified Data Source stream & Data Manipulator Stored Procedure grid |
