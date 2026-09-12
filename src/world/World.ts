import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AreaSnapshot, GeoFeature } from '../areas/types';
import type { BoxCollider } from '../game/types';
import { HONGJECHEON_CONFIG } from '../areas/hongjecheon/config';
import { geoToLocal } from '../utils/geo';
import { horizontalShape, ribbonGeometry } from './geometry';

export type Quality = 'low' | 'medium' | 'high';

const CONFIG = HONGJECHEON_CONFIG;
const localPoints = (feature: GeoFeature, y = 0) => feature.points.map((point) => {
  const local = geoToLocal(point, CONFIG.origin);
  return new THREE.Vector3(local.x, y, local.z);
});
const seeded = (id: number) => ((id * 9301 + 49297) % 233280) / 233280;

export class World {
  readonly scene = new THREE.Scene();
  readonly drone = new THREE.Group();
  readonly colliders: BoxCollider[] = [];
  readonly checkpointObjects: THREE.Group[] = [];
  private trees?: THREE.InstancedMesh;
  private readonly rotors: THREE.Mesh[] = [];

  constructor(private readonly data: AreaSnapshot, quality: Quality) {
    this.scene.background = new THREE.Color(0x9dc4ce);
    this.scene.fog = new THREE.FogExp2(0xa8c8c9, 0.00125);
    this.addLights(quality);
    this.addTerrain();
    this.addWater();
    this.addRoads();
    this.addBuildings(quality);
    this.addBridges();
    this.addTrees(quality);
    this.addLandingPad();
    this.createDrone();
    this.createCheckpoints();
  }

  private addLights(quality: Quality) {
    const hemisphere = new THREE.HemisphereLight(0xd8f1f4, 0x496351, 2.1);
    const sun = new THREE.DirectionalLight(0xfff1c9, 2.7);
    sun.position.set(180, 250, 120);
    sun.castShadow = quality === 'high';
    if (sun.castShadow) {
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -420; sun.shadow.camera.right = 420;
      sun.shadow.camera.top = 420; sun.shadow.camera.bottom = -420;
      sun.shadow.camera.far = 700;
    }
    this.scene.add(hemisphere, sun);
  }

  private addTerrain() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1300, 1300, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x789375, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.32;
    ground.receiveShadow = true;
    this.scene.add(ground);
    for (const park of this.data.parks) {
      const points = localPoints(park, -0.26);
      if (points.length > 2) this.scene.add(new THREE.Mesh(horizontalShape(points), new THREE.MeshStandardMaterial({ color: 0x678967, roughness: 1 })));
    }
  }

  private addWater() {
    const material = new THREE.MeshStandardMaterial({ color: 0x4f94a8, roughness: 0.24, metalness: 0.08, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
    const polygonWater = this.data.water.filter((feature) => feature.points.length > 3 && feature.points[0].lat === feature.points.at(-1)?.lat && feature.points[0].lon === feature.points.at(-1)?.lon);
    const geometries: THREE.BufferGeometry[] = polygonWater.map((feature) => horizontalShape(localPoints(feature, -0.12)));
    this.data.water.filter((feature) => !polygonWater.includes(feature) && feature.kind === 'river').forEach((feature) => geometries.push(ribbonGeometry(localPoints(feature, -0.14), 13)));
    const merged = mergeGeometries(geometries);
    if (merged) this.scene.add(new THREE.Mesh(merged, material));
  }

  private addRoads() {
    const roadMaterials = {
      major: new THREE.MeshStandardMaterial({ color: 0x677277, roughness: 0.95 }),
      minor: new THREE.MeshStandardMaterial({ color: 0x8c918c, roughness: 0.95 }),
      path: new THREE.MeshStandardMaterial({ color: 0xc3bfa6, roughness: 1 }),
    };
    const majorGeometries: THREE.BufferGeometry[] = [];
    const minorGeometries: THREE.BufferGeometry[] = [];
    this.data.roads.forEach((feature) => {
      const major = ['trunk', 'primary', 'secondary', 'tertiary'].includes(feature.kind);
      const width = major ? (feature.kind === 'trunk' ? 12 : 8) : feature.kind === 'service' ? 3.2 : 5;
      (major ? majorGeometries : minorGeometries).push(ribbonGeometry(localPoints(feature, -0.22), width));
    });
    const pathGeometries: THREE.BufferGeometry[] = [];
    this.data.paths.forEach((feature) => {
      const width = feature.kind === 'cycleway' ? 3.2 : 2;
      pathGeometries.push(ribbonGeometry(localPoints(feature, -0.17), width));
    });
    ([[majorGeometries, roadMaterials.major], [minorGeometries, roadMaterials.minor], [pathGeometries, roadMaterials.path]] as const).forEach(([geometries, material]) => {
      const merged = mergeGeometries(geometries);
      if (!merged) return;
      const mesh = new THREE.Mesh(merged, material);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    });
  }

  private addBuildings(quality: Quality) {
    const material = new THREE.MeshStandardMaterial({ color: 0xb5bbb2, roughness: 0.88, vertexColors: false });
    const geometries: THREE.BufferGeometry[] = [];
    this.data.buildings.forEach((feature) => {
      const points = localPoints(feature);
      if (points.length < 3) return;
      const shape = new THREE.Shape();
      points.forEach((point, index) => index === 0 ? shape.moveTo(point.x, -point.z) : shape.lineTo(point.x, -point.z));
      shape.closePath();
      const height = Math.min(65, Math.max(5, feature.height ?? 7 + seeded(feature.id) * 24));
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2);
      geometry.computeBoundingBox();
      geometries.push(geometry);
      const box = geometry.boundingBox!;
      this.colliders.push({ minX: box.min.x, maxX: box.max.x, minY: 0, maxY: height, minZ: box.min.z, maxZ: box.max.z, label: feature.name || '주변 건물' });
    });
    const merged = mergeGeometries(geometries);
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = quality === 'high';
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  private addBridges() {
    const material = new THREE.MeshStandardMaterial({ color: 0x4f5c60, roughness: 0.8 });
    const geometries: THREE.BufferGeometry[] = [];
    this.data.bridges.forEach((feature) => {
      const y = feature.kind === 'trunk' ? 13 : 3.8;
      const width = feature.kind === 'trunk' ? 13 : ['secondary', 'residential'].includes(feature.kind) ? 8 : 3;
      geometries.push(ribbonGeometry(localPoints(feature, y), width));
    });
    const merged = mergeGeometries(geometries);
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    this.scene.add(mesh);
  }

  private addTrees(quality: Quality) {
    const count = quality === 'low' ? 70 : quality === 'medium' ? 140 : 220;
    const crown = new THREE.ConeGeometry(1.6, 4.5, 7);
    crown.translate(0, 3.25, 0);
    const material = new THREE.MeshStandardMaterial({ color: 0x3f7655, roughness: 1 });
    this.trees = new THREE.InstancedMesh(crown, material, count);
    const matrix = new THREE.Matrix4();
    for (let index = 0; index < count; index += 1) {
      const angle = seeded(index + 19) * Math.PI * 2;
      const radius = 55 + seeded(index + 83) * 410;
      const x = Math.cos(angle) * radius + Math.sin(index) * 35;
      const z = Math.sin(angle) * radius;
      const scale = 0.75 + seeded(index + 191) * 0.65;
      matrix.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));
      this.trees.setMatrixAt(index, matrix);
    }
    this.trees.castShadow = quality === 'high';
    this.scene.add(this.trees);
  }

  private addLandingPad() {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.18, 40), new THREE.MeshStandardMaterial({ color: 0x263e42, roughness: 0.8 }));
    pad.position.set(CONFIG.start.x, 0, CONFIG.start.z);
    pad.receiveShadow = true;
    this.scene.add(pad);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.13, 8, 48), new THREE.MeshBasicMaterial({ color: 0xcafa79 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(pad.position).setY(0.14);
    this.scene.add(ring);
  }

  private createDrone() {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 1.35), new THREE.MeshStandardMaterial({ color: 0xe6ebe3, roughness: 0.45 }));
    const dark = new THREE.MeshStandardMaterial({ color: 0x1d3036, roughness: 0.5 });
    this.drone.add(body);
    [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]].forEach(([x, z]) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 1.2), dark);
      arm.position.set(x / 2, 0, z / 2);
      arm.rotation.y = Math.sign(x * z) * Math.PI / 4;
      this.drone.add(arm);
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.035, 20), new THREE.MeshBasicMaterial({ color: 0x26383d, transparent: true, opacity: 0.55 }));
      rotor.position.set(x, 0.18, z);
      this.drone.add(rotor);
      this.rotors.push(rotor);
    });
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0xcafa79 }));
    light.position.set(0, 0.12, -0.7);
    this.drone.add(light);
    this.drone.traverse((object) => { if (object instanceof THREE.Mesh) object.castShadow = true; });
    this.scene.add(this.drone);
  }

  private createCheckpoints() {
    CONFIG.checkpoints.forEach((checkpoint, index) => {
      const group = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.28, 10, 42), new THREE.MeshStandardMaterial({ color: 0x889c96, emissive: 0x18211f, emissiveIntensity: 0.5 }));
      const previous = index === 0 ? CONFIG.start : CONFIG.checkpoints[index - 1].position;
      ring.rotation.y = Math.atan2(checkpoint.position.x - previous.x, checkpoint.position.z - previous.z);
      group.add(ring);
      group.position.set(checkpoint.position.x, checkpoint.position.y, checkpoint.position.z);
      group.visible = false;
      this.checkpointObjects.push(group);
      this.scene.add(group);
    });
  }

  updateDrone(position: { x: number; y: number; z: number }, yaw: number, velocity: { x: number; z: number }, elapsed: number) {
    this.drone.position.set(position.x, position.y, position.z);
    this.drone.rotation.set(Math.max(-0.22, Math.min(0.22, velocity.z * 0.012)), yaw, Math.max(-0.25, Math.min(0.25, -velocity.x * 0.012)));
    this.rotors.forEach((rotor, index) => { rotor.rotation.y = elapsed * (index % 2 ? -20 : 20); });
  }

  setCheckpointState(active: number, visible: boolean) {
    this.checkpointObjects.forEach((group, index) => {
      group.visible = visible;
      const mesh = group.children[0] as THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
      mesh.material.color.set(index < active ? 0xcafa79 : index === active ? 0xffa75e : 0x718680);
      mesh.material.emissive.set(index === active ? 0x6b3210 : 0x18211f);
    });
  }
}
