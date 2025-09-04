const W = 450, H = 550;
const HOLE_DIAM = 210;

const SCENES = [
  { name: "Boston", bg: "assets/boston.jpg" },
  { name: "Las Vegas",    bg: "assets/vegas.jpg" },
  { name: "Hawaii",    bg: "assets/hawaii.jpg" }
];

// Accept common aliases for answers
const ANSWERS = {
  "Boston": ["boston"],
  "Las Vegas":["las vegas", "vegas"],
  "Hawaii":    ["honolulu","hawaii"]
};

// music resume key (shared with Home)
const MUSIC_KEY = "jb_music_state_v1";
let jbSound = null;

// state
let sceneIndex = 0;
let currentImg = null;
let imgOk = false;
let searchMode = false;
let flashX = -999, flashY = -999;
let cover; // black overlay with a circular hole

// buttons / inputs
let btnSearch, btnNext, btnBack;
let guessForm, guessInput, guessFeedback;

function preload() {
  if (typeof loadSound === "function") {
    jbSound = loadSound("assets/DAISIES.mp3");
  }
}

function setup() {
  const c = createCanvas(W, H);
  c.parent("sketch");

  btnSearch = document.getElementById("search-mode");
  btnNext   = document.getElementById("next-memory");
  btnBack   = document.getElementById("back-home");

  // NEW: guess UI refs
  guessForm     = document.getElementById("guess-form");
  guessInput    = document.getElementById("guess-input");
  guessFeedback = document.getElementById("guess-feedback");

  textAlign(CENTER, CENTER);
  cover = createGraphics(W, H);

  if (btnSearch) {
    btnSearch.onclick = () => {
      searchMode = !searchMode;
      if (searchMode && flashX < 0) {
        flashX = width / 2;
        flashY = height / 2;
      }
      btnSearch.textContent = searchMode ? "Exit Search Mode" : "Search for Clues";
    };
  }

  if (btnNext) {
    btnNext.onclick = () => {
      sceneIndex = (sceneIndex + 1) % SCENES.length;
      flashX = flashY = -999;
      loadSceneImage(sceneIndex);
      // reset guess UI
      setFeedback("", "");
      if (guessInput) guessInput.value = "";
      if (guessInput) guessInput.focus();
    };
  }

  if (btnBack) {
    btnBack.onclick = () => {
      // save current music position so Home can resume
      try {
        const prev = JSON.parse(localStorage.getItem(MUSIC_KEY) || "{}");
        const vol  = typeof prev.volume === "number" ? prev.volume : 0.5;
        const state = {
          playing: (jbSound?.isPlaying?.() ?? false) || prev.playing || false,
          time:    jbSound?.currentTime ? jbSound.currentTime() : (prev.time || 0),
          volume:  vol
        };
        localStorage.setItem(MUSIC_KEY, JSON.stringify(state));
      } catch {}
      window.location.href = "HomePage.html";
    };
  }

  //submit handler for guesses
  if (guessForm) {
    guessForm.addEventListener("submit", (e) => {
      e.preventDefault();
      checkGuess();
    });
  }

  // Enter key UX: if user presses Enter in input, form submits anyway
  // resume the music after first tap/click
  document.addEventListener("pointerdown", () => {
    if (typeof getAudioContext === "function") getAudioContext().resume();
    resumeJB();
  }, { once: true });

  // load first image
  loadSceneImage(sceneIndex);
  // small hint when page loads
  setFeedback("Guess the city!", "hint");
  if (guessInput) guessInput.focus();
}

function draw() {
  background(0);

  // city photo
  if (imgOk && currentImg) {
    image(currentImg, 0, 0, width, height);
  } else {
    fill(220); noStroke(); textSize(18);
    text(`Image not found:\n${SCENES[sceneIndex].bg}`, width/2, height/2);
  }

  // build the black cover
  cover.clear();
  cover.background(0);
  if (searchMode) {
    cover.erase();
    cover.circle(flashX, flashY, HOLE_DIAM);
    cover.noErase();
  }
  image(cover, 0, 0, width, height);

  fill(255); noStroke(); textSize(14);
  text(searchMode ? "Drag or move to aim the flashlight" : "Click “Search for Clues”", width/2, 20);
}

// flashlight movement
function mouseDragged() { if (searchMode) updateFlash(); }
function mouseMoved()   { if (searchMode) updateFlash(); }
function updateFlash()  { flashX = mouseX; flashY = mouseY; }

// helpers
function loadSceneImage(i) {
  const path = SCENES[i]?.bg;
  if (!path) { currentImg = null; imgOk = false; return; }
  currentImg = loadImage(path, () => imgOk = true, () => imgOk = false);
}

function resumeJB() {
  if (!jbSound) return;
  const saved = JSON.parse(localStorage.getItem(MUSIC_KEY) || "{}");
  if (!saved.playing) return;
  const vol = typeof saved.volume === "number" ? saved.volume : 0.5;
  const cue = typeof saved.time === "number" ? saved.time : 0;
  if (!jbSound.isPlaying()) {
    jbSound.setVolume(vol);
    jbSound.play(0, 1, vol, cue);
  }
}

// Guessing Part
function normalize(s) {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function checkGuess() {
  if (!guessInput) return;
  const user = normalize(guessInput.value);
  if (!user) {
    setFeedback("Type a city first.", "hint");
    return;
  }

  const correctName = SCENES[sceneIndex].name;
  const accepted = (ANSWERS[correctName] || [correctName.toLowerCase()]);

  const isCorrect = accepted.some(a => user === a);
  if (isCorrect) {
    setFeedback("✅ Correct!", "ok");
  } else {
    setFeedback("❌ Try again.", "no");
  }
}

function setFeedback(msg, kind = "") {
  if (!guessFeedback) return;
  guessFeedback.textContent = msg;
  guessFeedback.className = kind;
}

// save position on leave
window.addEventListener("beforeunload", () => {
  try {
    const prev = JSON.parse(localStorage.getItem(MUSIC_KEY) || "{}");
    const vol  = typeof prev.volume === "number" ? prev.volume : 0.5;
    const state = {
      playing: jbSound?.isPlaying?.() || false,
      time: jbSound?.currentTime ? jbSound.currentTime() : (prev.time || 0),
      volume: vol
    };
    localStorage.setItem(MUSIC_KEY, JSON.stringify(state));
  } catch {}
});