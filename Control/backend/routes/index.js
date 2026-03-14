/**
 * routes/index.js — Agrupador centralizado de todas las rutas API.
 */
const personalRoutes = require('./personal');
const callejoneadasRoutes = require('./callejoneadas');
const documentsRoutes = require('./documents');
const activityRoutes = require('./activity');

function registerRoutes(app) {
    app.use('/api/personal', personalRoutes);
    app.use('/api/callejoneadas', callejoneadasRoutes);
    app.use('/api/documents', documentsRoutes);
    app.use('/api/activity', activityRoutes);
}

module.exports = registerRoutes;
