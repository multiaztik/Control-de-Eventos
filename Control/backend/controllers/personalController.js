/**
 * controllers/personalController.js — Lógica de negocio para Personal.
 */
const Personal = require('../models/Personal');
const ExcelJS = require('exceljs');
const fs = require('fs');

// ── Validadores ──
const validarEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const validarTelefono = (t) => !t || t.replace(/\D/g, '').length >= 10;
const COMPANIAS = ['Compañía 1', 'Compañía 2', 'Compañía 3', 'Administrativo'];

const PersonalController = {
    // GET /
    getAll: async (req, res) => {
        try { res.json(await Personal.getAll()); }
        catch (e) { res.status(500).json({ error: e.message }); }
    },

    // GET /historico
    getHistorico: async (req, res) => {
        try { res.json(await Personal.getHistorico(req.query)); }
        catch (e) { res.status(500).json({ error: 'Error al generar histórico' }); }
    },

    // GET /plantilla-xlsx
    descargarPlantilla: async (req, res) => {
        try {
            const wb = new ExcelJS.Workbook();
            wb.creator = 'Sistema Administrativo';
            const ws = wb.addWorksheet('Personal', { properties: { tabColor: { argb: '3498DB' } } });

            ws.columns = [
                { header: 'Nombre *', key: 'nombre', width: 22 },
                { header: 'Apellido *', key: 'apellido', width: 22 },
                { header: 'Cargo *', key: 'cargo', width: 22 },
                { header: 'Compañía *', key: 'compania', width: 22 },
                { header: 'Email *', key: 'email', width: 30 },
                { header: 'Teléfono', key: 'telefono', width: 18 },
                { header: 'Salario *', key: 'salario', width: 15, style: { numFmt: '"$"#,##0.00' } },
                { header: 'Fecha Contratación * (YYYY-MM-DD)', key: 'fecha_contratacion', width: 30 },
            ];

            const hr = ws.getRow(1);
            hr.height = 28;
            hr.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
            hr.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            hr.eachCell(c => {
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3498DB' } };
                c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'medium', color: { argb: '2C3E50' } }, right: { style: 'thin' } };
            });

            const e1 = ws.addRow({ nombre: 'Juan', apellido: 'Pérez García', cargo: 'Desarrollador', compania: 'Compañía 1', email: 'juan.perez@empresa.com', telefono: '4921234567', salario: 15000, fecha_contratacion: '2025-01-15' });
            e1.font = { italic: true, color: { argb: '95A5A6' } };
            const e2 = ws.addRow({ nombre: 'María', apellido: 'López Sánchez', cargo: 'Administradora', compania: 'Administrativo', email: 'maria.lopez@empresa.com', telefono: '4929876543', salario: 18000, fecha_contratacion: '2024-06-01' });
            e2.font = { italic: true, color: { argb: '95A5A6' } };

            for (let i = 2; i <= 500; i++) {
                ws.getCell(`D${i}`).dataValidation = {
                    type: 'list', allowBlank: false,
                    formulae: ['"Compañía 1,Compañía 2,Compañía 3,Administrativo"'],
                    showErrorMessage: true, errorTitle: 'Valor inválido', error: 'Selecciona una compañía'
                };
            }

            const iws = wb.addWorksheet('Instrucciones', { properties: { tabColor: { argb: '27AE60' } } });
            iws.columns = [{ header: 'Instrucciones para llenado', width: 80 }];
            iws.getRow(1).font = { bold: true, size: 14, color: { argb: '2C3E50' } };
            ['', '📋 INSTRUCCIONES PARA LLENADO DE PERSONAL', '', '1. Llena los datos en la hoja "Personal".', '2. Los campos con * son OBLIGATORIOS.', '3. Elimina las filas de ejemplo.', '',
                '📌 COLUMNAS:', '', '• Nombre * → Ej: Juan', '• Apellido * → Ej: Pérez García', '• Cargo * → Ej: Desarrollador',
                '• Compañía * → Lista: Compañía 1, 2, 3, Administrativo', '• Email * → Único. Ej: juan@empresa.com',
                '• Teléfono → (Opcional) Mín 10 dígitos', '• Salario * → Número positivo', '• Fecha Contratación * → YYYY-MM-DD', '',
                '⚠️ NOTAS:', '• Email ÚNICO', '• Máx 500 registros por carga'
            ].forEach(l => iws.addRow([l]));

            const buffer = await wb.xlsx.writeBuffer();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="plantilla_personal.xlsx"');
            res.send(Buffer.from(buffer));
        } catch (e) {
            console.error('Error plantilla:', e);
            res.status(500).json({ error: 'Error al generar la plantilla' });
        }
    },

    // POST /carga-masiva
    cargaMasiva: async (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

        try {
            const wb = new ExcelJS.Workbook();
            await wb.xlsx.readFile(req.file.path);
            const ws = wb.getWorksheet('Personal') || wb.getWorksheet(1);
            if (!ws) return res.status(400).json({ error: 'No se encontró la hoja "Personal"' });

            const results = { insertados: 0, errores: [], total: 0 };
            const rows = [];

            ws.eachRow((row, rn) => {
                if (rn === 1) return;
                let emailRaw = row.getCell(5).value;
                if (emailRaw && typeof emailRaw === 'object' && emailRaw.text) emailRaw = emailRaw.text;
                let fechaRaw = row.getCell(8).value;
                let fc = '';
                if (fechaRaw instanceof Date) fc = fechaRaw.toISOString().split('T')[0];
                else if (typeof fechaRaw === 'string') fc = fechaRaw.trim();

                rows.push({
                    rowNumber: rn,
                    nombre: String(row.getCell(1).value || '').trim(),
                    apellido: String(row.getCell(2).value || '').trim(),
                    cargo: String(row.getCell(3).value || '').trim(),
                    compania: String(row.getCell(4).value || '').trim(),
                    email: String(emailRaw || '').trim(),
                    telefono: String(row.getCell(6).value || '').trim(),
                    salario: (row.getCell(7).value !== null && row.getCell(7).value !== undefined && row.getCell(7).value !== '') ? Number(row.getCell(7).value) : NaN,
                    fecha_contratacion: fc,
                });
            });

            results.total = rows.length;
            if (!rows.length) return res.json({ ...results, mensaje: 'Archivo sin datos.' });
            if (rows.length > 500) return res.status(400).json({ error: 'Máximo 500 registros. Archivo tiene ' + rows.length });

            for (const row of rows) {
                const errs = [];
                if (!row.nombre) errs.push('Nombre vacío');
                if (!row.apellido) errs.push('Apellido vacío');
                if (!row.cargo) errs.push('Cargo vacío');
                if (!row.compania) errs.push('Compañía vacía');
                else if (!COMPANIAS.includes(row.compania)) errs.push(`Compañía inválida: "${row.compania}"`);
                if (!row.email) errs.push('Email vacío');
                else if (!validarEmail(row.email)) errs.push(`Email inválido`);
                if (row.telefono && !validarTelefono(row.telefono)) errs.push('Teléfono < 10 dígitos');
                if (isNaN(row.salario) || row.salario < 0) errs.push('Salario inválido');
                if (!row.fecha_contratacion) errs.push('Fecha vacía');
                else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.fecha_contratacion)) errs.push(`Fecha inválida`);

                if (errs.length) { results.errores.push({ fila: row.rowNumber, errores: errs }); continue; }

                try { await Personal.create(row); results.insertados++; }
                catch (err) {
                    const msg = err.message.includes('UNIQUE') ? `Email "${row.email}" ya existe` : err.message;
                    results.errores.push({ fila: row.rowNumber, errores: [msg] });
                }
            }

            results.mensaje = `Se insertaron ${results.insertados} de ${results.total} registros.`;
            if (results.errores.length) results.mensaje += ` ${results.errores.length} error(es).`;
            res.json(results);
        } catch (e) {
            res.status(500).json({ error: 'Error procesando archivo: ' + e.message });
        } finally {
            if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch (_) { }
        }
    },

    // GET /:id
    getById: async (req, res) => {
        try {
            const row = await Personal.getById(req.params.id);
            if (!row) return res.status(404).json({ error: 'Empleado no encontrado' });
            res.json(row);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },

    // POST /
    create: async (req, res) => {
        const { nombre, apellido, cargo, compania, email, telefono, salario, fecha_contratacion } = req.body;
        if (!nombre || !apellido || !cargo || !compania || !email || salario == null || !fecha_contratacion)
            return res.status(400).json({ error: 'Campos obligatorios faltantes' });
        if (!validarEmail(email)) return res.status(400).json({ error: 'Email inválido' });
        if (!validarTelefono(telefono)) return res.status(400).json({ error: 'Teléfono debe tener ≥10 dígitos' });
        if (Number(salario) < 0) return res.status(400).json({ error: 'Salario negativo' });

        try {
            const result = await Personal.create(req.body);
            res.json({ id: result.lastID, ...req.body, telefono: telefono || null });
        } catch (e) {
            if (e.message?.includes('UNIQUE')) return res.status(400).json({ error: 'El email ya existe' });
            res.status(500).json({ error: e.message });
        }
    },

    // PUT /:id
    update: async (req, res) => {
        const { nombre, apellido, cargo, compania, email, telefono, salario, fecha_contratacion } = req.body;
        if (!nombre || !apellido || !cargo || !compania || !email || salario == null || !fecha_contratacion)
            return res.status(400).json({ error: 'Campos obligatorios faltantes' });
        if (!validarEmail(email)) return res.status(400).json({ error: 'Email inválido' });
        if (!validarTelefono(telefono)) return res.status(400).json({ error: 'Teléfono debe tener ≥10 dígitos' });

        try {
            const result = await Personal.update(req.params.id, req.body);
            if (result.changes === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
            res.json({ mensaje: 'Empleado actualizado correctamente' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },

    // DELETE /:id
    delete: async (req, res) => {
        try {
            const result = await Personal.delete(req.params.id);
            if (result.changes === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
            res.json({ mensaje: 'Empleado eliminado correctamente' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
};

module.exports = PersonalController;
