/**
 * models/Callejoneada.js — Acceso a datos de callejoneadas.
 */
const { db } = require('../config/database');

const BASE_QUERY = `
  SELECT c.*,
         GROUP_CONCAT(p.id)                          AS personal_ids,
         GROUP_CONCAT(p.nombre || ' ' || p.apellido) AS personal_nombres
  FROM callejoneadas c
  LEFT JOIN callejoneada_personal cp ON c.id = cp.callejoneada_id
  LEFT JOIN personal p ON cp.personal_id = p.id
`;

function processRow(row) {
    if (!row) return null;
    return {
        ...row,
        personal_ids: row.personal_ids ? row.personal_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [],
        personal_nombres: row.personal_nombres ? row.personal_nombres.split(',').map(n => n.trim()) : []
    };
}

const Callejoneada = {
    getAll: async () => {
        const rows = await db.allAsync(`${BASE_QUERY} GROUP BY c.id ORDER BY c.fecha_evento DESC, c.hora_inicio DESC`);
        return rows.map(processRow);
    },

    getById: async (id) => {
        const row = await db.getAsync(`${BASE_QUERY} WHERE c.id = ? GROUP BY c.id`, [id]);
        return row ? processRow(row) : null;
    },

    getFiltrado: async ({ estatus, fecha_desde, fecha_hasta, personal_id, lugar, costo_min, costo_max }) => {
        const conditions = [];
        const params = [];

        if (estatus) { conditions.push(`c.estatus = ?`); params.push(estatus); }
        if (fecha_desde) { conditions.push(`date(c.fecha_evento) >= date(?)`); params.push(fecha_desde); }
        if (fecha_hasta) { conditions.push(`date(c.fecha_evento) <= date(?)`); params.push(fecha_hasta); }
        if (lugar) { conditions.push(`(c.lugar_inicio LIKE ? OR c.lugar_fin LIKE ?)`); params.push(`%${lugar}%`, `%${lugar}%`); }
        if (costo_min) { conditions.push(`c.costo >= ?`); params.push(Number(costo_min)); }
        if (costo_max) { conditions.push(`c.costo <= ?`); params.push(Number(costo_max)); }

        let personalFilter = '';
        if (personal_id) {
            personalFilter = `AND c.id IN (SELECT callejoneada_id FROM callejoneada_personal WHERE personal_id = ?)`;
            params.push(Number(personal_id));
        }

        const where = conditions.length > 0
            ? 'WHERE ' + conditions.join(' AND ') + ' ' + personalFilter
            : (personalFilter ? 'WHERE 1=1 ' + personalFilter : '');

        const rows = await db.allAsync(`${BASE_QUERY} ${where} GROUP BY c.id ORDER BY c.fecha_evento DESC, c.hora_inicio DESC`, params);
        return rows.map(processRow);
    },

    create: async ({ lugar_inicio, lugar_fin, fecha_evento, fecha_pago, hora_inicio, hora_fin, estatus, descripcion, costo, personal_ids }) => {
        const result = await db.runAsync(
            `INSERT INTO callejoneadas (lugar, lugar_inicio, lugar_fin, fecha_evento, fecha_pago, hora, hora_inicio, hora_fin, estatus, descripcion, costo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [lugar_inicio, lugar_inicio, lugar_fin, fecha_evento, fecha_pago, hora_inicio, hora_inicio, hora_fin, estatus, descripcion, costo || 0]
        );
        if (personal_ids?.length > 0) await linkPersonal(result.lastID, personal_ids);
        return result.lastID;
    },

    update: async (id, { lugar_inicio, lugar_fin, fecha_evento, fecha_pago, hora_inicio, hora_fin, estatus, descripcion, costo, personal_ids }) => {
        const result = await db.runAsync(
            `UPDATE callejoneadas SET lugar=?, lugar_inicio=?, lugar_fin=?, fecha_evento=?, fecha_pago=?, hora=?, hora_inicio=?, hora_fin=?, estatus=?, descripcion=?, costo=? WHERE id=?`,
            [lugar_inicio, lugar_inicio, lugar_fin, fecha_evento, fecha_pago, hora_inicio, hora_inicio, hora_fin, estatus, descripcion, costo || 0, id]
        );
        if (result.changes === 0) return null;
        if (personal_ids !== undefined) {
            await db.runAsync('DELETE FROM callejoneada_personal WHERE callejoneada_id = ?', [id]);
            if (personal_ids.length > 0) await linkPersonal(id, personal_ids);
        }
        return result;
    },

    delete: (id) => db.runAsync('DELETE FROM callejoneadas WHERE id = ?', [id]),

    getReporte: async () => {
        const rows = await db.allAsync(`
      SELECT c.id, c.lugar_inicio, c.lugar_fin, c.fecha_evento, c.fecha_pago,
        c.hora_inicio, c.hora_fin, c.estatus, c.descripcion, c.costo,
        GROUP_CONCAT(p.id) AS personal_ids,
        GROUP_CONCAT(p.nombre || ' ' || p.apellido) AS personal_nombres,
        GROUP_CONCAT(p.cargo) AS personal_cargos,
        GROUP_CONCAT(p.compania) AS personal_companias
      FROM callejoneadas c
      LEFT JOIN callejoneada_personal cp ON c.id = cp.callejoneada_id
      LEFT JOIN personal p ON cp.personal_id = p.id
      GROUP BY c.id ORDER BY c.fecha_evento DESC, c.id DESC
    `);
        return rows.map(r => ({
            ...r,
            personal_ids: r.personal_ids ? r.personal_ids.split(',').map(Number) : [],
            personal_nombres: r.personal_nombres ? r.personal_nombres.split(',') : [],
            personal_cargos: r.personal_cargos ? r.personal_cargos.split(',') : [],
            personal_companias: r.personal_companias ? r.personal_companias.split(',') : []
        }));
    },

    getPersonalDisponible: () => db.allAsync('SELECT id, nombre, apellido FROM personal ORDER BY nombre, apellido'),
};

async function linkPersonal(callejoneadaId, personalIds) {
    for (const pid of personalIds) {
        await db.runAsync('INSERT OR IGNORE INTO callejoneada_personal (callejoneada_id, personal_id) VALUES (?, ?)', [callejoneadaId, pid]);
    }
}

module.exports = Callejoneada;
