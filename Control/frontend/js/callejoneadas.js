import { CallejoneadasAPI } from './api.js';
import { Validation } from './components/validation.js';
import { Modal } from './components/modal.js';

class CallejoneadasManager {
  constructor() {
    this.data = [];
    this.personalDisponible = [];
    this.editingId = null;
    this.filtrosActivos = false;
    this.init();
  }

  init() {
    this.cargar();
    this.cargarPersonalDisponible();
    const fechaEvento = document.getElementById('fecha_evento');
    if (fechaEvento) fechaEvento.valueAsDate = new Date();
  }

  async cargarPersonalDisponible() {
    try {
      this.personalDisponible = await CallejoneadasAPI.getPersonalDisponible();
      this.actualizarCheckboxesPersonal();
      this.actualizarSelectParticipanteFiltro();
    } catch (error) {
      console.error('Error cargando personal disponible:', error);
      const container = document.getElementById('personal_checkboxes_container');
      if (container) {
        container.innerHTML = '<p class="loading-text" style="color: #e74c3c;">Error al cargar personal. Reintente.</p>';
      }
    }
  }

  actualizarCheckboxesPersonal() {
    const container = document.getElementById('personal_checkboxes_container');
    if (!container) return;

    if (this.personalDisponible.length === 0) {
      container.innerHTML = '<p class="loading-text">No hay personal disponible en la base de datos.</p>';
      return;
    }

    container.innerHTML = '';
    this.personalDisponible.forEach(persona => {
      const label = document.createElement('label');
      label.className = 'checkbox-item';
      label.innerHTML = `
        <input type="checkbox" name="personal_ids" value="${persona.id}" onchange="CallejoneadasUI.handleCheckboxChange(this)">
        <span>${persona.nombre} ${persona.apellido}</span>
      `;
      container.appendChild(label);
    });
  }

  handleCheckboxChange(checkbox) {
    const container = checkbox.closest('.checkbox-item');
    if (container) {
      container.classList.toggle('selected', checkbox.checked);
    }

    // Validar máximo 4
    const selected = document.querySelectorAll('input[name="personal_ids"]:checked');
    if (selected.length > 4) {
      this.mostrarStatus('Máximo 4 participantes permitidos', 'error');
      checkbox.checked = false;
      container.classList.remove('selected');
    }
  }

  actualizarSelectParticipanteFiltro() {
    const select = document.getElementById('filtro_participante');
    if (!select) return;

    select.innerHTML = '<option value="">— Todos —</option>';
    this.personalDisponible.forEach(persona => {
      const option = document.createElement('option');
      option.value = persona.id;
      option.textContent = `${persona.nombre} ${persona.apellido}`;
      select.appendChild(option);
    });
  }

  async cargar() {
    try {
      this.data = await CallejoneadasAPI.getAll();
      this.filtrosActivos = false;
      this.render();
      this.mostrarStatus('Callejoneadas cargadas correctamente', 'success');
    } catch (error) {
      this.mostrarStatus('Error cargando callejoneadas: ' + error.message, 'error');
    }
  }

  // ═══════════════════ FILTROS AVANZADOS ═══════════════════

  toggleFiltros() {
    const panel = document.getElementById('filtrosPanel');
    if (!panel) return;
    const isVisible = panel.style.display !== 'none';
    panel.style.display = isVisible ? 'none' : 'block';

    const btn = document.getElementById('btnToggleFiltros');
    if (btn) {
      btn.textContent = isVisible ? '🔍 Filtros Avanzados' : '🔍 Ocultar Filtros';
      btn.classList.toggle('btn-primary', !isVisible);
      btn.classList.toggle('btn-secondary', isVisible);
    }
  }

  async aplicarFiltros() {
    const filtros = {
      estatus: document.getElementById('filtro_estatus')?.value || '',
      fecha_desde: document.getElementById('filtro_fecha_desde')?.value || '',
      fecha_hasta: document.getElementById('filtro_fecha_hasta')?.value || '',
      personal_id: document.getElementById('filtro_participante')?.value || '',
      lugar: document.getElementById('filtro_lugar')?.value || '',
      costo_min: document.getElementById('filtro_costo_min')?.value || '',
      costo_max: document.getElementById('filtro_costo_max')?.value || '',
    };

    // Remove empty values
    Object.keys(filtros).forEach(key => {
      if (!filtros[key]) delete filtros[key];
    });

    try {
      if (Object.keys(filtros).length === 0) {
        // No filters, load all
        await this.cargar();
        return;
      }

      this.data = await CallejoneadasAPI.getFiltrado(filtros);
      this.filtrosActivos = true;
      this.render();

      // Show result count
      const resultDiv = document.getElementById('filtrosResultado');
      const conteo = document.getElementById('filtrosConteo');
      if (resultDiv && conteo) {
        conteo.textContent = this.data.length;
        resultDiv.style.display = 'block';
      }

      this.mostrarStatus(`Filtro aplicado: ${this.data.length} resultado(s)`, 'success');
    } catch (error) {
      this.mostrarStatus('Error aplicando filtros: ' + error.message, 'error');
    }
  }

  limpiarFiltros() {
    // Reset all filter inputs
    ['filtro_estatus', 'filtro_fecha_desde', 'filtro_fecha_hasta',
      'filtro_participante', 'filtro_lugar', 'filtro_costo_min',
      'filtro_costo_max', 'buscar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });

    // Hide result count
    const resultDiv = document.getElementById('filtrosResultado');
    if (resultDiv) resultDiv.style.display = 'none';

    // Reload all data
    this.cargar();
  }

  filtroRapido(tipo) {
    // Reset filters first
    ['filtro_estatus', 'filtro_fecha_desde', 'filtro_fecha_hasta',
      'filtro_participante', 'filtro_lugar', 'filtro_costo_min',
      'filtro_costo_max'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based

    switch (tipo) {
      case 'deudas':
        document.getElementById('filtro_estatus').value = 'En deuda';
        break;
      case 'pagadas':
        document.getElementById('filtro_estatus').value = 'Pagada';
        break;
      case 'este_mes': {
        const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
        const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
        document.getElementById('filtro_fecha_desde').value = firstDay;
        document.getElementById('filtro_fecha_hasta').value = lastDay;
        break;
      }
      case 'mes_pasado': {
        const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const lastDay = new Date(year, month, 0).toISOString().split('T')[0];
        document.getElementById('filtro_fecha_desde').value = firstDay;
        document.getElementById('filtro_fecha_hasta').value = lastDay;
        break;
      }
      case 'este_anio': {
        const firstDay = new Date(year, 0, 1).toISOString().split('T')[0];
        const lastDay = new Date(year, 11, 31).toISOString().split('T')[0];
        document.getElementById('filtro_fecha_desde').value = firstDay;
        document.getElementById('filtro_fecha_hasta').value = lastDay;
        break;
      }
    }

    // Make sure panel is visible
    const panel = document.getElementById('filtrosPanel');
    if (panel && panel.style.display === 'none') {
      panel.style.display = 'block';
      const btn = document.getElementById('btnToggleFiltros');
      if (btn) {
        btn.textContent = '🔍 Ocultar Filtros';
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-secondary');
      }
    }

    this.aplicarFiltros();
  }

  // Local text filter (filters the already-rendered rows)
  filtrarLocal() {
    const searchTerm = document.getElementById('buscar')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#tablaCallejoneadas .table-row');

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  }

  // Keep backward compat — old `filtrar` method now maps to `filtrarLocal`
  filtrar() {
    this.filtrarLocal();
  }

  // ═══════════════════ RENDER ═══════════════════

  render() {
    const tabla = document.getElementById('tablaCallejoneadas');
    if (!tabla) return;

    tabla.innerHTML = '';

    if (this.data.length === 0) {
      tabla.innerHTML = `
        <div class="empty-state">
          <div class="icon">🍻</div>
          <h3>${this.filtrosActivos ? 'No se encontraron resultados con los filtros aplicados' : 'No hay callejoneadas registradas'}</h3>
          <p>${this.filtrosActivos ? 'Intenta ajustar los filtros o limpia la búsqueda' : 'Agrega la primera callejoneada para comenzar'}</p>
          ${this.filtrosActivos
          ? '<button class="btn btn-secondary" onclick="CallejoneadasUI.limpiarFiltros()">🧹 Limpiar Filtros</button>'
          : '<button class="btn btn-warning" onclick="CallejoneadasUI.agregar()">🍻 Nueva Callejoneada</button>'
        }
        </div>
      `;
      return;
    }

    this.data.forEach(callejoneada => {
      const estatusClass = callejoneada.estatus === 'Pagada' ? 'estatus-pagada' : 'estatus-deuda';
      const participantes = callejoneada.personal_nombres && callejoneada.personal_nombres.length > 0
        ? callejoneada.personal_nombres.join(', ')
        : 'Sin participantes';

      // Formatear fechas para mostrar
      const fechaEvento = callejoneada.fecha_evento
        ? new Date(callejoneada.fecha_evento).toLocaleDateString('es-ES')
        : '';
      const fechaPago = callejoneada.fecha_pago
        ? new Date(callejoneada.fecha_pago).toLocaleDateString('es-ES')
        : 'No pagada';

      // Mostrar lugares y horas separados
      const lugares = callejoneada.lugar_inicio && callejoneada.lugar_fin
        ? `${callejoneada.lugar_inicio} → ${callejoneada.lugar_fin}`
        : (callejoneada.lugar_inicio || callejoneada.lugar || '-');

      const horas = callejoneada.hora_inicio && callejoneada.hora_fin
        ? `${callejoneada.hora_inicio} – ${callejoneada.hora_fin}`
        : (callejoneada.hora_inicio || callejoneada.hora || '-');

      const row = document.createElement('div');
      row.className = 'table-row callejoneadas-row';
      row.innerHTML = `
        <div class="table-cell">${callejoneada.id}</div>
        <div class="table-cell">
          <div><strong>Evento:</strong> ${fechaEvento}</div>
          <div style="font-size:12px;color:#666;"><strong>Pago:</strong> ${fechaPago}</div>
        </div>
        <div class="table-cell">
          <div><strong>Lugares:</strong> ${lugares}</div>
          <div style="font-size:12px;color:#666;"><strong>Horas:</strong> ${horas}</div>
        </div>
        <div class="table-cell"><span class="${estatusClass}">${callejoneada.estatus}</span></div>
        <div class="table-cell">
          <div><strong>${callejoneada.descripcion || 'Sin descripción'}</strong></div>
          <div style="font-size:12px;color:#666;margin-top:5px;">👥 ${participantes}</div>
        </div>
        <div class="table-cell">$${callejoneada.costo ? Number(callejoneada.costo).toLocaleString() : '0'}</div>
        <div class="table-cell actions">
          <button class="action-btn btn-edit" onclick="CallejoneadasUI.editar(${callejoneada.id})">✏️</button>
          <button class="action-btn btn-delete" onclick="CallejoneadasUI.eliminar(${callejoneada.id})">🗑️</button>
        </div>
      `;
      tabla.appendChild(row);
    });
  }

  // ═══════════════════ CRUD ═══════════════════

  async agregar() {
    this.editingId = null;
    const modalTitulo = document.getElementById('modalTitulo');
    const form = document.getElementById('formCallejoneada');
    const fechaEvento = document.getElementById('fecha_evento');

    if (modalTitulo) modalTitulo.textContent = '🍻 Nueva Callejoneada';
    if (form) form.reset();
    if (fechaEvento) fechaEvento.valueAsDate = new Date();

    // Resetear checkboxes
    document.querySelectorAll('input[name="personal_ids"]').forEach(cb => {
      cb.checked = false;
      cb.closest('.checkbox-item')?.classList.remove('selected');
    });

    Modal.open('modalCallejoneada');
  }

  async editar(id) {
    try {
      const callejoneada = await CallejoneadasAPI.getById(id);
      this.editingId = id;

      // Función segura para asignar valores
      const setValue = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.value = value || '';
      };

      document.getElementById('modalTitulo').textContent = 'Editar Callejoneada';
      setValue('lugar_inicio', callejoneada.lugar_inicio);
      setValue('lugar_fin', callejoneada.lugar_fin);
      setValue('fecha_evento', callejoneada.fecha_evento);
      setValue('fecha_pago', callejoneada.fecha_pago);
      setValue('hora_inicio', callejoneada.hora_inicio);
      setValue('hora_fin', callejoneada.hora_fin);
      setValue('estatus', callejoneada.estatus);
      setValue('descripcion', callejoneada.descripcion);
      setValue('costo', callejoneada.costo);

      // Seleccionar personal mediante checkboxes
      if (this.personalDisponible.length === 0) {
        await this.cargarPersonalDisponible();
      }

      const personalIds = callejoneada.personal_ids || [];
      document.querySelectorAll('input[name="personal_ids"]').forEach(cb => {
        const isSelected = personalIds.includes(parseInt(cb.value));
        cb.checked = isSelected;
        cb.closest('.checkbox-item')?.classList.toggle('selected', isSelected);
      });

      Modal.open('modalCallejoneada');
    } catch (error) {
      this.mostrarStatus('Error cargando callejoneada: ' + error.message, 'error');
    }
  }

  async guardar(event) {
    event.preventDefault();

    const personalIds = Array.from(document.querySelectorAll('input[name="personal_ids"]:checked'))
      .map(cb => parseInt(cb.value))
      .filter(id => !isNaN(id));

    if (personalIds.length === 0) {
      this.mostrarStatus('Error: Debe seleccionar al menos un participante', 'error');
      return;
    }

    if (personalIds.length > 4) {
      this.mostrarStatus('Error: Máximo 4 personas por callejoneada', 'error');
      return;
    }

    const formData = {
      lugar_inicio: document.getElementById('lugar_inicio').value.trim(),
      lugar_fin: document.getElementById('lugar_fin').value.trim(),
      fecha_evento: document.getElementById('fecha_evento').value,
      fecha_pago: document.getElementById('fecha_pago').value || null,
      hora_inicio: document.getElementById('hora_inicio').value,
      hora_fin: document.getElementById('hora_fin').value,
      estatus: document.getElementById('estatus').value,
      descripcion: document.getElementById('descripcion').value.trim(),
      costo: document.getElementById('costo').value ? parseFloat(document.getElementById('costo').value) : 0,
      personal_ids: personalIds
    };

    // Validaciones
    const camposRequeridos = ['lugar_inicio', 'lugar_fin', 'fecha_evento', 'hora_inicio', 'hora_fin', 'estatus'];
    for (const campo of camposRequeridos) {
      if (!Validation.validarRequerido(formData[campo])) {
        this.mostrarStatus('Por favor completa todos los campos obligatorios', 'error');
        return;
      }
    }

    if (!['Pagada', 'En deuda'].includes(formData.estatus)) {
      this.mostrarStatus('El estatus debe ser "Pagada" o "En deuda"', 'error');
      return;
    }

    try {
      if (this.editingId) {
        await CallejoneadasAPI.update(this.editingId, formData);
        this.mostrarStatus('Callejoneada actualizada correctamente', 'success');
      } else {
        await CallejoneadasAPI.create(formData);
        this.mostrarStatus('Callejoneada agregada correctamente', 'success');
      }

      Modal.close('modalCallejoneada');
      this.cargar();
    } catch (error) {
      this.mostrarStatus('Error: ' + error.message, 'error');
    }
  }

  async eliminar(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta callejoneada?')) return;

    try {
      await CallejoneadasAPI.delete(id);
      this.mostrarStatus('Callejoneada eliminada correctamente', 'success');
      this.cargar();
    } catch (error) {
      this.mostrarStatus('Error: ' + error.message, 'error');
    }
  }

  async generarReporte() {
    try {
      const status = document.getElementById('status');
      if (status) status.textContent = 'Generando Excel...';

      const res = await fetch('/api/callejoneadas/export-xlsx');
      if (!res.ok) throw new Error('No se pudo generar el XLSX');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `callejoneadas_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      if (status) status.textContent = 'Reporte generado correctamente';
      setTimeout(() => { if (status) status.textContent = ''; }, 3000);
    } catch (err) {
      this.mostrarStatus('Error generando Excel: ' + err.message, 'error');
    }
  }

  mostrarStatus(mensaje, tipo) {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;

    statusDiv.className = `status ${tipo}`;
    statusDiv.textContent = mensaje;

    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 5000);
  }
}

window.CallejoneadasUI = new CallejoneadasManager();