// Selección de elementos
const flap = document.querySelector('.flap');
const letter = document.querySelector('.letter');
const openBtn = document.getElementById('openBtn');
const closeBtn = document.getElementById('closeBtn');
const nextBtn = document.getElementById('nextBtn');
const heartsContainer = document.querySelector('.hearts-container');

let typingTimeout;

// Música
const musica = new Audio('img/cancion.mp3');
musica.loop = true;

// Texto de la carta
const cartaText = `Hola mi amor, esta se suponía que seria en persona la carta pero la verdad quería ponerle un poco de mi toque personal y único que siento por ti pero también el esfuerzo que me gusta hacer cuando hago estas cosas, Quería empezar diciéndote que muchas gracias por aguantarme tantos años (2 años apenas) y que la verdad no paro de estar orgulloso y la felicidad que es nuestra relación del ver como desde muy pequeños (se podría decir) ya estamos construyendo nuestro futuro y mas principalmente juntos como pareja. También me quiero disculpar si últimamente no e sido el mejor novio por mis cambios repentinos de humor y te pido una disculpa por todo esto y quiero que sepas que nada fue por hacerte sentir mal ni nada por el estilo si no son problemas que ya te e contado que e estado pasando pero créeme que tu eres la única persona que puede calmarme en esos momentos difíciles para mi. quiero que sepas que para mi tu eres lo mas importante que tengo y que siempre tendré, eres la persona mas maravillosa que conozco y no paro de sentirme orgulloso de ti día a día viéndote convertirte en la persona que me va a mantener por toda la vida :3 (Es cura obviamente yo te mantendré a ti). Por el momento es todo de la carta pero espero disfrutes las demás cosas que te hice porque me esforcé mucho a tal punto que son las 4:37 de la mañana exactamente. Te amo con todo mi corazon nunca lo olvides :3`;

// Función para crear corazones
function createHeart() {
  const heart = document.createElement('div');
  heart.classList.add('heart');
  heart.style.left = Math.random() * (heartsContainer.offsetWidth - 20) + "px";
  heart.style.top = Math.random() * (heartsContainer.offsetHeight - 20) + "px";
  heartsContainer.appendChild(heart);
  setTimeout(() => heart.remove(), 3000);
}

// Animación máquina de escribir con corazones
function typeWriter(text, container) {
  let i = 0;
  container.textContent = "";
  if (typingTimeout) clearTimeout(typingTimeout);

  function typing() {
    if (i < text.length) {
      container.textContent += text[i];
      i++;
      createHeart();
      typingTimeout = setTimeout(typing, 20);
    }
  }
  typing();
}

// Abrir carta
openBtn.addEventListener('click', () => {
  flap.style.transform = "translateX(-50%) rotateX(-160deg) scaleY(0.95)";
  letter.style.opacity = 1;
  typeWriter(cartaText, letter);
  openBtn.disabled = true;
  closeBtn.disabled = false;
  nextBtn.disabled = false;
  
  musica.play();
});

// Cerrar carta
closeBtn.addEventListener('click', () => {
  flap.style.transform = "translateX(-50%) rotateX(0deg) scaleY(1)";
  letter.style.opacity = 0;
  openBtn.disabled = false;
  closeBtn.disabled = true;
  nextBtn.disabled = true;

  if (typingTimeout) clearTimeout(typingTimeout);
  musica.pause();
  musica.currentTime = 0;
});

// Siguiente página
nextBtn.addEventListener('click', () => {
  musica.pause();
  musica.currentTime = 0;
  window.location.href = "galeria.html"; // Ajusta la ruta si es necesario
});
