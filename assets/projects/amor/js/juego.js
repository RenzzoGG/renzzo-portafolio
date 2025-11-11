class Puzzle {
  constructor(containerId, imgPath) {
    this.container = document.getElementById(containerId);
    this.imgPath = imgPath;
    this.ROWS = 3;
    this.COLS = 3;
    this.pieces = [];
    this.completed = false;

    this.init();
  }

  init() {
    for(let r=0; r<this.ROWS; r++){
      for(let c=0; c<this.COLS; c++){
        const piece = document.createElement("div");
        piece.classList.add("piece");
        piece.style.backgroundImage = `url('${this.imgPath}')`;
        piece.style.backgroundPosition = `-${c*110}px -${r*110}px`;
        piece.setAttribute("data-pos", `${r}-${c}`);
        piece.draggable = true;
        this.container.appendChild(piece);
        this.pieces.push(piece);
      }
    }

    this.pieces.sort(() => Math.random() - 0.5).forEach(p => this.container.appendChild(p));

    let dragged = null;
    this.pieces.forEach(piece => {
      piece.addEventListener("dragstart", e => dragged = piece);
      piece.addEventListener("dragover", e => e.preventDefault());
      piece.addEventListener("drop", e => this.swapPieces(dragged, piece));

      // Touch
      piece.addEventListener("touchstart", e => dragged = piece);
      piece.addEventListener("touchend", e => {
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if(target && target.classList.contains("piece")) this.swapPieces(dragged, target);
      });
    });
  }

  swapPieces(p1, p2){
    const temp = p1.style.backgroundPosition;
    p1.style.backgroundPosition = p2.style.backgroundPosition;
    p2.style.backgroundPosition = temp;
    this.checkPuzzle();
  }

  checkPuzzle() {
    let correct = true;
    this.pieces.forEach(piece => {
      const [r,c] = piece.getAttribute("data-pos").split("-");
      const [bgX,bgY] = piece.style.backgroundPosition.replace("px","").split(" ");
      if(parseInt(bgX) != -c*110 || parseInt(bgY) != -r*110) correct = false;
    });

    if(correct && !this.completed){
      this.completed = true;
      showHearts(15);
      checkWin();
    }
  }
}

const puzzle1 = new Puzzle("puzzle-container-1", "./img/puzzle-1.jpg");
const puzzle2 = new Puzzle("puzzle-container-2", "./img/puzzle-2.jpg");
const mensajeFinal = document.getElementById("mensaje-final");
const ganasteText = document.getElementById("ganaste-text");

function checkWin() {
  if(puzzle1.completed && puzzle2.completed){
    ganasteText.classList.remove("hidden");
    showHearts(30);
  }
}

function showHearts(count){
  for(let i=0; i<count; i++){
    const heart = document.createElement("div");
    heart.classList.add("heart");
    heart.style.left = Math.random() * window.innerWidth + "px";
    heart.style.top = Math.random() * window.innerHeight + "px";
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 2000);
  }
}

// Botón "Siguiente" siempre visible
const btnSiguiente = document.getElementById("btn-siguiente");
btnSiguiente.addEventListener("click", () => {
  window.location.href = "final.html";
});