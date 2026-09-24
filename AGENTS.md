# Agent Guide

## Repository

- This is a dependency-free HTML5 Canvas game; there is no package manifest, bundler, build step, test suite, lint config, or formatter config.
- `index.html` is the browser entrypoint. It defines the 800x600 canvas and loads `game.js`; keep those filenames and the canvas id aligned when changing the entrypoint.
- `game.js` contains the complete runtime: input handling, game entities/state, update loop, rendering, and `requestAnimationFrame` startup. Prefer changes there over adding a framework or build tooling.
- `favicon.svg` is the only other runtime asset referenced by the page.

## Development

- Run `npx serve .` from the repository root and open `http://localhost:3000`, or open `index.html` directly in a browser.
- There are no automated checks. After gameplay changes, manually verify loading, keyboard controls (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`), collisions, level progression, lives/game-over, and restart behavior.
- Keep browser-facing JavaScript compatible with the existing plain ES6+ setup; do not assume Node globals or a module loader.
