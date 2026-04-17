import { GeoBoundingBoxService } from './geo-bounding-box.service';
import { GeoDistanceService } from './geo-distance.service';

describe('Geo services', () => {
  it('calculates zero distance for the same point', () => {
    const service = new GeoDistanceService();

    expect(
      service.calculateKm(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 0 },
      ),
    ).toBe(0);
  });

  it('calculates known Haversine distance close to one equatorial degree', () => {
    const service = new GeoDistanceService();

    expect(
      service.calculateKm(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
      ),
    ).toBeCloseTo(111.195, 3);
  });

  it('builds a bounding box around an origin', () => {
    const service = new GeoBoundingBoxService();
    const box = service.calculate(
      { latitude: -18.9186, longitude: -48.2772 },
      10,
    );

    expect(box.minLat).toBeLessThan(-18.9186);
    expect(box.maxLat).toBeGreaterThan(-18.9186);
    expect(box.minLon).toBeLessThan(-48.2772);
    expect(box.maxLon).toBeGreaterThan(-48.2772);
  });
});
