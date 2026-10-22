
const API_URL = "http://localhost:5000/api/v1";

console.log("API BASE URL:", API_URL);

export async function request(path, options = {}) {
  const url = `${API_URL}${path}`;

  console.log("REQUEST URL:", url);

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}
