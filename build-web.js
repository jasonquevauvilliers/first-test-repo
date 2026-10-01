"use strict";

// Ship only the game's assets, never repository files or node_modules.
const fs = require("node:fs");
const path = require("node:path");
const output = path.join(__dirname, "dist");
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const name of ["index.html", "styles.css", "game.js"]) {
  fs.copyFileSync(path.join(__dirname, name), path.join(output, name));
}
console.log("Created dist/ — web assets ready for Capacitor.");
