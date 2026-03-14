import { PersonalAPI } from './api.js';
import { Validation } from './components/validation.js';
import { Modal } from './components/modal.js';

class PersonalManager {
  constructor() {
    this.data = [];
    this.editingId = null;
    this.init();
  }

  init() {
    this.cargar();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Validación en tiempo real
    document.getElementById('email')?.addEventListener('blur', () => this.validarEmail());
    document.getElementById('telefono')?.addEventListener('blur', () => this.validarTelefono());
    document.getElementById('salario')?.addEventListener('blur', () => this.validarSalario());
  }

  async cargar() {
    try {
      this.data = await PersonalAPI.getAll();
      this.render();
      this.mostrarStatus('Datos de personal cargados correctamente', 'success');
    } catch (error) {
      this.mostrarStatus('Error cargando personal: ' + error.message, 'error');
    }
  }

  render() {
    const tabla = document.getElementById('tablaPersonal');

    if (!this.data || this.data.length === 0) {
      tabla.innerHTML = `
        <div class="empty-state">
          <div class="icon">👥</div>
          <h3>No hay empleados registrados</h3>
          <p>Agrega el primer empleado para comenzar</p>
          <button class="btn btn-primary" onclick="PersonalUI.agregar()">
            👥 Agregar Primer Empleado
          </button>
        </div>
      `;
      return;
    }

    tabla.innerHTML = '';

    this.data.forEach(persona => {
      const row = document.createElement('div');
      row.className = 'table-row personal-row';
      row.innerHTML = `
        <div class="table-cell">${persona.id}</div>
        <div class="table-cell">${persona.nombre}</div>
        <div class="table-cell">${persona.apellido}</div>
        <div class="table-cell">${persona.cargo}</div>
        <div class="table-cell">${persona.compania}</div>
        <div class="table-cell">${persona.email}</div>
        <div class="table-cell">${persona.telefono || '-'}</div>
        <div class="table-cell">$${persona.salario ? Number(persona.salario).toLocaleString() : '0'}</div>
        <div class="table-cell">${persona.fecha_contratacion}</div>
        <div class="table-cell actions">
          <button class="action-btn btn-edit" onclick="PersonalUI.editar(${persona.id})">✏️</button>
          <button class="action-btn btn-delete" onclick="PersonalUI.eliminar(${persona.id})">🗑️</button>
        </div>
      `;
      tabla.appendChild(row);
    });
  }

  async agregar() {
    this.editingId = null;
    document.getElementById('modalTituloPersonal').textContent = '👥 Agregar Nuevo Empleado';
    document.getElementById('formPersonal').reset();
    this.limpiarErrores();
    Modal.open('modalPersonal');
  }

  async editar(id) {
    try {
      const persona = await PersonalAPI.getById(id);
      this.editingId = id;

      document.getElementById('modalTituloPersonal').textContent = 'Editar Empleado';
      document.getElementById('nombre').value = persona.nombre;
      document.getElementById('apellido').value = persona.apellido;
      document.getElementById('cargo').value = persona.cargo;
      document.getElementById('compania').value = persona.compania;
      document.getElementById('email').value = persona.email;
      document.getElementById('telefono').value = persona.telefono || '';
      document.getElementById('salario').value = persona.salario;
      document.getElementById('fecha_contratacion').value = persona.fecha_contratacion;

      this.limpiarErrores();
      Modal.open('modalPersonal');
    } catch (error) {
      this.mostrarStatus('Error cargando empleado: ' + error.message, 'error');
    }
  }

  async guardar(event) {
    event.preventDefault();

    const formData = {
      nombre: document.getElementById('nombre').value.trim(),
      apellido: document.getElementById('apellido').value.trim(),
      cargo: document.getElementById('cargo').value.trim(),
      compania: document.getElementById('compania').value,
      email: document.getElementById('email').value.trim(),
      telefono: document.getElementById('telefono').value.trim(),
      salario: parseFloat(document.getElementById('salario').value),
      fecha_contratacion: document.getElementById('fecha_contratacion').value
    };

    if (!this.validarFormulario(formData)) {
      return;
    }

    try {
      if (this.editingId) {
        await PersonalAPI.update(this.editingId, formData);
        this.mostrarStatus('Empleado actualizado correctamente', 'success');
      } else {
        await PersonalAPI.create(formData);
        this.mostrarStatus('Empleado agregado correctamente', 'success');
      }

      Modal.close('modalPersonal');
      this.cargar();
    } catch (error) {
      this.mostrarStatus('Error: ' + error.message, 'error');
    }
  }

  validarFormulario(formData) {
    let valido = true;

    if (!Validation.validarRequerido(formData.nombre)) {
      Validation.mostrarError('nombre', 'Este campo es requerido');
      valido = false;
    }
    if (!Validation.validarRequerido(formData.apellido)) {
      Validation.mostrarError('apellido', 'Este campo es requerido');
      valido = false;
    }
    if (!Validation.validarRequerido(formData.cargo)) {
      Validation.mostrarError('cargo', 'Este campo es requerido');
      valido = false;
    }
    if (!Validation.validarRequerido(formData.compania)) {
      Validation.mostrarError('compania', 'Este campo es requerido');
      valido = false;
    }
    if (!Validation.validarRequerido(formData.email)) {
      Validation.mostrarError('email', 'Este campo es requerido');
      valido = false;
    } else if (!Validation.validarEmail(formData.email)) {
      Validation.mostrarError('email', 'Formato de email inválido');
      valido = false;
    }
    if (!Validation.validarTelefono(formData.telefono)) {
      Validation.mostrarError('telefono', 'El teléfono debe tener al menos 10 dígitos');
      valido = false;
    }
    if (!Validation.validarNumeroPositivo(formData.salario)) {
      Validation.mostrarError('salario', 'El salario debe ser un número positivo');
      valido = false;
    }
    if (!Validation.validarRequerido(formData.fecha_contratacion)) {
      Validation.mostrarError('fecha_contratacion', 'Este campo es requerido');
      valido = false;
    }

    return valido;
  }

  validarEmail() {
    const email = document.getElementById('email').value;
    if (!Validation.validarRequerido(email)) {
      Validation.mostrarError('email', 'Este campo es requerido');
    } else if (!Validation.validarEmail(email)) {
      Validation.mostrarError('email', 'Formato de email inválido');
    } else {
      Validation.limpiarError('email');
    }
  }

  validarTelefono() {
    const telefono = document.getElementById('telefono').value;
    if (telefono && !Validation.validarTelefono(telefono)) {
      Validation.mostrarError('telefono', 'El teléfono debe tener al menos 10 dígitos');
    } else {
      Validation.limpiarError('telefono');
    }
  }

  validarSalario() {
    const salario = parseFloat(document.getElementById('salario').value);
    if (!Validation.validarNumeroPositivo(salario)) {
      Validation.mostrarError('salario', 'El salario debe ser un número positivo');
    } else {
      Validation.limpiarError('salario');
    }
  }

  limpiarErrores() {
    const campos = ['nombre', 'apellido', 'cargo', 'compania', 'email', 'telefono', 'salario', 'fecha_contratacion'];
    campos.forEach(campo => Validation.limpiarError(campo));
  }

  async eliminar(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este empleado?')) return;

    try {
      await PersonalAPI.delete(id);
      this.mostrarStatus('Empleado eliminado correctamente', 'success');
      this.cargar();
    } catch (error) {
      this.mostrarStatus('Error: ' + error.message, 'error');
    }
  }

  filtrar() {
    const searchTerm = document.getElementById('buscar-personal').value.toLowerCase();
    const rows = document.querySelectorAll('#tablaPersonal .table-row');

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  }

  // ===================== HISTÓRICO =====================

  async verHistorico() {
    // 1) validar que existe el modal
    const modal = document.getElementById('modalHistorico');
    if (!modal) {
      this.mostrarStatus('No se encontró el modal de histórico (modalHistorico)', 'error');
      return;
    }

    // 2) limpiar filtros
    const d = document.getElementById('hist_desde');
    const h = document.getElementById('hist_hasta');
    if (d) d.value = '';
    if (h) h.value = '';

    // 3) cargar datos iniciales
    await this.cargarHistorico();

    // 4) abrir el modal (con fallback)
    try {
      Modal.open('modalHistorico');
    } catch (e) {
      modal.classList.add('open'); // fallback si tu modal usa 'display:none'
    }
  }

  async cargarHistorico() {
    const desde = document.getElementById('hist_desde')?.value || null;
    const hasta = document.getElementById('hist_hasta')?.value || null;

    try {
      const rows = await PersonalAPI.getHistorico({ desde, hasta });

      // ===== Resumen =====
      const resumen = {
        personas: rows.length,
        totalEventos: rows.reduce((acc, r) => acc + Number(r.total || 0), 0),
        conCero: rows.filter(r => Number(r.total) === 0).length,
      };
      const summaryEl = document.getElementById('hist_summary');
      if (summaryEl) {
        summaryEl.innerHTML = `
        <div class="card">
          <div>Personas</div>
          <div class="kpi">${resumen.personas.toLocaleString()}</div>
        </div>
        <div class="card">
          <div>Total de callejoneadas</div>
          <div class="kpi">${resumen.totalEventos.toLocaleString()}</div>
        </div>
        <div class="card">
          <div>Sin callejoneadas</div>
          <div class="kpi">${resumen.conCero.toLocaleString()}</div>
        </div>
      `;
      }

      // ===== Tabla =====
      const body = document.getElementById('tablaHistorico');
      if (!body) return;
      body.innerHTML = '';

      if (!rows || rows.length === 0) {
        body.innerHTML = `<div class="empty-state"><h4>Sin resultados</h4></div>`;
        return;
      }

      rows.forEach(r => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
        <div class="table-cell col-id">${r.id}</div>
        <div class="table-cell col-nombre"><b>${r.nombre} ${r.apellido}</b></div>
        <div class="table-cell col-cargo">${r.cargo || ''}</div>
        <div class="table-cell col-compania">
          ${r.compania ? `<span class="chip">${r.compania}</span>` : ''}
        </div>
        <div class="table-cell col-num"><b>${r.total}</b></div>
        <div class="table-cell col-num">${r.pagadas}</div>
        <div class="table-cell col-num">${r.en_deuda}</div>
        <div class="table-cell col-fecha">${r.ultima_fecha || '-'}</div>
        <div class="table-cell col-rango"><span class="badge ${badgeClase(r.rango)}">${r.rango}</span></div>
      `;
        body.appendChild(row);
      });
    } catch (e) {
      console.error(e);
      const body = document.getElementById('tablaHistorico');
      if (body) body.innerHTML = `<div class="empty-state"><h4>Error cargando histórico</h4></div>`;
    }
  }


  // ===================== CARGA MASIVA =====================

  async descargarPlantilla() {
    try {
      this.mostrarStatus('Descargando plantilla...', 'success');
      await PersonalAPI.descargarPlantilla();
      this.mostrarStatus('Plantilla descargada correctamente', 'success');
    } catch (error) {
      this.mostrarStatus('Error descargando plantilla: ' + error.message, 'error');
    }
  }

  async cargaMasiva(event) {
    const file = event.target?.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be re-selected
    event.target.value = '';

    // Show loading modal
    const body = document.getElementById('cargaMasivaBody');
    const titulo = document.getElementById('cargaMasivaTitulo');
    if (titulo) titulo.textContent = '📤 Procesando Carga Masiva...';
    if (body) {
      body.innerHTML = `
        <div class="carga-progress">
          <div class="spinner"></div>
          <p style="color:#7f8c8d;font-weight:600;">Procesando archivo: ${file.name}</p>
          <p style="color:#bdc3c7;font-size:12px;">Esto puede tardar unos segundos...</p>
        </div>
      `;
    }
    Modal.open('modalCargaMasiva');

    try {
      const result = await PersonalAPI.cargaMasiva(file);

      if (titulo) titulo.textContent = '📤 Resultados de Carga Masiva';

      let html = `
        <div class="carga-resumen">
          <div class="carga-card ok">
            <span class="num">${result.insertados || 0}</span>
            <span class="label">✅ Insertados</span>
          </div>
          <div class="carga-card error">
            <span class="num">${(result.errores || []).length}</span>
            <span class="label">❌ Errores</span>
          </div>
          <div class="carga-card total">
            <span class="num">${result.total || 0}</span>
            <span class="label">📋 Total filas</span>
          </div>
        </div>
        <p style="text-align:center;color:#2c3e50;font-weight:600;margin-bottom:12px;">
          ${result.mensaje || ''}
        </p>
      `;

      if (result.errores && result.errores.length > 0) {
        html += `
          <div class="carga-errores">
            <h4>⚠️ Detalle de errores por fila:</h4>
            ${result.errores.map(e => `
              <div class="carga-error-item">
                <span class="fila">Fila ${e.fila}:</span>
                ${e.errores.join(', ')}
              </div>
            `).join('')}
          </div>
        `;
      }

      if (body) body.innerHTML = html;

      // Refresh data
      if (result.insertados > 0) {
        this.cargar();
      }

      this.mostrarStatus(result.mensaje || 'Carga completada', result.insertados > 0 ? 'success' : 'error');
    } catch (error) {
      if (titulo) titulo.textContent = '❌ Error en Carga Masiva';
      if (body) {
        body.innerHTML = `
          <div style="text-align:center;padding:20px;">
            <div style="font-size:48px;margin-bottom:12px;">❌</div>
            <p style="color:#e74c3c;font-weight:700;font-size:16px;">${error.message}</p>
            <p style="color:#7f8c8d;font-size:13px;margin-top:8px;">Verifica que el archivo sea un Excel válido (.xlsx) con el formato de la plantilla.</p>
          </div>
        `;
      }
      this.mostrarStatus('Error en carga masiva: ' + error.message, 'error');
    }
  }

  mostrarStatus(mensaje, tipo) {
    const statusDiv = document.getElementById('status-personal');
    if (!statusDiv) return;
    statusDiv.className = `status ${tipo}`;
    statusDiv.textContent = mensaje;

    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 5000);
  }
}

// Helper rango -> color
function badgeClase(r) {
  switch (r) {
    case 'Ninguna': return 'badge-gray';
    case '1': return 'badge-blue';
    case '2': return 'badge-green';
    case '3': return 'badge-orange';
    default: return 'badge-purple'; // 4+
  }
}

// Instancia global para uso en HTML
window.PersonalUI = new PersonalManager();
