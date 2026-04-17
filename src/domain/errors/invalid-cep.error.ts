import { DomainError } from './domain.error';

export class InvalidCepError extends DomainError {
  constructor() {
    super('CEP invalido', 400);
  }
}
