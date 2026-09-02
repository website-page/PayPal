const form = document.getElementById("memoForm");
const button = document.getElementById("sendButton");
const statusBox = document.getElementById("status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusBox.className = "status";
  statusBox.textContent = "";

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  button.disabled = true;
  button.textContent = "Sending...";

  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    const response = await fetch("/api/memos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to send memo.");

    form.reset();
    statusBox.className = "status success";
    statusBox.textContent = "Memo sent successfully.";
  } catch (error) {
    statusBox.className = "status error";
    statusBox.textContent = error.message || "Something went wrong.";
  } finally {
    button.disabled = false;
    button.textContent = "Send memo";
  }
});
