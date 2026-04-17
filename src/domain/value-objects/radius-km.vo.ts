import { InvalidRadiusError } from '../errors/invalid-radius.error';

export class RadiusKm {
  private constructor(private readonly radiusValue: number) {}

  static create(input: unknown, maxRadiusKm = 200): RadiusKm {
    const rawValue =
      typeof input === 'string' || typeof input === 'number'
        ? String(input)
        : '';
    const radius =
      typeof input === 'number' ? input : Number(rawValue.replace(',', '.'));

    if (!Number.isFinite(radius) || radius <= 0 || radius > maxRadiusKm) {
      throw new InvalidRadiusError(maxRadiusKm);
    }

    return new RadiusKm(radius);
  }

  get value(): number {
    return this.radiusValue;
  }
}
