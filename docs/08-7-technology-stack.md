# 7. Technology Stack

## 7.1 Customer Photobooth Application

| Layer              | Technology                 |
|--------------------|----------------------------|
| Language           | Python 3.11+               |
| UI Framework       | PySide6 (Qt for Python)    |
| Image Processing   | OpenCV, Pillow, NumPy      |
| LUT Processing     | Custom .cube file parser   |
| Local Database     | SQLite (via SQLAlchemy)    |
| Camera SDK         | TBD (depends on DSLR model)|
| Networking         | websockets, httpx/requests |

**Responsibilities:**

- Customer interface (touch-friendly, full-screen kiosk mode)
- Live camera preview
- Photo capture with countdown
- Filter preview and application
- LUT processing
- Template generation / compositing
- Print job management
- Session management (timer, state machine)
- Offline storage
- Background synchronization with central server

## 7.2 Central Backend

| Layer              | Technology                  |
|--------------------|-----------------------------|
| Language           | Python 3.11+                |
| Framework          | FastAPI                     |
| ORM                | SQLAlchemy 2.0              |
| Migrations         | Alembic                     |
| Auth               | JWT (python-jose / PyJWT)   |
| WebSockets         | FastAPI WebSocket support   |
| Task Queue         | Celery + Redis (optional)   |
| Validation         | Pydantic v2                 |

**Responsibilities:**

- Authentication and authorization (JWT + RBAC)
- Session management API
- Booth management API
- Operator management API
- Template management API
- LUT management API
- Photo metadata management API
- Synchronization endpoints
- File metadata management
- Real-time command dispatch (WebSocket)
- Analytics APIs

## 7.3 Frontend Dashboards (Operator + Admin)

| Layer              | Technology                  |
|--------------------|-----------------------------|
| Language           | TypeScript                  |
| Framework          | React 18+                  |
| Routing            | React Router v6             |
| Data Fetching      | TanStack Query (React Query)|
| State Management   | Zustand or Context API      |
| WebSocket Client   | Native WebSocket API        |
| UI Library         | Ant Design / Shadcn/UI      |
| Build Tool         | Vite                        |

The operator and admin dashboards may exist inside the **same frontend application** with different routes and permissions:

```
/operator
/operator/session
/operator/booth-status

/admin
/admin/booths
/admin/sessions
/admin/photos
/admin/templates
/admin/operators
/admin/analytics
```

## 7.4 Infrastructure

| Component          | Technology                  |
|--------------------|-----------------------------|
| Containerization   | Docker + Docker Compose     |
| Reverse Proxy      | Nginx / Caddy               |
| Central Database   | PostgreSQL 16               |
| Local Database     | SQLite 3                    |
| Object Storage     | MinIO (self-hosted S3) or AWS S3 |
| Monitoring         | Prometheus + Grafana (optional) |

---