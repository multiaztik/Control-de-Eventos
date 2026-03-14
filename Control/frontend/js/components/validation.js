export class Validation {
  static validarRequerido(valor) {
    return valor && valor.trim() !== '';
  }

  static validarEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validarTelefono(telefono) {
    if (!telefono) return true; // Opcional
    const telefonoLimpio = telefono.replace(/\D/g, '');
    return telefonoLimpio.length >= 10;
  }

  static validarNumeroPositivo(numero) {
    return !isNaN(numero) && numero >= 0;
  }

  static mostrarError(campoId, mensaje) {
    const campo = document.getElementById(campoId);
    const error = document.getElementById(`error-${campoId}`);

    if (campo && error) {
      campo.classList.add('error');
      error.textContent = mensaje;
      error.style.display = 'block';
    }
  }

  static limpiarError(campoId) {
    const campo = document.getElementById(campoId);
    const error = document.getElementById(`error-${campoId}`);

    if (campo && error) {
      campo.classList.remove('error');
      error.style.display = 'none';
    }
  }
}