# 8. Photobooth Client Application

## 8.1 Application Module Architecture

```
Photobooth Application
├── UI Module (PySide6)
│   ├── Idle Screen
│   ├── Template Selection Screen
│   ├── Camera Interface Screen
│   ├── Keep/Retake Screen
│   ├── Final Preview Screen
│   ├── Printing Screen
│   └── Thank You Screen
│
├── Session Manager
│   ├── State Machine
│   ├── Timer Controller
│   └── Package Rules Engine
│
├── Camera Manager
│   ├── Camera Abstraction Interface
│   ├── Camera Adapters (Canon, Nikon, Sony, etc.)
│   └── Live View Renderer
│
├── Image Processing Engine
│   ├── Filter Processor
│   ├── LUT Processor (.cube file parser)
│   └── Image Resizer/Optimizer
│
├── Template Engine
│   ├── Template Loader (JSON config)
│   ├── Photo Placer / Compositor
│   └── Final Image Generator
│
├── Printer Manager
│   ├── Printer Abstraction Interface
│   ├── Printer Adapters (Windows Print, DNP, etc.)
│   └── Print Job Queue
│
├── Local Database Manager (SQLite)
│   ├── Session Repository
│   ├── Photo Repository
│   └── Sync Status Tracker
│
├── File Manager
│   ├── Photo Storage (originals, processed, final)
│   ├── Template Cache
│   └── LUT Cache
│
├── Synchronization Service
│   ├── Session Sync
│   ├── Photo Upload
│   ├── Template/LUT Download
│   └── Retry Logic
│
├── WebSocket Client
│   ├── Command Receiver
│   ├── Status Reporter
│   └── Heartbeat
│
└── Device Monitor
    ├── Camera Health Check
    ├── Printer Health Check
    ├── Internet Connectivity Check
    └── Disk Space Monitor
```

## 8.2 UI Screens

### Idle Screen

```
┌──────────────────────────────────────┐
│                                      │
│        Welcome to XYZ Photobooth     │
│                                      │
│   Please contact our staff to start  │
│           your session.              │
│                                      │
│     [Sample Photos Slideshow]        │
│                                      │
│       Packages starting at ৳XXX      │
│                                      │
└──────────────────────────────────────┘
```

### Template Selection Screen

```
┌──────────────────────────────────────┐
│        Choose Your Template          │
│                                      │
│  ┌────────┐  ┌────────┐  ┌────────┐ │
│  │Classic │  │Friends │  │ Couple │ │
│  │4 Photos│  │6 Photos│  │2 Photos│ │
│  └────────┘  └────────┘  └────────┘ │
│                                      │
│  ┌────────┐  ┌────────┐  ┌────────┐ │
│  │Birthday│  │  Grad  │  │Seasonal│ │
│  │4 Photos│  │3 Photos│  │4 Photos│ │
│  └────────┘  └────────┘  └────────┘ │
│                                      │
│         [ BEGIN PHOTO SESSION ]      │
└──────────────────────────────────────┘
```

### Camera Interface Screen

```
┌──────────────────────────────────────┐
│ PHOTO 2/4            Time: 02:34    │
│                                      │
│ Filters    ┌────────────────────────┐│
│            │                        ││
│ [Normal  ] │   LIVE CAMERA PREVIEW  ││
│ [B&W     ] │                        ││
│ [Vintage ] │                        ││
│ [Warm    ] │                        ││
│ [Cool    ] │                        ││
│ [Custom  ] │                        ││
│            └────────────────────────┘│
│                                      │
│          [ 🔴 CAPTURE PHOTO ]        │
└──────────────────────────────────────┘
```

---