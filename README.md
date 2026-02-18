# 🛡 AEGIS — Accident Prevention & Response System

> Modern dark-minimal dashboard for real-time road accident detection, authority dispatch, and detailed incident reporting.

---

## 📁 Project Structure

```
accident-prevention-system/
├── frontend/
│   └── index.html          ← Full dashboard (open in browser)
├── backend/
│   ├── server.js           ← Node.js Express API (port 3000)
│   ├── package.json
│   ├── routes/
│   │   └── incidents.js    ← REST endpoints
│   ├── models/
│   │   └── Incident.js     ← Mongoose models (MongoDB)
│   └── python/
│       ├── main.py         ← FastAPI AI detection service (port 8000)
│       └── requirements.txt
├── database/
│   └── schema.sql          ← PostgreSQL schema + seed data
└── config/
    └── .env.example        ← Environment variables template
```

---

## 🚀 Quick Start

### 1. Frontend (Static — no build needed)
```bash
open frontend/index.html
# Or serve with any HTTP server:
npx serve frontend/
```

### 2. Node.js API
```bash
cd backend
npm install
cp ../config/.env.example .env  # fill in DB credentials
npm run dev
# → http://localhost:3000
```

### 3. PostgreSQL Database
```bash
createdb aegis_db
psql -U postgres -d aegis_db -f database/schema.sql
```

### 4. MongoDB
```bash
mongod --dbpath /data/db  # or use MongoDB Atlas URI in .env
```

### 5. Python AI Service
```bash
cd backend/python
pip install -r requirements.txt
python main.py
# → http://localhost:8000/docs  (Swagger UI)
```

---

## 🔌 API Endpoints

| Method | Endpoint                      | Description                  |
|--------|-------------------------------|------------------------------|
| GET    | `/api/incidents`              | List all incidents           |
| GET    | `/api/incidents/:id`          | Get incident + rich details  |
| POST   | `/api/incidents`              | Create new incident          |
| PATCH  | `/api/incidents/:id`          | Update status                |
| POST   | `/api/upload/footage`         | Upload CCTV footage          |
| GET    | `/api/analytics`              | Stats & summaries            |
| GET    | `/health`                     | Health check                 |

**Python AI Service:**

| Method | Endpoint                     | Description                  |
|--------|------------------------------|------------------------------|
| POST   | `/analyze/frame`             | CCTV frame analysis          |
| POST   | `/analyze/speed`             | Speed detection              |
| POST   | `/classify/incident`         | Incident classification      |
| GET    | `/cameras/status`            | All camera statuses          |
| GET    | `/analytics/summary`         | AI-driven analytics          |

---

## 🗄 Databases

- **PostgreSQL** — Structured: incidents, cameras, speed violations, dispatch logs, reports
- **MongoDB** — Unstructured: rich descriptions, footage metadata, AI analysis results, witness statements

---

## 🛠 Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | HTML5, CSS3, Vanilla JS, Chart.js   |
| API         | Node.js + Express.js                |
| AI Service  | Python + FastAPI + (YOLOv8 ready)   |
| SQL DB      | PostgreSQL 16                       |
| NoSQL DB    | MongoDB 7                           |
| File Upload | Multer                              |
| Charts      | Chart.js 4                          |

---

## 📌 Notes

- The frontend runs fully standalone — no backend required to preview
- Python AI service uses mock detectors; replace with real YOLOv8/OpenCV in production
- All footage uploads stored in `backend/uploads/footage/`
- Extend `routes/` folder to add more REST resources easily
