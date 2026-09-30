# Pong

A small arcade game built with vanilla HTML, CSS, and JavaScript. No packages, build step, fonts, or other external dependencies.

## Run

**For a download:** download `pong.html` and open it in a modern browser. It includes all styling and game code in one file and works offline.

**For development:** keep `index.html`, `styles.css`, and `game.js` together in the same folder. Open `index.html` in a browser, or serve this directory locally:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Stop the server with Ctrl+C.

If Start does not work, check that JavaScript is enabled and you downloaded `pong.html`, or that all three development files are together. Downloading only `index.html` will not include the game code.

## Play

- Click **Start game**. You control the mint paddle on the left; the computer controls the blue paddle.
- Hold **W / S** or **↑ / ↓** to move up / down.
- On mobile, **drag anywhere on the court** to position the paddle, or hold the large **Move up / Move down** buttons. Releasing or cancelling a touch stops movement. Holding both directions cancels movement until one is released.
- Click **Pause** or press **Space** to pause. Click **Resume** or press Space to continue. The game pauses automatically when the window loses focus or the tab is hidden.
- **Restart** immediately starts a new match with both scores at zero.
- First to **7** wins. Click **Play again** for a rematch.

Aim with the paddle: hitting near its edge sends the ball at a sharper angle. The ball speeds up with each paddle hit, to a capped maximum. The computer has a limited movement speed so it can be beaten.

## Files

- `index.html`: page, scoreboard, and accessible controls.
- `styles.css`: responsive court layout and visual styling.
- `game.js`: input, fixed-step physics, AI, scoring, and rendering.
- `pong.html`: generated, self-contained version for downloading and offline play.
- `build-standalone.js`: rebuilds `pong.html` from the three source files. After editing those sources, run `node build-standalone.js` (Node.js only; no packages needed).

## Manual checks

Start a match, try both key pairs, and check that the paddle stays inside the court. Check wall and paddle bounces, and that a missed ball awards the opposing side one point. Pause and verify the ball and paddles freeze, then resume. Restart to clear scores. Play to seven to check the winner screen and rematch. Resize the window and test touch controls on a mobile device.

Run the dependency-free regression tests with `node --test tests/game.test.cjs`. They cover collision timing, wall/paddle corner ordering, touch cancellation, multiple fingers, input cleanup, and the standalone download. Mobile browser testing should also check dragging outside the court, releasing outside a button, and switching away from the tab while holding a control.
