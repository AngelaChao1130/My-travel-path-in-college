// scenes
const SCENES = [
  { name: "New York", bg: "assets/nyc.jpg" },
  { name: "Paris",    bg: "assets/paris.jpg" },
  { name: "Spain",    bg: "assets/spain.jpg" }
];
// answers
const ANSWERS = {
  "New York": ["new york", "nyc", "new york city"],
  "Paris":    ["paris","france"],
  "Spain":    ["spain", "barcelona"]
};

// music resume
const MUSIC_KEY = "jb_music_state_v1";
let jbSound = null;

// state
let sceneIndex = 0;
let img = null, imgOk = false;
let searchMode = false;
let flashX = -999, flashY = -999;
let cover; // overlay we punch a hole in


let solved = [];            
let overlayAlpha = 255;     
let overlayTarget = 255;   

// ui
let btnSearch, btnNext, btnBack, guessForm, guessInput, guessFeedback;

function preload() {
  if (typeof loadSound === "function") {
    jbSound = loadSound("assets/DAISIES.mp3");
  }
}

function setup() {
  // responsive canvas
  const w = constrain(int(windowWidth * 0.92), 320, 650);
  const h = constrain(int(windowHeight * 0.78), 420, 820);
  createCanvas(w, h).parent("sketch");
  cover = createGraphics(width, height);
  textAlign(CENTER, CENTER);

  //init solved flags for each scene
  solved = SCENES.map(() => false);
  overlayAlpha = 255;
  overlayTarget = 255;

  // grab elements
  btnSearch = document.getElementById("search-mode");
  btnNext   = document.getElementById("next-memory");
  btnBack   = document.getElementById("back-home");
  guessForm     = document.getElementById("guess-form");
  guessInput    = document.getElementById("guess-input");
  guessFeedback = document.getElementById("guess-feedback");

  // buttons
  if (btnSearch) {
    btnSearch.onclick = () => {
      // disable search once scene is solved
      if (solved[sceneIndex]) return;
      searchMode = !searchMode;
      if (searchMode && flashX < 0) { flashX = width/2; flashY = height/2; }
      updateSearchButton();
    };
    updateSearchButton();
  }

  if (btnNext) {
    btnNext.onclick = () => {
      sceneIndex = (sceneIndex + 1) % SCENES.length;
      // reset for new city
      searchMode = false;
      overlayAlpha = 255;
      overlayTarget = 255;
      flashX = flashY = -999;
      feedback("", "");
      if (guessInput) { guessInput.value = ""; guessInput.focus(); }
      loadScene();
      updateSearchButton();
      // optional hint for new city
      feedback("Guess the city!", "hint");
    };
  }

  if (btnBack) {
    btnBack.onclick = () => {
      // save simple music state so Home can resume
      try {
        const prev = JSON.parse(localStorage.getItem(MUSIC_KEY) || "{}");
        const vol  = typeof prev.volume === "number" ? prev.volume : 0.5;
        localStorage.setItem(MUSIC_KEY, JSON.stringify({
          playing: jbSound?.isPlaying?.() || false,
          time: jbSound?.currentTime ? jbSound.currentTime() : (prev.time || 0),
          volume: vol
        }));
      } catch {}
      window.location.href = "HomePage.html";
    };
  }

  // guess form
  if (guessForm) {
    guessForm.addEventListener("submit", (e) => {
      e.preventDefault();
      checkGuess();
    });
  }

  // mobile autoplay unlock + resume
  document.addEventListener("pointerdown", () => {
    if (typeof getAudioContext === "function") getAudioContext().resume();
    resumeJB();
  }, { once: true });

  // first scene
  loadScene();
  feedback("Guess the city!", "hint");
  if (guessInput) guessInput.focus();
}

function draw() {
  background(0);

  // draw photo (fit inside canvas)
  if (imgOk && img) {
    const scale = min(width / img.width, height / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const dx = (width - drawW) / 2;
    const dy = (height - drawH) / 2;
    image(img, dx, dy, drawW, drawH);
  } else {
    // fallback if image not loaded
    fill(40); rect(0, 0, width, height);
    fill(220); text("Loading...", width/2, height/2);
  }

  // animate overlay alpha toward the target (nice fade on reveal)
  overlayAlpha = lerp(overlayAlpha, overlayTarget, 0.12);

  // flashlight overlay logic
  // If current scene is NOT solved:
  if (!solved[sceneIndex]) {
    // build the cover
    cover.clear();
    cover.background(0);

    if (searchMode) {
      // punch a circular hole where the flashlight is
      const hole = int(min(width, height) * 0.42);
      cover.erase();
      cover.circle(flashX, flashY, hole);
      cover.noErase();
    }
    // draw the cover fully (still dark outside the hole)
    image(cover, 0, 0);
  } else {
    // Scene solved: fade the veil to fully transparent (no flashlight hole)
    if (overlayAlpha > 1) {
      noStroke();
      fill(0, constrain(overlayAlpha, 0, 255));
      rect(0, 0, width, height);
    }
  }

  // hint text (top)
  fill(255); noStroke();
  textSize(constrain(int(min(width, height) * 0.032), 12, 18));
  let hint = "";
  if (!solved[sceneIndex]) {
    hint = searchMode ? "Drag or move to aim the flashlight" : "Click “Search for Clues”";
  } else {
    hint = "Unlocked! Click Next ▶ when ready";
  }
  text(hint, width/2, 7);
}

// interaction 
function mouseMoved()   { if (searchMode) setFlash(mouseX, mouseY); }
function mouseDragged() { if (searchMode) setFlash(mouseX, mouseY); }
function touchMoved()   { if (searchMode) setFlash(mouseX, mouseY); return false; }
function setFlash(x, y) { flashX = x; flashY = y; }

//responsive resize 
function windowResized() {
  const w = constrain(int(windowWidth * 0.92), 320, 650);
  const h = constrain(int(windowHeight * 0.78), 420, 820);
  resizeCanvas(w, h);
  cover = createGraphics(width, height);
  if (searchMode && (flashX < 0 || flashY < 0)) { flashX = width/2; flashY = height/2; }
}

//helpers
function loadScene() {
  const path = SCENES[sceneIndex].bg;
  img = null; imgOk = false;
  img = loadImage(path, () => imgOk = true, () => imgOk = false);

  // on load of current scene, if it was previously solved,
  // keep it revealed. Otherwise, start covered.
  if (solved[sceneIndex]) {
    overlayAlpha = 0;
    overlayTarget = 0;
    searchMode = false;
  } else {
    overlayAlpha = 255;
    overlayTarget = 255;
    searchMode = false;
  }
  updateSearchButton();
}

function resumeJB() {
  if (!jbSound) return;
  const saved = JSON.parse(localStorage.getItem(MUSIC_KEY) || "{}");
  if (!saved.playing) return;
  const vol = (typeof saved.volume === "number") ? saved.volume : 0.5;
  const cue = (typeof saved.time === "number") ? saved.time : 0;
  if (!jbSound.isPlaying()) {
    jbSound.setVolume(vol);
    jbSound.play(0, 1, vol, cue);
  }
}

//guessing
function normalize(s) { return (s || "").trim().toLowerCase().replace(/\s+/g, " "); }

function checkGuess() {
  if (!guessInput) return;
  const user = normalize(guessInput.value);
  if (!user) { feedback("Type a city first.", "hint"); return; }

  const correct = SCENES[sceneIndex].name;
  const accepted = ANSWERS[correct] || [correct.toLowerCase()];
  const ok = accepted.some(a => user === a);

  if (ok) {
    //mark solved and fade the veil away
    solved[sceneIndex] = true;
    overlayTarget = 0;
    searchMode = false;
    updateSearchButton();
  }
  feedback(ok ? "✅ Correct! Scene unlocked" : "❌ Try again.", ok ? "ok" : "no");
}

function feedback(msg, cls = "") {
  if (!guessFeedback) return;
  guessFeedback.textContent = msg;
  guessFeedback.className = cls;
}

// keep the search button label in sync with state
function updateSearchButton() {
  if (!btnSearch) return;
  if (solved[sceneIndex]) {
    btnSearch.textContent = "Scene Revealed";
    btnSearch.disabled = true;      // no searching once solved
    btnSearch.classList.add("disabled");
  } else {
    btnSearch.disabled = false;
    btnSearch.classList.remove("disabled");
    btnSearch.textContent = searchMode ? "Exit Search Mode" : "Search for Clues";
  }
}