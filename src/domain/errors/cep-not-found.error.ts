import { DomainError } from './domain.error';

export class CepNotFoundError extends DomainError {
  constructor(cep: string) {
    super(`CEP ${cep} nao encontrado na base`, 404);
  }
}
