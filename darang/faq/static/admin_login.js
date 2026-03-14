const loginForm = document.getElementById("loginForm");
const employeeIdInput = document.getElementById("employeeId");
const passwordInput = document.getElementById("password");
const errorText = document.getElementById("errorText");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorText.textContent = "";

  try {
    const response = await fetch("/admin/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: employeeIdInput.value.trim(),
        password: passwordInput.value.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error("관리자에게 문의하세요.");
    }

    window.location.href = "/admin";
  } catch (error) {
    const message = error.message || "관리자에게 문의하세요.";
    errorText.textContent = message;
    window.alert(message);
  }
});
