import { InvalidRadiusError } from '../errors/invalid-radius.error';
import { RadiusKm } from './radius-km.vo';

describe('RadiusKm', () => {
  it('accepts a positive numeric radius', () => {
    expect(RadiusKm.create(10, 200).value).toBe(10);
  });

  it('accepts a string radius with comma decimal separator', () => {
    expect(RadiusKm.create('10,5', 200).value).toBe(10.5);
  });

  it('rejects zero, negative, non numeric and above max radius values', () => {
    expect(() => RadiusKm.create(0, 200)).toThrow(InvalidRadiusError);
    expect(() => RadiusKm.create(-1, 200)).toThrow(InvalidRadiusError);
    expect(() => RadiusKm.create('abc', 200)).toThrow(InvalidRadiusError);
    expect(() => RadiusKm.create(201, 200)).toThrow(InvalidRadiusError);
  });
});
