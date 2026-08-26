# 28. Repository and Project Structure

## 28.1 Recommended: Monorepo

For a team of three working on one connected system, a **monorepo** is recommended:

```
photobooth-system/
│
├── apps/
│   ├── photobooth-client/           # Python + PySide6 (Booth Application)
│   │   ├── src/
│   │   │   ├── main.py
│   │   │   ├── app.py
│   │   │   ├── ui/
│   │   │   │   ├── idle_screen.py
│   │   │   │   ├── template_screen.py
│   │   │   │   ├── camera_screen.py
│   │   │   │   ├── review_screen.py
│   │   │   │   ├── final_preview_screen.py
│   │   │   │   ├── print_screen.py
│   │   │   │   └── thankyou_screen.py
│   │   │   ├── session/
│   │   │   │   ├── session_manager.py
│   │   │   │   ├── state_machine.py
│   │   │   │   └── timer.py
│   │   │   ├── camera/
│   │   │   │   ├── camera_interface.py
│   │   │   │   ├── camera_manager.py
│   │   │   │   ├── canon_adapter.py
│   │   │   │   ├── nikon_adapter.py
│   │   │   │   └── mock_adapter.py
│   │   │   ├── printer/
│   │   │   │   ├── printer_interface.py
│   │   │   │   ├── printer_manager.py
│   │   │   │   ├── windows_print_adapter.py
│   │   │   │   ├── dnp_adapter.py
│   │   │   │   └── mock_adapter.py
│   │   │   ├── processing/
│   │   │   │   ├── filter_processor.py
│   │   │   │   ├── lut_processor.py
│   │   │   │   └── image_utils.py
│   │   │   ├── templates/
│   │   │   │   ├── template_engine.py
│   │   │   │   ├── template_loader.py
│   │   │   │   └── compositor.py
│   │   │   ├── storage/
│   │   │   │   ├── local_db.py
│   │   │   │   ├── file_manager.py
│   │   │   │   └── models.py
│   │   │   ├── sync/
│   │   │   │   ├── sync_service.py
│   │   │   │   ├── sync_queue.py
│   │   │   │   └── conflict_resolver.py
│   │   │   ├── network/
│   │   │   │   ├── websocket_client.py
│   │   │   │   ├── api_client.py
│   │   │   │   └── heartbeat.py
│   │   │   └── monitoring/
│   │   │       ├── device_monitor.py
│   │   │       └── logger.py
│   │   ├── tests/
│   │   ├── config/
│   │   │   └── booth.json.example
│   │   ├── requirements.txt
│   │   └── pyproject.toml
│   │
│   ├── backend/                     # Python + FastAPI (Central Backend)
│   │   ├── src/
│   │   │   ├── main.py
│   │   │   ├── config.py
│   │   │   ├── api/
│   │   │   │   ├── auth.py
│   │   │   │   ├── booths.py
│   │   │   │   ├── sessions.py
│   │   │   │   ├── templates.py
│   │   │   │   ├── luts.py
│   │   │   │   ├── packages.py
│   │   │   │   ├── photos.py
│   │   │   │   ├── operators.py
│   │   │   │   ├── sync.py
│   │   │   │   └── analytics.py
│   │   │   ├── models/
│   │   │   │   ├── user.py
│   │   │   │   ├── booth.py
│   │   │   │   ├── session.py
│   │   │   │   ├── photo.py
│   │   │   │   ├── template.py
│   │   │   │   ├── lut.py
│   │   │   │   ├── package.py
│   │   │   │   ├── print_job.py
│   │   │   │   └── device_status.py
│   │   │   ├── schemas/
│   │   │   │   └── (Pydantic schemas for each model)
│   │   │   ├── services/
│   │   │   │   ├── auth_service.py
│   │   │   │   ├── session_service.py
│   │   │   │   ├── command_service.py
│   │   │   │   └── analytics_service.py
│   │   │   ├── websocket/
│   │   │   │   ├── connection_manager.py
│   │   │   │   ├── command_handler.py
│   │   │   │   └── event_handler.py
│   │   │   ├── storage/
│   │   │   │   └── object_storage.py
│   │   │   └── database/
│   │   │       ├── connection.py
│   │   │       └── migrations/ (Alembic)
│   │   ├── tests/
│   │   ├── alembic.ini
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   └── dashboard/                   # React + TypeScript (Operator + Admin)
│       ├── src/
│       │   ├── App.tsx
│       │   ├── routes/
│       │   │   ├── operator/
│       │   │   │   ├── OperatorDashboard.tsx
│       │   │   │   ├── SessionControl.tsx
│       │   │   │   └── BoothStatus.tsx
│       │   │   └── admin/
│       │   │       ├── AdminDashboard.tsx
│       │   │       ├── BoothManagement.tsx
│       │   │       ├── SessionHistory.tsx
│       │   │       ├── PhotoGallery.tsx
│       │   │       ├── TemplateManagement.tsx
│       │   │       ├── LutManagement.tsx
│       │   │       ├── PackageManagement.tsx
│       │   │       ├── OperatorManagement.tsx
│       │   │       ├── Analytics.tsx
│       │   │       └── Settings.tsx
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── services/
│       │   │   ├── api.ts
│       │   │   └── websocket.ts
│       │   └── types/
│       ├── tests/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── Dockerfile
│
├── shared/
│   ├── api-schemas/                 # Shared API contract definitions
│   └── constants/                   # Shared enums, status codes
│
├── docs/
│   ├── this-specification.md
│   ├── hardware-investigation.md
│   ├── api-contract.md
│   └── deployment-guide.md
│
├── infrastructure/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   ├── nginx/
│   │   └── nginx.conf
│   └── scripts/
│       ├── setup-booth.sh
│       └── backup-db.sh
│
├── .gitignore
├── README.md
└── Makefile
```

---