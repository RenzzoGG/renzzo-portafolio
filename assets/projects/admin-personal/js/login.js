const authorizedEmails = {
  "beto.gutierrez@taurusbiogas.com": "admin",
  "pedro.torres@taurusbiogas.com": "manager",
  "sergio@sksgreen.com": "executive"
};

// ✅ Comprobación inicial: si ya está logueado, redirigir automáticamente
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    const email = user.email;
    if (authorizedEmails[email]) {
      const role = authorizedEmails[email];
      localStorage.setItem("userRole", role);
      localStorage.setItem("userEmail", email);
      console.log("🔁 Ya logueado, redirigiendo al dashboard...");
      window.location.href = "dashboard.html";
    } else {
      alert("❌ Este correo no está autorizado.");
      firebase.auth().signOut();
    }
  }
});

// 🧠 Evento para iniciar sesión si aún no estás logueado
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;

      if (authorizedEmails[email]) {
        const role = authorizedEmails[email];
        localStorage.setItem("userRole", role);
        localStorage.setItem("userEmail", email);

        console.log("✅ Logged in:", email);
        window.location.href = "dashboard.html";
      } else {
        alert("❌ Email no autorizado.");
        firebase.auth().signOut();
      }
    })
    .catch((error) => {
      console.error("❌ Login failed:", error.message);
      alert("Login failed. Please try again.");
    });
});