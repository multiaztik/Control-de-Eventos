/**
 * controllers/documentController.js — Lógica de negocio para Documentos.
 */
const Document = require('../models/Document');
const { uploadsDir } = require('../config/database');
const path = require('path');
const fs = require('fs');

const DocumentController = {
    getAll: async (req, res) => {
        try { res.json(await Document.getAll()); }
        catch (e) { res.status(500).json({ error: e.message }); }
    },

    create: async (req, res) => {
        const { empId, type, date } = req.body;
        if (!empId || !type || !date) return res.status(400).json({ error: 'empId, type y date son obligatorios' });

        try {
            const result = await Document.create({
                personal_id: parseInt(empId), type, date, title: type,
                file_name: req.file?.originalname || '',
                file_path: req.file ? `/uploads/${req.file.filename}` : '',
                file_type: req.file?.mimetype || ''
            });
            res.json({ id: result.lastID, empId: parseInt(empId), type, date, title: type });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },

    update: async (req, res) => {
        const id = parseInt(req.params.id);
        const { empId, type, date } = req.body;

        try {
            const doc = await Document.getById(id);
            if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

            let file_name = doc.file_name, file_path = doc.file_path, file_type = doc.file_type;
            if (req.file) {
                if (doc.file_path) {
                    const old = path.join(uploadsDir, path.basename(doc.file_path));
                    if (fs.existsSync(old)) fs.unlinkSync(old);
                }
                file_name = req.file.originalname;
                file_path = `/uploads/${req.file.filename}`;
                file_type = req.file.mimetype;
            }

            await Document.update(id, { personal_id: parseInt(empId), type, date, title: type, file_name, file_path, file_type });
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },

    delete: async (req, res) => {
        const id = parseInt(req.params.id);
        try {
            const doc = await Document.getById(id);
            if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
            if (doc.file_path) {
                const fp = path.join(uploadsDir, path.basename(doc.file_path));
                if (fs.existsSync(fp)) fs.unlinkSync(fp);
            }
            await Document.delete(id);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },

    markPrinted: async (req, res) => {
        const ids = req.body.ids;
        if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids requerido' });
        try { await Document.markPrinted(ids); res.json({ ok: true }); }
        catch (e) { res.status(500).json({ error: e.message }); }
    },

    getStats: async (req, res) => {
        try { res.json(await Document.getStats()); }
        catch (e) { res.status(500).json({ error: e.message }); }
    },
};

module.exports = DocumentController;
