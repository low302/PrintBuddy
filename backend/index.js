import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4201;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'files.sqlite');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    storage_name TEXT NOT NULL,
    extension TEXT NOT NULL,
    size INTEGER NOT NULL,
    mime_type TEXT,
    created_at TEXT NOT NULL
  );
`);

const insertStmt = db.prepare(`
  INSERT INTO files (id, original_name, storage_name, extension, size, mime_type, created_at)
  VALUES (@id, @original_name, @storage_name, @extension, @size, @mime_type, @created_at)
`);

const listStmt = db.prepare('SELECT * FROM files ORDER BY datetime(created_at) DESC');
const findStmt = db.prepare('SELECT * FROM files WHERE id = ?');
const deleteStmt = db.prepare('DELETE FROM files WHERE id = ?');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.stl' || ext === '.3mf') {
      cb(null, true);
    } else {
      cb(new Error('Only STL and 3MF files are allowed.'));
    }
  }
});

const app = express();
app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/files', (_req, res) => {
  const items = listStmt.all().map((row) => ({
    ...row,
    file_url: `/api/files/${row.id}/file`
  }));
  res.json({ items });
});

app.post('/api/files', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'File missing.' });
  }
  const id = uuidv4();
  const extension = path.extname(req.file.originalname).toLowerCase().replace('.', '');
  const payload = {
    id,
    original_name: req.file.originalname,
    storage_name: req.file.filename,
    extension,
    size: req.file.size,
    mime_type: req.file.mimetype,
    created_at: new Date().toISOString()
  };

  insertStmt.run(payload);
  res.status(201).json({ item: payload });
});

app.get('/api/files/:id', (req, res) => {
  const item = findStmt.get(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({ item });
});

app.get('/api/files/:id/file', (req, res) => {
  const item = findStmt.get(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Not found' });
  }
  const filePath = path.join(UPLOAD_DIR, item.storage_name);
  res.sendFile(filePath);
});

app.delete('/api/files/:id', (req, res) => {
  const item = findStmt.get(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Not found' });
  }
  const filePath = path.join(UPLOAD_DIR, item.storage_name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  deleteStmt.run(req.params.id);
  res.json({ deleted: true });
});

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
