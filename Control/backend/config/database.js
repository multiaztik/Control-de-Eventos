/**
 * config/database.js — Conexión a SQLite, creación de tablas e índices, migraciones.
 * Exporta el singleton `db` y la promesa `dbReady` para saber cuándo está listo.
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');

// ══════════════════════════════════════════════════════════════
//  DETECCIÓN PKG Y RUTAS
// ══════════════════════════════════════════════════════════════
const isPkg = !!process.pkg;
const projectRoot = path.join(__dirname, '..', '..');

// 1. Intentar usar base de datos local (junto al .exe o en carpeta data de desarrollo)
const localDataDir = isPkg
    ? path.join(path.dirname(process.execPath), 'data')
    : path.join(projectRoot, 'data');

const roamingDataDir = isPkg
    ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'MiApp', 'database')
    : path.join(projectRoot, 'data');

// Lógica de selección de carpeta de datos:
// Si existe la base de datos en la carpeta local (junto al .exe), la usamos.
// Si no, usamos la carpeta de Roaming para persistencia entre versiones.
let dataDir = roamingDataDir;
const localDbFile = path.join(localDataDir, 'app.db');

if (fs.existsSync(localDbFile)) {
    dataDir = localDataDir;
    console.log('📂 Usando base de datos local detectada.');
}

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const uploadsDir = isPkg
    ? (dataDir === localDataDir ? path.join(path.dirname(process.execPath), 'uploads') : path.join(dataDir, '..', 'uploads'))
    : path.join(projectRoot, 'uploads');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const frontendPath = path.join(projectRoot, 'frontend');

const dbPath = path.join(dataDir, 'app.db');

// ══════════════════════════════════════════════════════════════
//  CONEXIÓN
// ══════════════════════════════════════════════════════════════
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error al conectar con la DB:', err.message);
    else console.log('✅ Conectado a SQLite:', dbPath);
});

// Promisificar db.run / db.all / db.get para los modelos
db.runAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });

db.allAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

db.getAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });

// ══════════════════════════════════════════════════════════════
//  CREACIÓN DE TABLAS E ÍNDICES
// ══════════════════════════════════════════════════════════════
function initDatabase() {
    db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON');

        // ── personal ──
        db.run(`
      CREATE TABLE IF NOT EXISTS personal (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre            TEXT NOT NULL,
        apellido          TEXT NOT NULL DEFAULT '',
        cargo             TEXT NOT NULL DEFAULT '',
        compania          TEXT NOT NULL DEFAULT '',
        email             TEXT NOT NULL UNIQUE,
        telefono          TEXT,
        salario           REAL NOT NULL DEFAULT 0,
        fecha_contratacion TEXT NOT NULL DEFAULT (date('now')),
        dept              TEXT,
        activo            INTEGER NOT NULL DEFAULT 1,
        created_at        TEXT DEFAULT (datetime('now'))
      )
    `);

        // ── callejoneadas ──
        db.run(`
      CREATE TABLE IF NOT EXISTS callejoneadas (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        lugar        TEXT NOT NULL,
        fecha_evento TEXT NOT NULL,
        fecha_pago   TEXT,
        hora         TEXT NOT NULL,
        estatus      TEXT NOT NULL CHECK(estatus IN ('Pagada','En deuda')),
        descripcion  TEXT,
        costo        REAL DEFAULT 0,
        created_at   TEXT DEFAULT (datetime('now'))
      )
    `);

        // ── callejoneada_personal ──
        db.run(`
      CREATE TABLE IF NOT EXISTS callejoneada_personal (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        callejoneada_id  INTEGER NOT NULL,
        personal_id      INTEGER NOT NULL,
        rol              TEXT,
        created_at       TEXT DEFAULT (datetime('now')),
        UNIQUE(callejoneada_id, personal_id),
        FOREIGN KEY (callejoneada_id) REFERENCES callejoneadas(id) ON DELETE CASCADE,
        FOREIGN KEY (personal_id)     REFERENCES personal(id)      ON DELETE CASCADE
      )
    `);

        // ── documents ──
        db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        personal_id INTEGER,
        type        TEXT NOT NULL,
        date        TEXT NOT NULL,
        title       TEXT,
        file_name   TEXT,
        file_path   TEXT,
        file_type   TEXT,
        printed     INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (personal_id) REFERENCES personal(id) ON DELETE SET NULL
      )
    `);

        // ── activity ──
        db.run(`
      CREATE TABLE IF NOT EXISTS activity (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        time TEXT DEFAULT (datetime('now'))
      )
    `);

        // ── Índices ──
        db.run(`CREATE INDEX IF NOT EXISTS idx_personal_email      ON personal(email)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_callejoneadas_fecha ON callejoneadas(fecha_evento)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_rel_calle           ON callejoneada_personal(callejoneada_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_rel_personal        ON callejoneada_personal(personal_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_documents_personal  ON documents(personal_id)`);

        // ── Columnas nuevas (migraciones) ──
        ensureColumns();
        migrateFromDocControl();
        migrateUploads();
    });
}

// ══════════════════════════════════════════════════════════════
//  MIGRACIONES DE COLUMNAS
// ══════════════════════════════════════════════════════════════
function ensureColumns() {
    // Callejoneadas: columnas nuevas
    db.all(`PRAGMA table_info('callejoneadas')`, (err, rows) => {
        if (err) return;
        const cols = new Set(rows.map(r => r.name));
        const add = (sql) => db.run(sql, () => { });
        if (!cols.has('lugar_inicio')) add(`ALTER TABLE callejoneadas ADD COLUMN lugar_inicio TEXT DEFAULT ''`);
        if (!cols.has('lugar_fin')) add(`ALTER TABLE callejoneadas ADD COLUMN lugar_fin TEXT DEFAULT ''`);
        if (!cols.has('hora_inicio')) add(`ALTER TABLE callejoneadas ADD COLUMN hora_inicio TEXT DEFAULT ''`);
        if (!cols.has('hora_fin')) add(`ALTER TABLE callejoneadas ADD COLUMN hora_fin TEXT DEFAULT ''`);
    });

    // Personal: columna dept
    db.run(`ALTER TABLE personal ADD COLUMN dept TEXT`, () => { });
}

// ══════════════════════════════════════════════════════════════
//  MIGRACIÓN DocControl JSON → SQLite (una sola vez)
// ══════════════════════════════════════════════════════════════
function migrateFromDocControl() {
    const candidatos = [
        path.join(isPkg ? path.dirname(process.execPath) : path.join(__dirname, '..', '..', '..'), 'data', 'db.json'),
        path.join(__dirname, '..', '..', '..', 'data', 'db.json'),
    ];

    const jsonPath = candidatos.find(p => fs.existsSync(p));
    if (!jsonPath) return; // Silencioso: no hay db.json → nada que hacer

    let json;
    try { json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); }
    catch (e) { console.warn('⚠️ Error leyendo db.json:', e.message); return; }

    db.get('SELECT COUNT(*) AS c FROM documents', [], (err, row) => {
        if (err || (row && row.c > 0)) return; // Ya migrado

        console.log('🔄 Migrando datos desde db.json...');
        const employees = json.employees || [];
        const documents = json.documents || [];
        const idMap = {};

        const insertEmp = db.prepare(`
      INSERT OR IGNORE INTO personal (nombre, apellido, cargo, compania, email, telefono, salario, fecha_contratacion, dept)
      VALUES (?, ?, ?, ?, ?, ?, 0, date('now'), ?)
    `);

        let pending = employees.length;
        if (pending === 0) { insertDocs(documents, idMap); return; }

        employees.forEach(emp => {
            const parts = (emp.name || 'Sin Nombre').split(' ');
            const nombre = parts[0] || 'Sin';
            const apellido = parts.slice(1).join(' ') || 'Nombre';
            const email = emp.email?.trim() || `migrado_${emp.id}@doccontrol.local`;
            insertEmp.run([nombre, apellido, emp.dept || 'Sin cargo', 'Importado', email, emp.phone || null, emp.dept || ''], function (e) {
                if (!e) idMap[emp.id] = this.lastID;
                else db.get('SELECT id FROM personal WHERE email = ?', [email], (_e2, r) => { if (r) idMap[emp.id] = r.id; });
                if (--pending === 0) insertEmp.finalize(() => insertDocs(documents, idMap));
            });
        });
    });
}

function insertDocs(documents, idMap) {
    if (!documents.length) return;
    const stmt = db.prepare(`INSERT OR IGNORE INTO documents (personal_id,type,date,title,file_name,file_path,file_type,printed) VALUES (?,?,?,?,?,?,?,?)`);
    documents.forEach(d => {
        stmt.run([idMap[d.empId] || null, d.type || 'Documento', d.date || new Date().toISOString().split('T')[0], d.title || d.type || 'Documento', d.fileName || '', d.filePath || '', d.fileType || '', d.printed ? 1 : 0]);
    });
    stmt.finalize(() => console.log(`✅ Migración completada: ${documents.length} documento(s)`));
}

// ══════════════════════════════════════════════════════════════
//  MIGRACIÓN DE UPLOADS ANTIGUOS
// ══════════════════════════════════════════════════════════════
function migrateUploads() {
    const oldDirs = [
        path.join(isPkg ? path.dirname(process.execPath) : path.join(__dirname, '..', '..', '..'), 'uploads'),
        path.join(__dirname, '..', '..', '..', 'uploads'),
    ];

    for (const oldDir of oldDirs) {
        if (!fs.existsSync(oldDir) || oldDir === uploadsDir) continue;
        try {
            const files = fs.readdirSync(oldDir);
            let migrated = 0;
            files.forEach(f => {
                const src = path.join(oldDir, f);
                const dest = path.join(uploadsDir, f);
                if (!fs.existsSync(dest) && fs.statSync(src).isFile()) { fs.copyFileSync(src, dest); migrated++; }
            });
            if (migrated > 0) console.log(`📋 Migrados ${migrated} archivo(s) a ${uploadsDir}`);
        } catch (e) { /* silencioso */ }
    }
}

// ══════════════════════════════════════════════════════════════
//  EXPORTAR
// ══════════════════════════════════════════════════════════════
module.exports = { db, initDatabase, dbPath, dataDir, uploadsDir, frontendPath, isPkg };
