# 24. Logging and Monitoring

## 24.1 Structured Logging

Every booth maintains structured, daily log files:

```
logs/
    2026-08-20.log
    2026-08-21.log
```

### Log Format (JSON Lines)

Each log entry is a single JSON object per line:

```json
{
  "timestamp": "2026-08-20T15:42:31.123Z",
  "level": "INFO",
  "source": "camera_manager",
  "booth_id": "BC-01",
  "event": "PHOTO_CAPTURED",
  "session_id": "sess_abc123",
  "message": "Photo captured successfully",
  "details": {
    "slot_index": 2,
    "file_path": "photos/originals/2026/08/20/18392.jpg",
    "file_size_bytes": 4523891,
    "capture_duration_ms": 342
  }
}
```

### Log Levels

| Level    | Usage                                              |
|----------|----------------------------------------------------|
| DEBUG    | Detailed diagnostic information (dev only)         |
| INFO     | Normal operational events                          |
| WARN     | Potentially problematic but non-critical issues    |
| ERROR    | Failed operations that need attention              |
| CRITICAL | System-threatening failures requiring immediate action |

### Events to Log

```
Application Started / Stopped
Camera Connected / Disconnected
Printer Connected / Disconnected
Internet Connected / Disconnected
Session Created / Started / Paused / Resumed / Completed / Cancelled / Expired / Error
Photo Captured (with file details)
Filter Applied (with LUT ID)
Template Generated
Print Started / Completed / Failed
Sync Started / Completed / Failed
Command Received (from backend)
Heartbeat Sent
Disk Space Warning (below threshold)
```

## 24.2 Remote Log Reporting

Critical errors (ERROR and CRITICAL level) should be reported to the central backend:

```
POST /sync/logs
[
  {
    "booth_id": "BC-01",
    "level": "ERROR",
    "source": "printer_manager",
    "message": "Print job failed: paper jam",
    "timestamp": "2026-08-20T15:42:31Z"
  }
]
```

This allows the admin dashboard to show system-wide error alerts.

## 24.3 Log Retention

- Local logs: Keep 30 days, auto-rotate
- Central logs: Keep 90 days, archive older
- Configurable via admin settings

---