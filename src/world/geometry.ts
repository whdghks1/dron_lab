import * as THREE from 'three';

export function ribbonGeometry(points: THREE.Vector3[], width: number): THREE.BufferGeometry {
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dz = next.z - previous.z;
    const length = Math.hypot(dx, dz) || 1;
    const offsetX = -dz / length * width / 2;
    const offsetZ = dx / length * width / 2;
    vertices.push(points[index].x + offsetX, points[index].y, points[index].z + offsetZ);
    vertices.push(points[index].x - offsetX, points[index].y, points[index].z - offsetZ);
    uvs.push(0, index / Math.max(1, points.length - 1), 1, index / Math.max(1, points.length - 1));
    if (index < points.length - 1) {
      const start = index * 2;
      indices.push(start, start + 2, start + 1, start + 2, start + 3, start + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function horizontalShape(points: THREE.Vector3[]): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  points.forEach((point, index) => index === 0 ? shape.moveTo(point.x, -point.z) : shape.lineTo(point.x, -point.z));
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
