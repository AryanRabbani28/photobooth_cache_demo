# 23. Error Handling and Recovery

## 23.1 Camera Error Recovery

```
Camera disconnected during session
        │
        ▼
Pause capture process automatically
        │
        ▼
Display message to customer:
  "Please wait, reconnecting camera..."
        │
        ▼
Notify operator via WebSocket
        │
        ▼
Attempt automatic reconnect (up to 3 times)
        │
        ├── Success → Resume session, continue from where left off
        │
        └── Failed after 3 attempts:
                │
                ▼
            Display: "Camera error. Please contact staff."
                │
                ▼
            Operator can: Reconnect Camera / Restart Session / Cancel Session
```

## 23.2 Printer Error Recovery

```
Print requested
      │
      ▼
Printer unavailable or error?
      │
   ┌──NO───────► Print normally
   │
   YES
   │
   ▼
Store print job with status: FAILED
      │
      ▼
Display to customer: "Printing error. Staff will assist you."
      │
      ▼
Notify operator
      │
      ▼
Operator can:
    ├── [ RETRY PRINT ]  — Resend to printer
    ├── [ REPRINT ]      — Reprint from saved final image
    └── [ CANCEL ]       — Cancel print job
```

## 23.3 Application Crash Recovery

The booth application should support automatic restart:

```
Application Stops Unexpectedly
       │
       ▼
Local Watchdog Detects Failure
  (Windows Task Scheduler or a lightweight daemon)
       │
       ▼
Restart Application
       │
       ▼
Application Loads:
  ├── Reads local config
  ├── Checks for incomplete session
  │     ├── If found: Restore session state from SQLite
  │     └── If not found: Start in Idle state
  ├── Reconnects camera
  ├── Reconnects printer
  └── Reconnects WebSocket to backend
```

### Session Recovery After Crash

```
On startup, check SQLite for sessions with status NOT in terminal states:
  │
  ├── ACTIVE / PAUSED:
  │     If less than 10 minutes old → Offer to resume
  │     If older than 10 minutes → Mark as ERROR
  │
  └── PRINTING / PRINT_FAILED:
        Final image exists locally → Offer reprint
        Final image missing → Mark as ERROR
```

## 23.4 Emergency Controls

The operator or admin should have access to hardware recovery controls:

```
[ 🔌 RECONNECT CAMERA ]
[ 🔌 RECONNECT PRINTER ]
[ 🔄 RESTART PHOTOBOOTH APPLICATION ]
[ 🔄 RESTART SESSION ]
[ ❌ CANCEL SESSION ]
[ 🖨️ REPRINT LAST PHOTO ]
```

## 23.5 Hardware Status Display

The operator dashboard always shows real-time hardware status:

```
CAMERA:    🟢 CONNECTED     (Canon EOS R50)
PRINTER:   🟢 READY         (DNP DS620)
INTERNET:  🟢 ONLINE        (45ms latency)
SERVER:    🟢 CONNECTED      (WebSocket active)
DISK:      🟢 OK            (45.2 GB free)
```

If something disconnects:

```
PRINTER:   🔴 DISCONNECTED
```

The operator should immediately know what the problem is.

---