// ✅ Inicializa Firestore
const db = firebase.firestore();

// 🔄 Cargar todos los eventos
function loadReports(events = null) {
  const tbody = document.getElementById("reportTableBody");
  tbody.innerHTML = "";

  const query = events
    ? Promise.resolve(events)
    : db.collection("events").orderBy("timestamp", "desc").get();

  query.then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${data.name}</td>
        <td>${data.date}</td>
        <td>${data.type}</td>
        <td>${data.details || ""}</td>
      `;
      tbody.appendChild(tr);
    });
  });
}

// 🔍 Aplicar filtros
function applyFilters() {
  const name = document.getElementById("filterName").value.toLowerCase();
  const date = document.getElementById("filterDate").value;
  const type = document.getElementById("filterType").value;

  db.collection("events").orderBy("timestamp", "desc").get().then((querySnapshot) => {
    const filtered = querySnapshot.docs.filter((doc) => {
      const data = doc.data();
      return (
        (!name || data.name.toLowerCase().includes(name)) &&
        (!date || data.date === date) &&
        (!type || data.type === type)
      );
    });
    loadReports(filtered);
  });
}

// 🔄 Limpiar filtros
function clearFilters() {
  document.getElementById("filterName").value = "";
  document.getElementById("filterDate").value = "";
  document.getElementById("filterType").value = "";
  loadReports();
}

// 🔁 Redirección
function goTo(page) {
  window.location.href = page;
}

// 📄 Exportar a PDF
function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 10;

  doc.setFontSize(12);
  doc.text("Event Report", 10, y);
  y += 10;

  const rows = document.querySelectorAll("#reportTableBody tr");
  rows.forEach((row) => {
    const cols = row.querySelectorAll("td");
    const line = Array.from(cols).map((td) => td.innerText).join(" | ");
    doc.text(line, 10, y);
    y += 10;
    if (y > 280) {
      doc.addPage();
      y = 10;
    }
  });

  doc.save("report.pdf");
}

// 📊 Exportar a Excel
function exportToExcel() {
  const rows = [["Employee", "Date", "Type", "Details"]];
  document.querySelectorAll("#reportTableBody tr").forEach((row) => {
    const cols = row.querySelectorAll("td");
    rows.push(Array.from(cols).map((td) => td.innerText));
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, "report.xlsx");
}

// 🔃 Cargar al iniciar
window.onload = () => {
  loadReports();
};

firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    alert("🚫 No hay sesión activa. Por favor inicia sesión.");
    window.location.href = "login.html";
  }
});

const role = localStorage.getItem("userRole");
if (!role) {
  alert("⚠️ No tienes permisos para acceder a esta página.");
  window.location.href = "login.html";
}

