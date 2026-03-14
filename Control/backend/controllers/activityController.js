/**
 * controllers/activityController.js — Lógica de negocio para Actividad.
 */
const Activity = require('../models/Activity');

const ActivityController = {
    getRecent: async (req, res) => {
        try { res.json(await Activity.getRecent()); }
        catch (e) { res.status(500).json({ error: e.message }); }
    },

    create: async (req, res) => {
        const { text, type } = req.body;
        if (!text) return res.status(400).json({ error: 'text es obligatorio' });
        try { res.json(await Activity.create({ text, type })); }
        catch (e) { res.status(500).json({ error: e.message }); }
    },
};

module.exports = ActivityController;
