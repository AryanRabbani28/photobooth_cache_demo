# 16. Database Architecture

## 16.1 Dual Database Strategy

The system uses two types of databases:

```
                    ┌───────────────────────┐
                    │   CENTRAL DATABASE    │
                    │     PostgreSQL        │
                    │                       │
                    │  All booths' data     │
                    │  Permanent record     │
                    │  Analytics source     │
                    └───────────┬───────────┘
                                │
                         Sync Service
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
   ┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐
   │ LOCAL DB    │       │ LOCAL DB    │       │ LOCAL DB    │
   │  SQLite     │       │  SQLite     │       │  SQLite     │
   │  Booth 01   │       │  Booth 02   │       │  Booth 03   │
   │             │       │             │       │             │
   │ Active data │       │ Active data │       │ Active data │
   │ Offline ops │       │ Offline ops │       │ Offline ops │
   └─────────────┘       └─────────────┘       └─────────────┘
```

## 16.2 Central Database Schema (PostgreSQL)

### users

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(100) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'OPERATOR', 'BOOTH_DEVICE')),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### operators

```sql
CREATE TABLE operators (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
    name             VARCHAR(200) NOT NULL,
    phone            VARCHAR(20),
    assigned_booth_id UUID REFERENCES booths(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### locations

```sql
CREATE TABLE locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    address     TEXT,
    city        VARCHAR(100),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### booths

```sql
CREATE TABLE booths (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
    name            VARCHAR(100) NOT NULL,
    booth_code      VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "BC-01"
    device_id       VARCHAR(100) UNIQUE,          -- hardware identifier
    status          VARCHAR(20) DEFAULT 'OFFLINE'
                    CHECK (status IN ('ONLINE', 'OFFLINE', 'MAINTENANCE')),
    last_seen       TIMESTAMPTZ,
    app_version     VARCHAR(20),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### packages

```sql
CREATE TABLE packages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL,
    duration_seconds    INTEGER NOT NULL,
    max_photos          INTEGER NOT NULL,
    max_retakes         INTEGER DEFAULT -1,  -- -1 = unlimited
    number_of_prints    INTEGER DEFAULT 1,
    price               DECIMAL(10, 2),
    expiry_behavior     VARCHAR(20) DEFAULT 'AUTO_COMPLETE'
                        CHECK (expiry_behavior IN ('AUTO_COMPLETE', 'GRACE_PERIOD', 'ASK_OPERATOR')),
    grace_period_sec    INTEGER DEFAULT 0,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### templates

```sql
CREATE TABLE templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    category        VARCHAR(50),
    configuration   JSONB NOT NULL,          -- Full template JSON schema
    thumbnail_path  VARCHAR(500),
    template_path   VARCHAR(500),            -- Background image path
    number_of_slots INTEGER NOT NULL,
    version         INTEGER DEFAULT 1,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### luts

```sql
CREATE TABLE luts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    file_path       VARCHAR(500) NOT NULL,
    preview_path    VARCHAR(500),
    version         INTEGER DEFAULT 1,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### sessions

```sql
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booth_id        UUID REFERENCES booths(id),
    operator_id     UUID REFERENCES operators(id),
    package_id      UUID REFERENCES packages(id),
    template_id     UUID REFERENCES templates(id),
    customer_name   VARCHAR(200),
    status          VARCHAR(30) NOT NULL DEFAULT 'CREATED'
                    CHECK (status IN (
                        'CREATED', 'READY', 'TEMPLATE_SELECTED', 'ACTIVE',
                        'PAUSED', 'PHOTO_COMPLETE', 'FINAL_PREVIEW',
                        'PRINTING', 'PRINT_FAILED', 'COMPLETED',
                        'CANCELLED', 'EXPIRED', 'ERROR'
                    )),
    allocated_time  INTEGER NOT NULL,       -- seconds
    remaining_time  INTEGER,                -- seconds
    total_photos    INTEGER NOT NULL,
    photos_captured INTEGER DEFAULT 0,
    retakes_used    INTEGER DEFAULT 0,
    started_at      TIMESTAMPTZ,            -- when timer started
    ended_at        TIMESTAMPTZ,            -- when terminal state reached
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### photos

```sql
CREATE TABLE photos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID REFERENCES sessions(id) ON DELETE CASCADE,
    slot_index          INTEGER NOT NULL,       -- which template slot (0-indexed)
    original_file_path  VARCHAR(500) NOT NULL,
    processed_file_path VARCHAR(500),
    lut_id              UUID REFERENCES luts(id),
    filter_name         VARCHAR(50),
    is_kept             BOOLEAN DEFAULT TRUE,   -- false if retaken
    captured_at         TIMESTAMPTZ DEFAULT NOW(),
    sync_status         VARCHAR(20) DEFAULT 'PENDING'
                        CHECK (sync_status IN ('PENDING', 'UPLOADING', 'SYNCED', 'FAILED'))
);
```

### final_outputs

```sql
CREATE TABLE final_outputs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID REFERENCES sessions(id) ON DELETE CASCADE,
    file_path       VARCHAR(500) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    sync_status     VARCHAR(20) DEFAULT 'PENDING'
                    CHECK (sync_status IN ('PENDING', 'UPLOADING', 'SYNCED', 'FAILED'))
);
```

### print_jobs

```sql
CREATE TABLE print_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID REFERENCES sessions(id),
    final_output_id UUID REFERENCES final_outputs(id),
    copies          INTEGER DEFAULT 1,
    status          VARCHAR(20) NOT NULL DEFAULT 'QUEUED'
                    CHECK (status IN ('QUEUED', 'PRINTING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    error_message   TEXT,
    is_reprint      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);
```

### device_status

```sql
CREATE TABLE device_status (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booth_id        UUID REFERENCES booths(id) UNIQUE,
    camera_status   VARCHAR(20) DEFAULT 'UNKNOWN',
    camera_model    VARCHAR(100),
    printer_status  VARCHAR(20) DEFAULT 'UNKNOWN',
    printer_model   VARCHAR(100),
    internet_status VARCHAR(20) DEFAULT 'UNKNOWN',
    disk_free_mb    INTEGER,
    app_version     VARCHAR(20),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### system_logs

```sql
CREATE TABLE system_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booth_id    UUID REFERENCES booths(id),
    level       VARCHAR(10) NOT NULL,   -- INFO, WARN, ERROR, CRITICAL
    source      VARCHAR(100),           -- module/component name
    message     TEXT NOT NULL,
    details     JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

## 16.3 Local Booth Database Schema (SQLite)

Every physical booth laptop has its own local SQLite database. This allows the booth to continue operating when the internet is unavailable.

The local database stores:

| Table               | Purpose                                  |
|---------------------|------------------------------------------|
| local_sessions      | Current and recent sessions              |
| local_photos        | Captured photo metadata                  |
| local_print_jobs    | Print history and pending jobs           |
| local_device_status | Latest camera/printer/internet status    |
| sync_queue          | Items pending synchronization            |
| templates_cache     | Downloaded template configurations       |
| luts_cache          | Downloaded LUT metadata                  |
| pending_commands    | Commands received while offline          |
| config              | Booth identity, settings, server URL     |

## 16.4 Entity Relationship Overview

```
locations ──┐
            │ 1:N
            ▼
booths ──────┬──── device_status (1:1)
   │         │
   │ 1:N     │
   ▼         │
operators ◄──┘
   │
   │ 1:N
   ▼
sessions ────┬──── photos (1:N)
             ├──── final_outputs (1:N)
             └──── print_jobs (1:N)

packages ────── sessions (1:N)
templates ───── sessions (1:N)
luts ─────────── photos (1:N, optional)
users ────────── operators (1:1)
```

---