// scenes
const SCENES = [
  { name: "New York", bg: "assets/nyc.jpg" },
  { name: "Paris",    bg: "assets/paris.jpg" },
  { name: "Spain",    bg: "assets/spain.jpg" }
];
// answers
const ANSWERS = {
  "New York": ["new york", "nyc", "new york city"],
  "Paris":    ["paris", "paris france", "france"],
  "Spain":    ["spain", "barcelona", "madrid"]
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
      searchMode = !searchMode;
      if (searchMode && flashX < 0) { flashX = width/2; flashY = height/2; }
      btnSearch.textContent = searchMode ? "Exit Search Mode" : "Search for Clues";
    };
  }

  if (btnNext) {
    btnNext.onclick = () => {
      sceneIndex = (sceneIndex + 1) % SCENES.length;
      flashX = flashY = -999;
      loadScene();
      feedback("", "");
      if (guessInput) { guessInput.value = ""; guessInput.focus(); }
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

  // draw photo
  if (imgOk && img) {
  // scale factor so the whole photo fits
  const scale = min(width / img.width, height / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const dx = (width - drawW) / 2;
  const dy = (height - drawH) / 2;
  image(img, dx, dy, drawW, drawH);
}

  

  // flashlight overlay (hole scales with canvas)
  const hole = int(min(width, height) * 0.42);
  cover.clear();
  cover.background(0);
  if (searchMode) {
    cover.erase();
    cover.circle(flashX, flashY, hole);
    cover.noErase();
  }
  image(cover, 0, 0);

  // hint text
  fill(255); noStroke();
  textSize(constrain(int(min(width, height) * 0.032), 12, 18));
  text(searchMode ? "Drag or move to aim the flashlight" : "Click “Search for Clues”", width/2, 20);
}

// interaction 
function mouseMoved()   { if (searchMode) setFlash(mouseX, mouseY); }
function mouseDragged() { if (searchMode) setFlash(mouseX, mouseY); }
function touchMoved() {
  if (searchMode) {
    setFlash(mouseX, mouseY);
    return false; // block scroll only in flashlight mode
  }
}
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

  feedback(ok ? "✅ Correct!" : "❌ Try again.", ok ? "ok" : "no");
}

function feedback(msg, cls = "") {
  if (!guessFeedback) return;
  guessFeedback.textContent = msg;
  guessFeedback.className = cls;
}
