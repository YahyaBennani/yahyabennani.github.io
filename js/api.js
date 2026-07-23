const api = {
  async get(path) {
    const res = await fetch(`${API_BASE_URL}${path}`, { credentials: "include" });
    if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `POST ${path} -> ${res.status}`);
    return data;
  },
  async put(path, body) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `PUT ${path} -> ${res.status}`);
    return data;
  },
  async del(path) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `DELETE ${path} -> ${res.status}`);
    return data;
  },
  async me() {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: "include" });
    return res.json();
  },
};
