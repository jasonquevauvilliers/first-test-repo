const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

function loadGame(options = {}) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      listeners: {}, disabled: false, textContent: '', hidden: false,
      addEventListener(type, handler) { (this.listeners[type] ??= []).push(handler); },
      emit(type, event = {}) { for (const handler of this.listeners[type] ?? []) handler({ preventDefault() {}, button: 0, ...event }); },
      focus() {}, setPointerCapture() {},
      getBoundingClientRect() { return { top: 100, height: 270 }; },
      getContext() { return new Proxy({}, { get: () => () => {} }); },
    });
    return elements.get(id);
  };
  const document = element('document');
  document.getElementById = element;
  const context = vm.createContext({
    document,
    window: Object.assign(element('window'), options.window), requestAnimationFrame() {},
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'game.js'), 'utf8'), context);
  const run = code => vm.runInContext(code, context);
  run('start(); game.serveDelay = 0;');
  return { run, element };
}

test('paddle hits use contact-time height, avoiding false misses and false hits', () => {
  const { run } = loadGame();
  run('game.playerY=200; Object.assign(game.ball,{x:54,y:192,vx:-380,vy:-300,speed:380}); advanceBall(STEP)');
  assert.ok(run('game.ball.vx') > 0, 'ball overlapped at contact, despite leaving the edge later');
  run('Object.assign(game.ball,{x:54,y:190,vx:-380,vy:300,speed:380}); advanceBall(STEP)');
  assert.ok(run('game.ball.vx') < 0, 'ball passed above the paddle before entering its height range');
});

test('wall bounce before a paddle collision is resolved in chronological order', () => {
  const { run } = loadGame();
  run('game.playerY=0; Object.assign(game.ball,{x:55,y:9.5,vx:-380,vy:-380,speed:540}); advanceBall(STEP)');
  assert.ok(run('game.ball.vx') > 0);
  assert.ok(run('game.ball.y') >= 9);
  assert.ok(run('game.ball.x') >= 53);
});

test('native haptics trigger once on a player hit, not on computer or wall hits', () => {
  const impacts = [];
  const { run } = loadGame({ window: { Capacitor: { Plugins: { Haptics: {
    impact(options) { impacts.push(options.style); return Promise.resolve(); },
  } } } } });
  run('game.playerY=200; Object.assign(game.ball,{x:54,y:240,vx:-380,vy:0,speed:380}); advanceBall(STEP); advanceBall(STEP)');
  assert.deepEqual(impacts, ['LIGHT']);
  run('game.aiY=200; Object.assign(game.ball,{x:RIGHT_X-BALL_RADIUS-1,y:240,vx:380,vy:0,speed:380}); advanceBall(STEP)');
  run('Object.assign(game.ball,{x:480,y:9.5,vx:0,vy:-380,speed:380}); advanceBall(STEP)');
  assert.deepEqual(impacts, ['LIGHT']);
});

test('unavailable native vibration never prevents a player bounce', async () => {
  for (const impact of [() => { throw new Error('No vibrator'); }, () => Promise.reject(new Error('Haptics disabled'))]) {
    const { run } = loadGame({ window: { Capacitor: { Plugins: { Haptics: { impact } } } } });
    run('game.playerY=200; Object.assign(game.ball,{x:54,y:240,vx:-380,vy:0,speed:380}); advanceBall(STEP)');
    assert.ok(run('game.ball.vx') > 0);
    assert.equal(run('game.state'), 'running');
    await Promise.resolve();
  }
});

test('pause instructions match touch, native Android, and desktop controls', () => {
  for (const window of [{ matchMedia: () => ({ matches: true }) }, { Capacitor: { isNativePlatform: () => true } }]) {
    const { run, element } = loadGame({ window });
    run('pause()');
    assert.equal(element('detail').textContent, 'Tap Resume to keep playing.');
  }
  const { run, element } = loadGame();
  run('pause()');
  assert.match(element('detail').textContent, /Space/);
});

test('either side wins at three, with rematches clearing scores and held input', () => {
  for (const playerWon of [true, false]) {
    const { run, element } = loadGame();
    assert.equal(element('status').textContent, 'Game started. First to three wins.');
    run(`score(${playerWon}); score(${playerWon})`);
    assert.equal(run('game.state'), 'running', 'two points must not end the match');
    run('keys.add("w"); heldDirections.set(1, -1)');
    run(`score(${playerWon})`);
    assert.equal(run('game.state'), 'over');
    assert.equal(run(playerWon ? 'game.playerScore' : 'game.aiScore'), 3);
    assert.equal(element('message').textContent, playerWon ? 'You win!' : 'Computer wins');
    assert.equal(run('keys.size + heldDirections.size'), 0);
    const finalScore = run('JSON.stringify(game)');
    run('update(1)');
    assert.equal(run('JSON.stringify(game)'), finalScore, 'play stops after the third point');
    run('start()');
    assert.equal(run('game.playerScore + game.aiScore'), 0);
    assert.equal(run('game.state'), 'running');
  }
});

test('multiple fingers stay independent, including two fingers on one button', () => {
  const { run, element } = loadGame();
  element('move-up').emit('pointerdown', { pointerId: 1 });
  element('move-up').emit('pointerdown', { pointerId: 2 });
  element('move-up').emit('pointerup', { pointerId: 1 });
  const before = run('game.playerY');
  run('update(.1)');
  assert.equal(run('game.playerY'), before - 48);
  element('move-down').emit('pointerdown', { pointerId: 3 });
  const both = run('game.playerY');
  run('update(.1)');
  assert.equal(run('game.playerY'), both);
  element('move-up').emit('pointercancel', { pointerId: 2 });
  run('update(.1)');
  assert.equal(run('game.playerY'), both + 48);
  element('move-down').emit('lostpointercapture', { pointerId: 3 });
  assert.equal(run('heldDirections.size'), 0);
});

test('paused controls ignore touches and blur always clears stale input', () => {
  const { run, element } = loadGame();
  run('pause()');
  element('move-up').emit('pointerdown', { pointerId: 1 });
  assert.equal(run('heldDirections.size'), 0);
  run('keys.add("w")');
  element('window').emit('blur');
  assert.equal(run('keys.size'), 0);
  run('start(); heldDirections.set(1, -1); pause(); start()');
  assert.equal(run('heldDirections.size'), 0);
});

test('drag maps displayed court coordinates and clamps outside its bounds', () => {
  const { run, element } = loadGame();
  element('game').emit('pointerdown', { pointerId: 4, clientY: 235 });
  assert.equal(run('game.playerY'), 222);
  element('game').emit('pointermove', { pointerId: 4, clientY: 99 });
  assert.equal(run('game.playerY'), 0);
  element('game').emit('pointermove', { pointerId: 4, clientY: 500 });
  assert.equal(run('game.playerY'), 444);
  element('game').emit('pointercancel', { pointerId: 4 });
  element('game').emit('pointermove', { pointerId: 4, clientY: 235 });
  assert.equal(run('game.playerY'), 444);
});

test('hiding the game pauses play, clears touch input, and requires an explicit resume', () => {
  const { run, element } = loadGame();
  element('move-up').emit('pointerdown', { pointerId: 1 });
  element('game').emit('pointerdown', { pointerId: 2, clientY: 235 });
  run('keys.add("w")');
  element('document').hidden = true;
  element('document').emit('visibilitychange');
  assert.equal(run('game.state'), 'paused');
  assert.equal(run('keys.size + heldDirections.size'), 0);
  assert.equal(run('dragPointer'), null);
  const before = run('JSON.stringify(game)');
  run('update(1)');
  assert.equal(run('JSON.stringify(game)'), before);
  element('document').hidden = false;
  element('document').emit('visibilitychange');
  assert.equal(run('game.state'), 'paused');
  element('pause').emit('click');
  assert.equal(run('game.state'), 'running');
});

test('standalone download contains current game and styles without asset requests', () => {
  const html = fs.readFileSync(path.join(root, 'pong.html'), 'utf8');
  assert.ok(html.includes(fs.readFileSync(path.join(root, 'game.js'), 'utf8')));
  assert.ok(html.includes(fs.readFileSync(path.join(root, 'styles.css'), 'utf8')));
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href="styles.css"/);
});
