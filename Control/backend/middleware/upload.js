/**
 * middleware/upload.js — Configuración de Multer para subida de archivos.
 */
const multer = require('multer');
const path = require('path');
const os = require('os');
const { uploadsDir } = require('../config/database');

// Documentos: guardar en uploadsDir con nombre único
const docStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, suffix + path.extname(file.originalname));
    }
});
const uploadDocument = multer({ storage: docStorage });

// Carga masiva Excel: guardar en directorio temporal
const uploadExcel = multer({
    dest: os.tmpdir(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.xlsx' || ext === '.xls') cb(null, true);
        else cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
});

module.exports = { uploadDocument, uploadExcel };
