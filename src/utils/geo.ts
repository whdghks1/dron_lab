import type { Vec3 } from '../game/types';

export interface GeoPoint { lat: number; lon: number }
export interface GeoOrigin extends GeoPoint { elevation?: number }

const METERS_PER_LATITUDE_DEGREE = 111_320;

export function geoToLocal(point: GeoPoint, origin: GeoOrigin): Vec3 {
  const metersPerLongitudeDegree = METERS_PER_LATITUDE_DEGREE * Math.cos(origin.lat * Math.PI / 180);
  return {
    x: (point.lon - origin.lon) * metersPerLongitudeDegree,
    y: -(origin.elevation ?? 0),
    z: -(point.lat - origin.lat) * METERS_PER_LATITUDE_DEGREE,
  };
}

export function localToGeo(point: Vec3, origin: GeoOrigin): GeoPoint {
  const metersPerLongitudeDegree = METERS_PER_LATITUDE_DEGREE * Math.cos(origin.lat * Math.PI / 180);
  return { lat: origin.lat - point.z / METERS_PER_LATITUDE_DEGREE, lon: origin.lon + point.x / metersPerLongitudeDegree };
}
