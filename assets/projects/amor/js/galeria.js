const cards = document.querySelectorAll(".card");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const modalVideo = document.getElementById("modal-video");
const modalMessage = document.getElementById("modal-message");
const closeModal = document.querySelector(".close");

const musicBtn = document.getElementById("music-btn");
const bgMusic = document.getElementById("background-music");
let musicPlaying = false;

const icons = ["📷","🎬","💌","❤️","🌹","🎵"];

// Inicialización de cartas con animación y iconos aleatorios
cards.forEach((card, index) => {
  const front = card.querySelector(".card-front");
  front.textContent = icons[Math.floor(Math.random() * icons.length)];

  setTimeout(() => {
    card.style.opacity = 1;
    card.style.transform = "translateY(0)";
  }, index * 100);

  card.addEventListener("click", () => openCardModal(card));
});

function openCardModal(card) {
  card.classList.add("open"); // Abre el flap del sobre

  setTimeout(() => {
    const type = card.getAttribute("data-type");
    const src = card.getAttribute("data-src");
    const message = card.getAttribute("data-message");

    modalMessage.textContent = "";
    modal.style.display = "flex";

    if(type === "img") {
      modalImg.src = src;
      modalImg.style.display = "block";
      modalImg.style.maxWidth = "90vw";
      modalImg.style.maxHeight = "80vh";
      modalVideo.style.display = "none";
      modalVideo.pause();
      modalVideo.src = "";
    } else {
      modalVideo.src = src;
      modalVideo.style.display = "block";
      modalVideo.style.maxWidth = "90vw";
      modalVideo.style.maxHeight = "80vh";
      modalImg.style.display = "none";
    }

    typeWriter(message, modalMessage, 30);
  }, 800); // Espera la duración de la animación del flap
}

// Al cerrar modal, la carta vuelve a cerrarse
closeModal.addEventListener("click", () => {
  modal.style.display = "none";
  modalVideo.pause();
  modalVideo.src = "";
  cards.forEach(card => card.classList.remove("open"));
});


// Animación de máquina de escribir
function typeWriter(text, element, speed) {
  let i = 0;
  element.textContent = "";
  clearInterval(element.timer);
  element.timer = setInterval(() => {
    element.textContent += text.charAt(i);
    i++;
    if(i >= text.length) clearInterval(element.timer);
  }, speed);
}

// Botón de música
musicBtn.addEventListener("click", () => {
  if(!musicPlaying) {
    bgMusic.play();
    musicPlaying = true;
    musicBtn.style.backgroundColor = "#d63384";
  } else {
    bgMusic.pause();
    musicPlaying = false;
    musicBtn.style.backgroundColor = "#ff8abf";
  }
});
