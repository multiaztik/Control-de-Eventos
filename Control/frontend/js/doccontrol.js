/**
 * doccontrol.js — Sistema de gestión de documentos integrado en mi_app
 * Toda la lógica se autocontiene aquí (sin módulos) para compatibilidad con pkg.
 */

(() => {
    'use strict';

    // ══════════════════════════════════════════════════════════════
    //  ESTADO
    // ══════════════════════════════════════════════════════════════
    const state = {
        employees: [],   // personal del servidor (tabla personal)
        documents: [],
        currentView: 'dashboard',
        editDocId: null,
    };

    // ══════════════════════════════════════════════════════════════
    //  API HELPERS
    // ══════════════════════════════════════════════════════════════
    const API = {
        async get(url) {
            const r = await fetch(url);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        },
        async post(url, body) {
            const r = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!r.ok) throw new Error(await r.text());
            return r.json();
        },
        async postForm(url, formData) {
            const r = await fetch(url, { method: 'POST', body: formData });
            if (!r.ok) throw new Error(await r.text());
            return r.json();
        },
        async put(url, formData) {
            const r = await fetch(url, { method: 'PUT', body: formData });
            if (!r.ok) throw new Error(await r.text());
            return r.json();
        },
        async del(url) {
            const r = await fetch(url, { method: 'DELETE' });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        }
    };

    // ══════════════════════════════════════════════════════════════
    //  TOAST
    // ══════════════════════════════════════════════════════════════
    let toastTimer;
    function toast(msg, type = 'success') {
        const el = document.getElementById('dcToast');
        if (!el) return;
        el.textContent = msg;
        el.className = `dc-toast ${type} show`;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
    }

    // ══════════════════════════════════════════════════════════════
    //  NAVEGACIÓN
    // ══════════════════════════════════════════════════════════════
    function navigate(view) {
        state.currentView = view;
        document.querySelectorAll('.dc-view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.dc-nav-item').forEach(n => n.classList.remove('active'));

        const viewEl = document.getElementById(`view-${view}`);
        if (viewEl) viewEl.classList.add('active');

        const navEl = document.getElementById(`nav-${view}`);
        if (navEl) navEl.classList.add('active');

        const titles = {
            dashboard: 'Dashboard',
            employees: 'Empleados',
            documents: 'Documentos',
            search: 'Consulta y Filtros'
        };
        const titleEl = document.getElementById('dcPageTitle');
        if (titleEl) titleEl.textContent = titles[view] || 'DocControl';

        renderView(view);
    }

    async function renderView(view) {
        switch (view) {
            case 'dashboard': return renderDashboard();
            case 'employees': return renderEmployees();
            case 'documents': return renderDocuments();
            case 'search': return renderSearch();
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  CARGA DE DATOS
    // ══════════════════════════════════════════════════════════════
    async function loadAll() {
        try {
            const [emps, docs] = await Promise.all([
                API.get('/api/personal'),       // usa la tabla unificada de personal
                API.get('/api/documents')
            ]);
            state.employees = emps;
            state.documents = docs;
        } catch (e) {
            console.error('Error cargando datos:', e);
            toast('Error al cargar datos del servidor', 'error');
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  DASHBOARD
    // ══════════════════════════════════════════════════════════════
    async function renderDashboard() {
        // Stats
        try {
            const stats = await API.get('/api/stats');
            setText('statEmployees', stats.totalEmployees ?? '—');
            setText('statDocuments', stats.totalDocuments ?? '—');
            setText('statPrinted', stats.printCount ?? '—');
        } catch (_) {
            setText('statEmployees', state.employees.length);
            setText('statDocuments', state.documents.length);
            setText('statPrinted', state.documents.filter(d => d.printed).length);
        }

        // Actividad
        try {
            const acts = await API.get('/api/activity');
            renderActivity(acts);
        } catch (_) {
            renderActivity([]);
        }
    }

    function renderActivity(acts) {
        const el = document.getElementById('dcActivityList');
        if (!el) return;
        if (!acts || acts.length === 0) {
            el.innerHTML = '<div class="dc-empty">Sin actividad reciente</div>';
            return;
        }
        el.innerHTML = acts.slice(0, 8).map(a => `
      <div class="dc-activity-item">
        <span class="dc-activity-dot ${a.type || 'info'}"></span>
        <span class="dc-activity-text">${esc(a.text)}</span>
        <span class="dc-activity-time">${fmtTime(a.time)}</span>
      </div>
    `).join('');
    }

    // ══════════════════════════════════════════════════════════════
    //  EMPLEADOS (solo lectura — se editan en /personal)
    // ══════════════════════════════════════════════════════════════
    function renderEmployees() {
        const search = (document.getElementById('dcEmpSearch')?.value || '').toLowerCase();
        const emps = state.employees.filter(e =>
            `${e.nombre} ${e.apellido} ${e.cargo} ${e.email}`.toLowerCase().includes(search)
        );
        const tbody = document.getElementById('dcEmpTableBody');
        if (!tbody) return;

        if (emps.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="dc-empty">Sin empleados</td></tr>';
            return;
        }
        tbody.innerHTML = emps.map(e => {
            const docCount = state.documents.filter(d => d.personal_id === e.id).length;
            const nombre = `${e.nombre || ''} ${e.apellido || ''}`.trim();
            const dept = e.dept || e.cargo || '—';
            return `
        <tr>
          <td>${e.id}</td>
          <td>${esc(nombre)}</td>
          <td>${esc(dept)}</td>
          <td>${esc(e.email || '—')}</td>
          <td>
            <span class="dc-badge ${docCount > 0 ? 'dc-badge-green' : 'dc-badge-gray'}">
              ${docCount} doc${docCount !== 1 ? 's' : ''}
            </span>
          </td>
          <td class="dc-action-btns">
            <button class="dc-btn dc-btn-sm dc-btn-secondary" onclick="DC.filterByEmp(${e.id})">
              Ver docs
            </button>
          </td>
        </tr>
      `;
        }).join('');
    }

    // ══════════════════════════════════════════════════════════════
    //  DOCUMENTOS
    // ══════════════════════════════════════════════════════════════
    function renderDocuments() {
        const search = (document.getElementById('dcDocSearch')?.value || '').toLowerCase();
        const docs = state.documents.filter(d => {
            const emp = findEmp(d.personal_id);
            const name = emp ? `${emp.nombre} ${emp.apellido}` : (d.empName || '');
            return `${d.title} ${d.type} ${name}`.toLowerCase().includes(search);
        });
        const tbody = document.getElementById('dcDocTableBody');
        if (!tbody) return;

        if (docs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="dc-empty">Sin documentos registrados</td></tr>';
            return;
        }
        tbody.innerHTML = docs.map(d => {
            const emp = findEmp(d.personal_id);
            const name = emp ? `${emp.nombre} ${emp.apellido}`.trim() : (d.empName || '—');
            const printed = d.printed
                ? '<span class="dc-badge dc-badge-green">Impreso</span>'
                : '<span class="dc-badge dc-badge-yellow">Pendiente</span>';
            return `
        <tr>
          <td>${d.id}</td>
          <td>${esc(d.title || d.type)}</td>
          <td>${esc(name)}</td>
          <td>${fmtDate(d.date)}</td>
          <td>${esc(d.type)}</td>
          <td>${printed}</td>
          <td class="dc-action-btns">
            ${d.file_path ? `<button class="dc-btn dc-btn-sm dc-btn-secondary" onclick="DC.viewDoc(${d.id})">Ver</button>` : ''}
            <button class="dc-btn dc-btn-sm dc-btn-outline" onclick="DC.editDoc(${d.id})">Editar</button>
            <button class="dc-btn dc-btn-sm dc-btn-danger" onclick="DC.deleteDoc(${d.id})">Eliminar</button>
          </td>
        </tr>
      `;
        }).join('');
    }

    // ══════════════════════════════════════════════════════════════
    //  BÚSQUEDA / FILTROS
    // ══════════════════════════════════════════════════════════════
    function renderSearch() {
        populateFilterSelects();
        applyFilters();
    }

    function populateFilterSelects() {
        // Empleados
        const selEmp = document.getElementById('filterEmployee');
        if (selEmp) {
            const cur = selEmp.value;
            selEmp.innerHTML = '<option value="">— Todos —</option>' +
                state.employees.map(e =>
                    `<option value="${e.id}">${esc(`${e.nombre} ${e.apellido}`.trim())}</option>`
                ).join('');
            selEmp.value = cur;
        }

        // Años
        const selYear = document.getElementById('filterYear');
        if (selYear) {
            const years = [...new Set(state.documents.map(d => d.date?.split('-')[0]).filter(Boolean))].sort().reverse();
            const cur = selYear.value;
            selYear.innerHTML = '<option value="">— Todos —</option>' +
                years.map(y => `<option value="${y}">${y}</option>`).join('');
            selYear.value = cur;
        }

        // Tipos
        const selType = document.getElementById('filterType');
        if (selType) {
            const types = [...new Set(state.documents.map(d => d.type).filter(Boolean))].sort();
            const cur = selType.value;
            selType.innerHTML = '<option value="">— Todos —</option>' +
                types.map(t => `<option value="${t}">${esc(t)}</option>`).join('');
            selType.value = cur;
        }
    }

    function applyFilters() {
        const empId = document.getElementById('filterEmployee')?.value;
        const year = document.getElementById('filterYear')?.value;
        const month = document.getElementById('filterMonth')?.value;
        const type = document.getElementById('filterType')?.value;

        let docs = [...state.documents];
        if (empId) docs = docs.filter(d => String(d.personal_id) === empId);
        if (year) docs = docs.filter(d => d.date?.startsWith(year));
        if (month) docs = docs.filter(d => {
            const m = d.date?.split('-')[1];
            return m && parseInt(m, 10) === parseInt(month, 10);
        });
        if (type) docs = docs.filter(d => d.type === type);

        const header = document.getElementById('dcResultsHeader');
        const count = document.getElementById('dcResultsCount');
        if (header) header.style.display = docs.length > 0 ? 'flex' : 'none';
        if (count) count.textContent = `${docs.length} documento${docs.length !== 1 ? 's' : ''} encontrado${docs.length !== 1 ? 's' : ''}`;

        const tbody = document.getElementById('dcSearchTableBody');
        if (!tbody) return;
        if (docs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="dc-empty">Sin resultados</td></tr>';
            return;
        }

        tbody.innerHTML = docs.map(d => {
            const emp = findEmp(d.personal_id);
            const name = emp ? `${emp.nombre} ${emp.apellido}`.trim() : (d.empName || '—');
            const printed = d.printed
                ? '<span class="dc-badge dc-badge-green">Impreso</span>'
                : '<span class="dc-badge dc-badge-yellow">Pendiente</span>';
            return `
        <tr>
          <td><input type="checkbox" class="dc-search-check" data-id="${d.id}" /></td>
          <td>${esc(d.title || d.type)}</td>
          <td>${esc(name)}</td>
          <td>${fmtDate(d.date)}</td>
          <td>${esc(d.type)}</td>
          <td>${printed}</td>
          <td>
            ${d.file_path ? `<button class="dc-btn dc-btn-sm dc-btn-secondary" onclick="DC.viewDoc(${d.id})">Ver</button>` : '—'}
          </td>
        </tr>
      `;
        }).join('');
    }

    // ══════════════════════════════════════════════════════════════
    //  MODAL DOCUMENTO
    // ══════════════════════════════════════════════════════════════
    function openDocModal(docId = null) {
        state.editDocId = docId;
        const doc = docId ? state.documents.find(d => d.id === docId) : null;

        document.getElementById('dcDocModalTitle').textContent = doc ? 'Editar Documento' : 'Registrar Documento';
        document.getElementById('dcDocId').value = docId || '';
        document.getElementById('dcDocDate').value = doc?.date || new Date().toISOString().split('T')[0];
        document.getElementById('dcDocType').value = doc?.type || '';
        document.getElementById('dcDocFile').value = '';

        // Hint archivo actual
        const hint = document.getElementById('dcCurrentFile');
        if (hint) hint.textContent = doc?.file_name ? `Archivo actual: ${doc.file_name}` : '';

        // Poblar select de empleados
        const selEmp = document.getElementById('dcDocEmp');
        if (selEmp) {
            selEmp.innerHTML = '<option value="">— Seleccionar empleado —</option>' +
                state.employees.map(e =>
                    `<option value="${e.id}">${esc(`${e.nombre} ${e.apellido}`.trim())}</option>`
                ).join('');
            if (doc?.personal_id) selEmp.value = doc.personal_id;
        }

        openModal('dcDocModal');
    }

    async function saveDoc() {
        const empId = document.getElementById('dcDocEmp')?.value;
        const type = document.getElementById('dcDocType')?.value;
        const date = document.getElementById('dcDocDate')?.value;
        const file = document.getElementById('dcDocFile')?.files[0];

        if (!empId || !type || !date) {
            toast('Completa todos los campos obligatorios', 'error');
            return;
        }

        const fd = new FormData();
        fd.append('empId', empId);
        fd.append('type', type);
        fd.append('date', date);
        if (file) fd.append('file', file);

        try {
            if (state.editDocId) {
                await API.put(`/api/documents/${state.editDocId}`, fd);
                toast('Documento actualizado ✓');
                logActivity(`Documento actualizado: ${type}`);
            } else {
                await API.postForm('/api/documents', fd);
                toast('Documento registrado ✓');
                logActivity(`Documento registrado: ${type}`);
            }
            closeModal('dcDocModal');
            await loadAll();
            renderView(state.currentView);
        } catch (e) {
            toast('Error al guardar: ' + e.message, 'error');
        }
    }

    function editDoc(id) {
        openDocModal(id);
        navigate('documents');
    }

    async function deleteDoc(id) {
        if (!confirm('¿Eliminar este documento?')) return;
        try {
            await API.del(`/api/documents/${id}`);
            toast('Documento eliminado');
            logActivity('Documento eliminado');
            await loadAll();
            renderView(state.currentView);
        } catch (e) {
            toast('Error al eliminar: ' + e.message, 'error');
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  VER DOCUMENTO
    // ══════════════════════════════════════════════════════════════
    function viewDoc(id) {
        const doc = state.documents.find(d => d.id === id);
        if (!doc) return;

        document.getElementById('dcViewDocTitle').textContent = doc.title || doc.type;

        const viewer = document.getElementById('dcViewerContent');
        const dlBtn = document.getElementById('dcBtnDownload');

        if (doc.file_path) {
            dlBtn.href = doc.file_path;
            dlBtn.download = doc.file_name || 'documento';
            dlBtn.style.display = '';

            if (doc.file_type?.includes('pdf') || doc.file_path?.endsWith('.pdf')) {
                viewer.innerHTML = `<iframe src="${doc.file_path}" style="width:100%;height:550px;border:none;border-radius:8px;"></iframe>`;
            } else if (/\.(png|jpg|jpeg|webp|gif)$/i.test(doc.file_path)) {
                viewer.innerHTML = `<img src="${doc.file_path}" style="width:100%;max-height:550px;object-fit:contain;border-radius:8px;" alt="Documento" />`;
            } else {
                viewer.innerHTML = `<div class="dc-no-preview">
          <p>Vista previa no disponible para este tipo de archivo.</p>
          <p style="margin-top:8px;font-size:.8rem;color:#475569;">${esc(doc.file_name || '')}</p>
        </div>`;
            }
        } else {
            dlBtn.style.display = 'none';
            viewer.innerHTML = '<div class="dc-no-preview">Este documento no tiene archivo adjunto.</div>';
        }

        openModal('dcViewDocModal');
    }

    // ══════════════════════════════════════════════════════════════
    //  IMPRIMIR
    // ══════════════════════════════════════════════════════════════
    function printFiltered() {
        const checks = [...document.querySelectorAll('.dc-search-check:checked')];
        if (checks.length === 0) { toast('Selecciona al menos un documento', 'error'); return; }

        const ids = checks.map(c => parseInt(c.dataset.id));
        const docs = ids.map(id => state.documents.find(d => d.id === id)).filter(Boolean);

        document.getElementById('dcPrintPreviewBody').innerHTML = `
      <p style="margin-bottom:16px;color:#94a3b8;font-size:.875rem;">${docs.length} documento${docs.length > 1 ? 's' : ''} seleccionado${docs.length > 1 ? 's' : ''}</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid rgba(255,255,255,.1);">
            <th style="padding:8px;text-align:left;color:#64748b;font-size:.75rem;">#</th>
            <th style="padding:8px;text-align:left;color:#64748b;font-size:.75rem;">DOCUMENTO</th>
            <th style="padding:8px;text-align:left;color:#64748b;font-size:.75rem;">EMPLEADO</th>
            <th style="padding:8px;text-align:left;color:#64748b;font-size:.75rem;">FECHA</th>
            <th style="padding:8px;text-align:left;color:#64748b;font-size:.75rem;">TIPO</th>
          </tr>
        </thead>
        <tbody>
          ${docs.map((d, i) => {
            const emp = findEmp(d.personal_id);
            const name = emp ? `${emp.nombre} ${emp.apellido}`.trim() : (d.empName || '—');
            return `
              <tr style="border-bottom:1px solid rgba(255,255,255,.04);">
                <td style="padding:8px;color:#475569;font-size:.8rem;">${i + 1}</td>
                <td style="padding:8px;color:#cbd5e1;">${esc(d.title || d.type)}</td>
                <td style="padding:8px;color:#cbd5e1;">${esc(name)}</td>
                <td style="padding:8px;color:#cbd5e1;">${fmtDate(d.date)}</td>
                <td style="padding:8px;color:#cbd5e1;">${esc(d.type)}</td>
              </tr>
            `;
        }).join('')}
        </tbody>
      </table>
    `;

        document.getElementById('dcBtnDoPrint').onclick = async () => {
            // Marcar como impresos
            try {
                await API.post('/api/documents/mark-printed', { ids });
                toast(`${ids.length} documento${ids.length > 1 ? 's' : ''} marcado${ids.length > 1 ? 's' : ''} como impreso${ids.length > 1 ? 's' : ''}`);
                logActivity(`Impresión: ${ids.length} doc(s)`);
                await loadAll();
                renderView(state.currentView);
            } catch (e) {
                toast('Error al marcar: ' + e.message, 'error');
            }
            window.print();
            closeModal('dcPrintModal');
        };

        openModal('dcPrintModal');
    }

    function filterByEmp(empId) {
        navigate('search');
        setTimeout(() => {
            const sel = document.getElementById('filterEmployee');
            if (sel) { sel.value = String(empId); applyFilters(); }
        }, 50);
    }

    // ══════════════════════════════════════════════════════════════
    //  ACTIVIDAD
    // ══════════════════════════════════════════════════════════════
    async function logActivity(text, type = 'success') {
        try { await API.post('/api/activity', { text, type }); }
        catch (_) { /* silencioso */ }
    }

    // ══════════════════════════════════════════════════════════════
    //  MODALES
    // ══════════════════════════════════════════════════════════════
    function openModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
    }
    function closeModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    }

    // ══════════════════════════════════════════════════════════════
    //  UTILIDADES
    // ══════════════════════════════════════════════════════════════
    function findEmp(id) { return state.employees.find(e => e.id === id); }
    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function fmtDate(d) {
        if (!d) return '—';
        try { return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch (_) { return d; }
    }
    function fmtTime(t) {
        if (!t) return '';
        try { return new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); }
        catch (_) { return ''; }
    }
    function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

    // ══════════════════════════════════════════════════════════════
    //  RELOJ
    // ══════════════════════════════════════════════════════════════
    function initClock() {
        const el = document.getElementById('dcDatetime');
        if (!el) return;
        const update = () => {
            el.textContent = new Date().toLocaleString('es-MX', {
                weekday: 'short', day: '2-digit', month: 'short',
                year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        };
        update();
        setInterval(update, 1000);
    }

    // ══════════════════════════════════════════════════════════════
    //  INICIALIZACIÓN
    // ══════════════════════════════════════════════════════════════
    document.addEventListener('DOMContentLoaded', async () => {
        initClock();
        await loadAll();
        navigate('dashboard');

        // ── Sidebar toggle ──
        document.getElementById('dcSidebarToggle')?.addEventListener('click', () => {
            document.getElementById('dcSidebar')?.classList.toggle('collapsed');
        });

        // ── Navegación ──
        document.querySelectorAll('.dc-nav-item[data-view]').forEach(btn => {
            btn.addEventListener('click', () => navigate(btn.dataset.view));
        });

        // ── Búsqueda en empleados ──
        document.getElementById('dcEmpSearch')?.addEventListener('input', renderEmployees);

        // ── Búsqueda en documentos ──
        document.getElementById('dcDocSearch')?.addEventListener('input', renderDocuments);

        // ── Filtros ──
        ['filterEmployee', 'filterYear', 'filterMonth', 'filterType'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', applyFilters);
        });
        document.getElementById('dcBtnClearFilters')?.addEventListener('click', () => {
            ['filterEmployee', 'filterYear', 'filterMonth', 'filterType'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            applyFilters();
        });

        // ── Botón nuevo documento ──
        document.getElementById('dcBtnNewDocument')?.addEventListener('click', () => openDocModal());
        document.getElementById('qaBtnNewDoc')?.addEventListener('click', () => { navigate('documents'); openDocModal(); });

        // ── Quick actions dashboard ──
        document.getElementById('qaBtnEmployees')?.addEventListener('click', () => navigate('employees'));
        document.getElementById('qaBtnSearch')?.addEventListener('click', () => navigate('search'));

        // ── Guardar documento ──
        document.getElementById('dcBtnSaveDoc')?.addEventListener('click', saveDoc);

        // ── Imprimir filtrado ──
        document.getElementById('dcBtnPrintFiltered')?.addEventListener('click', printFiltered);

        // ── Select all en búsqueda ──
        document.getElementById('dcSelectAll')?.addEventListener('change', e => {
            document.querySelectorAll('.dc-search-check').forEach(c => c.checked = e.target.checked);
        });

        // ── Cerrar modales ──
        document.querySelectorAll('.dc-modal-close, [data-modal]').forEach(el => {
            el.addEventListener('click', () => {
                const target = el.dataset.modal || el.closest('.dc-modal-overlay')?.id;
                if (target) closeModal(target);
            });
        });
        document.querySelectorAll('.dc-modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', e => {
                if (e.target === overlay) closeModal(overlay.id);
            });
        });
    });

    // ── Exponer API pública al HTML ──
    window.DC = { viewDoc, editDoc, deleteDoc, filterByEmp };

})();
