/**
 * models/Personal.js — Acceso a datos de la tabla `personal`.
 */
const { db } = require('../config/database');

const Personal = {
    getAll: () => db.allAsync('SELECT * FROM personal ORDER BY id'),

    getById: (id) => db.getAsync('SELECT * FROM personal WHERE id = ?', [id]),

    create: ({ nombre, apellido, cargo, compania, email, telefono, salario, fecha_contratacion }) =>
        db.runAsync(
            `INSERT INTO personal (nombre, apellido, cargo, compania, email, telefono, salario, fecha_contratacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre, apellido, cargo, compania, email, telefono || null, salario, fecha_contratacion]
        ),

    update: (id, { nombre, apellido, cargo, compania, email, telefono, salario, fecha_contratacion, activo }) =>
        db.runAsync(
            `UPDATE personal SET nombre=?, apellido=?, cargo=?, compania=?, email=?, telefono=?, salario=?, fecha_contratacion=?, activo=? WHERE id=?`,
            [nombre, apellido, cargo, compania, email, telefono || null, salario, fecha_contratacion, activo ? 1 : 0, id]
        ),

    delete: (id) => db.runAsync('DELETE FROM personal WHERE id = ?', [id]),

    getHistorico: ({ desde, hasta } = {}) => {
        let joinFiltro = '';
        const params = [];
        if (desde) { joinFiltro += ' AND date(c.fecha_evento) >= date(?)'; params.push(desde); }
        if (hasta) { joinFiltro += ' AND date(c.fecha_evento) <= date(?)'; params.push(hasta); }

        return db.allAsync(`
      SELECT p.id, p.nombre, p.apellido, p.cargo, p.compania,
        COALESCE(COUNT(c.id), 0) AS total,
        COALESCE(SUM(CASE WHEN c.estatus = 'Pagada' THEN 1 ELSE 0 END), 0) AS pagadas,
        COALESCE(SUM(CASE WHEN c.estatus = 'En deuda' THEN 1 ELSE 0 END), 0) AS en_deuda,
        MAX(c.fecha_evento) AS ultima_fecha,
        CASE WHEN COUNT(c.id) = 0 THEN 'Ninguna'
             WHEN COUNT(c.id) = 1 THEN '1'
             WHEN COUNT(c.id) = 2 THEN '2'
             WHEN COUNT(c.id) = 3 THEN '3'
             ELSE '4+' END AS rango
      FROM personal p
      LEFT JOIN callejoneada_personal cp ON p.id = cp.personal_id
      LEFT JOIN callejoneadas c ON c.id = cp.callejoneada_id ${joinFiltro}
      GROUP BY p.id
      ORDER BY total DESC, p.nombre, p.apellido
    `, params);
    },

    getActiveForDocControl: () =>
        db.allAsync('SELECT * FROM personal WHERE activo = 1 ORDER BY id'),
};

module.exports = Personal;
