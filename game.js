"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const ui = Object.fromEntries(["player-score", "ai-score", "overlay", "message", "detail", "start", "pause", "restart", "status"].map(id => [id, document.getElementById(id)]));
const WIDTH = 960, HEIGHT = 540, PADDLE_WIDTH = 14, PADDLE_HEIGHT = 96;
const BALL_RADIUS = 9, WINNING_SCORE = 7, STEP = 1 / 120;
const keys = new Set();
const heldDirections = new Map();
let dragPointer = null;
const game = {
  state: "ready", playerScore: 0, aiScore: 0,
  playerY: (HEIGHT - PADDLE_HEIGHT) / 2, aiY: (HEIGHT - PADDLE_HEIGHT) / 2,
  ball: { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0, speed: 380 },
  serveDelay: 0,
};
const LEFT_X = 30, RIGHT_X = WIDTH - 30 - PADDLE_WIDTH;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function serve(direction = Math.random() < .5 ? -1 : 1) {
  const angle = (Math.random() - .5) * .8;
  Object.assign(game.ball, { x: WIDTH / 2, y: HEIGHT / 2, speed: 380, vx: direction * Math.cos(angle) * 380, vy: Math.sin(angle) * 380 });
  game.serveDelay = .65;
}

function syncUI(message, detail) {
  ui["player-score"].textContent = game.playerScore;
  ui["ai-score"].textContent = game.aiScore;
  ui.overlay.hidden = game.state === "running";
  ui.start.disabled = game.state === "running";
  ui.start.textContent = game.state === "running" ? "Playing" : game.state === "paused" ? "Resume" : game.state === "over" ? "Play again" : "Start game";
  ui.pause.disabled = !["running", "paused"].includes(game.state);
  ui.pause.textContent = game.state === "paused" ? "Resume" : "Pause";
  ui.restart.disabled = false;
  if (message) {
    ui.message.textContent = message;
    ui.detail.textContent = detail;
    ui.status.textContent = `${message} ${detail}`;
  }
}

function clearInput() {
  keys.clear();
  heldDirections.clear();
  dragPointer = null;
}

function reset() {
  clearInput();
  game.playerScore = game.aiScore = 0;
  game.playerY = game.aiY = (HEIGHT - PADDLE_HEIGHT) / 2;
  serve();
}

function start() {
  if (game.state === "running") return;
  if (game.state === "over") reset();
  game.state = "running";
  previousTime = null;
  accumulator = 0;
  canvas.focus({ preventScroll: true });
  syncUI();
  ui.status.textContent = "Game started. First to seven wins.";
}

function pause() {
  if (game.state !== "running") return;
  game.state = "paused";
  clearInput();
  syncUI("Taking a breather", "Press Resume or Space to keep playing.");
}

function score(playerWon) {
  if (playerWon) game.playerScore++; else game.aiScore++;
  if (game.playerScore === WINNING_SCORE || game.aiScore === WINNING_SCORE) {
    game.state = "over";
    clearInput();
    syncUI(playerWon ? "You win!" : "Computer wins", `${game.playerScore} – ${game.aiScore}. Ready for a rematch?`);
  } else {
    serve(playerWon ? 1 : -1);
    syncUI();
    ui.status.textContent = `You ${game.playerScore}, computer ${game.aiScore}.`;
  }
}

function bounce(paddleY, direction) {
  const ball = game.ball;
  const offset = clamp((ball.y - (paddleY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2), -1, 1);
  const angle = offset * Math.PI / 3;
  ball.speed = Math.min(ball.speed + 26, 760);
  ball.vx = direction * Math.cos(angle) * ball.speed;
  ball.vy = Math.sin(angle) * ball.speed;
}

function update(dt) {
  if (game.state !== "running") return;
  const up = keys.has("w") || keys.has("arrowup") || [...heldDirections.values()].includes(-1);
  const down = keys.has("s") || keys.has("arrowdown") || [...heldDirections.values()].includes(1);
  game.playerY = clamp(game.playerY + (Number(down) - Number(up)) * 480 * dt, 0, HEIGHT - PADDLE_HEIGHT);

  // A speed limit and dead zone keep the computer beatable.
  const ball = game.ball;
  const target = ball.vx > 0 ? ball.y : HEIGHT / 2;
  const difference = target - (game.aiY + PADDLE_HEIGHT / 2);
  if (Math.abs(difference) > 12) game.aiY = clamp(game.aiY + clamp(difference, -285 * dt, 285 * dt), 0, HEIGHT - PADDLE_HEIGHT);
  if (game.serveDelay > 0) { game.serveDelay -= dt; return; }

  advanceBall(dt);
}

// Resolve the earliest impact first, using the ball's position at contact.
// This avoids missed edge hits and incorrect ordering near paddle/wall corners.
function advanceBall(dt) {
  const ball = game.ball;
  if (ball.x <= -BALL_RADIUS) { score(false); return; }
  if (ball.x >= WIDTH + BALL_RADIUS) { score(true); return; }
  let remaining = dt;
  for (let impacts = 0; remaining > 0 && impacts < 8; impacts++) {
    let time = remaining, hit = null;
    const consider = (candidate, kind) => {
      if (candidate >= 0 && candidate <= time) { time = candidate; hit = kind; }
    };
    if (ball.vy < 0) consider((BALL_RADIUS - ball.y) / ball.vy, "top");
    if (ball.vy > 0) consider((HEIGHT - BALL_RADIUS - ball.y) / ball.vy, "bottom");
    if (ball.vx !== 0) {
      const movingLeft = ball.vx < 0;
      const plane = movingLeft ? LEFT_X + PADDLE_WIDTH + BALL_RADIUS : RIGHT_X - BALL_RADIUS;
      const contactTime = (plane - ball.x) / ball.vx;
      const contactY = ball.y + ball.vy * contactTime;
      const paddleY = movingLeft ? game.playerY : game.aiY;
      if (contactY + BALL_RADIUS >= paddleY && contactY - BALL_RADIUS <= paddleY + PADDLE_HEIGHT) {
        consider(contactTime, movingLeft ? "left" : "right");
      }
      consider(((movingLeft ? -BALL_RADIUS : WIDTH + BALL_RADIUS) - ball.x) / ball.vx, "score");
    }
    ball.x += ball.vx * time;
    ball.y += ball.vy * time;
    remaining -= time;
    if (!hit) break;
    if (hit === "score") { score(ball.vx > 0); return; }
    if (hit === "top") ball.vy = Math.abs(ball.vy);
    if (hit === "bottom") ball.vy = -Math.abs(ball.vy);
    if (hit === "left") bounce(game.playerY, 1);
    if (hit === "right") bounce(game.aiY, -1);
  }
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "#293d50";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 12]);
  ctx.beginPath(); ctx.moveTo(WIDTH / 2, 22); ctx.lineTo(WIDTH / 2, HEIGHT - 22); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "#1b2c3e";
  ctx.beginPath(); ctx.arc(WIDTH / 2, HEIGHT / 2, 66, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#70efc5";
  ctx.fillRect(LEFT_X, game.playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillStyle = "#95b8f1";
  ctx.fillRect(RIGHT_X, game.aiY, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillStyle = "#f3f7fc";
  ctx.shadowColor = "#e0eeff"; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(game.ball.x, game.ball.y, BALL_RADIUS, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
}

ui.start.addEventListener("click", start);
ui.pause.addEventListener("click", () => game.state === "paused" ? start() : pause());
ui.restart.addEventListener("click", () => { reset(); game.state = "ready"; start(); });
window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  if (["w", "s", "arrowup", "arrowdown"].includes(key)) {
    event.preventDefault();
    keys.add(key);
  } else if (event.code === "Space" && event.target.tagName !== "BUTTON") {
    event.preventDefault();
    if (!event.repeat) game.state === "running" ? pause() : start();
  }
});
window.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => { pause(); clearInput(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
for (const [id, direction] of [["move-up", -1], ["move-down", 1]]) {
  const button = document.getElementById(id);
  button.addEventListener("pointerdown", event => {
    if (game.state !== "running" || event.button !== 0) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    heldDirections.set(event.pointerId, direction);
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(event, event => heldDirections.delete(event.pointerId));
  }
  button.addEventListener("keydown", event => {
    if (![" ", "Enter"].includes(event.key)) return;
    event.preventDefault();
    if (game.state === "running") heldDirections.set(id, direction);
  });
  button.addEventListener("keyup", event => {
    if ([" ", "Enter"].includes(event.key)) { event.preventDefault(); heldDirections.delete(id); }
  });
  button.addEventListener("blur", () => heldDirections.delete(id));
}

// Drag anywhere on the court: map CSS pixels to the fixed logical playfield.
function moveFromPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  game.playerY = clamp((event.clientY - bounds.top) * HEIGHT / bounds.height - PADDLE_HEIGHT / 2, 0, HEIGHT - PADDLE_HEIGHT);
}
canvas.addEventListener("pointerdown", event => {
  if (game.state !== "running" || dragPointer !== null || event.button !== 0) return;
  event.preventDefault();
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(event.pointerId);
  dragPointer = event.pointerId;
  moveFromPointer(event);
});
canvas.addEventListener("pointermove", event => {
  if (game.state === "running" && event.pointerId === dragPointer) moveFromPointer(event);
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
  canvas.addEventListener(event, event => { if (event.pointerId === dragPointer) dragPointer = null; });
}

let previousTime = null, accumulator = 0;
function frame(time) {
  if (previousTime !== null && game.state === "running") {
    accumulator += Math.min((time - previousTime) / 1000, .05);
    while (accumulator >= STEP) { update(STEP); accumulator -= STEP; }
  } else accumulator = 0;
  previousTime = time;
  draw();
  requestAnimationFrame(frame);
}
serve();
syncUI("Ready to rally?", "Take the left paddle. Make the first move.");
requestAnimationFrame(frame);
