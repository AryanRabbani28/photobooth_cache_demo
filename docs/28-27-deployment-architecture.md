# 27. Deployment Architecture

## 27.1 Central Server Deployment

The central services run using Docker:

```
┌────────────────────────────────┐
│          SERVER                │
│                                │
│   Docker Compose               │
│                                │
│   ├── FastAPI Backend          │
│   │   (port 8000)             │
│   │                           │
│   ├── PostgreSQL              │
│   │   (port 5432)             │
│   │                           │
│   ├── Redis                   │
│   │   (port 6379, optional)   │
│   │                           │
│   ├── MinIO (Object Storage)  │
│   │   (port 9000)             │
│   │                           │
│   └── Nginx (Reverse Proxy)   │
│       (ports 80/443)          │
│                                │
└────────────────────────────────┘
```

### docker-compose.yml Services

```
services:
  backend:      FastAPI application
  db:           PostgreSQL 16
  redis:        Redis (for task queue / caching, optional)
  minio:        S3-compatible object storage
  dashboard:    React frontend (served by Nginx)
  nginx:        Reverse proxy + SSL termination
```

## 27.2 Booth Deployment

Each booth laptop runs:

- The **Photobooth Client Application** (Python/PySide6)
- Configured to auto-start on boot (Windows Task Scheduler or Startup folder)
- A watchdog process that restarts the app if it crashes
- Local SQLite database
- Local file storage

### Booth Setup Procedure

1. Install Python runtime on booth laptop
2. Install photobooth application (ideally as a bundled executable via PyInstaller)
3. Create `booth.json` config with:
   - `booth_id`
   - `device_id`
   - `device_secret`
   - `server_url`
4. Register booth in central backend
5. Connect DSLR and printer
6. Run initial test session
7. Configure auto-start

## 27.3 Object Storage Selection

The actual storage provider can be selected based on cost, reliability, and expected volume:

| Option           | Best For                     |
|------------------|------------------------------|
| MinIO (self-hosted) | Budget-conscious, full control |
| AWS S3           | Scalability, reliability     |
| DigitalOcean Spaces | Cost-effective cloud storage |
| Backblaze B2     | Cheapest per-GB pricing      |

Estimated storage per booth per day:
- ~50 sessions × ~4 photos × ~5 MB = ~1 GB originals
- Processed + final adds ~50% → ~1.5 GB/day/booth
- 10 booths × 30 days = ~450 GB/month

---