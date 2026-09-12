import * as THREE from 'three';
import { CameraController } from '../game/CameraController';
import { CollisionSystem } from '../game/CollisionSystem';
import { DEFAULT_FLIGHT_CONFIG, initialFlightState, stepFlight } from '../game/FlightPhysics';
import { InputManager } from '../game/InputManager';
import type { FlightState, Vec3 } from '../game/types';
import { HONGJECHEON_CONFIG as config } from '../areas/hongjecheon/config';
import type { LoadedAreaData } from '../areas/types';
import { crossedCheckpoint } from '../utils/math';
import { World, type Quality } from '../world/World';
import { Hud } from '../ui/Hud';
import { MiniMap } from '../ui/MiniMap';
import { MissionPanel } from '../ui/MissionPanel';

export class DroneLabApp {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly world: World;
  private readonly cameraController: CameraController;
  private readonly collision: CollisionSystem;
  private readonly input = new InputManager();
  private readonly hud = new Hud();
  private readonly minimap: MiniMap;
  private readonly mission: MissionPanel;
  private flight: FlightState = initialFlightState(config.start, config.startYaw);
  private running = false;
  private started = false;
  private crashed = false;
  private completed = false;
  private checkpoint = 0;
  private lastFrame = performance.now();
  private quality: Quality;
  private animationFrame = 0;

  constructor(canvas: HTMLCanvasElement, data: LoadedAreaData) {
    this.quality = this.readQuality();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality !== 'low', powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = this.quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(67, 1, 0.1, 1800);
    this.world = new World(data.snapshot, data.elevation, this.quality);
    this.cameraController = new CameraController(this.camera);
    this.collision = new CollisionSystem(this.world.colliders, DEFAULT_FLIGHT_CONFIG.collisionRadius);
    this.minimap = new MiniMap(document.getElementById('map') as HTMLCanvasElement, data.snapshot);
    this.mission = new MissionPanel(() => this.reset(false));
    this.bindUi();
    this.resize();
    this.reset(false);
  }

  start() {
    this.lastFrame = performance.now();
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;
    if (this.running) this.update(dt);
    this.cameraController.update(this.flight, dt);
    this.world.updateDrone(this.flight.position, this.flight.yaw, this.flight.velocity, this.flight.elapsed);
    this.world.updateStreaming(this.flight.position);
    this.renderer.render(this.world.scene, this.camera);
    this.hud.update(this.flight, this.crashed ? 'COLLISION' : this.running ? 'IN FLIGHT' : this.started ? 'PAUSED' : 'STANDBY', this.world.groundHeightAt(this.flight.position.x, this.flight.position.z));
    this.hud.ambient(this.mission.mode === 'explore' ? `NEXT PLACE ${Math.min(this.checkpoint + 1, config.checkpoints.length)} / ${config.checkpoints.length}` : 'FREE FLIGHT · HONGJECHEON', this.flight.elapsed);
    this.minimap.draw(this.flight, this.checkpoint, this.mission.mode === 'explore');
    this.animationFrame = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    const previous = { ...this.flight.position };
    const wind = Number((document.getElementById('wind') as HTMLSelectElement).value);
    const result = stepFlight(this.flight, this.input.snapshot(), dt, DEFAULT_FLIGHT_CONFIG, config.bounds, wind, this.world.groundHeightAt);
    this.flight = result.state;
    if (result.hitBoundary) this.hud.notify('MVP 비행구역 경계입니다 · 방향을 바꿔주세요', this.flight.elapsed);
    const altitudeAboveGround = this.flight.position.y - this.world.groundHeightAt(this.flight.position.x, this.flight.position.z);
    if (result.hitAltitudeLimit && altitudeAboveGround >= DEFAULT_FLIGHT_CONFIG.maxAltitude - 0.01) this.hud.notify('최대 지상고도 100m', this.flight.elapsed);
    const collision = this.collision.check(this.flight.position);
    if (collision) {
      this.crashed = true;
      this.running = false;
      this.flight.velocity = { x: 0, y: 0, z: 0 };
      this.hud.notify(`충돌 · ${collision.label ?? '구조물'} · R로 다시 시작`, this.flight.elapsed, 30);
      this.renderControls();
      return;
    }
    if (this.mission.mode === 'explore' && this.checkpoint < config.checkpoints.length) {
      const target = this.world.checkpointPositions[this.checkpoint];
      const from: Vec3 = this.checkpoint === 0 ? this.world.startPosition : this.world.checkpointPositions[this.checkpoint - 1];
      if (crossedCheckpoint(previous, this.flight.position, target, from, 6)) {
        this.checkpoint += 1;
        if (this.checkpoint === config.checkpoints.length) {
          this.completed = true;
          this.running = false;
          this.hud.notify(`탐험 완료 · ${this.flight.elapsed.toFixed(1)}초`, this.flight.elapsed, 30);
        } else {
          this.hud.notify(`${config.checkpoints[this.checkpoint - 1].title} · 통과!`, this.flight.elapsed);
        }
        this.mission.render(this.checkpoint, this.completed);
        this.world.setCheckpointState(this.checkpoint, true);
        this.renderControls();
      }
    }
  }

  private bindUi() {
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', (event) => {
      if (event.repeat || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement) return;
      const key = event.key.toLowerCase();
      if (key === 'c') this.toggleCamera();
      if (key === 'p') this.togglePause();
      if (key === 'r') this.reset(true);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.running) {
        this.running = false;
        this.input.clear();
        this.renderControls();
      }
    });
    document.getElementById('start')!.addEventListener('click', () => {
      if (this.crashed || this.completed) this.reset(false);
      this.started = true;
      this.running = true;
      this.hud.notify('이륙 준비 완료 · ↑로 상승하세요', this.flight.elapsed);
      this.renderControls();
    });
    document.getElementById('pause')!.addEventListener('click', () => this.togglePause());
    document.getElementById('reset')!.addEventListener('click', () => this.reset(true));
    document.getElementById('camera')!.addEventListener('click', () => this.toggleCamera());
    document.getElementById('quality')!.addEventListener('click', () => this.cycleQuality());
  }

  private togglePause() {
    if (this.crashed || this.completed) return;
    this.started = true;
    this.running = !this.running;
    this.input.clear();
    this.renderControls();
  }

  private toggleCamera() {
    const mode = this.cameraController.toggle();
    this.world.drone.visible = mode !== 'fpv';
    (document.getElementById('camera') as HTMLButtonElement).innerHTML = `${mode === 'fpv' ? '1인칭 시점' : '추적 시점'} <kbd>C</kbd>`;
  }

  private reset(notify: boolean) {
    this.flight = initialFlightState(this.world.startPosition, config.startYaw);
    this.running = false;
    this.started = false;
    this.crashed = false;
    this.completed = false;
    this.checkpoint = 0;
    this.input.clear();
    this.cameraController.reset();
    this.world.setCheckpointState(0, this.mission.mode === 'explore');
    this.mission.render(0, false);
    if (notify) this.hud.notify('출발점으로 돌아왔습니다', 0);
    this.renderControls();
  }

  private renderControls() {
    const start = document.getElementById('start') as HTMLButtonElement;
    start.innerHTML = `${this.crashed || this.completed ? '다시 비행하기' : this.running ? '비행 중' : this.started ? '비행 계속' : '비행 시작'} <span>↗</span>`;
    (document.getElementById('pause') as HTMLButtonElement).innerHTML = `${this.running ? '일시정지' : '계속하기'} <kbd>P</kbd>`;
  }

  private readQuality(): Quality {
    const stored = localStorage.getItem('drone-lab-quality');
    return stored === 'low' || stored === 'medium' || stored === 'high' ? stored : matchMedia('(max-width: 700px)').matches ? 'low' : 'high';
  }

  private cycleQuality() {
    const values: Quality[] = ['low', 'medium', 'high'];
    this.quality = values[(values.indexOf(this.quality) + 1) % values.length];
    localStorage.setItem('drone-lab-quality', this.quality);
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.shadowMap.enabled = this.quality === 'high';
    this.world.setQuality(this.quality);
    document.querySelector<HTMLButtonElement>('#quality b')!.textContent = this.quality.toUpperCase();
    this.hud.notify(`그래픽 품질 · ${this.quality.toUpperCase()}`, this.flight.elapsed);
  }

  private pixelRatio() {
    const cap = this.quality === 'low' ? 1 : this.quality === 'medium' ? 1.5 : 2;
    return Math.min(window.devicePixelRatio || 1, cap);
  }

  private resize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    const label = document.querySelector<HTMLButtonElement>('#quality b');
    if (label) label.textContent = this.quality.toUpperCase();
  };

  dispose() {
    cancelAnimationFrame(this.animationFrame);
    this.input.dispose();
    this.renderer.dispose();
  }
}
