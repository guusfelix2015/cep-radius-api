import { InvalidGeoPointError } from '../errors/invalid-geo-point.error';

export class GeoPoint {
  private constructor(
    public readonly latitude: number,
    public readonly longitude: number,
  ) {}

  static create(latitude: unknown, longitude: unknown): GeoPoint {
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    if (
      !Number.isFinite(parsedLatitude) ||
      !Number.isFinite(parsedLongitude) ||
      parsedLatitude < -90 ||
      parsedLatitude > 90 ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      throw new InvalidGeoPointError();
    }

    return new GeoPoint(parsedLatitude, parsedLongitude);
  }
}
