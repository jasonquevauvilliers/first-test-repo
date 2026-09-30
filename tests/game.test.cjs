const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

function loadGame() {
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
  const context = vm.createContext({
    document: { getElementById: element, addEventListener() {} },
    window: element('window'), requestAnimationFrame() {},
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

test('scores stop the match at seven and restart clears score and held input', () => {
  const { run } = loadGame();
  run('for(let i=0;i<7;i++) score(true)');
  assert.equal(run('game.state'), 'over');
  assert.equal(run('game.playerScore'), 7);
  run('start()');
  assert.equal(run('game.playerScore'), 0);
  assert.equal(run('game.state'), 'running');
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

test('standalone download contains current game and styles without asset requests', () => {
  const html = fs.readFileSync(path.join(root, 'pong.html'), 'utf8');
  assert.ok(html.includes(fs.readFileSync(path.join(root, 'game.js'), 'utf8')));
  assert.ok(html.includes(fs.readFileSync(path.join(root, 'styles.css'), 'utf8')));
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href="styles.css"/);
});
