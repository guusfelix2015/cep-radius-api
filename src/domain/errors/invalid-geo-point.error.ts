import { DomainError } from './domain.error';

export class InvalidGeoPointError extends DomainError {
  constructor() {
    super('Coordenada geografica invalida', 400);
  }
}
