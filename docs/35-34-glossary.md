# 34. Glossary

| Term              | Definition                                                     |
|-------------------|----------------------------------------------------------------|
| Booth             | A physical photobooth unit at a specific location              |
| Session           | A single customer interaction, from activation to print/cancel |
| Operator          | Staff member physically present at the booth                   |
| Admin             | Business owner/manager with central dashboard access           |
| Template          | A predefined layout for arranging photos in the final output   |
| LUT               | Look-Up Table — a file that defines a color transformation     |
| Slot              | A placeholder within a template where a photo is placed        |
| Package           | A configured set of session parameters (duration, photos, etc.)|
| Final Output      | The completed image with all photos placed into the template   |
| Print Job         | A trackable record of a print attempt                          |
| Heartbeat         | Periodic status message from a booth to the backend            |
| Sync              | Process of uploading local data to the central server          |
| Device Token      | Authentication credential for a booth device                   |
| Darkroom Booth    | The existing third-party photobooth software being replaced    |
| EDSDK             | Canon's official SDK for camera control                        |
| gPhoto2           | Open-source camera control library (Linux-focused)             |
| PySide6           | Python bindings for the Qt UI framework                        |
| FastAPI           | Modern Python web framework for building APIs                  |
| Pydantic          | Python data validation library used with FastAPI               |
| Alembic           | Database migration tool for SQLAlchemy                         |
| MinIO             | Self-hosted S3-compatible object storage                       |

---

> **Recommended Next Step:**  
> Before writing the first major part of the application, the team should do **V0.0 and V0.1 first**: visit the booth, identify the exact DSLR and printer models, and build a small proof of concept proving that you can **connect → live preview → capture → process → print**.
>
> Once you have those exact hardware details, the next documents to produce are:
> 1. Final database ER diagram
> 2. Exact API contract (OpenAPI spec)
> 3. WebSocket event specification
> 4. Local SQLite schema
> 5. Synchronization algorithm detail
> 6. Project folder structure and initial scaffolding

---

*End of Specification*