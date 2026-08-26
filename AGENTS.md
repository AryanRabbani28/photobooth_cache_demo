# Antigravity Navigation Rules

1. **INDEX FIRST**: Read `ARCHITECTURE.md` before exploring source files. It contains the complete mapping of backend and frontend modules.
2. **DO NOT DUMP FULL FILES**: Always use `grep_search`, `find_by_name`, or line slicing (`StartLine`/`EndLine`).
3. **LARGE SPECIFICATION WARNING**: Never ingest the entire `Photobooth-Management-System-Complete-Specification.md`. It has been split into modular chapters inside the `docs/` folder for efficient reading.
4. **STACK CONVENTIONS**:
   - Backend: Python 3.11+, FastAPI, SQLAlchemy, Pydantic v2.
   - Frontend: React 19, TypeScript, TailwindCSS v4.
