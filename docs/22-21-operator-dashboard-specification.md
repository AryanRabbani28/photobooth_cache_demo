# 21. Operator Dashboard Specification

## 21.1 Login Screen

```
┌──────────────────────────────────┐
│                                  │
│       Photobooth Operator        │
│                                  │
│   Username: [________________]   │
│   Password: [________________]   │
│                                  │
│          [ LOGIN ]               │
│                                  │
└──────────────────────────────────┘
```

## 21.2 Main Dashboard (Post-Login)

After login, the operator sees their assigned booth:

```
┌──────────────────────────────────────────┐
│  Operator: Rahim                         │
│  Assigned Booth: Bashundhara City BC-01  │
│                                          │
│  BOOTH STATUS                            │
│  ┌────────────────────────────────────┐  │
│  │ Camera:    🟢 CONNECTED           │  │
│  │ Printer:   🟢 READY               │  │
│  │ Internet:  🟢 ONLINE              │  │
│  │ Server:    🟢 CONNECTED           │  │
│  │ Session:   ⚪ IDLE                │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [ ▶️ START NEW SESSION ]                 │
│                                          │
└──────────────────────────────────────────┘
```

## 21.3 Start Session Form

```
┌──────────────────────────────────────────┐
│  NEW SESSION                             │
│                                          │
│  Customer Name: [________________]       │
│                                          │
│  Package:                                │
│    ○ Standard (3 min, 4 photos, 2 print) │
│    ○ Premium  (5 min, 6 photos, 4 print) │
│    ○ Custom                              │
│                                          │
│  Duration: [3:00]                        │
│  Prints:   [2]                           │
│                                          │
│  [ START SESSION ]     [ CANCEL ]        │
│                                          │
└──────────────────────────────────────────┘
```

## 21.4 Active Session Monitor

```
┌──────────────────────────────────────────┐
│  CURRENT SESSION                         │
│                                          │
│  Customer: Rahim                         │
│  Template: Classic 4 Photo               │
│  Package:  Standard                      │
│  Time Remaining: 01:42                   │
│  Photos: 2/4 captured                    │
│  Status: 🟢 ACTIVE                      │
│                                          │
│  [ ⏸️  PAUSE ]                           │
│  [ ➕ ADD 1 MINUTE ]                     │
│  [ ❌ CANCEL SESSION ]                   │
│  [ 🔄 RESTART SESSION ]                  │
│  [ 🖨️  REPRINT LAST PHOTO ]             │
│                                          │
└──────────────────────────────────────────┘
```

---