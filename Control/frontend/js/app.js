// Cargar usuarios al iniciar
document.addEventListener('DOMContentLoaded', cargarUsuarios);

async function cargarUsuarios() {
    try {
        const response = await fetch('/api/usuarios');
        const usuarios = await response.json();

        const lista = document.getElementById('usuariosList');
        lista.innerHTML = usuarios.map(usuario => `
            <div class="usuario-item">
                <strong>${usuario.nombre}</strong> - ${usuario.email}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error cargando usuarios:', error);
    }
}

async function agregarUsuario() {
    const nombre = document.getElementById('nombreInput').value;
    const email = document.getElementById('emailInput').value;

    try {
        const response = await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email })
        });

        if (response.ok) {
            cargarUsuarios(); // Recargar lista
            document.getElementById('nombreInput').value = '';
            document.getElementById('emailInput').value = '';
        }
    } catch (error) {
        console.error('Error agregando usuario:', error);
    }
}