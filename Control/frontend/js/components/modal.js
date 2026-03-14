// frontend/js/components/modal.js
export class Modal {
  static _openCount = 0;
  static _lastFocused = null;

  static open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Guardar foco actual para restaurar
    Modal._lastFocused = document.activeElement;

    // Mostrar modal
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');

    // Evitar scroll del body si hay al menos un modal abierto
    if (Modal._openCount === 0) {
      document.body.style.overflow = 'hidden';
    }
    Modal._openCount++;

    // Enfocar primer elemento focuseable
    const focusable = modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) focusable.focus();
  }

  static close(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');

    Modal._openCount = Math.max(Modal._openCount - 1, 0);
    if (Modal._openCount === 0) {
      document.body.style.overflow = '';
    }

    // Restaurar foco
    if (Modal._lastFocused && typeof Modal._lastFocused.focus === 'function') {
      Modal._lastFocused.focus();
      Modal._lastFocused = null;
    }
  }

  static init() {
    // Cerrar al hacer click en el fondo (elemento con clase .modal)
    document.addEventListener('click', (event) => {
      const el = event.target;
      if (el.classList && el.classList.contains('modal')) {
        // Si el contenedor (fondo) recibe el click, cerrar ese modal
        const id = el.id;
        if (id) Modal.close(id);
      }
      // Compatibilidad: elementos con data-close-modal="#id"
      const btn = el.closest && el.closest('[data-close-modal]');
      if (btn) {
        const tgt = btn.getAttribute('data-close-modal').replace('#', '');
        if (tgt) Modal.close(tgt);
      }
    });

    // Cerrar con tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Cierra el último modal abierto (si tienes más de uno, puedes mejorar esto)
        const modals = Array.from(document.querySelectorAll('.modal'))
          .filter(m => m.style.display !== 'none');
        const last = modals.pop();
        if (last && last.id) Modal.close(last.id);
      }
    });
  }
}

// Inicializar eventos del modal
Modal.init();
// Hacer disponible Modal en el scope global para los onclick del HTML
if (typeof window !== 'undefined') {
  window.Modal = Modal;
}

