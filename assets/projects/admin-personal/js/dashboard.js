// Verificar si el usuario ha iniciado sesión
const user = JSON.parse(localStorage.getItem("loggedInUser"));

if (!user) {
  alert("Please log in first.");
  window.location.href = "index.html";
} else {
  document.getElementById("username").textContent = user.username;
  document.getElementById("userRole").textContent = user.role;
}

// Mostrar solo la sección correspondiente al rol
switch (user.role) {
  case "admin":
    document.getElementById("adminSection").style.display = "block";
    break;
  case "manager":
    document.getElementById("managerSection").style.display = "block";
    break;
  case "executive":
    document.getElementById("executiveSection").style.display = "block";
    break;
}

// Redirigir a otras páginas
function goTo(page) {
  window.location.href = page;
}

// Cerrar sesión
function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "index.html";
}