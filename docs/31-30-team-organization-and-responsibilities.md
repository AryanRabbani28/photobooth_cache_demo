# 30. Team Organization and Responsibilities

## 30.1 Team Division (3 Developers)

### Developer A — Photobooth Client Application

Primary responsibility:

```
PySide6 Customer Interface
Camera Integration (DSLR adapter)
Live Preview
Photo Capture + Countdown
Filters / LUT Processing
Template Engine + Compositor
Printing Integration
Local SQLite Storage
Session State Machine
Timer Logic
```

### Developer B — Backend and Infrastructure

Primary responsibility:

```
FastAPI Application
PostgreSQL Schema + Migrations
Authentication + Authorization
REST APIs (all endpoints)
WebSocket Server (command dispatch)
Object Storage Integration
Synchronization Endpoints
Docker + Deployment
Database Backup
```

### Developer C — Dashboards and Frontend

Primary responsibility:

```
React + TypeScript Application
Operator Dashboard (all screens)
Admin Dashboard (all screens)
Booth Monitoring Views
Session Management Views
Analytics and Reporting
WebSocket Client Integration
Responsive Design
```

## 30.2 Shared Responsibilities

All three developers should collaborate on:

- Database schema design
- API contract definitions
- WebSocket event specifications
- Integration testing
- Code review
- Sprint planning

## 30.3 Important Note on V0.0–V0.1

For V0.0 (Research) and V0.1 (Hardware PoC), the team should **not** be strictly isolated. All three developers should:

1. Visit the physical photobooth together
2. Collaborate on the hardware proof of concept
3. Understand the DSLR and printer integration challenges

Only after V0.1 is proven should the team split into their primary responsibilities.

---