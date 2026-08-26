# Photobooth Management System - Architecture Map

This document is optimized for AI agents and developers to quickly understand the codebase structure without reading the full repository.

## Topology
- **Backend**: FastAPI (Python 3.11+), SQLite, WebSockets.
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS v4.

## Directory Structure

### `apps/backend/`
- **`app/api/`**: REST API and WebSocket routers.
  - `sessions.py`: Manages photobooth capture sessions.
  - `photos.py`: Photo upload, processing, retrieval.
  - `ws_routes.py`: WebSocket server for real-time booth control and frontend sync.
  - `booths.py`: CRUD operations for photobooth instances.
- **`app/state_machine.py`**: The core state engine for the photobooth (Idle -> Countdown -> Capture -> Review -> Printing).
- **`app/models.py`**: SQLAlchemy ORM models (Booth, Session, Photo).
- **`app/schemas.py`**: Pydantic v2 schemas for API validation.
- **`demo.db`**: Local SQLite database.
- **`storage/`**: Local directory for saving raw and processed photos.

### `apps/web/`
- **`src/components/`**: React UI components (Capture Studio, Admin Dashboards).
- **`src/api/`**: Axios instances and React Query hooks.
- **`src/context/`**: React context providers (WebSocket context).

## Key Workflows
1. **Capture Flow**: 
   - User clicks start -> `ws.send('start_session')` -> Backend transitions state to `Countdown`.
   - Backend triggers camera -> State transitions to `Capture`.
   - Photo is saved to `storage/` -> State transitions to `Review`.
2. **WebSocket Communication**:
   - The frontend maintains a persistent WS connection to `/api/ws/booth/{booth_id}`.
   - The backend broadcasts state changes to all connected clients.

## Quick Commands (Windows)
- `./setup.bat`: Installs dependencies.
- `./start.bat`: Boots FastAPI on `8000` and Vite on `5173`.
