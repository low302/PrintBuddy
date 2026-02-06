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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
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
    created_at TEXT NOT NULL,
    tags TEXT DEFAULT ''
  );
`);

const columns = db.prepare('PRAGMA table_info(files)').all();
if (!columns.find((col) => col.name === 'tags')) {
  db.exec("ALTER TABLE files ADD COLUMN tags TEXT DEFAULT ''");
}

const insertStmt = db.prepare(`
  INSERT INTO files (id, original_name, storage_name, extension, size, mime_type, created_at, tags)
  VALUES (@id, @original_name, @storage_name, @extension, @size, @mime_type, @created_at, @tags)
`);

const listStmt = db.prepare('SELECT * FROM files ORDER BY datetime(created_at) DESC');
const findStmt = db.prepare('SELECT * FROM files WHERE id = ?');
const deleteStmt = db.prepare('DELETE FROM files WHERE id = ?');
const updateTagsStmt = db.prepare('UPDATE files SET tags = @tags WHERE id = @id');

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
app.use(cors({ origin: true }));
app.use(express.json());

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags
      .map((tag) => String(tag).trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
};

const serializeTags = (tagsArray) => {
  const unique = Array.from(new Set(tagsArray));
  return unique.join(',');
};

const rowToItem = (row) => ({
  ...row,
  tags: row.tags ? row.tags.split(',').filter(Boolean) : [],
  file_url: `/api/files/${row.id}/file`
});

const suggestTags = (filename, extension) => {
  const name = filename.replace(new RegExp(`\\.${extension}$`, 'i'), '');
  const tokens = name
    .split(/[^a-zA-Z0-9]+/)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 1 && !['v1', 'v2', 'v3', 'final'].includes(token));
  const tags = new Set(tokens);
  if (extension) tags.add(extension.toLowerCase());
  return Array.from(tags).slice(0, 8);
};

const parseTagsFromText = (text) => {
  if (!text) return [];
  let payload = text.trim();
  const match = payload.match(/\[[\s\S]*\]/);
  if (match) {
    payload = match[0];
  }
  try {
    const parsed = JSON.parse(payload);
    if (Array.isArray(parsed)) {
      return normalizeTags(parsed);
    }
  } catch (error) {
    return [];
  }
  return [];
};

const generateAiTags = async (file) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }
  const prompt = `Generate 5-8 concise, lowercase tags (1-2 words) for a 3D model file. Respond with a JSON array only. File name: ${file.original_name}. Extension: ${file.extension}.`;
  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a tagging assistant. Return only a JSON array of tags.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 120
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  const parsed = parseTagsFromText(text);
  return parsed.length ? parsed.slice(0, 8) : suggestTags(file.original_name, file.extension);
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/files', (_req, res) => {
  const items = listStmt.all().map(rowToItem);
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
    created_at: new Date().toISOString(),
    tags: ''
  };

  insertStmt.run(payload);
  res.status(201).json({ item: rowToItem(payload) });
});

app.get('/api/files/:id', (req, res) => {
  const item = findStmt.get(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({ item: rowToItem(item) });
});

app.get('/api/files/:id/file', (req, res) => {
  const item = findStmt.get(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Not found' });
  }
  const filePath = path.join(UPLOAD_DIR, item.storage_name);
  res.sendFile(filePath);
});

app.patch('/api/files/:id/tags', (req, res) => {
  const item = findStmt.get(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Not found' });
  }
  const normalized = normalizeTags(req.body.tags);
  const serialized = serializeTags(normalized);
  updateTagsStmt.run({ id: req.params.id, tags: serialized });
  const updated = findStmt.get(req.params.id);
  res.json({ item: rowToItem(updated) });
});

app.post('/api/files/:id/autotag', async (req, res) => {
  const item = findStmt.get(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const suggested = await generateAiTags(item);
    const serialized = serializeTags(suggested);
    updateTagsStmt.run({ id: req.params.id, tags: serialized });
    const updated = findStmt.get(req.params.id);
    res.json({ item: rowToItem(updated), suggested });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Auto-tagging failed.' });
  }
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
