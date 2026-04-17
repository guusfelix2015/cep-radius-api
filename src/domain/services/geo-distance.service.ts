import { Injectable } from '@nestjs/common';
import { GeoPoint } from '../value-objects/geo-point.vo';

type PointLike = Pick<GeoPoint, 'latitude' | 'longitude'>;

@Injectable()
export class GeoDistanceService {
  private readonly earthRadiusKm = 6371;

  calculateKm(from: PointLike, to: PointLike): number {
    const deltaLat = this.toRadians(to.latitude - from.latitude);
    const deltaLon = this.toRadians(to.longitude - from.longitude);
    const fromLat = this.toRadians(from.latitude);
    const toLat = this.toRadians(to.latitude);

    const haversine =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2;

    return 2 * this.earthRadiusKm * Math.asin(Math.sqrt(haversine));
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
