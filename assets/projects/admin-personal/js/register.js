console.log("✅ register.js loaded");

document.getElementById("registerForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  // Lista de correos autorizados y su rol
  const allowedUsers = {
    "beto.gutierrez@taurusbiogas.com": "admin",
    "pedro.torres@taurusbiogas.com": "manager",
    "sergio@sksgreen.com": "executive"
  };

  // Validar si el correo está permitido
  if (!allowedUsers[email]) {
    alert("❌ This email is not authorized to register.");
    return;
  }

  try {
    // Registrar con Firebase Authentication
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    // Guardar el rol en Firestore
    await firebase.firestore().collection("users").doc(uid).set({
      email: email,
      role: allowedUsers[email]
    });

    alert("✅ User registered successfully!");
    window.location.href = "index.html"; // Redirige al login

  } catch (error) {
    console.error("❌ Registration error:", error);
    alert("❌ Error: " + error.message);
  }
});