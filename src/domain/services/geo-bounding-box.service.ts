import { Injectable } from '@nestjs/common';
import { BoundingBoxParams } from '../repositories/zip-code-location.repository';

type PointLike = {
  latitude: number;
  longitude: number;
};

@Injectable()
export class GeoBoundingBoxService {
  private readonly earthRadiusKm = 6371;

  calculate(origin: PointLike, radiusKm: number): BoundingBoxParams {
    const latDelta = this.toDegrees(radiusKm / this.earthRadiusKm);
    const latRad = this.toRadians(origin.latitude);
    const cosLat = Math.cos(latRad);
    const lonDelta =
      Math.abs(cosLat) < 1e-12
        ? 180
        : this.toDegrees(radiusKm / (this.earthRadiusKm * cosLat));

    return {
      minLat: Math.max(-90, origin.latitude - latDelta),
      maxLat: Math.min(90, origin.latitude + latDelta),
      minLon: Math.max(-180, origin.longitude - lonDelta),
      maxLon: Math.min(180, origin.longitude + lonDelta),
    };
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  private toDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
  }
}
