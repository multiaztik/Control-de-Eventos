// Configuración base de la API
const API_BASE_URL = '/api';

// Cliente HTTP genérico
class ApiClient {
  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        // Intentar parsear JSON de error, si no, construir uno simple
        let errorPayload = {};
        try {
          errorPayload = await response.json();
        } catch (_) {
          /* noop */
        }
        const msg = errorPayload.error || `Error ${response.status}`;
        throw new Error(msg);
      }

      // Para endpoints JSON (todos los que usamos aquí)
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  static async get(endpoint) {
    return this.request(endpoint);
  }

  static async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
    });
  }

  static async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
    });
  }

  static async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

// Helpers
const buildQuery = (paramsObj = {}) => {
  const params = new URLSearchParams();
  Object.entries(paramsObj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.append(k, v);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

// Servicios específicos para cada módulo
export const PersonalAPI = {
  getAll: () => ApiClient.get('/personal'),
  getById: (id) => ApiClient.get(`/personal/${id}`),
  create: (data) => ApiClient.post('/personal', data),
  update: (id, data) => ApiClient.put(`/personal/${id}`, data),
  delete: (id) => ApiClient.delete(`/personal/${id}`),

  // Histórico de callejoneadas por persona
  getHistorico: ({ desde, hasta } = {}) =>
    ApiClient.get(`/personal/historico${buildQuery({ desde, hasta })}`),

  // Descargar Plantilla Excel
  descargarPlantilla: async () => {
    const res = await fetch(`${API_BASE_URL}/personal/plantilla-xlsx`);
    if (!res.ok) throw new Error('Error descargando plantilla');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_personal.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // Carga Masiva desde Excel
  cargaMasiva: async (file) => {
    const formData = new FormData();
    formData.append('archivo', file);
    const res = await fetch(`${API_BASE_URL}/personal/carga-masiva`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Error ${res.status}` }));
      throw new Error(err.error || `Error ${res.status}`);
    }
    return await res.json();
  }
};

export const CallejoneadasAPI = {
  getAll: () => ApiClient.get('/callejoneadas'),
  getById: (id) => ApiClient.get(`/callejoneadas/${id}`),
  create: (data) => ApiClient.post('/callejoneadas', data),
  update: (id, data) => ApiClient.put(`/callejoneadas/${id}`, data),
  delete: (id) => ApiClient.delete(`/callejoneadas/${id}`),
  getPersonalDisponible: () => ApiClient.get('/callejoneadas/personal-disponible'),
  getReporte: () => ApiClient.get('/callejoneadas/reporte'),

  // Listado filtrado avanzado
  getFiltrado: (filtros = {}) =>
    ApiClient.get(`/callejoneadas/filtrar${buildQuery(filtros)}`),

  // Nota: el XLSX se descarga con fetch/Blob desde el front (no por ApiClient)
};

// Función para verificar la conexión con el backend
export const checkConnection = async () => {
  try {
    const response = await ApiClient.get('/test');
    return { connected: true, data: response };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

export default ApiClient;
