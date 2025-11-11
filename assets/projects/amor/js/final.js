const mensajeFinal = `Todo esto que hice es por ti mi amor, tú eres la razón por la cual yo quiero esforzarme diariamente y ser alguien bueno para ti, tú vales la pena cada hora invertida en esto (14 horas).  
Eres lo mejor del mundo y esto es una prueba de ello.  
Siempre a tu lado - Renzzo, tu novio y tu futuro esposo y el que te mantendrá por toda la vida 💖`;

const mensajeContainer = document.getElementById("mensaje-final");
let index = 0;

// Animación de máquina de escribir
function typeWriter() {
  if(index < mensajeFinal.length){
    mensajeContainer.innerHTML += mensajeFinal.charAt(index);
    index++;
    setTimeout(typeWriter, 50); // velocidad de escritura
  }
}
typeWriter();

// Corazones flotando
function createHearts(count) {
  for(let i=0; i<count; i++){
    const heart = document.createElement("div");
    heart.classList.add("heart");
    heart.style.left = Math.random() * window.innerWidth + "px";
    heart.style.top = Math.random() * window.innerHeight + "px";
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 3000);
  }
}
setInterval(() => createHearts(3), 800);

// Control de música
const audio = document.getElementById("audio");
const btnMusica = document.getElementById("btn-musica");
let isPlaying = false;

// Intentar autoplay
window.addEventListener("load", () => {
  const playPromise = audio.play();
  if(playPromise !== undefined){
    playPromise.then(() => {
      isPlaying = true;
      btnMusica.textContent = "🔇";
    }).catch(() => {
      isPlaying = false;
      btnMusica.textContent = "🎵";
    });
  }
});

// Botón para reproducir/pausar
btnMusica.addEventListener("click", () => {
  if(isPlaying){
    audio.pause();
    isPlaying = false;
    btnMusica.textContent = "🎵";
  } else {
    audio.play();
    isPlaying = true;
    btnMusica.textContent = "🔇";
  }
});

