import { DomainError } from './domain.error';

export class InvalidRadiusError extends DomainError {
  constructor(maxRadiusKm: number) {
    super(
      `Raio invalido. Informe um numero maior que 0 e menor ou igual a ${maxRadiusKm}.`,
      400,
    );
  }
}
