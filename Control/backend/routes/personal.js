/**
 * routes/personal.js — Definiciones de rutas para Personal (thin).
 */
const express = require('express');
const ctrl = require('../controllers/personalController');
const { uploadExcel } = require('../middleware/upload');

const router = express.Router();

// Rutas específicas ANTES de /:id
router.get('/historico', ctrl.getHistorico);
router.get('/plantilla-xlsx', ctrl.descargarPlantilla);
router.post('/carga-masiva', uploadExcel.single('archivo'), ctrl.cargaMasiva);

// CRUD
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.delete);

module.exports = router;
