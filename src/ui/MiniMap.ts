import type { AreaConfig, AreaSnapshot } from '../areas/types';
import type { FlightState } from '../game/types';
import { geoToLocal } from '../utils/geo';

export class MiniMap {
  private readonly context: CanvasRenderingContext2D;
  private readonly width: number;
  private readonly height: number;

  constructor(canvas: HTMLCanvasElement, private readonly data: AreaSnapshot, private readonly config: AreaConfig) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('미니맵 Canvas를 초기화할 수 없습니다.');
    this.context = context;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  private project(x: number, z: number) {
    const { minX, maxX, minZ, maxZ } = this.config.bounds;
    const padding = 18;
    return {
      x: padding + (x - minX) / (maxX - minX) * (this.width - padding * 2),
      y: padding + (z - minZ) / (maxZ - minZ) * (this.height - padding * 2),
    };
  }

  draw(flight: FlightState, checkpointIndex: number, courseVisible: boolean) {
    const ctx = this.context;
    ctx.fillStyle = '#193039';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.lineCap = 'round';
    this.data.water.forEach((feature) => this.drawFeature(feature.points, '#4e8fa0', 13));
    this.data.roads.filter((feature) => ['trunk', 'secondary', 'tertiary'].includes(feature.kind)).forEach((feature) => this.drawFeature(feature.points, '#718084', feature.kind === 'trunk' ? 5 : 3));
    this.data.paths.filter((feature) => feature.kind === 'cycleway').forEach((feature) => this.drawFeature(feature.points, '#b8b69b', 2));
    if (courseVisible) {
      ctx.strokeStyle = '#cafa7960';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 7]);
      ctx.beginPath();
      this.config.checkpoints.forEach((checkpoint, index) => {
        const point = this.project(checkpoint.position.x, checkpoint.position.z);
        if (index === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      this.config.checkpoints.forEach((checkpoint, index) => {
        const point = this.project(checkpoint.position.x, checkpoint.position.z);
        ctx.beginPath();
        ctx.arc(point.x, point.y, index === checkpointIndex ? 7 : 4, 0, Math.PI * 2);
        ctx.strokeStyle = index < checkpointIndex ? '#cafa79' : index === checkpointIndex ? '#ffa75e' : '#829b97';
        ctx.lineWidth = 3;
        ctx.stroke();
      });
    }
    const drone = this.project(flight.position.x, flight.position.z);
    ctx.save();
    ctx.translate(drone.x, drone.y);
    ctx.rotate(flight.yaw);
    ctx.fillStyle = '#cafa79';
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(7, 7); ctx.lineTo(0, 3); ctx.lineTo(-7, 7); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawFeature(points: Array<{ lat: number; lon: number }>, color: string, width: number) {
    if (points.length < 2) return;
    const ctx = this.context;
    ctx.beginPath();
    points.forEach((geo, index) => {
      const local = geoToLocal(geo, this.config.origin);
      const point = this.project(local.x, local.z);
      if (index === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}
