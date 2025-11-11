const giftBox = document.getElementById('giftBox');
const message = document.getElementById('message');
const bgParticles = document.getElementById('backgroundParticles');

// Sonido pop
const popSound = new Audio('js/pop.mp3');

// Crear partículas de fondo suaves
for (let i = 0; i < 30; i++) createBackgroundParticle();

function createBackgroundParticle() {
  const p = document.createElement('div');
  p.classList.add('particle');
  p.style.left = Math.random() * window.innerWidth + 'px';
  p.style.bottom = Math.random() * window.innerHeight + 'px';
  p.style.width = p.style.height = 5 + Math.random()*5 + 'px';
  p.style.animationDuration = 5 + Math.random()*5 + 's';
  bgParticles.appendChild(p);
}

giftBox.addEventListener('click', () => {
  // Pop
  popSound.currentTime = 0; 
  popSound.play();

  // Rebote
  giftBox.classList.add('bounce');
  setTimeout(() => giftBox.classList.remove('bounce'), 400);

  // Abrir
  giftBox.classList.add('open');

  // Corazones
  setTimeout(() => {
    for (let i = 0; i < 20; i++) createHeart();
  }, 300);

  // Destellos
  setTimeout(() => {
    for (let i = 0; i < 7; i++) createSparkle();
  }, 300);

  // Mostrar mensaje y botón
  setTimeout(() => message.classList.add('show'), 500);
});

function createHeart() {
  const heart = document.createElement('div');
  heart.classList.add('heart');

  const boxWidth = giftBox.offsetWidth;
  const boxHeight = giftBox.offsetHeight;
  const startX = Math.random() * boxWidth - boxWidth / 2;
  const startY = Math.random() * boxHeight - boxHeight / 2;

  heart.style.left = `calc(50% + ${startX}px)`;
  heart.style.bottom = `${startY}px`;

  const xEnd = startX + (Math.random() * 200 - 100);
  const yEnd = startY - (150 + Math.random() * 100);

  heart.style.setProperty('--x', `${xEnd}px`);
  heart.style.setProperty('--y', `${yEnd}px`);
  heart.style.setProperty('--x-end', `${xEnd + (Math.random()*40 - 20)}px`);
  heart.style.setProperty('--y-end', `${yEnd + (Math.random()*20 - 10)}px`);

  const size = 15 + Math.random() * 15;
  heart.style.width = heart.style.height = `${size}px`;

  const duration = 1.5 + Math.random() * 1.5;
  heart.style.animationDuration = `${duration}s`;

  giftBox.parentElement.appendChild(heart);

  setTimeout(() => heart.remove(), duration*1000);
}

function createSparkle() {
  const sparkle = document.createElement('div');
  sparkle.classList.add('sparkle');

  const offsetX = Math.random()*160 - 80;
  const offsetY = Math.random()*160 - 80;

  sparkle.style.left = `calc(50% + ${offsetX}px)`;
  sparkle.style.bottom = `${offsetY}px`;

  const duration = 0.8 + Math.random()*0.7;
  sparkle.style.animationDuration = `${duration}s`;

  giftBox.parentElement.appendChild(sparkle);

  setTimeout(() => sparkle.remove(), duration*1000);
}
