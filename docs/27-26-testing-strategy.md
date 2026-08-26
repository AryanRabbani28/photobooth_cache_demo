# 26. Testing Strategy

## 26.1 Overview

Testing is critical for a system that integrates with physical hardware. The strategy must account for development without constant access to DSLR cameras and printers.

## 26.2 Testing Pyramid

```
                    ┌───────────┐
                    │   E2E     │  ← Full flow with mock hardware
                    │  Tests    │     (few, slow, high confidence)
                   ┌┴───────────┴┐
                   │ Integration │  ← API + DB + WebSocket tests
                   │   Tests     │     (moderate count)
                  ┌┴─────────────┴┐
                  │   Unit Tests   │  ← Business logic, state machine,
                  │                │     image processing, template engine
                  └────────────────┘     (many, fast)
```

## 26.3 Mock Hardware Layer

For development and CI/CD, create mock adapters:

| Component      | Mock Implementation                                  |
|----------------|------------------------------------------------------|
| Camera         | `MockCameraAdapter` — Returns sample images, simulates live view with webcam or video loop |
| Printer        | `MockPrinterAdapter` — Saves "printed" images to a local directory |
| Internet       | `MockNetworkMonitor` — Can simulate online/offline transitions |

These mocks implement the same interfaces as real adapters, so the application doesn't know the difference.

## 26.4 What to Test

### Unit Tests

- Session state machine transitions (valid and invalid)
- Timer logic (start, pause, resume, add time, expire)
- Template engine (photo placement, compositing)
- LUT processing (.cube file parsing, image filtering)
- Package rules (retake limits, expiry behavior)
- Sync queue logic (pending, retry, idempotency)
- API request/response validation (Pydantic schemas)

### Integration Tests

- API endpoints with real PostgreSQL (use Docker for test DB)
- WebSocket command dispatch and acknowledgment
- Session creation → photo capture → print flow (with mocks)
- Sync service: local SQLite → central PostgreSQL
- Authentication + authorization (RBAC enforcement)

### End-to-End Tests

- Full customer flow: idle → template → capture → keep → final → print (with mock hardware)
- Operator flow: login → start session → pause → add time → reprint
- Offline scenario: disconnect internet → complete session → reconnect → verify sync
- Crash recovery: kill app → restart → verify session restoration

## 26.5 Testing Tools

| Layer          | Tool                           |
|----------------|--------------------------------|
| Python tests   | pytest + pytest-asyncio        |
| API testing    | httpx (async test client)      |
| DB testing     | Docker PostgreSQL + test fixtures |
| Frontend tests | Vitest + React Testing Library |
| E2E tests      | Playwright (for dashboards)    |
| CI/CD          | GitHub Actions or similar      |

---