# 18. Offline Mode and Synchronization

## 18.1 Offline Architecture

Each booth must be able to function without internet. This is a core architectural requirement because mall internet connectivity can be unreliable.

```
                  CENTRAL SERVER
                         │
                         │
                Internet Connection
                         │
                    Available?
                    /         \
                  YES          NO
                   │            │
                   ▼            ▼
             Sync Data    Continue Locally
                   │            │
                   │            ├── Capture Photos
                   │            ├── Process Images
                   │            ├── Generate Templates
                   │            ├── Print
                   │            └── Save to SQLite + Filesystem
                   │
                   └───────────────┐
                                   │
                           Internet Restored
                                   │
                                   ▼
                               Synchronize
```

## 18.2 What Works Offline

| Function                  | Online | Offline |
|---------------------------|--------|---------|
| Customer photo session    | ✅      | ✅       |
| Template selection        | ✅      | ✅ (cached) |
| Filter/LUT application    | ✅      | ✅ (cached) |
| Photo capture             | ✅      | ✅       |
| Printing                  | ✅      | ✅       |
| Session data save         | ✅      | ✅ (local) |
| Operator remote commands  | ✅      | ❌       |
| Admin dashboard view      | ✅      | ❌       |
| Photo sync to cloud       | ✅      | ❌ (queued) |
| Template/LUT updates      | ✅      | ❌ (uses cache) |

## 18.3 Synchronization State Machine

Every local record has a synchronization state:

```
sync_status:
    PENDING     — Created locally, not yet uploaded
    UPLOADING   — Upload in progress
    SYNCED      — Successfully synchronized
    FAILED      — Upload failed, will retry
```

### Sync Workflow

```
Photo Captured
      │
      ▼
Saved Locally (file + SQLite record)
      │
      ▼
sync_status = PENDING
      │
      ▼
Internet Available?
      │
   ┌──YES──────────────┐
   │                   │
   ▼                   │
sync_status = UPLOADING│
   │                   │
   ▼                   │
Upload File to Object Storage
   │                   │
   ▼                   │
Update Central Database│
   │                   │
   ▼                   │
sync_status = SYNCED   │
                       │
      NO ──────────────┘
      │
      ▼
Stays as PENDING
      │
      ▼
Sync service retries periodically
```

## 18.4 Conflict Resolution

When a booth operates offline and the operator issues commands through the backend, conflicts can occur.

### Conflict Scenarios and Resolution

| Scenario                                                    | Resolution                                              |
|------------------------------------------------------------|---------------------------------------------------------|
| Operator starts session via backend, but booth is offline  | Backend queues command; booth receives on reconnect     |
| Booth creates session offline, then syncs                  | Backend accepts booth's session data (booth is source of truth for captures) |
| Operator adds time while booth is offline                  | Queued as pending command; applied on reconnect         |
| Two sessions created with overlapping IDs                  | Use UUIDs generated locally to prevent ID collision     |
| Template updated centrally while booth has cached version  | Booth checks template version on sync; downloads if newer |

### Resolution Principles

1. **Booth is the source of truth** for session capture data (photos, timestamps, print jobs)
2. **Backend is the source of truth** for configuration data (templates, LUTs, packages, operator assignments)
3. All entities use **UUIDs** generated locally to prevent ID collisions
4. Sync operations are **idempotent** — re-syncing the same data is safe
5. **Pending commands** are timestamped and applied in order on reconnect

## 18.5 Sync Service Behavior

The synchronization service runs as a background thread on the booth:

```
Every 30 seconds (configurable):
    │
    ├── Check internet connectivity
    │
    ├── If ONLINE:
    │   ├── Send heartbeat
    │   ├── Check for pending commands from backend
    │   ├── Upload PENDING photos (oldest first)
    │   ├── Upload PENDING session data
    │   ├── Check for template/LUT updates
    │   └── Download any new templates/LUTs
    │
    └── If OFFLINE:
        └── Log offline status, continue local operations
```

### Retry Logic

- Failed uploads are retried with **exponential backoff**: 30s → 1m → 2m → 5m → 10m (max)
- After 5 consecutive failures, the item is marked as `FAILED` and an alert is logged
- Failed items can be manually re-queued by the admin or operator

---