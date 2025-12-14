# WarGames Chat Terminal

Retro-styled NORAD terminal that marries a socket-based group chat with tongue-in-cheek WOPR game simulations. Clients connect through a CRT-inspired UI, exchange messages in real time, watch fellow operatives light up a world map, and drop into mini games (including a cinematic GLOBAL THERMONUCLEAR WAR sequence) without ever leaving the terminal prompt.

## Features
- **Global chat with presence** – Socket.IO keeps everyone synced, announces link activity, and auto-assigns `USER-XXXX` call signs.
- **Geo-visualization** – Each client is geolocated through `ipapi.co`, plotted as a pulsing Leaflet marker, and summarized in the ACTIVE LINKS counter.
- **In-terminal command palette** – Slash commands control the experience: bootstrapping, listing scenarios, toggling DEFCON levels, and entering games.
- **Scenario loader** – Each game lives in `/comps/<scenario>/game.js` as an ES module that plugs into shared helpers (board renderer, card formatting, missile animations, etc.).
- **Mini games** – Tic-Tac-Toe (with selectable AI), Chess, Checkers, Blackjack, Solitaire/Klondike, and the fully animated GLOBAL THERMONUCLEAR WAR sequence.
- **Missile simulation** – GTW uses arced Leaflet polylines, radar overlay, and DEFCON theming for an immersive launch/retaliation visualization.

## Tech Stack
- **Node + Express** serves the static front-end, hosts the Socket.IO server, and proxies module bundles.
- **Socket.IO** powers bi-directional chat/state updates.
- **Axios** fetches IP geodata from `https://ipapi.co/<ip>/json/`.
- **Leaflet** renders the map, markers, and missile animations in the browser.
- **Vanilla JS modules** implement the terminal client and the self-contained game engines.

## Requirements
- Node.js 18+ (Socket.IO v4 expects a current Node runtime).
- npm 9+ (matches the generated `package-lock.json` format).
- Internet access for:
  - `ipapi.co` geolocation lookups (falls back to `UNKNOWN` on failure).
  - Unpkg-hosted Leaflet CSS/JS.
  - Carto dark tile layer.

## Quick Start
```bash
git clone <repo>
cd wargames
npm install
npm start
```

The server binds to `http://0.0.0.0:4000`. Visit that URL from a browser; additional devices on your LAN can join if the port is exposed.

### Development Tips
- The server auto-serves `/public/index.html` plus the `/comps` directory, so rebuilding is only needed when you edit source files.
- Restart `npm start` after changing `server.js`; front-end changes hot-reload via the browser.
- When developing offline, stub the `lookupGeo` helper in `server.js` to avoid external HTTP calls.

## Using the Terminal
Once the UI boots, type commands or chat messages directly into the prompt.

### Slash Commands
| Command | Description |
| --- | --- |
| `/help` | List all supported commands. |
| `/chat` | Re-enter broadcast chat mode after using commands/games. |
| `/games` | Show every scenario the WOPR can launch. |
| `/settings` | Placeholder for future terminal customization hooks. |
| `/defcon <1-5>` | Change the simulated DEFCON (affects theme + map tint). |
| `/launch <name>` | Load a scenario (aliases like `/launch tic` are supported). |

Messages that do not start with `/` are broadcast to all connected users as chat.

### Scenario Catalog
| Scenario | Path | Highlights |
| --- | --- | --- |
| Tic-Tac-Toe | `comps/ttt/game.js` | ASCII grid, easy/hard AI via minimax, `PLAY`/`EXIT` controls. |
| Chess | `comps/chess/game.js` | Board rendered through `createBoardElement`, optional AI, SAN-like move inputs (e.g., `E2 E4`). |
| Checkers | `comps/checkers/game.js` | Basic draughts with jump logic and move prompts. |
| Blackjack | `comps/blackjack/game.js` | Multi-hand shoe, card rendering helpers, commands such as `HIT`, `STAND`, `DOUBLE`. |
| Solitaire | `comps/solitare/game.js` | Klondike rules, tableau/foundation commands (`MOVE T1 T3`, `MOVE WASTE FHEART`), auto-complete once stock/tableau are clear. |
| Global Thermonuclear War | `comps/gtw/game.js` | Narrative sequence: confirm participation, choose USA/USSR, lock a target or random pick, then watch missile volleys with DEFCON drop and concluding lesson. |

Each module exports `createGame(context)` and consumes shared helpers like `appendLine`, `createBoardElement`, `animateMissilePath`, or `exitToTerminal`. Use `exitToTerminal()` within a scenario to hand control back to the main CLI.

## Project Structure
```
wargames/
├── public/               # Static assets (index.html with terminal UI)
├── comps/                # Scenario modules, ES modules fetched on demand
│   ├── blackjack/
│   ├── chess/
│   ├── checkers/
│   ├── gtw/
│   ├── solitare/
│   └── ttt/
├── server.js             # Express + Socket.IO server, IP geolocation helper
├── package.json
├── package-lock.json
└── node_modules/
```

## Configuration & Customization
- **Port** – Update `PORT` in `server.js` if you need something other than `4000`.
- **Geolocation** – `lookupGeo()` currently calls `ipapi.co` anonymously. Swap in an API key or different provider as needed; local/private IPs already map to a DEV ENV placeholder.
- **Static assets** – Additional terminal panels or sounds can live in `public/`. Reference them from `index.html`.
- **Scenarios** – Add new folders under `comps/`, export `createGame(context)`, and add the loader to the `gameLoaders`, `gameLabels`, and `scenarioAliases` dictionaries in `public/index.html`.

## Testing & Troubleshooting
- There is no formal test suite (`npm test` exits by design). Exercise features manually via the browser.
- Use multiple browser windows or devices to validate chat presence, map marker syncing, and missile visualizations.
- If Leaflet tiles or ipapi calls fail (e.g., offline development), the client gracefully falls back to blank tiles and `UNKNOWN` locations; check the browser console for network warnings.

## Credits & Inspiration
This interface pays homage to the WarGames (1983) depiction of NORAD terminals and the WOPR. All cities, missile arcs, and messages are purely illustrative; keep it fun and fictional.
