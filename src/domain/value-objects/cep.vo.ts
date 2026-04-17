import { InvalidCepError } from '../errors/invalid-cep.error';

export class Cep {
  private constructor(private readonly normalizedValue: string) {}

  static create(input: unknown): Cep {
    const rawValue =
      typeof input === 'string' || typeof input === 'number'
        ? String(input)
        : '';
    const digits = rawValue.replace(/\D/g, '');

    if (!/^\d{8}$/.test(digits)) {
      throw new InvalidCepError();
    }

    return new Cep(digits);
  }

  get value(): string {
    return this.normalizedValue;
  }
}
