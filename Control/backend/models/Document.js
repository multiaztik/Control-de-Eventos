/**
 * models/Document.js — Acceso a datos de documentos.
 */
const { db } = require('../config/database');

const Document = {
    getAll: () => db.allAsync(`
    SELECT d.*, p.nombre || ' ' || p.apellido AS empName
    FROM documents d LEFT JOIN personal p ON p.id = d.personal_id
    ORDER BY d.id DESC
  `),

    getById: (id) => db.getAsync('SELECT * FROM documents WHERE id = ?', [id]),

    create: ({ personal_id, type, date, title, file_name, file_path, file_type }) =>
        db.runAsync(
            `INSERT INTO documents (personal_id, type, date, title, file_name, file_path, file_type, printed)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
            [personal_id, type, date, title, file_name, file_path, file_type]
        ),

    update: (id, { personal_id, type, date, title, file_name, file_path, file_type }) =>
        db.runAsync(
            `UPDATE documents SET personal_id=?, type=?, date=?, title=?, file_name=?, file_path=?, file_type=? WHERE id=?`,
            [personal_id, type, date, title, file_name, file_path, file_type, id]
        ),

    delete: (id) => db.runAsync('DELETE FROM documents WHERE id = ?', [id]),

    markPrinted: (ids) => {
        const placeholders = ids.map(() => '?').join(',');
        return db.runAsync(`UPDATE documents SET printed = 1 WHERE id IN (${placeholders})`, ids);
    },

    getStats: () => db.getAsync(`
    SELECT
      (SELECT COUNT(*) FROM personal WHERE activo = 1) AS totalEmployees,
      (SELECT COUNT(*) FROM documents)                  AS totalDocuments,
      (SELECT COALESCE(SUM(CASE WHEN printed=1 THEN 1 ELSE 0 END),0) FROM documents) AS printCount
  `),
};

module.exports = Document;
