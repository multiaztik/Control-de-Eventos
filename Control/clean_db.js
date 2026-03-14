
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Obtener la ruta de la base de datos desde el archivo de configuración
const { dbPath, uploadsDir } = require('./backend/config/database');

const db = new sqlite3.Database(dbPath);

const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

async function cleanAndSeed() {
  try {
    console.log('--- Iniciando Limpieza de Base de Datos ---');

    // 1. Limpiar tablas (respetando llaves foráneas)
    await runAsync('DELETE FROM callejoneada_personal');
    await runAsync('DELETE FROM documents');
    await runAsync('DELETE FROM callejoneadas');
    await runAsync('DELETE FROM personal');
    await runAsync('DELETE FROM activity');
    
    // Resetear autoincrementales
    await runAsync("DELETE FROM sqlite_sequence WHERE name IN ('personal', 'callejoneadas', 'documents', 'activity', 'callejoneada_personal')");

    console.log('✅ Base de datos limpia.');

    // 2. Insertar Datos variados (4 empleados)
    console.log('--- Insertando Datos de Prueba ---');

    // PERSONAL
    const personalData = [
      ['Juan', 'Pérez', 'Director de Orquesta', 'Cultura S.A.', 'juan.perez@ejemplo.com', '4731234567', 15000, 'Musica'],
      ['María', 'García', 'Guía Turístico', 'Turismo Guanajuato', 'maria.garcia@ejemplo.com', '4739876543', 12000, 'Guias'],
      ['Roberto', 'Hernández', 'Logística', 'Eventos Bajío', 'roberto.h@ejemplo.com', '4735554433', 10000, 'Administracion'],
      ['Jose', 'Prueba', 'El jefaso', 'Administrativo', 'prueba@gmail.com', '1234567890', 100000, 'Gerencia']
    ];

    for (const p of personalData) {
      await runAsync(`
        INSERT INTO personal (nombre, apellido, cargo, compania, email, telefono, salario, dept, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, p);
    }
    console.log('✅ 4 empleados insertados.');

    // CALLEJONEADAS (Con horas de inicio y fin)
    const callejoneadasData = [
      ['Teatro Juarez', '2026-03-20', '2026-03-21', '19:00', 'Pagada', 'Callejoneada nocturna tradicional', 2500, 'Teatro Juarez', 'Alhóndiga', '19:00', '21:00'],
      ['Jardín Unión', '2026-04-15', null, '20:30', 'En deuda', 'Evento corporativo privado', 3500, 'Jardín Unión', 'Plazuela de San Roque', '20:30', '22:30'],
      ['Plaza de los Ángeles', '2026-05-01', '2026-05-02', '18:00', 'Pagada', 'Callejoneada romántica especial', 1800, 'Plaza de los Ángeles', 'El Beso', '18:00', '19:30']
    ];

    for (const c of callejoneadasData) {
      await runAsync(`
        INSERT INTO callejoneadas (lugar, fecha_evento, fecha_pago, hora, estatus, descripcion, costo, lugar_inicio, lugar_fin, hora_inicio, hora_fin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, c);
    }
    console.log('✅ 3 callejoneadas insertadas.');

    // RELACIONES (Vincular participantes a las callejoneadas)
    console.log('--- Vinculando Participantes ---');
    // Callejoneada 1 -> Juan (1), María (2), Roberto (3)
    await runAsync('INSERT INTO callejoneada_personal (callejoneada_id, personal_id) VALUES (1, 1), (1, 2), (1, 3)');
    // Callejoneada 2 -> Jose (4), Roberto (3)
    await runAsync('INSERT INTO callejoneada_personal (callejoneada_id, personal_id) VALUES (2, 4), (2, 3)');
    // Callejoneada 3 -> María (2), Jose (4)
    await runAsync('INSERT INTO callejoneada_personal (callejoneada_id, personal_id) VALUES (3, 2), (3, 4)');
    console.log('✅ Participantes vinculados.');

    // ACTIVIDADES
    const activities = [
      ['Sistema inicializado con datos de prueba completos', 'info'],
      ['Se vincularon participantes a las callejoneadas', 'success']
    ];
    for (const a of activities) {
      await runAsync('INSERT INTO activity (text, type) VALUES (?, ?)', a);
    }

    console.log('\n✨ Proceso de carga completado exitosamente.');
    db.close();
  } catch (err) {
    console.error('❌ Error durante el proceso:', err.message);
    db.close();
    process.exit(1);
  }
}

cleanAndSeed();
