/**
 * routes/callejoneadas.js — Definiciones de rutas para Callejoneadas (thin).
 */
const express = require('express');
const ctrl = require('../controllers/callejoneadaController');

const router = express.Router();

// Rutas específicas ANTES de /:id
router.get('/filtrar', ctrl.getFiltrado);
router.get('/reporte', ctrl.getReporte);
router.get('/export/csv', ctrl.exportCsv);
router.get('/export/xlsx', ctrl.exportXlsx);
router.get('/personal-disponible', ctrl.getPersonalDisponible);

// CRUD
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.delete);

module.exports = router;