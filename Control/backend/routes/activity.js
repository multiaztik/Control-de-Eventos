/**
 * routes/activity.js — Definiciones de rutas para Actividad (thin).
 */
const express = require('express');
const ctrl = require('../controllers/activityController');

const router = express.Router();

router.get('/', ctrl.getRecent);
router.post('/', ctrl.create);

module.exports = router;
