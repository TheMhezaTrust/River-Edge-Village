async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (url, body) => request(url, { method: "PUT", body: body instanceof FormData ? body : JSON.stringify(body) }),
  del: (url) => request(url, { method: "DELETE" }),
};
