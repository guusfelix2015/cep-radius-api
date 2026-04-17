import { ConfigService } from '@nestjs/config';
import { ZipCodeLocation } from '../../domain/entities/zip-code-location.entity';
import { CepNotFoundError } from '../../domain/errors/cep-not-found.error';
import { InvalidCepError } from '../../domain/errors/invalid-cep.error';
import { ZipCodeLocationRepository } from '../../domain/repositories/zip-code-location.repository';
import { GeoBoundingBoxService } from '../../domain/services/geo-bounding-box.service';
import { GeoDistanceService } from '../../domain/services/geo-distance.service';
import { SearchZipCodesByRadiusUseCase } from './search-zip-codes-by-radius.use-case';

describe('SearchZipCodesByRadiusUseCase', () => {
  const origin = new ZipCodeLocation({
    cep: '38400000',
    latitude: -18.9186,
    longitude: -48.2772,
    city: 'Uberlandia',
    state: 'MG',
  });
  const nearby = new ZipCodeLocation({
    cep: '38400100',
    latitude: -18.9195,
    longitude: -48.28,
    city: 'Uberlandia',
    state: 'MG',
  });
  let repository: jest.Mocked<ZipCodeLocationRepository>;
  let useCase: SearchZipCodesByRadiusUseCase;

  beforeEach(() => {
    repository = {
      findByCep: jest.fn(),
      findWithinBoundingBox: jest.fn(),
    };
    useCase = new SearchZipCodesByRadiusUseCase(
      repository,
      new GeoDistanceService(),
      new GeoBoundingBoxService(),
      { get: jest.fn().mockReturnValue(200) } as unknown as ConfigService,
    );
  });

  it('returns ordered results inside the radius', async () => {
    repository.findByCep.mockResolvedValue(origin);
    repository.findWithinBoundingBox.mockResolvedValue([nearby, origin]);

    const result = await useCase.execute({ cep: '38400-000', radiusKm: 10 });

    expect(result.originCep).toBe('38400000');
    expect(result.total).toBe(2);
    expect(result.items[0].cep).toBe('38400000');
    expect(result.items[0].distanceKm).toBe(0);
  });

  it('throws when the origin CEP does not exist', async () => {
    repository.findByCep.mockResolvedValue(null);

    await expect(
      useCase.execute({ cep: '38400000', radiusKm: 10 }),
    ).rejects.toThrow(CepNotFoundError);
  });

  it('throws when CEP is invalid', async () => {
    await expect(useCase.execute({ cep: '123', radiusKm: 10 })).rejects.toThrow(
      InvalidCepError,
    );
  });
});
