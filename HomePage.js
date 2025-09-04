const NullSound = { isPlaying: () => false, stop: () => {}, play: () => {}, setVolume: () => {}, currentTime: () => 0 };

let doorSound = NullSound, jbSound = NullSound, amplitude;
let doors = [];


let DOOR_W = 120;
let DOOR_H = 200;
let ARCH_H = 30;
const OPEN_MAX = Math.PI * 0.6;
const OPEN_LERP = 0.15;
let THICKNESS = 14;

const MUSIC_KEY = 'jb_music_state_v1'; // shared with year pages

function saveMusicState() {
  const volEl = document.getElementById('vol');
  const vol = volEl ? parseFloat(volEl.value || '0.5') : 0.5;
  const state = {
    playing: jbSound.isPlaying ? jbSound.isPlaying() : false,
    time:    jbSound.currentTime ? jbSound.currentTime() : 0,
    volume:  vol
  };
  try { localStorage.setItem(MUSIC_KEY, JSON.stringify(state)); } catch {}
}

function maybeResumeJB() {
  try {
    const saved = JSON.parse(localStorage.getItem(MUSIC_KEY) || '{}');
    if (!saved.playing || !jbSound.play) return;
    if (!jbSound.isPlaying()) {
      const vol = typeof saved.volume === 'number' ? saved.volume : 0.5;
      const cue = typeof saved.time === 'number' ? saved.time : 0;
      jbSound.setVolume(vol);
      jbSound.play(0, 1, vol, cue);
    }
  } catch {}
}

function preload() {
  if (typeof loadSound === 'function') {
    doorSound = loadSound('assets/Airport sound.mp3');
    jbSound   = loadSound('assets/DAISIES.mp3');
  }
}

//  helper
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// compute sizes & (re)build doors based on current canvas
function layoutDoors() {
  doors = [];

  // door size scales with screen; clamp so it’s usable on phones & laptops
  const doorW = clamp(width * 0.18, 80, 170);
  const doorH = clamp(height * 0.48, 140, 320);
  const archH = doorH * 0.14;
  const thick = clamp(doorW * 0.12, 10, 18);

  // write back so Door drawing uses current values
  DOOR_W = doorW;
  DOOR_H = doorH;
  ARCH_H = archH;
  THICKNESS = thick;

  // positions: evenly spaced across, near top third
  const labels = ["Gate Freshman", "Gate Sophomore", "Gate Junior", "Gate Senior"];
  const spacing = width / (labels.length + 1);
  const yTop = clamp(height * 0.18, 60, height * 0.28);

  // adjust text size for labels
  textSize(clamp(width * 0.028, 10, 18));

  for (let i = 0; i < labels.length; i++) {
    const xCenter = (i + 1) * spacing;
    doors.push(new Door(xCenter - DOOR_W / 2, yTop, labels[i], DOOR_W, DOOR_H));
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layoutDoors();              //  rebuild on resize
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);

  // volume slider
  const vol = document.getElementById('vol');
  const volVal = document.getElementById('volVal');
  if (vol) {
    const v = parseFloat(vol.value || '0.5');
    doorSound.setVolume(v); jbSound.setVolume(v);
    if (volVal) volVal.textContent = v.toFixed(2);
    vol.addEventListener('input', () => {
      const nv = parseFloat(vol.value || '0.5');
      doorSound.setVolume(nv); jbSound.setVolume(nv);
      if (volVal) volVal.textContent = nv.toFixed(2);
      saveMusicState();
    });
  }

  // play/stop JB (home controls music)
  const btn = document.getElementById('toggle-sound');
  if (btn) {
    btn.addEventListener('click', () => {
      if (!jbSound.isPlaying()) jbSound.play();
      else jbSound.stop();
      updateSoundButton();
      saveMusicState();
    });
  }

  // resume audio if coming from a year page (and unlock on first tap)
  document.addEventListener('pointerdown', () => {
    if (typeof getAudioContext === 'function') { try { getAudioContext().resume(); } catch {} }
    maybeResumeJB();
  }, { once: true });
  maybeResumeJB();

  window.addEventListener('beforeunload', saveMusicState);

  amplitude = new p5.Amplitude();

  layoutDoors();              // initial layout
  updateSoundButton();
}

function draw() {
  clear();
  for (const d of doors) d.show();

  // little audio circle (also scales a bit with screen)
  const size = map(amplitude.getLevel(), 0, 0.6, 10, clamp(min(width, height) * 0.18, 120, 240), true);
  noStroke(); fill(255, 240); circle(40, 60, size);
}

function mousePressed() {
  routeIfClickOnDoor(mouseX, mouseY);
}

function routeIfClickOnDoor(mx, my) {
  for (const d of doors) {
    if (!d.contains(mx, my)) continue;

    // keep JB playing
    try { doorSound.stop(); doorSound.play(); } catch {}
    saveMusicState();

    const ROUTES = {
      freshman:  'Freshman.html',
      sophomore: 'Sophomore.html',
      junior:    'Junior.html',
      senior:    'Senior.html'
    };

    const label = d.label.toLowerCase();
    let target =
      label.includes('freshman')  ? ROUTES.freshman  :
      label.includes('sophomore') ? ROUTES.sophomore :
      label.includes('junior')    ? ROUTES.junior    :
      label.includes('senior')    ? ROUTES.senior    : null;

    if (!target) return;
    setTimeout(() => { window.location.href = target; }, 120);
    return;
  }
}

function updateSoundButton() {
  const btn = document.getElementById('toggle-sound');
  const label = document.getElementById('music-label');  // update the side label too
  const playing = jbSound.isPlaying();
  if (btn) btn.textContent = playing ? '⏹' : '▶';
  if (label) label.textContent = playing ? 'Stop Music' : 'Play Music';
}

// Class  Door 
class Door {
  constructor(x, y, label, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h; this.label = label;
    this.angle = 0; this.targetAngle = 0; this.openDir = -1;
  }

  show() {
    const hover = this.contains(mouseX, mouseY);
    this.targetAngle = hover ? this.openDir * OPEN_MAX : 0;
    this.angle += (this.targetAngle - this.angle) * OPEN_LERP;

    this.drawFrame();
    this.drawSwingPanel();

    push();
    textAlign(CENTER, CENTER);
    stroke(0, 180); strokeWeight(3); fill(255);
    text(this.label, this.x + this.w / 2, this.y + this.h + 18);
    pop();
  }

  drawFrame() {
    noStroke();
    fill(255);
    rect(this.x + 4, this.y + ARCH_H + 4, this.w - 8, this.h - ARCH_H - 8, 8);
    arc(this.x + this.w / 2, this.y + ARCH_H, this.w - 8, 70, PI, 0);

    noFill(); stroke(30); strokeWeight(2);
    rect(this.x, this.y + ARCH_H, this.w, this.h - ARCH_H, 12);
    arc(this.x + this.w / 2, this.y + ARCH_H, this.w, 70, PI, 0);
  }

  drawSwingPanel() {
    const x = this.x, y = this.y + ARCH_H, w = this.w, h = this.h - ARCH_H;
    const a = this.angle, cosA = Math.cos(a), sinA = Math.sin(a);
    const xR = x + w * cosA;
    const sideW = THICKNESS * Math.abs(sinA);

    const tl = { x, y }, tr = { x: xR, y }, br = { x: xR, y: y + h }, bl = { x, y: y + h };

    noStroke();
    fill(a >= 0 ? 220 : 240);
    quad(tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y);

    const sideDir = (a < 0) ? 1 : -1;
    const s_tr = { x: tr.x + sideDir * sideW, y: tr.y };
    const s_br = { x: br.x + sideDir * sideW, y: br.y };
    fill(200);
    quad(tr.x, tr.y, s_tr.x, s_tr.y, s_br.x, s_br.y, br.x, br.y);

    // handle
    push();
    const handleX = (tr.x + bl.x) / 2 + (sideDir === 1 ? -10 : 10);
    const handleY = y + h * 0.45;
    const squish = Math.max(0.15, Math.abs(cosA));
    translate(handleX, handleY); scale(squish, 1);
    noStroke(); fill(120); ellipse(0, 0, 12, 12);
    pop();
  }

  contains(mx, my) {
    return mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h;
  }
}