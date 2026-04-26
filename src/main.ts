import * as THREE from 'three';
import { InputManager } from './InputManager';
import { Mode } from './Game';
import { createInitialState, updateState } from './gameState';
import { ObstacleSpawner } from './systems/ObstacleSpawner';
import { CollisionSystem } from './systems/CollisionSystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { AudioManager } from './audio/AudioManager';
import { createToonGradientMap } from './rendering/ToonMaterial';
import { createWaterMaterial } from './rendering/WaterMaterial';
import { EnvironmentSpawner } from './systems/EnvironmentSpawner';
import { TerrainSpawner } from './systems/TerrainSpawner';
import {
  OBSTACLE_START_DISTANCE, OBSTACLE_INTERVAL,
  GROUND_Y, CEILING_Y, FOG_DENSITY, DEATH_KNOCKBACK_VELOCITY,
} from './constants';

// ─── DOM Elements ────────────────────────────────────────────────
const titleScreen = document.getElementById('title-screen')!;
const gameoverScreen = document.getElementById('gameover-screen')!;
const scoreDisplay = document.getElementById('score-display')!;
const fpsDisplay = document.getElementById('fps-display')!;

// ─── Renderer ────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.prepend(renderer.domElement);

// ─── Scene ───────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8e3);
scene.fog = new THREE.FogExp2(0xffcc88, FOG_DENSITY);

// ─── Camera ──────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 200);
camera.position.set(15, 6, 12);
camera.lookAt(3, 5, 0);

// ─── Shared Toon Gradient Map ────────────────────────────────────
const toonGradient = createToonGradientMap();

function toonMat(color: number): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient });
}

// ─── Lighting ────────────────────────────────────────────────────
const sun = new THREE.DirectionalLight(0xffeedd, 1.8);
sun.position.set(50, 30, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 200;
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -20;
sun.shadow.bias = -0.00015;
scene.add(sun);
scene.add(sun.target);

scene.add(new THREE.AmbientLight(0x8899cc, 0.5));
scene.add(new THREE.HemisphereLight(0xffaa66, 0x445533, 0.6));

// ─── Sky ─────────────────────────────────────────────────────────
const skyGeo = new THREE.SphereGeometry(100, 48, 32);
const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    uSunDir: { value: new THREE.Vector3(0.65, 0.55, 0.25).normalize() },
  },
  vertexShader: `
    varying vec3 vWorldDir;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldDir = normalize(worldPos.xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uSunDir;
    varying vec3 vWorldDir;

    void main() {
      float h = vWorldDir.y;
      vec3 zenith   = vec3(0.10, 0.22, 0.43);
      vec3 upper    = vec3(0.18, 0.38, 0.62);
      vec3 mid      = vec3(0.35, 0.55, 0.78);
      vec3 lower    = vec3(0.55, 0.70, 0.85);
      vec3 horizon  = vec3(0.72, 0.82, 0.90);
      vec3 haze     = vec3(0.82, 0.78, 0.68);

      float t1 = smoothstep(0.6, 1.0, h);
      float t2 = smoothstep(0.2, 0.6, h);
      float t3 = smoothstep(-0.1, 0.2, h);
      float t4 = smoothstep(-0.25, -0.1, h);

      vec3 col = mix(haze, horizon, t4);
      col = mix(col, lower, t3);
      col = mix(col, mid, t2);
      col = mix(col, zenith, t1);

      // Sun glow
      float sunDot = dot(vWorldDir, uSunDir);
      float sunGlow = smoothstep(0.80, 0.995, sunDot);
      vec3 sunColor = vec3(1.0, 0.95, 0.7);
      col = mix(col, sunColor, sunGlow * 0.5);

      // Brighter inner sun disc
      float sunDisc = smoothstep(0.95, 0.995, sunDot);
      col = mix(col, vec3(1.0, 0.98, 0.9), sunDisc * 0.7);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.BackSide,
});
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

// Stylized sun disc
const sunGeo = new THREE.SphereGeometry(2.5, 16, 16);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff5e0 });
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
sunMesh.position.set(35, 22, -10);
scene.add(sunMesh);

// Procedural clouds
const clouds: THREE.Group[] = [];
for (let i = 0; i < 10; i++) {
  const cg = new THREE.Group();
  const cm = toonMat(0xffffff);
  for (let j = 0; j < 3; j++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.5 + Math.random() * 0.9, 6, 5), cm);
    s.position.set(j * 0.8 - 0.8, Math.random() * 0.3, Math.random() * 0.3);
    cg.add(s);
  }
  cg.position.set(
    Math.random() * 50 - 10,
    10 + Math.random() * 6,
    -6 - Math.random() * 5,
  );
  cg.scale.setScalar(0.7 + Math.random() * 1.8);
  cg.userData.initialX = cg.position.x;
  clouds.push(cg);
  scene.add(cg);
}

// ─── Ground (chunk-based dynamic terrain) ────────────────────────
const terrainSpawner = new TerrainSpawner(scene, toonMat(0x7ec850));

// Ocean water (far background, fills the horizon — large enough that edges are beyond fog)
const waterGeo = new THREE.PlaneGeometry(600, 200, 120, 40);
waterGeo.rotateX(-Math.PI / 2);
const waterMat: THREE.ShaderMaterial = createWaterMaterial();
const water = new THREE.Mesh(waterGeo, waterMat);
water.position.set(0, -2.0, -25);
water.renderOrder = 1;
scene.add(water);


// ─── Player Character ────────────────────────────────────────────
const playerGroup = new THREE.Group();

const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.6, 8, 12);
const playerBody = new THREE.Mesh(bodyGeo, toonMat(0xe8734a));
playerBody.castShadow = true;
playerGroup.add(playerBody);

const headGeo = new THREE.SphereGeometry(0.28, 12, 10);
const playerHead = new THREE.Mesh(headGeo, toonMat(0xffcc99));
playerHead.position.y = 0.7;
playerHead.castShadow = true;
playerGroup.add(playerHead);

const eyeGeo = new THREE.SphereGeometry(0.08, 6, 4);
const eyeWhiteMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGradient });
const eyePupilMat = new THREE.MeshToonMaterial({ color: 0x222222, gradientMap: toonGradient });
const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
leftEye.position.set(-0.1, 0.78, 0.24);
playerGroup.add(leftEye);
const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), eyePupilMat);
leftPupil.position.set(-0.1, 0.78, 0.3);
playerGroup.add(leftPupil);
const rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
rightEye.position.set(0.1, 0.78, 0.24);
playerGroup.add(rightEye);
const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), eyePupilMat);
rightPupil.position.set(0.1, 0.78, 0.3);
playerGroup.add(rightPupil);

const wingGeo = new THREE.BoxGeometry(0.55, 0.06, 0.18);
const wingMat = toonMat(0xfff8dc);
const wingL = new THREE.Mesh(wingGeo, wingMat);
wingL.position.set(-0.4, 0.2, 0);
wingL.castShadow = true;
playerGroup.add(wingL);
const wingR = new THREE.Mesh(wingGeo, wingMat);
wingR.position.set(0.4, 0.2, 0);
wingR.castShadow = true;
playerGroup.add(wingR);

playerGroup.position.set(0, 5, 0);
scene.add(playerGroup);

// ─── Systems ─────────────────────────────────────────────────────
const obstacleSpawner = new ObstacleSpawner(scene);
const collisionSystem = new CollisionSystem();
const particleSystem = new ParticleSystem(scene, 80);
const audio = new AudioManager();
const envSpawner = new EnvironmentSpawner(scene, toonMat);

// ─── Game State ──────────────────────────────────────────────────
const input = new InputManager();
let state = createInitialState();
// ─── Audio Init on First Interaction ─────────────────────────────
async function initAudio() {
  await audio.init();
  audio.load('jump', '/assets/audio/jump.ogg');
  audio.load('hit', '/assets/audio/hit.ogg');
  audio.load('score', '/assets/audio/score.ogg');
}

// ─── Game Loop ───────────────────────────────────────────────────
let lastTime = performance.now();
let fireflyTimer = 0;

function animate(time: number) {
  requestAnimationFrame(animate);

  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;
  input.update();

  // Init audio on interaction
  if (input.jumpStarted) initAudio();

  const prevState = state;
  state = updateState(state, input, dt);

  // ── Update Obstacles ──────────────────────────────────────────
  const activeObstacles = state.mode === Mode.Game
    ? obstacleSpawner.update(state.worldOffset, OBSTACLE_START_DISTANCE, OBSTACLE_INTERVAL)
    : [];

  if (state.mode === Mode.Title && prevState.mode !== Mode.Title) {
    obstacleSpawner.reset();
    envSpawner.reset();
    terrainSpawner.reset();
  }
  envSpawner.update(state.worldOffset);
  terrainSpawner.update(state.worldOffset);

  // ── Obstacle Collision Check ──────────────────────────────────
  if (state.mode === Mode.Game) {
    playerGroup.position.set(state.worldOffset, state.playerY, 0);
    const hit = collisionSystem.checkPlayerCollision(
      playerGroup,
      activeObstacles,
      state.playerY,
      CEILING_Y,
      GROUND_Y,
    );
    if (hit) {
      console.warn(`Obstacle collision death: playerY=${state.playerY.toFixed(2)} worldOffset=${state.worldOffset.toFixed(2)}`);
      state = {
        ...state,
        mode: Mode.GameOver,
        playerVelocityY: DEATH_KNOCKBACK_VELOCITY,
        gameoverTimer: 0,
      };
    }
  }

  // ── Sound Effects (after all state transitions) ───────────────
  if (state.mode === Mode.Game) {
    if (prevState.mode !== Mode.Game) {
      audio.playJump();
    }
    if (input.jumpStarted) {
      audio.playJump();
    }
    if (state.score > prevState.score) {
      audio.playScore();
      particleSystem.emitBurst(
        new THREE.Vector3(state.worldOffset + 10, state.playerY, 0),
        12, 0xffd700, 0.8, 2.5, 0.06,
      );
    }
  }
  if (state.mode === Mode.GameOver && prevState.mode === Mode.Game) {
    audio.playHit();
    particleSystem.emitBurst(
      new THREE.Vector3(state.worldOffset, state.playerY, 0),
      20, 0xff4444, 1.2, 3.0, 0.08,
    );
  }
  // Cloud parallax (very slow, sky layer)
  for (let i = 0; i < clouds.length; i++) {
    const cloud = clouds[i];
    const nativeX = cloud.userData.initialX;
    cloud.position.x = nativeX + state.worldOffset * 0.02;
    // Wrap when far behind
    if (cloud.position.x < state.worldOffset - 60) {
      cloud.userData.initialX += 100 + Math.random() * 30;
    }
  }

  particleSystem.update(dt);

  fireflyTimer += dt;
  if (fireflyTimer > 0.5) {
    fireflyTimer = 0;
    const fx = state.worldOffset + Math.random() * 30 - 5;
    const fy = 1 + Math.random() * 8;
    const fz = -2 + Math.random() * 3;
    particleSystem.emitFirefly(new THREE.Vector3(fx, fy, fz));
  }

  // ── Update Scene Objects ──────────────────────────────────────

  playerGroup.position.set(state.worldOffset, state.playerY, 0);
  playerGroup.rotation.z = state.playerRotation;

  // Wing animation
  const wingFlap = state.mode === Mode.Game
    ? Math.sin(time * 0.025) * 0.5
    : Math.sin(time * 0.015) * 0.2;
  wingL.rotation.z = wingFlap;
  wingR.rotation.z = -wingFlap;

  // Sky moves with camera so it's always centered
  sky.position.x = state.worldOffset;

  // Water follows camera and animates
  water.position.x = state.worldOffset;
  waterMat.uniforms.uTime.value = time * 0.001;

  // Shadow camera follows player — must update sun.position since Three.js
  // derives the shadow camera position from the light's world position each frame
  sun.position.set(state.worldOffset + 35, 30, 10);
  sun.target.position.set(state.worldOffset, 3, 0);

  // Sun disc visible in sky (distant, follows camera at fixed offset)
  sunMesh.position.x = state.worldOffset + 35;

  const targetCamX = state.worldOffset + 15;
  const targetCamY = state.playerY + 5;
  camera.position.lerp(
    new THREE.Vector3(targetCamX, targetCamY, 12),
    0.05,
  );
  camera.lookAt(state.worldOffset + 3, state.playerY, 0);

  // ── UI ─────────────────────────────────────────────────────────
  if (state.mode === Mode.Title) {
    titleScreen.classList.remove('hidden');
    gameoverScreen.classList.add('hidden');
    scoreDisplay.classList.add('hidden');
  } else if (state.mode === Mode.Game) {
    titleScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    scoreDisplay.classList.remove('hidden');
    scoreDisplay.textContent = String(state.score).padStart(4, '0');
  } else {
    titleScreen.classList.add('hidden');
    gameoverScreen.classList.remove('hidden');
    scoreDisplay.classList.remove('hidden');
  }

  fpsDisplay.textContent = `FPS: ${Math.round(1 / Math.max(dt, 0.001))}`;

  renderer.render(scene, camera);
}

// ─── Resize Handler ──────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(animate);
