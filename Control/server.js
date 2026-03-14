/**
 * server.js — Punto de entrada del Sistema Administrativo Unificado.
 *
 * Arquitectura MVC:
 *   config/      → Configuración de la base de datos
 *   models/      → Acceso a datos (SQL)
 *   controllers/ → Lógica de negocio
 *   routes/      → Definiciones de rutas
 *   middleware/  → Configuración de Multer
 *   ../frontend/ → Vista (HTML, CSS, JS)
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// ── Configuración de BD (conexión, tablas, migraciones) ──
const { initDatabase, uploadsDir, frontendPath, isPkg, dbPath } = require('./backend/config/database');

// ── Registrar rutas API ──
const registerRoutes = require('./backend/routes/index');

// ── Compatibilidad DocControl ──
const Personal = require('./backend/models/Personal');
const Document = require('./backend/models/Document');

// ══════════════════════════════════════════════════════════════
//  APP EXPRESS
// ══════════════════════════════════════════════════════════════
const app = express();

// ── Middleware global ──
app.use(cors());
app.use(express.json());

// ── Archivos estáticos ──
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, fp) => { if (fp.endsWith('.pdf')) res.setHeader('Content-Type', 'application/pdf'); }
}));
app.use('/css', express.static(path.join(frontendPath, 'css'), {
  setHeaders: (res, fp) => { if (fp.endsWith('.css')) res.setHeader('Content-Type', 'text/css'); }
}));
app.use('/js', express.static(path.join(frontendPath, 'js'), {
  setHeaders: (res, fp) => { if (fp.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript'); }
}));
app.use(express.static(frontendPath));

// ── Páginas HTML ──
const sendPage = (name) => (req, res) => {
  const fp = path.join(frontendPath, name);
  fs.existsSync(fp) ? res.sendFile(fp) : res.status(404).send(`${name} no encontrado`);
};
app.get('/', sendPage('index.html'));
app.get('/personal', sendPage('personal.html'));
app.get('/callejoneadas', sendPage('callejoneadas.html'));
app.get('/doccontrol', sendPage('doccontrol.html'));

// ── Rutas API (MVC) ──
registerRoutes(app);

// ── Compatibilidad DocControl (legacy endpoints) ──
app.get('/api/employees', async (_req, res) => {
  try {
    const rows = await Personal.getActiveForDocControl();
    res.json(rows.map(r => ({
      id: r.id,
      name: `${r.nombre} ${r.apellido}`.trim(),
      dept: r.dept || r.cargo || '',
      email: r.email,
      phone: r.telefono || ''
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/stats', async (_req, res) => {
  try { res.json(await Document.getStats()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Test ──
app.get('/api/test', (_req, res) => {
  res.json({
    mensaje: '¡Sistema Unificado funcionando!',
    fecha: new Date().toLocaleString('es-ES'),
    estado: 'OK',
    modoPkg: isPkg,
    uploadsDir,
    frontendPath,
  });
});

// ── 404 de assets ──
app.use('/css/*', (_req, res) => res.status(404).send('CSS no encontrado'));
app.use('/js/*', (_req, res) => res.status(404).send('JS no encontrado'));

// ══════════════════════════════════════════════════════════════
//  INICIAR
// ══════════════════════════════════════════════════════════════
initDatabase();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Sistema Unificado en http://localhost:${PORT}`);
  console.log(`   • Personal / Callejoneadas : http://localhost:${PORT}/`);
  console.log(`   • DocControl (Documentos)  : http://localhost:${PORT}/doccontrol`);
  console.log(`📁 Frontend : ${frontendPath}`);
  console.log(`🗄️  DB       : ${dbPath}`);
  console.log(`📁 Uploads  : ${uploadsDir}\n`);
});