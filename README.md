# PrintBuddy STL/3MF Storage Portal

Local STL/3MF storage with a Three.js previewer.

## Setup

### Backend

```bash
cd /Users/zaidalia/Documents/GitHub/PrintBuddy/backend
npm install
npm run dev
```

Backend runs on `http://localhost:4201`.

### Frontend

```bash
cd /Users/zaidalia/Documents/GitHub/PrintBuddy/frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:4200`.

## Notes
- Files are stored in `backend/data/uploads`.
- SQLite database is stored in `backend/data/files.sqlite`.
- If you want to change the API base, set `VITE_API_BASE` in `frontend/.env`.

## Docker Compose

```bash
cd /Users/zaidalia/Documents/GitHub/PrintBuddy
docker compose up --build
```

Frontend: `http://localhost:4200`  
Backend: `http://localhost:4201`
