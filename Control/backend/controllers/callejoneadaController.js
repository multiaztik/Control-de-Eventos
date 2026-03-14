/**
 * controllers/callejoneadaController.js — Lógica de negocio para Callejoneadas.
 */
const Callejoneada = require('../models/Callejoneada');
const ExcelJS = require('exceljs');

function validate(body) {
    const { lugar_inicio, lugar_fin, fecha_evento, hora_inicio, hora_fin, estatus, personal_ids } = body;
    if (!lugar_inicio || !lugar_fin || !fecha_evento || !hora_inicio || !hora_fin || !estatus)
        return 'Lugar, fecha, horas y estatus son obligatorios';
    if (!['Pagada', 'En deuda'].includes(estatus))
        return 'Estatus debe ser "Pagada" o "En deuda"';
    if (!personal_ids || personal_ids.length === 0)
        return 'Debe seleccionar al menos un participante';
    if (personal_ids.length > 4)
        return 'Máximo 4 personas por callejoneada';
    return null;
}

const CallejoneadaController = {
    getAll: async (req, res) => {
        try { res.json(await Callejoneada.getAll()); }
        catch (e) { res.status(500).json({ error: e.message }); }
    },

    getFiltrado: async (req, res) => {
        try { res.json(await Callejoneada.getFiltrado(req.query)); }
        catch (e) { res.status(500).json({ error: e.message }); }
    },

    getReporte: async (req, res) => {
        try { res.json(await Callejoneada.getReporte()); }
        catch (e) { res.status(500).json({ error: e.message }); }
    },

    getById: async (req, res) => {
        try {
            const row = await Callejoneada.getById(req.params.id);
            if (!row) return res.status(404).json({ error: 'Callejoneada no encontrada' });
            res.json(row);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },

    create: async (req, res) => {
        const err = validate(req.body);
        if (err) return res.status(400).json({ error: err });

        const data = { ...req.body };
        if (data.estatus === 'Pagada' && !data.fecha_pago)
            data.fecha_pago = new Date().toISOString().split('T')[0];

        try {
            const id = await Callejoneada.create(data);
            res.json({ id, ...data });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },

    update: async (req, res) => {
        const err = validate(req.body);
        if (err) return res.status(400).json({ error: err });

        const data = { ...req.body };
        if (data.estatus === 'Pagada' && !data.fecha_pago)
            data.fecha_pago = new Date().toISOString().split('T')[0];

        try {
            const result = await Callejoneada.update(req.params.id, data);
            if (!result) return res.status(404).json({ error: 'Callejoneada no encontrada' });
            res.json({ mensaje: 'Callejoneada actualizada' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },

    delete: async (req, res) => {
        try {
            const result = await Callejoneada.delete(req.params.id);
            if (result.changes === 0) return res.status(404).json({ error: 'Callejoneada no encontrada' });
            res.json({ mensaje: 'Callejoneada eliminada' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },

    getPersonalDisponible: async (req, res) => {
        try { res.json(await Callejoneada.getPersonalDisponible()); }
        catch (e) { res.status(500).json({ error: e.message }); }
    },

    exportCsv: async (req, res) => {
        try {
            const rows = await Callejoneada.getReporte();
            const SEP = ';';
            const esc = v => `"${String(v ?? '').replace(/"/g, '""').replace(/[\r\n\t]/g, ' ')}"`;
            const header = ['ID', 'Lugar inicio', 'Lugar fin', 'Fecha Evento', 'Fecha Pago', 'Hora inicio', 'Hora fin', 'Estatus', 'Descripción', 'Costo', 'Participantes', 'Cargos', 'Compañías'];
            const lines = rows.map(r => [r.id, r.lugar_inicio, r.lugar_fin, r.fecha_evento, r.fecha_pago || 'No pagada', r.hora_inicio, r.hora_fin, r.estatus, r.descripcion, r.costo ?? 0, (r.personal_nombres || []).join(' | '), (r.personal_cargos || []).join(' | '), (r.personal_companias || []).join(' | ')].map(esc).join(SEP));
            const csv = ['sep=;', header.join(SEP), ...lines].join('\r\n');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="callejoneadas.csv"');
            res.send('\uFEFF' + csv);
        } catch (e) { res.status(500).send('Error al exportar'); }
    },

    exportXlsx: async (req, res) => {
        try {
            const rows = await Callejoneada.getReporte();
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet('Callejoneadas');
            ws.columns = [
                { header: 'ID', key: 'id', width: 8 },
                { header: 'Lugar inicio', key: 'lugar_inicio', width: 28 },
                { header: 'Lugar fin', key: 'lugar_fin', width: 28 },
                { header: 'Fecha Evento', key: 'fecha_evento', width: 15 },
                { header: 'Fecha Pago', key: 'fecha_pago', width: 15 },
                { header: 'Hora inicio', key: 'hora_inicio', width: 12 },
                { header: 'Hora fin', key: 'hora_fin', width: 12 },
                { header: 'Estatus', key: 'estatus', width: 12 },
                { header: 'Descripción', key: 'descripcion', width: 35 },
                { header: 'Costo', key: 'costo', width: 12, style: { numFmt: '"$"#,##0.00' } },
                { header: 'Participantes', key: 'participantes', width: 40 },
                { header: 'Cargos', key: 'cargos', width: 30 },
                { header: 'Compañías', key: 'companias', width: 30 }
            ];
            rows.forEach(r => ws.addRow({ ...r, costo: Number(r.costo || 0), fecha_pago: r.fecha_pago || 'No pagada', participantes: (r.personal_nombres || []).join(' | '), cargos: (r.personal_cargos || []).join(' | '), companias: (r.personal_companias || []).join(' | ') }));
            ws.getRow(1).font = { bold: true };
            ws.autoFilter = { from: 'A1', to: 'M1' };

            const buffer = await wb.xlsx.writeBuffer();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="callejoneadas.xlsx"');
            res.send(Buffer.from(buffer));
        } catch (e) { res.status(500).send('Error generando XLSX'); }
    },
};

module.exports = CallejoneadaController;
