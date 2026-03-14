/**
 * models/Activity.js — Acceso a datos de actividad.
 */
const { db } = require('../config/database');

const Activity = {
    getRecent: (limit = 50) => db.allAsync('SELECT * FROM activity ORDER BY time DESC LIMIT ?', [limit]),

    create: async ({ text, type }) => {
        const time = new Date().toISOString();
        const result = await db.runAsync(
            'INSERT INTO activity (text, type, time) VALUES (?, ?, ?)',
            [text, type || 'info', time]
        );
        // Mantener máximo 50 registros
        db.run('DELETE FROM activity WHERE id NOT IN (SELECT id FROM activity ORDER BY time DESC LIMIT 50)');
        return { id: result.lastID, text, type: type || 'info', time };
    },
};

module.exports = Activity;
