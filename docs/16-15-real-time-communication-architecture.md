# 15. Real-Time Communication Architecture

## 15.1 Communication Topology

The system needs real-time communication between:

```
Operator Dashboard  ↔  Central Backend  ↔  Photobooth Client
```

All communication flows through the backend. The operator dashboard and photobooth never communicate directly.

## 15.2 Command Flow Example: Add Time

```
Operator Dashboard
        │
        │ "Add 1 Minute" button clicked
        ▼
POST /sessions/{id}/add-time  OR  WebSocket command
        │
        ▼
Backend Validates:
  - Is operator authenticated?
  - Is operator assigned to this booth?
  - Is the session currently active/paused?
        │
        ▼
Backend Identifies Assigned Booth
        │
        ▼
WebSocket Event → Booth (ADD_TIME, payload: {seconds: 60})
        │
        ▼
Booth Receives ADD_TIME
        │
        ▼
Local Session Timer Updated (+60 seconds)
        │
        ▼
Acknowledgment Sent Back via WebSocket
        │
        ▼
Operator Dashboard Updated (new remaining time displayed)
```

## 15.3 WebSocket Command Events (Backend → Booth)

| Command          | Payload                          | Description                          |
|------------------|----------------------------------|--------------------------------------|
| START_SESSION    | session_id, package, template    | Start a new customer session         |
| PAUSE_SESSION    | session_id                       | Pause the active session timer       |
| RESUME_SESSION   | session_id                       | Resume a paused session              |
| ADD_TIME         | session_id, seconds              | Add time to the session timer        |
| CANCEL_SESSION   | session_id                       | Cancel the current session           |
| RESTART_SESSION  | session_id                       | Restart from the beginning           |
| REPRINT          | session_id, final_output_id      | Reprint a completed photo            |
| LOCK_BOOTH       | booth_id                         | Lock the booth (disable interaction) |
| UNLOCK_BOOTH     | booth_id                         | Unlock the booth                     |
| SYNC_TEMPLATES   | —                                | Trigger template download            |
| SYNC_LUTS        | —                                | Trigger LUT download                 |

## 15.4 WebSocket Status Events (Booth → Backend)

| Event               | Payload                              | Description                          |
|----------------------|--------------------------------------|--------------------------------------|
| BOOTH_ONLINE         | booth_id, device_id                  | Booth application started            |
| BOOTH_OFFLINE        | booth_id                             | Booth application shutting down      |
| CAMERA_CONNECTED     | booth_id, camera_model               | Camera detected                      |
| CAMERA_DISCONNECTED  | booth_id                             | Camera lost                          |
| PRINTER_READY        | booth_id, printer_model              | Printer available                    |
| PRINTER_ERROR        | booth_id, error_code, error_message  | Printer problem                      |
| SESSION_STARTED      | session_id, booth_id                 | Customer session began               |
| SESSION_PAUSED       | session_id                           | Session was paused                   |
| SESSION_RESUMED      | session_id                           | Session was resumed                  |
| SESSION_COMPLETED    | session_id                           | Session finished successfully        |
| SESSION_EXPIRED      | session_id                           | Timer ran out                        |
| PHOTO_CAPTURED       | session_id, photo_index, total       | A photo was captured                 |
| PRINT_STARTED        | session_id, print_job_id             | Print job began                      |
| PRINT_COMPLETED      | session_id, print_job_id             | Print job finished                   |
| PRINT_FAILED         | session_id, print_job_id, error      | Print job failed                     |
| SYNC_COMPLETED       | booth_id, sync_type                  | Synchronization finished             |
| HEARTBEAT            | booth_id, camera, printer, session   | Periodic status report               |

## 15.5 Heartbeat System

Every booth periodically (every 30 seconds) sends a heartbeat:

```json
{
  "event": "HEARTBEAT",
  "booth_id": "BC-01",
  "device_id": "DEVICE_9832",
  "timestamp": "2026-08-20T15:42:31Z",
  "camera_status": "CONNECTED",
  "printer_status": "READY",
  "internet_status": "ONLINE",
  "session_status": "ACTIVE",
  "session_id": "sess_abc123",
  "remaining_time": 102,
  "disk_free_mb": 45200,
  "app_version": "1.0.3"
}
```

The backend stores the latest heartbeat. If no heartbeat is received within a configurable timeout (e.g., 2 minutes), the booth is marked as **OFFLINE**.

---