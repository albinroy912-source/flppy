// ===== CANVAS SETUP =====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Set internal resolution
canvas.width = 400;
canvas.height = 600;

// ===== LOAD ASSETS =====
const birdImg = new Image(); birdImg.src = "bird.png";
const bgImg = new Image(); bgImg.src = "background.png";
const pipeImg = new Image(); pipeImg.src = "pipe.png";
const overImg = new Image(); overImg.src = "your_image.png"; 

const flapSnd = new Audio("flap.mp3");
const scoreSnd = new Audio("score.mp3");
const crashSnd = new Audio("crash.mp3");
const bgMusic = new Audio("background_music.mp3");

// Audio Settings
bgMusic.loop = true;
flapSnd.preload = "auto";
crashSnd.preload = "auto";

// ===== GAME STATE =====
let gameStarted = false;
let isGameOver = false;
let isWaitingForAudio = false; 
let score = 0;
let finalScore = 0;
let frame = 0;

const bird = { x: 80, y: 250, size: 40, velocity: 0, gravity: 0.35, jump: -7 };
let pipes = [];
const pipeWidth = 60;
const pipeGap = 180;

// ===== HELPER FUNCTIONS =====
function createPipe() {
  const topHeight = Math.floor(Math.random() * (canvas.height - pipeGap - 100)) + 50;
  pipes.push({ x: canvas.width, topHeight: topHeight, passed: false });
}

function resetGame() {
  bird.y = 250;
  bird.velocity = 0;
  pipes = [];
  score = 0;
  frame = 0;
  isGameOver = false;
  gameStarted = false; 
  isWaitingForAudio = false;
}

function checkCollision() {
  for (let pipe of pipes) {
    if (bird.x + bird.size > pipe.x && bird.x < pipe.x + pipeWidth &&
        (bird.y < pipe.topHeight || bird.y + bird.size > pipe.topHeight + pipeGap)) {
      return true;
    }
  }
  return (bird.y + bird.size >= canvas.height || bird.y <= 0);
}

// ===== DRAW FUNCTIONS =====
function drawStartScreen() {
  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.font = "bold 35px Arial";
  ctx.fillText("FLAPPY GAME", canvas.width / 2, 200);
  ctx.font = "20px Arial";
  ctx.fillText("Tap or Press Space to Start", canvas.width / 2, 300);
}

function drawGameOver() {
  ctx.drawImage(overImg, (canvas.width - 320) / 2, 80, 320, 320);
  ctx.fillStyle = "red";
  ctx.font = "bold 40px Arial";
  ctx.textAlign = "center";
  ctx.fillText("TOTAL SCORE: " + finalScore, canvas.width / 2, 460);
  
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  
  if (isWaitingForAudio) {
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText("Wait for it...", canvas.width / 2, 520);
  } else {
    ctx.fillStyle = "white";
    ctx.fillText("Tap or Space to Restart", canvas.width / 2, 520);
  }
}

// ===== MAIN GAME LOOP =====
function update() {
  if (isGameOver) {
    drawGameOver();
    requestAnimationFrame(update);
    return;
  }

  if (!gameStarted) {
    drawStartScreen();
    requestAnimationFrame(update);
    return;
  }

  // Check for hit
  if (checkCollision()) {
    isGameOver = true;
    isWaitingForAudio = true; 
    finalScore = score;
    
    bgMusic.pause();
    bgMusic.currentTime = 0;
    
    crashSnd.play().catch(() => { isWaitingForAudio = false; });

    // Step 1 Fix: Unlock after 1.5s regardless of audio length
    setTimeout(() => {
      isWaitingForAudio = false;
    }, 1500); 
    
    requestAnimationFrame(update);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

  // Bird Physics
  bird.velocity += bird.gravity;
  bird.y += bird.velocity;
  ctx.drawImage(birdImg, bird.x, bird.y, bird.size, bird.size);

  // Pipes Logic
  if (frame % 100 === 0) createPipe();
  frame++;

  for (let i = pipes.length - 1; i >= 0; i--) {
    let p = pipes[i];
    p.x -= 2.5;
    
    if (p.x + pipeWidth < 0) { 
        pipes.splice(i, 1); 
        continue; 
    }
    
    if (!p.passed && bird.x > p.x + pipeWidth) {
      score++;
      p.passed = true;
      scoreSnd.play().catch(() => {});
    }
    
    ctx.drawImage(pipeImg, p.x, 0, pipeWidth, p.topHeight); // Top
    ctx.drawImage(pipeImg, p.x, p.topHeight + pipeGap, pipeWidth, canvas.height); // Bottom
  }

  // Draw Score
  ctx.fillStyle = "white";
  ctx.font = "bold 30px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Score: " + score, 20, 50);

  requestAnimationFrame(update);
}

// ===== STEP 3: BUG-FREE INPUT HANDLING =====
function handleInput(e) {
  // Mobile Audio Policy Fix: Resume audio context on first tap
  if (window.AudioContext || window.webkitAudioContext) {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  if (isGameOver) {
    if (!isWaitingForAudio) resetGame();
  } else if (!gameStarted) {
    gameStarted = true;
    bgMusic.play().catch(() => {});
    bird.velocity = bird.jump;
    flapSnd.play().catch(() => {});
  } else {
    bird.velocity = bird.jump;
    flapSnd.currentTime = 0; 
    flapSnd.play().catch(() => {}); 
  }
}

// Mobile Touch (Step 3 Fix: preventDefault stops ghost clicks)
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    handleInput(e);
}, { passive: false });

// Laptop/Desktop Mouse
canvas.addEventListener("mousedown", (e) => {
    // Only handle mousedown if touch isn't used
    handleInput(e);
});

// Laptop Spacebar
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
      e.preventDefault(); // Stop page scrolling
      handleInput(e);
  }
});

// START
update();
