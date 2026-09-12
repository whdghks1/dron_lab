import * as THREE from 'three';
import { CameraController } from '../game/CameraController';
import { CollisionSystem } from '../game/CollisionSystem';
import { DEFAULT_FLIGHT_CONFIG, initialFlightState, stepFlight } from '../game/FlightPhysics';
import { InputManager } from '../game/InputManager';
import { canLand } from '../game/Landing';
import { FlightRecorder } from '../game/FlightRecorder';
import type { FlightState, Vec3 } from '../game/types';
import type { AreaConfig, LoadedAreaData } from '../areas/types';
import { crossedCheckpoint } from '../utils/math';
import { World, type Quality } from '../world/World';
import { Hud } from '../ui/Hud';
import { MiniMap } from '../ui/MiniMap';
import { MissionPanel } from '../ui/MissionPanel';
import { SafetyPanel } from '../ui/SafetyPanel';

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
  private readonly recorder = new FlightRecorder();
  private readonly config: AreaConfig;
  private flight: FlightState;
  private running = false;
  private started = false;
  private crashed = false;
  private completed = false;
  private landed = false;
  private replaying = false;
  private replayTime = 0;
  private replayReturnState?: FlightState;
  private checkpoint = 0;
  private lastFrame = performance.now();
  private quality: Quality;
  private animationFrame = 0;
  private bestTime?: number;
  private performanceFrames = 0;
  private performanceWindow = performance.now();

  constructor(canvas: HTMLCanvasElement, data: LoadedAreaData) {
    this.config = data.config;
    this.flight = initialFlightState(data.config.start, data.config.startYaw);
    this.bestTime = this.readBestTime();
    this.quality = this.readQuality();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality !== 'low', powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = this.quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(67, 1, 0.1, 1800);
    this.world = new World(data.config, data.snapshot, data.elevation, this.quality, data.chunkSource, data.visuals);
    this.cameraController = new CameraController(this.camera);
    this.collision = new CollisionSystem(this.world.colliders, DEFAULT_FLIGHT_CONFIG.collisionRadius);
    this.minimap = new MiniMap(document.getElementById('map') as HTMLCanvasElement, data.minimap, data.config);
    this.mission = new MissionPanel(data.config, () => this.reset(false), this.bestTime);
    new SafetyPanel(data.airspace);
    document.title = `DRONE LAB — ${data.config.name}`;
    document.getElementById('area-name')!.textContent = data.config.name;
    document.getElementById('area-description')!.textContent = `${data.config.subtitle}의 실제 공간 관계를 따라 비행해 보세요.`;
    const credits = [...new Map((data.visuals?.buildingPhotoTextures ?? []).map((photo) => [photo.sourceUrl ?? photo.attribution, photo])).values()];
    const creditElement = document.getElementById('visual-credits')!;
    if (credits.length > 0) {
      creditElement.append(' · 건물 사진: ');
      credits.forEach((photo, index) => {
        if (index > 0) creditElement.append(', ');
        if (photo.sourceUrl) {
          const source = document.createElement('a');
          source.textContent = photo.attribution;
          source.href = photo.sourceUrl;
          source.target = '_blank';
          source.rel = 'noreferrer';
          creditElement.append(source);
        } else creditElement.append(photo.attribution);
        creditElement.append(' (');
        if (photo.licenseUrl) {
          const license = document.createElement('a');
          license.textContent = photo.license;
          license.href = photo.licenseUrl;
          license.target = '_blank';
          license.rel = 'noreferrer';
          creditElement.append(license);
        } else creditElement.append(photo.license);
        creditElement.append(')');
      });
    }
    this.bindUi();
    this.resize();
    this.reset(false);
  }

  async prepare() {
    await this.world.prepare(this.flight.position);
  }

  start() {
    this.lastFrame = performance.now();
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;
    if (this.replaying) this.updateReplay(dt);
    else if (this.running) this.update(dt);
    this.cameraController.update(this.flight, dt);
    this.world.updateDrone(this.flight.position, this.flight.yaw, this.flight.velocity, this.flight.elapsed);
    this.world.updateStreaming(this.flight.position);
    this.renderer.render(this.world.scene, this.camera);
    this.updatePerformance(now);
    this.hud.update(this.flight, this.replaying ? 'REPLAY' : this.crashed ? 'COLLISION' : this.landed ? 'LANDED' : this.running ? 'IN FLIGHT' : this.started ? 'PAUSED' : 'STANDBY', this.world.groundHeightAt(this.flight.position.x, this.flight.position.z));
    const ambient = this.replaying ? `FLIGHT REPLAY · ${this.replayTime.toFixed(1)} / ${this.recorder.duration.toFixed(1)} SEC`
      : this.completed ? 'MISSION COMPLETE · SAFE LANDING'
      : this.mission.mode !== 'explore' ? `FREE FLIGHT · ${this.config.name}`
      : this.checkpoint >= this.config.checkpoints.length ? 'RETURN TO BASE · LANDING REQUIRED'
      : `NEXT PLACE ${this.checkpoint + 1} / ${this.config.checkpoints.length}`;
    this.hud.ambient(ambient, this.flight.elapsed);
    this.minimap.draw(this.flight, this.checkpoint, this.mission.mode === 'explore');
    this.animationFrame = requestAnimationFrame(this.frame);
  };

  private updatePerformance(now: number) {
    this.performanceFrames += 1;
    const elapsed = now - this.performanceWindow;
    if (elapsed < 500) return;
    const fps = Math.round(this.performanceFrames * 1000 / elapsed);
    this.hud.updatePerformance(fps, this.world.streamingStats, this.renderer.info.memory);
    this.performanceFrames = 0;
    this.performanceWindow = now;
  }

  private update(dt: number) {
    const previous = { ...this.flight.position };
    const wind = Number((document.getElementById('wind') as HTMLSelectElement).value);
    const input = this.input.snapshot();
    const result = stepFlight(this.flight, input, dt, DEFAULT_FLIGHT_CONFIG, this.config.bounds, wind, this.world.groundHeightAt);
    this.flight = result.state;
    if (this.recorder.record(this.flight)) {
      this.world.setFlightTrail(this.recorder.positions);
      this.renderControls();
    }
    if (result.hitBoundary) this.hud.notify('MVP 비행구역 경계입니다 · 방향을 바꿔주세요', this.flight.elapsed);
    const altitudeAboveGround = this.flight.position.y - this.world.groundHeightAt(this.flight.position.x, this.flight.position.z);
    if (result.hitAltitudeLimit && altitudeAboveGround >= DEFAULT_FLIGHT_CONFIG.maxAltitude - 0.01) this.hud.notify('최대 지상고도 100m', this.flight.elapsed);
    const collision = this.collision.check(this.flight.position);
    if (collision) {
      this.crashed = true;
      this.running = false;
      this.flight.velocity = { x: 0, y: 0, z: 0 };
      this.recorder.record(this.flight, true);
      this.world.setFlightTrail(this.recorder.positions);
      this.hud.notify(`충돌 · ${collision.label ?? '구조물'} · R로 다시 시작`, this.flight.elapsed, 30);
      this.renderControls();
      return;
    }
    if (this.mission.mode === 'explore' && this.checkpoint < this.config.checkpoints.length) {
      const target = this.world.checkpointPositions[this.checkpoint];
      const from: Vec3 = this.checkpoint === 0 ? this.world.startPosition : this.world.checkpointPositions[this.checkpoint - 1];
      if (crossedCheckpoint(previous, this.flight.position, target, from, 6)) {
        this.checkpoint += 1;
        if (this.checkpoint === this.config.checkpoints.length) {
          this.hud.notify('모든 장소 통과 · 출발 패드로 돌아가 착륙하세요', this.flight.elapsed, 8);
        } else {
          this.hud.notify(`${this.config.checkpoints[this.checkpoint - 1].title} · 통과!`, this.flight.elapsed);
        }
        this.mission.render(this.checkpoint, this.completed);
        this.world.setCheckpointState(this.checkpoint, true);
        this.renderControls();
      }
    }
    const groundHeight = this.world.groundHeightAt(this.flight.position.x, this.flight.position.z);
    if (canLand({
      position: this.flight.position,
      velocity: this.flight.velocity,
      pad: this.config.start,
      groundHeight,
      descending: input.vertical < 0,
    })) {
      if (this.mission.mode === 'explore' && this.checkpoint < this.config.checkpoints.length) {
        this.hud.notify('탐험 지점을 먼저 모두 통과하세요', this.flight.elapsed);
      } else {
        this.completeLanding();
      }
    }
  }

  private completeLanding() {
    this.running = false;
    this.landed = true;
    this.flight.velocity = { x: 0, y: 0, z: 0 };
    this.recorder.record(this.flight, true);
    this.world.setFlightTrail(this.recorder.positions);
    if (this.mission.mode === 'explore') {
      this.completed = true;
      if (this.bestTime === undefined || this.flight.elapsed < this.bestTime) {
        this.bestTime = this.flight.elapsed;
        localStorage.setItem(this.bestTimeKey, String(this.bestTime));
      }
      this.mission.render(this.checkpoint, true, this.bestTime);
      this.hud.notify(`탐험 완료 · 안전 착륙 · ${this.flight.elapsed.toFixed(1)}초`, this.flight.elapsed, 30);
    } else {
      this.hud.notify('안전하게 착륙했습니다', this.flight.elapsed, 10);
    }
    this.renderControls();
  }

  private bindUi() {
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', (event) => {
      if (event.repeat || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement) return;
      const key = event.key.toLowerCase();
      if (key === 'c') this.toggleCamera();
      if (key === 'p') this.togglePause();
      if (key === 'r') this.reset(true);
      if (key === 'l') this.toggleReplay();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.running) {
        this.running = false;
        this.input.clear();
        this.renderControls();
      }
    });
    document.getElementById('start')!.addEventListener('click', () => {
      if (this.replaying) this.reset(false);
      if (this.crashed || this.completed) this.reset(false);
      this.started = true;
      this.landed = false;
      this.running = true;
      this.hud.notify('이륙 준비 완료 · ↑로 상승하세요', this.flight.elapsed);
      this.renderControls();
    });
    document.getElementById('pause')!.addEventListener('click', () => this.togglePause());
    document.getElementById('reset')!.addEventListener('click', () => this.reset(true));
    document.getElementById('camera')!.addEventListener('click', () => this.toggleCamera());
    document.getElementById('replay')!.addEventListener('click', () => this.toggleReplay());
    document.getElementById('quality')!.addEventListener('click', () => this.cycleQuality());
  }

  private togglePause() {
    if (this.crashed || this.completed || this.replaying) return;
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
    this.flight = initialFlightState(this.world.startPosition, this.config.startYaw);
    this.running = false;
    this.started = false;
    this.crashed = false;
    this.completed = false;
    this.landed = false;
    this.replaying = false;
    this.replayTime = 0;
    this.replayReturnState = undefined;
    this.checkpoint = 0;
    this.input.clear();
    this.cameraController.reset();
    this.recorder.reset(this.flight);
    this.world.setFlightTrail(this.recorder.positions);
    this.world.setCheckpointState(0, this.mission.mode === 'explore');
    this.mission.render(0, false, this.bestTime);
    if (notify) this.hud.notify('출발점으로 돌아왔습니다', 0);
    this.renderControls();
  }

  private renderControls() {
    const start = document.getElementById('start') as HTMLButtonElement;
    start.innerHTML = `${this.crashed || this.completed ? '다시 비행하기' : this.landed ? '다시 이륙' : this.running ? '비행 중' : this.started ? '비행 계속' : '비행 시작'} <span>↗</span>`;
    (document.getElementById('pause') as HTMLButtonElement).innerHTML = `${this.running ? '일시정지' : '계속하기'} <kbd>P</kbd>`;
    const replay = document.getElementById('replay') as HTMLButtonElement;
    replay.disabled = !this.recorder.canReplay;
    replay.classList.toggle('replaying', this.replaying);
    replay.innerHTML = `${this.replaying ? '재생 중지' : '경로 재생'} <kbd>L</kbd>`;
  }

  private toggleReplay() {
    if (this.replaying) {
      this.stopReplay('경로 재생을 멈췄습니다');
      return;
    }
    if (!this.recorder.canReplay) return;
    if (this.running) {
      this.recorder.record(this.flight, true);
      this.world.setFlightTrail(this.recorder.positions);
    }
    this.replayReturnState = {
      ...this.flight,
      position: { ...this.flight.position },
      velocity: { ...this.flight.velocity },
    };
    this.running = false;
    this.replaying = true;
    this.replayTime = 0;
    this.input.clear();
    this.cameraController.reset();
    this.flight = this.recorder.sample(0)!;
    this.hud.notify('기록된 비행 경로 재생', this.flight.elapsed);
    this.renderControls();
  }

  private updateReplay(dt: number) {
    this.replayTime = Math.min(this.recorder.duration, this.replayTime + dt);
    const sample = this.recorder.sample(this.replayTime);
    if (sample) this.flight = sample;
    if (this.replayTime < this.recorder.duration) return;
    this.stopReplay('경로 재생 완료');
  }

  private stopReplay(message: string) {
    this.replaying = false;
    if (this.replayReturnState) this.flight = this.replayReturnState;
    this.replayReturnState = undefined;
    this.hud.notify(message, this.flight.elapsed);
    this.renderControls();
  }

  private readQuality(): Quality {
    const stored = localStorage.getItem('drone-lab-quality');
    return stored === 'low' || stored === 'medium' || stored === 'high' ? stored : matchMedia('(max-width: 700px)').matches ? 'low' : 'high';
  }

  private get bestTimeKey() { return `drone-lab-best-${this.config.id}`; }

  private readBestTime(): number | undefined {
    const value = Number(localStorage.getItem(this.bestTimeKey));
    return Number.isFinite(value) && value > 0 ? value : undefined;
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
