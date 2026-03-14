/**
 * routes/documents.js — Definiciones de rutas para Documentos (thin).
 */
const express = require('express');
const ctrl = require('../controllers/documentController');
const { uploadDocument } = require('../middleware/upload');

const router = express.Router();

// Rutas específicas ANTES de /:id
router.post('/mark-printed', ctrl.markPrinted);

// CRUD
router.get('/', ctrl.getAll);
router.post('/', uploadDocument.single('file'), ctrl.create);
router.put('/:id', uploadDocument.single('file'), ctrl.update);
router.delete('/:id', ctrl.delete);

module.exports = router;
