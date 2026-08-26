# 5. High-Level System Architecture

## 5.1 Four-Layer Architecture

```
┌──────────────────────────────────────────────────┐
│                  USER LAYER                      │
│                                                  │
│   Customer         Operator           Admin      │
└────────┬──────────────┬────────────────┬─────────┘
         │              │                │
         ▼              ▼                ▼
┌──────────────────────────────────────────────────┐
│              APPLICATION LAYER                   │
│                                                  │
│   Photobooth App     Operator Dashboard          │
│   (Python/PySide6)   Admin Dashboard             │
│                      (React/TypeScript)           │
└────────────────────────┬─────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────┐
│                BACKEND LAYER                     │
│                                                  │
│         FastAPI + REST API + WebSockets           │
└────────────────┬────────────────┬─────────────────┘
                 │                │
                 ▼                ▼
┌────────────────────────┐  ┌────────────────────────┐
│     PostgreSQL         │  │    Object Storage      │
│   Structured Data      │  │  Photos / LUTs         │
│                        │  │  Templates             │
└────────────────────────┘  └────────────────────────┘
```

## 5.2 Multi-Booth Topology

```
                         ┌──────────────────────┐
                         │     ADMIN USER       │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   ADMIN DASHBOARD    │
                         │  React + TypeScript  │
                         └──────────┬───────────┘
                                    │
                                    │ HTTPS
                                    │
                         ┌──────────▼───────────┐
                         │                      │
                         │   CENTRAL BACKEND    │
                         │      FastAPI         │
                         │                      │
                         └───────┬────────┬─────┘
                                 │        │
                          ┌──────▼──┐ ┌───▼──────────────┐
                          │Postgres │ │  Object Storage   │
                          │         │ │                   │
                          │Metadata │ │  Photos           │
                          │Sessions │ │  Templates        │
                          │Users    │ │  LUTs             │
                          └─────────┘ └───────────────────┘
                                 ▲
                                 │
                      WebSocket / HTTPS
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
          ▼                      ▼                      ▼
   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
   │  Booth 01   │        │  Booth 02   │        │  Booth 03   │
   │ Bashundhara │        │ Centre Point│        │  SKS Tower  │
   │             │        │             │        │             │
   │ ┌─────────┐ │        │ ┌─────────┐ │        │ ┌─────────┐ │
   │ │ SQLite  │ │        │ │ SQLite  │ │        │ │ SQLite  │ │
   │ │ DSLR    │ │        │ │ DSLR    │ │        │ │ DSLR    │ │
   │ │ Printer │ │        │ │ Printer │ │        │ │ Printer │ │
   │ └─────────┘ │        │ └─────────┘ │        │ └─────────┘ │
   └─────────────┘        └─────────────┘        └─────────────┘
```

Each photobooth is an independent local system that communicates with the central backend.

## 5.3 Multi-Booth Identity

Every booth has a unique identity:

```
Booth ID:   BC-01          Booth ID:   CP-01          Booth ID:   SKS-01
Location:   Bashundhara    Location:   Centre Point   Location:   SKS Tower
Device ID:  DEVICE_9832    Device ID:  DEVICE_4521    Device ID:  DEVICE_7103
```

The backend knows exactly which device belongs to which location. This prevents commands intended for one booth from being sent to another.

---