const form = document.getElementById("memoForm");
const steps = [...document.querySelectorAll(".step")];
const nextButtons = [...document.querySelectorAll(".next")];
const dots = [...document.querySelectorAll(".step-dots span")];
const stepText = document.getElementById("stepText");
const progressBar = document.getElementById("progressBar");
const statusBox = document.getElementById("status");
let currentStep = 0;

function showStep(index) {
  currentStep = index;
  steps.forEach((step, i) => step.classList.toggle("active", i === index));
  dots.forEach((dot, i) => dot.classList.toggle("active", i <= index));
  stepText.textContent = `${index + 1} of 3`;
  progressBar.style.width = `${((index + 1) / 3) * 100}%`;
  statusBox.textContent = "";
}

nextButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const fields = steps[currentStep].querySelectorAll("input, textarea");
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return;
      }
    }
    showStep(currentStep + 1);
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fields = steps[currentStep].querySelectorAll("input, textarea");
  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return;
    }
  }

  const button = document.getElementById("resetButton");
  button.disabled = true;
  button.textContent = "Resetting...";

  const payload = {
    name: document.getElementById("field1").value.trim(),
    email: document.getElementById("field2").value.trim(),
    subject: document.getElementById("field3").value.trim(),
    message: document.getElementById("field4").value.trim()
  };

  try {
    const response = await fetch("/api/memos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to save the form.");
    window.location.href = "reset-success.html";
  } catch (error) {
    statusBox.className = "status error";
    statusBox.textContent = error.message || "Something went wrong.";
    button.disabled = false;
    button.textContent = "Reset";
  }
});

showStep(0);
