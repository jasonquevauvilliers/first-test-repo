"use strict";

// Package the separate source files for a download that needs no sibling assets.
const fs = require("node:fs");
const path = require("node:path");
const read = name => fs.readFileSync(path.join(__dirname, name), "utf8");
const html = read("index.html")
  .replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${read("styles.css")}\n</style>`)
  .replace(/  <script src="game\.js"[^\n]*<\/script>\n/, "")
  .replace("</body>", () => `<script>\n${read("game.js")}\n</script>\n</body>`);
fs.writeFileSync(path.join(__dirname, "pong.html"), html);
console.log("Created pong.html — download this single file and open it in a browser.");
