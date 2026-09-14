const api = {
  async request(path, method = 'GET', body) {
    const options = { method, credentials: 'include' };
    if (body !== undefined) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 429) {
        const seconds = Number(response.headers.get('Retry-After') || data.retry_after);
        throw new Error(Number.isFinite(seconds) && seconds > 0 ? `Too many requests. Try again in ${Math.ceil(seconds)} seconds.` : 'Too many requests. Please try again later.');
      }
      throw new Error(data.error || `Request failed (${response.status}).`);
    }
    return data;
  },
  get(path) { return this.request(path); },
  post(path, body) { return this.request(path, 'POST', body); },
  put(path, body) { return this.request(path, 'PUT', body); },
  del(path) { return this.request(path, 'DELETE'); },
  me() { return this.request('/api/auth/me'); },
};
