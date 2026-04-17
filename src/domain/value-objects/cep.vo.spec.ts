import { InvalidCepError } from '../errors/invalid-cep.error';
import { Cep } from './cep.vo';

describe('Cep', () => {
  it('normalizes a masked CEP', () => {
    expect(Cep.create('38400-000').value).toBe('38400000');
  });

  it('accepts an unmasked CEP', () => {
    expect(Cep.create('38400000').value).toBe('38400000');
  });

  it('rejects a CEP with invalid length', () => {
    expect(() => Cep.create('384')).toThrow(InvalidCepError);
  });

  it('rejects an empty CEP', () => {
    expect(() => Cep.create(undefined)).toThrow(InvalidCepError);
  });
});
