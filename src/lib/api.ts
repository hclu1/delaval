// src/lib/api.ts
/**
 * API Client Abstraction
 * Connects to the local Option B backend (Node.js + SQLite).
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('authToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    let errMessage = 'Erreur API';
    try {
      const err = await response.json();
      errMessage = err.error || errMessage;
    } catch(e) {}
    throw new Error(errMessage);
  }
  return response.json();
}

export const api = {
  auth: {
    signIn: async (credentials: { clientName?: string; clientNumber?: string }) => {
      const data = await fetchAPI('/auth/signin', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      if (data.token) localStorage.setItem('authToken', data.token);
      return data.user;
    },
    signInWithGoogle: async (credentials: { token: string }) => {
      const data = await fetchAPI('/auth/google', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      if (data.token) localStorage.setItem('authToken', data.token);
      return data.user;
    },
    signOut: async () => {
      localStorage.removeItem('authToken');
    },
    refreshUser: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return null;
      try {
        const data = await fetchAPI('/auth/me');
        return data.user;
      } catch (error) {
        return null;
      }
    }
  },
  entities: {
    machines: {
      list: async (params?: any) => {
        const query = params?.clientId ? `?clientId=${params.clientId}` : '';
        const data = await fetchAPI(`/machines${query}`);
        const list = (data.list || []).map((m: any) => ({ ...m, _id: m.id }));
        return { list };
      },
      get: async (id: string) => {
        const m = await fetchAPI(`/machines/${id}`);
        return m ? { ...m, _id: m.id } : null;
      },
      create: async (data: any) => {
        const m = await fetchAPI('/machines', { method: 'POST', body: JSON.stringify(data) });
        return m ? { ...m, _id: m.id } : null;
      },
      update: async (id: string, data: any) => {
        const m = await fetchAPI(`/machines/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        return m ? { ...m, _id: m.id } : null;
      },
      delete: async (id: string) => fetchAPI(`/machines/${id}`, { method: 'DELETE' }),
    },
    clients: {
      list: async (params?: any) => {
        const data = await fetchAPI('/clients');
        let list = data.list || [];
        if (params?.filter?.email) {
          list = list.filter((c: any) => c.email === params.filter.email);
        }
        list = list.map((c: any) => ({ ...c, _id: c.id }));
        return { list };
      },
      get: async (id: string) => {
        const c = await fetchAPI(`/clients/${id}`);
        return c ? { ...c, _id: c.id } : null;
      },
      create: async (data: any) => {
        const c = await fetchAPI('/clients', { method: 'POST', body: JSON.stringify(data) });
        return c ? { ...c, _id: c.id } : null;
      },
      update: async (id: string, data: any) => {
        const c = await fetchAPI(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        return c ? { ...c, _id: c.id } : null;
      },
      delete: async (id: string) => fetchAPI(`/clients/${id}`, { method: 'DELETE' }),
    },
    // The rest remains mocked until the backend implements them
    interventions: {
      list: async (params?: any) => {
        const query = params?.clientId ? `?clientId=${params.clientId}` : '';
        const data = await fetchAPI(`/interventions${query}`);
        const list = (data.list || []).map((i: any) => {
          let parsed = i;
          try { if (i.donneesTechniques) parsed = { ...i, ...JSON.parse(i.donneesTechniques) }; } catch(e){}
          return { ...parsed, _id: i.id };
        });
        return { list };
      },
      get: async (id: string) => {
        const i = await fetchAPI(`/interventions/${id}`);
        if (!i) return null;
        let parsed = i;
        try { if (i.donneesTechniques) parsed = { ...i, ...JSON.parse(i.donneesTechniques) }; } catch(e){}
        return { ...parsed, _id: i.id };
      },
      create: async (data: any) => {
        const i = await fetchAPI('/interventions', { method: 'POST', body: JSON.stringify(data) });
        return i ? { ...i, _id: i.id } : null;
      },
      update: async (id: string, data: any) => {
        const i = await fetchAPI(`/interventions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        return i ? { ...i, _id: i.id } : null;
      },
      delete: async (id: string) => fetchAPI(`/interventions/${id}`, { method: 'DELETE' }),
    },
    utilisateurs: {
      list: async (params?: any) => { return { list: [] }; },
      get: async (id: string) => { return null; },
      create: async (data: any) => { return { _id: 'new-id' }; },
      update: async (id: string, data: any) => { return { _id: id }; },
      delete: async (id: string) => { return true; },
    },
    error_codes: {
      list: async (params?: any) => {
        const data = await fetchAPI('/error_codes');
        return { list: (data.list || []).map((m: any) => ({ ...m, _id: m.id })) };
      },
      get: async (id: string) => {
        const m = await fetchAPI(`/error_codes/${id}`);
        return m ? { ...m, _id: m.id } : null;
      },
      create: async (data: any) => {
        const m = await fetchAPI('/error_codes', { method: 'POST', body: JSON.stringify(data) });
        return m ? { ...m, _id: m.id } : null;
      },
      update: async (id: string, data: any) => {
        const m = await fetchAPI(`/error_codes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        return m ? { ...m, _id: m.id } : null;
      },
      delete: async (id: string) => fetchAPI(`/error_codes/${id}`, { method: 'DELETE' }),
    },
    user_connections: {
      list: async (params?: any) => { return { list: [] }; },
    },
    notifications: {
      list: async (params?: any) => { return { list: [] }; },
      get: async (id: string) => { return null; },
      create: async (data: any) => { return { _id: 'new-id' }; },
      update: async (id: string, data: any) => { return { _id: id }; },
      delete: async (id: string) => { return true; },
    },
    spare_parts: {
      list: async (params?: any) => {
        const data = await fetchAPI('/spare_parts');
        let list = data.list || [];
        return { list: list.map((item: any) => ({ ...item, _id: item.id })) };
      },
      get: async (id: string) => {
        const m = await fetchAPI(`/spare_parts/${id}`);
        return m ? { ...m, _id: m.id } : null;
      },
      create: async (data: any) => {
        const m = await fetchAPI('/spare_parts', { method: 'POST', body: JSON.stringify(data) });
        return m ? { ...m, _id: m.id } : null;
      },
      update: async (id: string, data: any) => {
        const m = await fetchAPI(`/spare_parts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        return m ? { ...m, _id: m.id } : null;
      },
      delete: async (id: string) => fetchAPI(`/spare_parts/${id}`, { method: 'DELETE' }),
    },
    intervention_parts: {
      list: async (params?: any) => { return { list: [] }; }
    },
    machine_fields: {
      list: async (params?: any) => {
        const query = params?.where ? `?where=${encodeURIComponent(JSON.stringify(params.where))}` : '';
        const data = await fetchAPI(`/machine_fields${query}`);
        return { list: Array.isArray(data) ? data : (data.list || []) };
      },
      get: async (id: string) => fetchAPI(`/machine_fields/${id}`),
      create: async (data: any) => fetchAPI('/machine_fields', { method: 'POST', body: JSON.stringify(data) }),
      update: async (id: string, data: any) => fetchAPI(`/machine_fields/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: async (id: string) => fetchAPI(`/machine_fields/${id}`, { method: 'DELETE' }),
    },
    clientmessages: {
      list: async (params?: any) => { return { list: [] }; },
      get: async (id: string) => { return null; },
      create: async (data: any) => { return { _id: 'new-id' }; },
      update: async (id: string, data: any) => { return { _id: id }; },
      delete: async (id: string) => { return true; },
    },
    machine_field_options: {
      list: async (params?: any) => {
        const query = params?.where ? `?where=${encodeURIComponent(JSON.stringify(params.where))}` : '';
        const data = await fetchAPI(`/machine_field_options${query}`);
        return { list: Array.isArray(data) ? data : (data.list || []) };
      },
      get: async (id: string) => fetchAPI(`/machine_field_options/${id}`),
      create: async (data: any) => fetchAPI('/machine_field_options', { method: 'POST', body: JSON.stringify(data) }),
      update: async (id: string, data: any) => fetchAPI(`/machine_field_options/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: async (id: string) => fetchAPI(`/machine_field_options/${id}`, { method: 'DELETE' }),
    },
    maintenance_kits: {
      list: async (params?: any) => {
        let query = '';
        if (params?.where) {
          query = `?where=${encodeURIComponent(JSON.stringify(params.where))}`;
        }
        const data = await fetchAPI(`/maintenance_kits${query}`);
        return { list: Array.isArray(data) ? data : (data.list || []) };
      },
      get: async (id: string) => fetchAPI(`/maintenance_kits/${id}`),
      create: async (data: any) => fetchAPI('/maintenance_kits', { method: 'POST', body: JSON.stringify(data) }),
      update: async (id: string, data: any) => fetchAPI(`/maintenance_kits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: async (id: string) => fetchAPI(`/maintenance_kits/${id}`, { method: 'DELETE' }),
    },
    taches_entretien: {
      list: async (params?: any) => {
        let query = '';
        if (params?.kitId) {
          query = `?kitId=${encodeURIComponent(params.kitId)}`;
        }
        const data = await fetchAPI(`/taches_entretien${query}`);
        return { list: data.list || [] };
      }
    },
    translations: {
      list: async (params?: any) => { return { list: [] }; },
      get: async (id: string) => { return null; },
      create: async (data: any) => { return { _id: 'new-id' }; },
      update: async (id: string, data: any) => { return { _id: id }; },
      delete: async (id: string) => { return true; },
    },
    languages: {
      list: async (params?: any) => { return { list: [{ code: 'fr', name: 'Français', isDefault: true }] }; },
      get: async (id: string) => { return null; },
      create: async (data: any) => { return { _id: 'new-id' }; },
      update: async (id: string, data: any) => { return { _id: id }; },
      delete: async (id: string) => { return true; },
    }
  },
  utils: {
    parsePdf: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_BASE_URL}/parse-pdf`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'analyse du PDF');
      }
      return response.json();
    }
  }
};
