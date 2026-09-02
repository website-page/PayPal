async function api(path, options = {}) {
  const token = sessionStorage.getItem("poleplus_token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed.");
  return data;
}

function showError(error) {
  const box = document.querySelector("#message");
  if (box) box.textContent = error.message;
}

document.querySelector("#loginForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const email = document.querySelector("#email").value.trim();
  const schoolName = document.querySelector("#schoolName").value.trim();
  try {
    const result = await api("/api/login", { method: "POST", body: JSON.stringify({ email, schoolName }) });
    sessionStorage.setItem("poleplus_token", result.token);
    location.href = "seat.html";
  } catch (error) { showError(error); }
});

document.querySelector("#seatForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const seatNumber = document.querySelector("#seatNumber").value.trim();
  try {
    await api("/api/verify-seat", { method: "POST", body: JSON.stringify({ seatNumber }) });
    location.href = "reset.html";
  } catch (error) { showError(error); }
});

document.querySelector("#foodForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const food = document.querySelector("#food").value.trim();
  const confirmFood = document.querySelector("#confirmFood").value.trim();
  try {
    await api("/api/reset-food", { method: "POST", body: JSON.stringify({ food, confirmFood }) });
    sessionStorage.removeItem("poleplus_token");
    location.href = "success.html";
  } catch (error) { showError(error); }
});
