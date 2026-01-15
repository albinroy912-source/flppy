// ===== CANVAS SETUP =====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
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
bgMusic.loop = true;

// ===== GAME STATE =====
let gameStarted = false;
let isGameOver = false;
let isWaitingForAudio = false; 
let score = 0;
let finalScore = 0;
let highScore = localStorage.getItem("flappyHighScore") || 0;

// Time-based movement variables
let lastTime = 0;
const targetFPS = 60; 
let pipeSpawnTimer = 0;

const bird = { x: 80, y: 250, size: 40, velocity: 0, gravity: 0.35, jump: -7 };
let pipes = [];
const pipeWidth = 60;
const pipeGap = 180;

function createPipe() {
  const topHeight = Math.floor(Math.random() * (canvas.height - pipeGap - 100)) + 50;
  pipes.push({ x: canvas.width, topHeight: topHeight, passed: false });
}

function resetGame() {
  bird.y = 250;
  bird.velocity = 0;
  pipes = [];
  score = 0;
  pipeSpawnTimer = 0;
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
  ctx.font = "22px Arial";
  ctx.fillText("BEST SCORE: " + highScore, canvas.width / 2, 260);
  ctx.font = "20px Arial";
  ctx.fillText("Tap or Space to Start", canvas.width / 2, 340);
}

function drawGameOver() {
  ctx.drawImage(overImg, (canvas.width - 320) / 2, 80, 320, 320);
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.font = "bold 30px Arial";
  ctx.fillText("SCORE: " + finalScore, canvas.width / 2, 430);
  ctx.fillStyle = "#FFD700"; 
  ctx.fillText("BEST: " + highScore, canvas.width / 2, 470);
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  if (isWaitingForAudio) {
    ctx.fillText("Wait for it...", canvas.width / 2, 530);
  } else {
    ctx.fillText("Tap or Space to Restart", canvas.width / 2, 530);
  }
}

// ===== UPDATED MAIN GAME LOOP (TIME-BASED) =====
function update(timestamp) {
  // Calculate Delta Time (time between frames)
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  // Calculate speed adjustment (1.0 at 60fps, 0.5 at 120fps)
  const speedAdjust = isNaN(deltaTime) ? 1 : deltaTime / (1000 / targetFPS);

  // Prevent giant jumps if the user switches tabs
  if (deltaTime > 100) {
    requestAnimationFrame(update);
    return;
  }

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

  if (checkCollision()) {
    isGameOver = true;
    isWaitingForAudio = true; 
    finalScore = score;
    if (finalScore > highScore) {
        highScore = finalScore;
        localStorage.setItem("flappyHighScore", highScore);
    }
    bgMusic.pause();
    bgMusic.currentTime = 0;
    crashSnd.play().catch(() => { isWaitingForAudio = false; });
    setTimeout(() => { isWaitingForAudio = false; }, 1500); 
    requestAnimationFrame(update);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

  // Apply speedAdjust to Bird Physics
  bird.velocity += bird.gravity * speedAdjust;
  bird.y += bird.velocity * speedAdjust;
  ctx.drawImage(birdImg, bird.x, bird.y, bird.size, bird.size);

  // Time-based pipe spawning (approx. every 100 "standard" frames)
  pipeSpawnTimer += 1 * speedAdjust;
  if (pipeSpawnTimer >= 100) {
    createPipe();
    pipeSpawnTimer = 0;
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    let p = pipes[i];
    p.x -= 2.5 * speedAdjust; // Move pipes based on time

    if (p.x + pipeWidth < 0) { pipes.splice(i, 1); continue; }
    if (!p.passed && bird.x > p.x + pipeWidth) {
      score++;
      p.passed = true;
      scoreSnd.play().catch(() => {});
    }
    ctx.drawImage(pipeImg, p.x, 0, pipeWidth, p.topHeight);
    ctx.drawImage(pipeImg, p.x, p.topHeight + pipeGap, pipeWidth, canvas.height);
  }

  ctx.fillStyle = "white";
  ctx.font = "bold 30px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Score: " + score, 20, 50);

  requestAnimationFrame(update);
}

// ===== INPUT HANDLING =====
function handleInput(e) {
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

// Mobile and Laptop Listeners
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    handleInput(e);
}, { passive: false });

canvas.addEventListener("mousedown", (e) => {
    handleInput(e);
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
      e.preventDefault();
      handleInput(e);
  }
});

// START
requestAnimationFrame(update);
