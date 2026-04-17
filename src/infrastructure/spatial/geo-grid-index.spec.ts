import { ZipCodeLocation } from '../../domain/entities/zip-code-location.entity';
import { GeoGridIndex } from './geo-grid-index';

describe('GeoGridIndex', () => {
  it('returns only candidates inside the bounding box', () => {
    const index = new GeoGridIndex(0.1);
    const inside = new ZipCodeLocation({
      cep: '38400000',
      latitude: -18.9186,
      longitude: -48.2772,
    });
    const outside = new ZipCodeLocation({
      cep: '01001000',
      latitude: -23.55052,
      longitude: -46.633308,
    });

    index.build([inside, outside]);

    const result = index.search({
      minLat: -19,
      maxLat: -18,
      minLon: -49,
      maxLon: -48,
    });

    expect(result).toHaveLength(1);
    expect(result[0].cep).toBe('38400000');
  });
});
