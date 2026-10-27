import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Enable JSON parser with large payload limit for bulletins with media
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database initialization
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.DATABASE_PUBLIC_URL ||
  process.env.POSTGRES_URL;
let pool = null;
let usePostgres = false;

// Fallback file storage
const DATA_DIR = path.join(__dirname, 'data');
const LOCAL_DB_FILE = path.join(DATA_DIR, 'local_db.json');

function initLocalDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DB_FILE)) {
    fs.writeFileSync(
      LOCAL_DB_FILE,
      JSON.stringify({ bulletins: {}, custom_assets: [] }, null, 2),
      'utf-8'
    );
  }
}

function readLocalDb() {
  try {
    initLocalDb();
    const data = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading local DB:', err);
    return { bulletins: {}, custom_assets: [] };
  }
}

function writeLocalDb(data) {
  try {
    initLocalDb();
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local DB:', err);
  }
}

async function initDatabase() {
  if (databaseUrl) {
    console.log('Detected database URL, establishing connection...');
    const isInternal =
      databaseUrl.includes('railway.internal') ||
      databaseUrl.includes('localhost') ||
      databaseUrl.includes('127.0.0.1');

    const tryConnect = async (useSsl) => {
      const testPool = new Pool({
        connectionString: databaseUrl,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 4000,
      });
      const client = await testPool.connect();
      return { testPool, client };
    };

    let client = null;
    try {
      // Attempt 1: preferred mode based on hostname
      const preferredSsl = !isInternal;
      console.log(`Connecting to PostgreSQL with SSL=${preferredSsl}...`);
      const res = await tryConnect(preferredSsl);
      pool = res.testPool;
      client = res.client;
      console.log('PostgreSQL connected successfully on primary attempt!');
    } catch (err1) {
      console.warn(`Primary PostgreSQL attempt (SSL=${!isInternal}) failed: ${err1.message}. Retrying with inverted SSL mode...`);
      try {
        // Attempt 2: opposite SSL mode
        const fallbackSsl = isInternal;
        const res = await tryConnect(fallbackSsl);
        pool = res.testPool;
        client = res.client;
        console.log('PostgreSQL connected successfully on fallback attempt!');
      } catch (err2) {
        console.error('All PostgreSQL connection attempts failed, falling back to local file storage:', err2.message);
        usePostgres = false;
        initLocalDb();
        return;
      }
    }

    if (client) {
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS bulletins (
            id VARCHAR(100) PRIMARY KEY,
            title TEXT NOT NULL,
            issue_no VARCHAR(50),
            document_data JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS idx_bulletins_updated_at ON bulletins(updated_at DESC);

          CREATE TABLE IF NOT EXISTS custom_assets (
            id VARCHAR(100) PRIMARY KEY,
            title TEXT,
            url TEXT NOT NULL,
            aspect_ratio VARCHAR(20),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        usePostgres = true;
        console.log('PostgreSQL schema verified and ready.');
      } catch (schemaErr) {
        console.error('Failed to initialize PostgreSQL schema:', schemaErr);
      } finally {
        client.release();
      }
    }
  } else {
    console.log('No DATABASE_URL found. Using local JSON storage mode.');
    usePostgres = false;
    initLocalDb();
  }
}

// ==========================================
// API ROUTES
// ==========================================

// Healthcheck (Responds with HTTP 200 immediately for Railway)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    port: PORT,
    database: usePostgres
      ? 'postgresql (Railway)'
      : pool
      ? 'connecting'
      : 'local_json_fallback',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// List all bulletins
app.get('/api/bulletins', async (req, res) => {
  try {
    if (usePostgres) {
      const result = await pool.query(`
        SELECT id, title, issue_no as "issueNo", updated_at as "updatedAt", created_at as "createdAt"
        FROM bulletins
        ORDER BY updated_at DESC;
      `);
      return res.json(result.rows);
    } else {
      const db = readLocalDb();
      const list = Object.values(db.bulletins || {}).map((item) => ({
        id: item.id,
        title: item.title,
        issueNo: item.issueNo,
        updatedAt: item.updatedAt,
        createdAt: item.createdAt,
      }));
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return res.json(list);
    }
  } catch (err) {
    console.error('Failed to list bulletins:', err);
    res.status(500).json({ error: 'Failed to retrieve bulletins' });
  }
});

// Get single bulletin by ID
app.get('/api/bulletins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (usePostgres) {
      const result = await pool.query('SELECT document_data FROM bulletins WHERE id = $1;', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Bulletin not found' });
      }
      return res.json(result.rows[0].document_data);
    } else {
      const db = readLocalDb();
      const item = db.bulletins?.[id];
      if (!item) {
        return res.status(404).json({ error: 'Bulletin not found' });
      }
      return res.json(item.documentData);
    }
  } catch (err) {
    console.error('Failed to get bulletin:', err);
    res.status(500).json({ error: 'Failed to retrieve bulletin' });
  }
});

// Save or Update bulletin
app.post('/api/bulletins', async (req, res) => {
  try {
    const documentData = req.body;
    if (!documentData || !documentData.id) {
      return res.status(400).json({ error: 'Invalid bulletin data: missing id' });
    }

    const id = documentData.id;
    const title = documentData.title || 'Untitled Bulletin';
    const issueNo = documentData.issueNo || '';
    const now = new Date().toISOString();

    if (usePostgres) {
      await pool.query(
        `
        INSERT INTO bulletins (id, title, issue_no, document_data, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          issue_no = EXCLUDED.issue_no,
          document_data = EXCLUDED.document_data,
          updated_at = CURRENT_TIMESTAMP;
      `,
        [id, title, issueNo, documentData]
      );
    } else {
      const db = readLocalDb();
      if (!db.bulletins) db.bulletins = {};
      db.bulletins[id] = {
        id,
        title,
        issueNo,
        documentData,
        updatedAt: now,
        createdAt: db.bulletins[id]?.createdAt || now,
      };
      writeLocalDb(db);
    }

    return res.json({ success: true, id, updatedAt: now });
  } catch (err) {
    console.error('Failed to save bulletin:', err);
    res.status(500).json({ error: 'Failed to save bulletin' });
  }
});

// Delete all bulletins
app.delete('/api/bulletins', async (req, res) => {
  try {
    if (usePostgres) {
      await pool.query('DELETE FROM bulletins;');
    } else {
      const db = readLocalDb();
      db.bulletins = {};
      writeLocalDb(db);
    }
    return res.json({ success: true, count: 0 });
  } catch (err) {
    console.error('Failed to delete all bulletins:', err);
    res.status(500).json({ error: 'Failed to delete all bulletins' });
  }
});

// Delete bulletin
app.delete('/api/bulletins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (usePostgres) {
      await pool.query('DELETE FROM bulletins WHERE id = $1;', [id]);
    } else {
      const db = readLocalDb();
      if (db.bulletins && db.bulletins[id]) {
        delete db.bulletins[id];
        writeLocalDb(db);
      }
    }
    return res.json({ success: true, id });
  } catch (err) {
    console.error('Failed to delete bulletin:', err);
    res.status(500).json({ error: 'Failed to delete bulletin' });
  }
});

// Custom Assets
app.get('/api/custom-assets', async (req, res) => {
  try {
    if (usePostgres) {
      const result = await pool.query('SELECT id, title, url, aspect_ratio as "aspectRatio" FROM custom_assets ORDER BY created_at DESC;');
      return res.json(result.rows);
    } else {
      const db = readLocalDb();
      return res.json(db.custom_assets || []);
    }
  } catch (err) {
    console.error('Failed to fetch custom assets:', err);
    res.status(500).json({ error: 'Failed to fetch custom assets' });
  }
});

app.post('/api/custom-assets', async (req, res) => {
  try {
    const assets = req.body;
    if (!Array.isArray(assets)) {
      return res.status(400).json({ error: 'Expected an array of assets' });
    }

    if (usePostgres) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM custom_assets;');
        for (const a of assets) {
          if (a.id && a.url) {
            await client.query(
              'INSERT INTO custom_assets (id, title, url, aspect_ratio) VALUES ($1, $2, $3, $4);',
              [a.id, a.title || '', a.url, a.aspectRatio || '1:1']
            );
          }
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } else {
      const db = readLocalDb();
      db.custom_assets = assets;
      writeLocalDb(db);
    }

    return res.json({ success: true, count: assets.length });
  } catch (err) {
    console.error('Failed to save custom assets:', err);
    res.status(500).json({ error: 'Failed to save custom assets' });
  }
});

// Serve frontend static build
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.send('TheBulletin CMS Server is running. Run `npm run build` to serve production assets.');
  });
}

// Start server immediately to bind $PORT for Railway deployment health checks
app.listen(PORT, '0.0.0.0', () => {
  console.log(`TheBulletin CMS Server running on http://0.0.0.0:${PORT}`);
  initDatabase().catch((err) => {
    console.error('Background database initialization failed:', err);
  });
});
