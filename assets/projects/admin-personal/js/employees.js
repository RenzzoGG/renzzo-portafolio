// Verifica roles permitidos
const allowedRoles = ["admin", "manager"];
const userRole = localStorage.getItem("userRole");

if (!allowedRoles.includes(userRole)) {
  alert("Access denied.");
  window.location.href = "dashboard.html";
}

const db = firebase.firestore();

// Agregar empleado
document.getElementById("employeeForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const position = document.getElementById("position").value.trim();

  try {
    await db.collection("employees").add({ name, email, position });
    alert("Employee added!");
    document.getElementById("employeeForm").reset();
    loadEmployees(); // actualiza la tabla
  } catch (error) {
    console.error("Error adding employee:", error);
    alert("Error adding employee");
  }
});

// Cargar empleados al inicio
async function loadEmployees() {
  const tbody = document.getElementById("employeeTableBody");
  tbody.innerHTML = "";

  const snapshot = await db.collection("employees").get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const row = `
      <tr>
        <td>${data.name}</td>
        <td>${data.email}</td>
        <td>${data.position}</td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}

loadEmployees();

// Navegación simple
function goTo(page) {
  window.location.href = page;
}

function filterEmployees() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const rows = document.querySelectorAll("#employeeTableBody tr");

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    const match = [...cells].some(cell => 
      cell.textContent.toLowerCase().includes(search)
    );
    row.style.display = match ? "" : "none";
  });
}
