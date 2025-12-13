export function createGame({
  appendLine,
  clearMissileAnimations,
  animateMissilePath,
  exitToTerminal,
  setDefcon,
  setMapView,
}) {
  const script = [
    "LINKING TO STRATEGIC LAUNCH SILOS...",
    "AUTHORIZING WOPR TO SELECT TARGETS...",
    "SIMULATION ONLINE. READY TO PLAY?",
  ];
  let step = 0;
  let concluded = false;
  let selectedSide = null;
  let pendingTarget = null;
  let sequenceInProgress = false;
  let attackPool = [];

  const launchSites = {
    USA: { name: "NORAD", coords: [39.742, -104.991] },
    USSR: { name: "SOVIET COMMAND", coords: [55.751, 37.617] },
  };

  const majorCities = {
    USA: [
      {
        name: "Washington D.C.",
        coords: [38.9072, -77.0369],
        aliases: ["WASHINGTON", "WASHINGTONDC", "DC", "CAPITOL"],
        note: "US CAPITAL",
      },
      {
        name: "New York City",
        coords: [40.7128, -74.006],
        aliases: ["NEWYORK", "NYC", "NEWYORKCITY"],
        note: "FINANCIAL CENTER",
      },
      {
        name: "Los Angeles",
        coords: [34.0522, -118.2437],
        aliases: ["LA", "LOSANGELES"],
        note: "WEST COAST MEGACITY",
      },
      {
        name: "Chicago",
        coords: [41.8781, -87.6298],
        aliases: ["CHICAGO"],
        note: "MIDWEST HUB",
      },
      {
        name: "Houston",
        coords: [29.7604, -95.3698],
        aliases: ["HOUSTON", "TEXAS"],
        note: "ENERGY INFRASTRUCTURE",
      },
    ],
    USSR: [
      {
        name: "Moscow",
        coords: [55.7558, 37.6173],
        aliases: ["MOSCOW", "MOSKVA"],
        note: "SOVIET CAPITAL",
      },
      {
        name: "Leningrad",
        coords: [59.9311, 30.3609],
        aliases: ["LENINGRAD", "STPETERSBURG", "SAINTPETERSBURG"],
        note: "NORTHERN PORT",
      },
      {
        name: "Kiev",
        coords: [50.4501, 30.5234],
        aliases: ["KIEV", "KYIV"],
        note: "STRATEGIC CENTER",
      },
      {
        name: "Novosibirsk",
        coords: [55.0084, 82.9357],
        aliases: ["NOVOSIBIRSK"],
        note: "SIBERIAN INDUSTRY",
      },
      {
        name: "Vladivostok",
        coords: [43.1155, 131.8855],
        aliases: ["VLADIVOSTOK"],
        note: "PACIFIC FLEET BASE",
      },
    ],
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function normalize(input) {
    return (input || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  }

  function listTargets(pool) {
    appendLine("PRIORITY TARGETS:", "system");
    pool.forEach((city, idx) => {
      appendLine(`  ${idx + 1}. ${city.name} — ${city.note}`, "system");
    });
    appendLine("TYPE A CITY NAME (OR NUMBER) OR TYPE RANDOM.", "system");
  }

  function resolveTarget(input, pool) {
    if (!pool.length) return null;
    const trimmed = input.trim();
    const byNumber = parseInt(trimmed, 10);
    if (!Number.isNaN(byNumber) && byNumber >= 1 && byNumber <= pool.length) {
      return pool[byNumber - 1];
    }
    const key = normalize(trimmed);
    return pool.find((city) => city.aliases.some((alias) => alias === key));
  }

  function randomTarget(pool) {
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function jitterCoord([lat, lon], latSpread = 6, lonSpread = 10) {
    const newLat = Math.max(-85, Math.min(85, lat + (Math.random() - 0.5) * latSpread));
    let newLon = lon + (Math.random() - 0.5) * lonSpread;
    newLon = ((newLon + 180) % 360 + 360) % 360 - 180;
    return [newLat, newLon];
  }

  function fireVolley(origin, target, options = {}) {
    const count = options.count || 5;
    const color = options.color || "#ff5533";
    const duration = options.duration || 6000;
    const steps = options.steps || 80;
    const stagger = options.stagger || 450;
    const originSpread = options.originSpread || 4;
    const targetSpread = options.targetSpread || 3;
    const preciseFirst = options.preciseFirst || false;
    const curveHeight = options.curveHeight || 6;

    const launches = [];
    for (let i = 0; i < count; i++) {
      const startDelay = i * stagger;
      const exact = preciseFirst && i === 0;
      const from = exact
        ? origin.coords
        : jitterCoord(origin.coords, originSpread, originSpread * 1.5);
      const to = exact
        ? target.coords
        : jitterCoord(target.coords, targetSpread, targetSpread * 1.5);
      const launch = delay(startDelay).then(() =>
        animateMissilePath(from, to, {
          color,
          duration,
          steps,
          curveHeight,
        })
      );
      launches.push(launch);
    }
    return Promise.all(launches);
  }

  async function runMissileVisualization(side, target, retaliationTargets = []) {
    const attackTarget = target || randomTarget(attackPool);
    if (!attackTarget) return;
    const origin = launchSites[side] || launchSites.USA;
    const retaliateSide = side === "USA" ? "USSR" : "USA";
    const retaliation = launchSites[retaliateSide];
    clearMissileAnimations();
    const primary = fireVolley(origin, attackTarget, {
      count: 6,
      color: "#ff5533",
      duration: 6500,
      steps: 90,
      originSpread: 5,
      targetSpread: 4,
      preciseFirst: true,
      curveHeight: 8,
    }).then(() => appendLine(`IMPACT CONFIRMED AT ${attackTarget.name.toUpperCase()}.`));

    const retaliationVolley = (async () => {
      await delay(1800);
      const counterList = retaliationTargets.length
        ? retaliationTargets
        : majorCities[retaliateSide] || [];
      const focusCities = counterList.slice(0, 4);
      if (!focusCities.length) return;
      appendLine(
        `COUNTERFORCE LAUNCHES TOWARD ${focusCities
          .map((c) => c.name.toUpperCase())
          .join(", ")}...`,
        "system"
      );
      const waves = focusCities.map((city, idx) =>
        delay(idx * 500).then(() =>
          fireVolley(retaliation, city, {
            count: 5,
            color: "#ffaa33",
            duration: 6500,
            steps: 90,
            originSpread: 8,
            targetSpread: 4,
            stagger: 250,
            preciseFirst: true,
            curveHeight: 10,
          })
        )
      );
      await Promise.all(waves);
      appendLine("COUNTERSTRIKE IMPACTS REGISTERED ACROSS MULTIPLE CITIES.");
    })();

    await Promise.all([primary, retaliationVolley]);
  }

  function conclude() {
    concluded = true;
    clearMissileAnimations();
    exitToTerminal();
  }

  function start() {
    clearMissileAnimations();
    appendLine("GLOBAL THERMONUCLEAR WAR (CINEMATIC MODE)", "system");
    appendLine("TYPE YES TO PROCEED OR EXIT TO ABORT.", "system");
  }

  async function executeLaunchSequence() {
    if (sequenceInProgress) return;
    sequenceInProgress = true;
    appendLine("COORDINATES LOCKED. PREPPING MISSILE TRAJECTORIES...");
    await delay(700);
    appendLine("LAUNCH SEQUENCE INITIATED. 3... 2... 1...");
    await delay(1200);
    appendLine("MISSILES AWAY. COUNTERFORCE RESPONSE DETECTED.");
    const counterTargets =
      (selectedSide && majorCities[selectedSide]) || majorCities.USA;
    await runMissileVisualization(selectedSide || "USA", pendingTarget, counterTargets);
    appendLine("WOPR RUNNING OUTCOME ANALYSIS...");
    await delay(1800);
    appendLine("AFTERMATH: GLOBAL DEVASTATION. NO WINNERS.");
    appendLine("THE ONLY WINNING MOVE IS NOT TO PLAY", "system");
    appendLine("SIMULATION COMPLETE. EXITING.", "system");
    conclude();
  }

  async function handleInput(raw) {
    const text = raw.trim().toUpperCase();
    if (text === "EXIT" || text === "/EXIT" || text === "QUIT") {
      appendLine("SIMULATION TERMINATED. RETURNING TO TERMINAL.", "system");
      conclude();
      return;
    }
    if (concluded) {
      appendLine("THE ONLY WINNING MOVE IS NOT TO PLAY.", "system");
      return;
    }
    if (sequenceInProgress) {
      appendLine("SEQUENCE IN PROGRESS. STAND BY FOR OUTCOME.", "system");
      return;
    }
    if (step === 0 && text === "YES") {
      if (typeof setDefcon === "function") setDefcon(1);
      if (typeof setMapView === "function") setMapView([30, 0], 1.05);
      appendLine(script[step]);
      step++;
      appendLine("CHOOSE YOUR SIDE: USA OR USSR?");
      return;
    }
    if (step === 1 && (text === "USA" || text === "USSR")) {
      selectedSide = text;
      const enemySide = text === "USA" ? "USSR" : "USA";
      attackPool = majorCities[enemySide] || [];
      appendLine(`SIDE CONFIRMED: ${text}. TARGET DATABASE LOADED.`);
      step++;
      appendLine(
        `ENTER A TARGET CITY IN ${enemySide} OR TYPE RANDOM FOR AUTOMATIC SELECTION.`,
        "system"
      );
      listTargets(attackPool);
      return;
    }
    if (step === 2) {
      if (text === "LIST" || text === "TARGETS") {
        listTargets(attackPool);
        return;
      }
      const chosen =
        text === "RANDOM"
          ? randomTarget(attackPool)
          : resolveTarget(text, attackPool);
      if (!chosen) {
        appendLine("UNRECOGNIZED TARGET. TYPE LIST TO SEE AVAILABLE OPTIONS.");
        return;
      }
      pendingTarget = chosen;
      appendLine(`TARGET LOCKED: ${pendingTarget.name}.`);
      await executeLaunchSequence();
      step++;
      return;
    }
    appendLine("TYPE YES TO BEGIN OR EXIT TO LEAVE.");
  }

  return { start, handleInput };
}
