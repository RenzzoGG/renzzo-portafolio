// ===== PARTICLE ANIMATION =====
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const particlesArray = [];
const numberOfParticles = 80;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 3 + 1;
    this.speedX = Math.random() * 1 - 0.5;
    this.speedY = Math.random() * 1 - 0.5;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.size > 0.2) this.size -= 0.01;

    if (this.x < 0) this.x = canvas.width;
    if (this.x > canvas.width) this.x = 0;
    if (this.y < 0) this.y = canvas.height;
    if (this.y > canvas.height) this.y = 0;
  }

  draw() {
    ctx.fillStyle = "#00c3ff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
}

function initParticles() {
  particlesArray.length = 0;
  for (let i = 0; i < numberOfParticles; i++) {
    particlesArray.push(new Particle());
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < particlesArray.length; i++) {
    particlesArray[i].update();
    particlesArray[i].draw();
  }
  requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

// ===== SMOOTH SCROLL =====
const links = document.querySelectorAll("nav a");

links.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute("href"));
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// ===== SCROLL REVEAL =====
const revealElements = document.querySelectorAll(".about, .projects, .contact");

function revealOnScroll() {
  const windowHeight = window.innerHeight;

  revealElements.forEach((el) => {
    const revealTop = el.getBoundingClientRect().top;
    if (revealTop < windowHeight - 100) {
      el.classList.add("reveal-visible");
    }
  });
}


window.addEventListener("scroll", revealOnScroll);

// ===== STACK: hover tilt + tooltip =====
const stackItems = document.querySelectorAll('.stack-item');
const tooltip = document.getElementById('stackTooltip');

stackItems.forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const cx = rect.width / 2, cy = rect.height / 2;
    const rotateX = ((y - cy) / cy) * -6; // tilt
    const rotateY = ((x - cx) / cx) * 6;
    card.style.transform = `translateY(-6px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

    // spotlight follow
    card.style.setProperty('--mx', `${(x / rect.width) * 100}%`);
    card.style.setProperty('--my', `${(y / rect.height) * 100}%`);
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });

  card.addEventListener('mouseenter', () => {
    if (tooltip) {
      tooltip.textContent = card.dataset.name || 'Tech';
      tooltip.style.opacity = '1';
    }
  });
});

// mover tooltip global
document.addEventListener('mousemove', (e) => {
  if (!tooltip) return;
  tooltip.style.left = `${e.clientX}px`;
  tooltip.style.top = `${e.clientY}px`;
});

// reveal on scroll incluye .stack
const revealTargets = document.querySelectorAll('.about, .projects, .contact, .stack');
function revealOnScrollPlus() {
  const windowH = window.innerHeight;
  revealTargets.forEach((el) => {
    const top = el.getBoundingClientRect().top;
    if (top < windowH - 100) el.classList.add('reveal-visible');
  });
}
window.addEventListener('scroll', revealOnScrollPlus);
revealOnScrollPlus(); // revela lo que ya esté a la vista

// ===== SCROLL REVEAL PREMIUM =====
const reveals = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      // Quitar para que no desaparezca al subir
      // revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.18, // aparece cuando el 18% está en pantalla
  rootMargin: "0px 0px -50px 0px"
});

reveals.forEach(el => revealObserver.observe(el));

const projectCards = document.querySelectorAll(".project-card");

function revealProjects() {
  const windowHeight = window.innerHeight;

  projectCards.forEach(card => {
    const top = card.getBoundingClientRect().top;
    if (top < windowHeight - 80) {
      card.classList.add("reveal-visible");
    }
  });
}

window.addEventListener("scroll", revealProjects);
revealProjects();

// ===== EMAILJS CONTACT FORM =====
emailjs.init("FD8yt-LzhsSqqmbj-"); // Public Key

document.getElementById("contactForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const sendBtn = document.getElementById("sendBtn");
  const status = document.getElementById("formStatus");

  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";

  const templateParams = {
    user_name: document.getElementById("name").value,
    user_email: document.getElementById("email").value,
    message: document.getElementById("message").value,
  };

  emailjs.send("service_dze25k6", "template_zxp29u2", templateParams)
    .then(() => {
      status.textContent = "Message sent successfully! 🎉";
      status.style.color = "#00ff9d";
      sendBtn.textContent = "Sent!";
      document.getElementById("contactForm").reset();

      setTimeout(() => {
        status.textContent = "";
        sendBtn.textContent = "Send Message";
        sendBtn.disabled = false;
      }, 3000);
    })
    .catch(() => {
      status.textContent = "Something went wrong. Try again!";
      status.style.color = "#ff4a4a";
      sendBtn.textContent = "Send Message";
      sendBtn.disabled = false;
    });
});



