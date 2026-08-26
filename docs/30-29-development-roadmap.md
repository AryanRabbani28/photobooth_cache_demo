# 29. Development Roadmap

## 29.1 Overview

```
V0.0  → Research & Hardware Discovery
V0.1  → Hardware Proof of Concept
V0.2  → Basic Local Photobooth
V0.3  → Complete Customer Experience
V0.4  → Image Processing & Templates
V0.5  → Reliable Printing & Recovery
V1.0  → Complete Single-Booth MVP
V1.1  → Backend & Central Database
V1.2  → Multi-Booth Communication
V1.3  → Operator Dashboard
V1.4  → Admin Dashboard
V1.5  → Offline Sync System
V2.0  → Production Multi-Booth System
V2.1+ → Advanced Features
```

> **The most important rule: Do not move to the next major version until the previous version is working reliably.**

---

## VERSION 0.0 — Research and Hardware Discovery

### Goal

Understand the real photobooth environment before writing major code. At this stage, you should **not build the full application**. Your job is to visit the photobooth and collect information.

### Things to Investigate

**DSLR Camera:**

- [ ] Brand
- [ ] Exact model
- [ ] Connection type (USB? Wi-Fi? Other?)
- [ ] Current resolution settings
- [ ] Image format (JPEG / RAW / both)
- [ ] Whether Live View is currently being used
- [ ] Whether the current software controls the shutter
- [ ] Available SDK/API for the camera brand
- [ ] SDK licensing restrictions

```
Camera Brand:     _______________
Model:            _______________
Connection:       _______________
Resolution:       _______________
Image Format:     _______________
SDK Available:    _______________
SDK License:      _______________
```

**Printer:**

- [ ] Brand
- [ ] Exact model
- [ ] Connection type (USB? Network?)
- [ ] Windows driver availability
- [ ] Print size (4×6? 5×7? Other?)
- [ ] Photo paper size and type
- [ ] Print resolution
- [ ] How Darkroom Booth sends images to it
- [ ] Vendor-specific SDK availability

**Laptop:**

- [ ] Operating system and version
- [ ] CPU and RAM
- [ ] Available disk space
- [ ] USB port types and count
- [ ] Display resolution
- [ ] Touch screen? (Yes/No)

**Existing Darkroom Booth Setup:**

Observe and document the complete flow:

```
Customer arrives
      ↓
Operator receives money
      ↓
Customer enters booth
      ↓
Darkroom Booth starts
      ↓
Customer selects something
      ↓
Camera captures
      ↓
Photos processed
      ↓
Template generated
      ↓
Printed
```

Document:

- [ ] Existing templates used
- [ ] Number of photos per session
- [ ] Countdown behavior
- [ ] Retake options
- [ ] Filters available
- [ ] Print dimensions and quality
- [ ] Customer interaction flow
- [ ] Typical session duration
- [ ] Number of sessions per day per booth
- [ ] Internet availability at each location

### Deliverable

```
Hardware Information Document:
  ├── Camera Model + SDK Options
  ├── Printer Model + Driver Info
  ├── Laptop OS + Specs
  ├── Connection Details
  ├── Photo Resolution
  ├── Print Resolution + Paper Size
  ├── Current Workflow Documentation
  └── Existing Software Workflow
```

### Success Condition

You completely understand what hardware you are dealing with, and you have identified the SDK/API options for the camera.

---

## VERSION 0.1 — Hardware Proof of Concept

### Goal

Prove that your team can control the actual hardware. This is probably the **most important early version of the entire project**.

- Do **not** worry about beautiful UI
- Do **not** worry about dashboards
- Just make the hardware work

### Step 1: Connect to DSLR

Create a simple program:

```
Connect DSLR → Print: "Camera Connected" ✓
```

Test:

- [ ] Detect camera
- [ ] Connect camera
- [ ] Disconnect camera

### Step 2: Get Live Preview

```
DSLR
  ↓
Computer
  ↓
Live Preview Window
```

Create a simple window. If you can see the camera feed: **major success**.

### Step 3: Trigger Camera Capture

Create a button: `[ CAPTURE ]`

```
Button Pressed
   ↓
Camera Trigger Command
   ↓
DSLR Takes Photo
   ↓
Image Received on Computer
   ↓
Saved Locally
```

### Step 4: Display Captured Photo

After capture, show the captured image in a window and save it locally.

### Step 5: Print a Test Image

Take any image. Send it to the actual printer:

```
test.jpg
   ↓
Your Application (print command)
   ↓
Printer
   ↓
Physical Print Output
```

### V0.1 Deliverable

A very ugly but functional program that can:

- ✅ Connect to camera
- ✅ Show live preview
- ✅ Capture image
- ✅ Save image locally
- ✅ Print image

### Success Condition

You can take a real photo with the actual DSLR and physically print it. **This version is more important than building 100 dashboard pages.**

---

## VERSION 0.2 — Basic Local Photobooth

### Goal

Turn the hardware proof of concept into a basic photobooth application. Still no cloud. Still no admin dashboard. Everything runs locally on one laptop.

### Features

- [ ] Idle screen with welcome message
- [ ] Manual session start button (local, no operator dashboard yet)
- [ ] Template selection (2–3 hardcoded templates)
- [ ] Basic countdown timer (`03:00 → 02:59 → 02:58 → ...`)
- [ ] Camera preview
- [ ] Capture button

### Deliverable

```
Idle → Start → Select Template → Start Timer → Camera → Capture
```

### Success Condition

Someone can sit in front of the booth and begin a basic session.

---

## VERSION 0.3 — Complete Customer Photo Experience

### Goal

Build the complete basic customer flow.

### Features

- [ ] Live camera interface with proper layout
- [ ] Large capture button (touch-friendly)
- [ ] 3-2-1 countdown animation
- [ ] Required photo counter (`PHOTO 1/4`, `PHOTO 2/4`, etc.)
- [ ] Keep / Retake flow after each capture
- [ ] Session expiry handling when timer reaches 0
- [ ] Basic session state tracking

### Deliverable

A customer can complete an entire photo-taking session:

```
Customer → Selects Template → Takes Multiple Photos → Retakes → Completes Session
```

### Success Condition

The complete capture experience works smoothly from start to finish.

---

## VERSION 0.4 — Image Processing, Filters, and Templates

### Goal

Turn captured photos into actual photobooth products. This version focuses heavily on image processing.

### Features

- [ ] Basic filters: Normal, Black & White, Warm, Vintage (start with 4)
- [ ] LUT system: `.cube` file parsing and application
- [ ] Template engine: JSON-based layout configuration
- [ ] Photo placement into template slots
- [ ] Background and decoration rendering
- [ ] Final preview screen

### Deliverable

```
Captured Photos → Apply Filter → Generate Template → Final Preview
```

### Success Condition

Your application can generate the same type of final photobooth output that the business currently produces.

---

## VERSION 0.5 — Reliable Printing and Error Recovery

### Goal

Make printing reliable. This is where you start thinking like a real product instead of a demo.

### Features

- [ ] Print job system (every print becomes a trackable job with status)
- [ ] Print failure handling: `[ RETRY ] [ CANCEL ] [ ASK OPERATOR ]`
- [ ] Reprint last photo (store the final generated image)
- [ ] Camera disconnect recovery (automatic reconnect attempts)
- [ ] Printer disconnect recovery
- [ ] Basic error logging

### Deliverable

A stable printing system with failure recovery.

### Success Condition

You can handle printer errors without destroying the customer's session.

---

## VERSION 1.0 — Complete Single-Booth MVP ⭐

### Goal

Create a complete standalone photobooth system. At this point, one physical booth should be able to completely replace the basic customer workflow of the current software.

### Features — Customer

- [ ] Idle screen
- [ ] Template selection
- [ ] Session timer
- [ ] Live camera
- [ ] Countdown
- [ ] Capture
- [ ] Retake
- [ ] Filters / LUTs
- [ ] Final preview
- [ ] Printing

### Features — Local System

- [ ] SQLite database
- [ ] Local photo storage (originals + processed + final)
- [ ] Print history
- [ ] Error logging
- [ ] Camera monitoring
- [ ] Printer monitoring

### Success Condition

```
One Booth → Runs Entire Day → No Major Crashes → Customers Take Photos → Photos Print Successfully
```

**This is your first real milestone.** Do not underestimate this version. If V1.0 works well, you already have something valuable.

---

## VERSION 1.1 — Central Backend

### Goal

Introduce the cloud/backend. Now you connect the standalone booth to a central system.

### Build

- [ ] FastAPI application setup
- [ ] Authentication (JWT + RBAC)
- [ ] Booth registration API
- [ ] Session storage API
- [ ] Template metadata API
- [ ] LUT metadata API
- [ ] Photo metadata API
- [ ] PostgreSQL schema (all tables from Section 16)
- [ ] Object storage setup (MinIO or cloud)
- [ ] Basic file upload endpoints

### Success Condition

After a session completes on the booth:

```
Booth → Backend → Database Updated
AND
Photos → Object Storage
```

---

## VERSION 1.2 — Multi-Booth Communication

### Goal

Connect multiple booths to the central backend.

### Features

- [ ] Every booth has a unique ID
- [ ] Booth registration with the backend
- [ ] Online/offline status reporting
- [ ] Camera status reporting
- [ ] Printer status reporting
- [ ] Current session status reporting
- [ ] Heartbeat system (every 30 seconds)

### Success Condition

Admin can see:

```
BC01    🟢 ONLINE
CP01    🟢 ONLINE
SKS01   🔴 OFFLINE
```

---

## VERSION 1.3 — Operator Dashboard

### Goal

Give the physical staff control over the booth.

### Features

- [ ] Operator login
- [ ] Assigned booth view with status
- [ ] Start session (package selection, customer name)
- [ ] Pause / Resume session
- [ ] Add time
- [ ] Cancel session
- [ ] Restart session
- [ ] Reprint last photo
- [ ] Device status display
- [ ] Real-time WebSocket communication (Operator → Backend → Booth)

### Success Condition

The operator can remotely start, pause, resume, add time, cancel, and reprint.

---

## VERSION 1.4 — Admin Dashboard

### Goal

Give the owner centralized control.

### Features

- [ ] Dashboard overview (stats, alerts)
- [ ] Booth management
- [ ] Session history (search + filter)
- [ ] Photo gallery (view + download + reprint)
- [ ] Template management (CRUD + upload)
- [ ] LUT management (CRUD + upload)
- [ ] Package management (CRUD)
- [ ] Operator management (CRUD + assign)
- [ ] Analytics (popular templates, peak hours, booth comparison)

### Success Condition

The owner can open one dashboard and understand what is happening across the entire business.

---

## VERSION 1.5 — Offline Mode and Synchronization

### Goal

Make the system survive bad internet. Essential for multiple mall locations.

### Features

- [ ] Booth registration and identity management
- [ ] Status reporting via sync
- [ ] Session synchronization (local → central)
- [ ] Photo upload synchronization
- [ ] Retry logic with exponential backoff
- [ ] Offline session handling
- [ ] Sync status tracking (PENDING, UPLOADING, SYNCED, FAILED)
- [ ] Conflict resolution for offline commands
- [ ] Template/LUT update checking and downloading

### Success Condition

You can disconnect the internet in the middle of the day and the photobooth still works. When the internet comes back, all data automatically appears in the central system.

---

## VERSION 2.0 — Production Multi-Booth System

### Goal

Prepare the system for real business deployment. Combine everything and harden for production.

### Production Requirements

- [ ] Comprehensive error logging
- [ ] Automatic application restart (watchdog)
- [ ] Device monitoring and alerts
- [ ] Database backup strategy
- [ ] Object storage backup strategy
- [ ] Secure authentication (HTTPS everywhere)
- [ ] Role-based access enforcement
- [ ] File access control
- [ ] Photo retention policy implementation
- [ ] Monitoring and alerting
- [ ] Load testing for multi-booth scenarios
- [ ] Documentation for booth setup procedure

### Success Condition

Multiple booths running simultaneously in production across different locations, with reliable sync, monitoring, and recovery.

---