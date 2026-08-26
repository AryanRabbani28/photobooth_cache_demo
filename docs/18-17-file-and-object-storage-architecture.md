# 17. File and Object Storage Architecture

## 17.1 Storage Principle

Large binary files (photos, templates, LUTs) should **not** be stored inside PostgreSQL. The database stores metadata and file path references only.

```
PostgreSQL
     │
     │ Stores metadata + file path references
     ▼
Object Storage
     │
     ├── Original Photos
     ├── Processed Photos
     ├── Final Template Images
     ├── Template Background Images
     └── LUT Files (.cube)
```

## 17.2 Central Object Storage Structure

```
photobooth-storage/
    photos/
        originals/
            2026/
                08/
                    20/
                        {photo_id}.jpg
        processed/
            2026/
                08/
                    20/
                        {photo_id}.jpg
        final/
            2026/
                08/
                    20/
                        session_{session_id}.jpg
    templates/
        {template_id}/
            background.png
            thumbnail.png
            config.json
    luts/
        {lut_id}/
            {name}.cube
            preview.jpg
```

## 17.3 Local Booth File Structure

Every booth laptop maintains local files:

```
C:/Photobooth/
    application/            # Application code
    database/
        local.db            # SQLite database
    photos/
        originals/          # Raw DSLR captures
        processed/          # After filter/LUT applied
        final/              # Completed template images
    templates/              # Downloaded template configs + assets
    luts/                   # Downloaded LUT .cube files
    pending_sync/           # Files waiting to be uploaded
    logs/                   # Application logs
        2026-08-20.log
        2026-08-21.log
    config/
        booth.json          # Booth identity, server URL, settings
```

> **Critical Rule:** The booth must never depend entirely on the cloud to capture or print photos. All operations work locally first.

## 17.4 Photo Metadata Example

```json
{
  "photo_id": "18392",
  "session_id": "9021",
  "slot_index": 2,
  "original_file": "photos/originals/2026/08/20/18392.jpg",
  "processed_file": "photos/processed/2026/08/20/18392.jpg",
  "final_file": "photos/final/2026/08/20/session_9021.jpg",
  "filter": "Vintage",
  "lut_id": "LUT_001",
  "captured_at": "2026-08-20T15:42:31Z",
  "sync_status": "SYNCED"
}
```

---