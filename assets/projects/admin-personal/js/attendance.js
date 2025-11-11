const db = firebase.firestore();
let editingEventId = null;

// 🔁 Cargar eventos al iniciar
window.onload = () => {
  loadEvents();
};

// ✅ Registrar o editar evento
document.getElementById("eventForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const date = document.getElementById("date").value;
  const type = document.getElementById("type").value;
  const details = document.getElementById("details").value;

  if (editingEventId) {
    // ✏️ Editar evento existente
    db.collection("events").doc(editingEventId).update({
      name,
      date,
      type,
      details,
      editedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      alert("✅ Event updated!");
      editingEventId = null;
      document.getElementById("eventForm").reset();
      document.querySelector("#eventForm button[type='submit']").textContent = "Submit";
      loadEvents();
    }).catch((error) => {
      console.error("❌ Error updating event:", error);
      alert("Error updating event.");
    });
  } else {
    // ➕ Registrar nuevo evento
    db.collection("events").add({
      name,
      date,
      type,
      details,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      alert("✅ Event saved!");
      document.getElementById("eventForm").reset();
      loadEvents();
    }).catch((error) => {
      console.error("❌ Error saving event:", error);
      alert("Error saving event.");
    });
  }
});

// ✅ Cargar eventos en la tabla
function loadEvents(events = null) {
  const tbody = document.getElementById("eventTableBody");
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
        <td>
          <button onclick="editEvent('${doc.id}', '${data.name}', '${data.date}', '${data.type}', '${data.details || ""}')">Editar</button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  });
}

// ✏️ Función para editar evento (rellena el formulario)
function editEvent(id, name, date, type, details) {
  editingEventId = id;

  document.getElementById("name").value = name;
  document.getElementById("date").value = date;
  document.getElementById("type").value = type;
  document.getElementById("details").value = details;

  document.querySelector("#eventForm button[type='submit']").textContent = "Update";
}

// 🔎 Aplicar filtros
function applyFilters() {
  const nameFilter = document.getElementById("filterName").value.toLowerCase();
  const dateFilter = document.getElementById("filterDate").value;
  const typeFilter = document.getElementById("filterType").value;

  db.collection("events").orderBy("timestamp", "desc").get().then((querySnapshot) => {
    const filtered = querySnapshot.docs.filter(doc => {
      const data = doc.data();
      return (
        (!nameFilter || data.name.toLowerCase().includes(nameFilter)) &&
        (!dateFilter || data.date === dateFilter) &&
        (!typeFilter || data.type === typeFilter)
      );
    });
    loadEvents(filtered);
  });
}

// 🧹 Limpiar filtros
function clearFilters() {
  document.getElementById("filterName").value = "";
  document.getElementById("filterDate").value = "";
  document.getElementById("filterType").value = "";
  loadEvents();
}

// 🔁 Redirección
function goTo(page) {
  window.location.href = page;
}
