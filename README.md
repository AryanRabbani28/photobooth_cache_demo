# Photobooth Management System

A full-stack photobooth management and capture system featuring a **FastAPI backend** (with SQLite, WebSockets, and state machine management) and a modern **React + TypeScript + Vite frontend**.

---

## ⚡ Quick Start for Developers (Windows)

We have provided automated scripts so you can get up and running with a single click.

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Python 3.11+** ([Download Python](https://www.python.org/downloads/)) — *Make sure to check "Add Python to PATH" during installation.*
- **Node.js (LTS)** ([Download Node.js](https://nodejs.org/))
- **Git** ([Download Git](https://git-scm.com/))

---

### 2. Initial Setup: `setup.bat`

Run `setup.bat` by double-clicking it in File Explorer or executing it from your terminal:

```cmd
setup.bat
```

#### What `setup.bat` does automatically:
1. **Environment Verification:** Checks that Python, Node.js, and npm are installed and in your system PATH.
2. **Backend Setup (`apps/backend`):**
   - Automatically creates a Python virtual environment at `apps/backend/.venv`.
   - Upgrades `pip` to the latest version.
   - Installs all backend dependencies from `apps/backend/requirements.txt` (`FastAPI`, `Uvicorn`, `SQLAlchemy`, `Pillow`, `Pydantic`, `PyJWT`, etc.).
3. **Frontend Setup (`apps/web`):**
   - Navigates into `apps/web`.
   - Runs `npm install` to download all dependencies (`React 19`, `TailwindCSS v4`, `@tanstack/react-query`, `lucide-react`, `Zustand`, `Vite`, etc.).

---

### 3. Running the Project: `start.bat`

Once `setup.bat` finishes, launch the entire application by double-clicking:

```cmd
start.bat
```

#### What `start.bat` does automatically:
- Opens **Backend Server Window**: Activates the Python virtual environment and starts the FastAPI server with live reload on **`http://localhost:8000`**.
- Opens **Frontend Dev Server Window**: Starts the Vite development server on **`http://localhost:5173`**.
- Displays URLs and keeps both processes cleanly separated in their own terminal windows for easy logging and debugging.

---

## 🌐 Services & Default Credentials

| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend UI** | [http://localhost:5173](http://localhost:5173) | Customer booth capture studio & Admin dashboard |
| **Backend API** | [http://localhost:8000](http://localhost:8000) | REST API & WebSocket service |
| **Interactive API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger UI for exploring and testing API endpoints |
| **Health Check** | [http://localhost:8000/health](http://localhost:8000/health) | Live service status and connected booth monitor |

> **Default Admin Account:**
> - **Username:** `admin`
> - **Password:** `admin123`
> *(Seeded automatically into the SQLite database on initial launch)*

---

## 💻 Manual Setup & Commands (Alternative / macOS / Linux)

If you prefer to run services manually or are on a Unix-based system:

### Backend Manual Run
```bash
cd apps/backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Manual Run
```bash
cd apps/web
npm install
npm run dev
```

---

## 📁 Repository Structure

```text
├── apps/
│   ├── backend/               # FastAPI backend
│   │   ├── app/               # Core application (API routes, models, DB, WebSockets)
│   │   ├── requirements.txt   # Python dependencies
│   │   └── ...
│   └── web/                   # React + TypeScript + Vite frontend
│       ├── src/               # UI components, state stores, camera/compositor logic
│       ├── package.json       # Frontend dependencies & scripts
│       └── ...
├── setup.bat                  # One-click environment installer for developers
├── start.bat                  # One-click dev launcher for backend and frontend
├── .gitignore                 # Git ignore rules (excludes .venv, node_modules, temp files)
└── README.md                  # Project overview & developer guide
```
