import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CepNotFoundError } from '../../domain/errors/cep-not-found.error';
import { ZIP_CODE_LOCATION_REPOSITORY } from '../../domain/repositories/zip-code-location.repository';
import type { ZipCodeLocationRepository } from '../../domain/repositories/zip-code-location.repository';
import { GeoBoundingBoxService } from '../../domain/services/geo-bounding-box.service';
import { GeoDistanceService } from '../../domain/services/geo-distance.service';
import { Cep } from '../../domain/value-objects/cep.vo';
import { RadiusKm } from '../../domain/value-objects/radius-km.vo';
import { SearchZipCodesByRadiusInput } from '../dto/search-zip-codes-by-radius.input';
import { SearchZipCodesByRadiusOutput } from '../dto/search-zip-codes-by-radius.output';

@Injectable()
export class SearchZipCodesByRadiusUseCase {
  constructor(
    @Inject(ZIP_CODE_LOCATION_REPOSITORY)
    private readonly repository: ZipCodeLocationRepository,
    private readonly distanceService: GeoDistanceService,
    private readonly boundingBoxService: GeoBoundingBoxService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    input: SearchZipCodesByRadiusInput,
  ): Promise<SearchZipCodesByRadiusOutput> {
    const cep = Cep.create(input.cep);
    const radius = RadiusKm.create(input.radiusKm, this.getMaxRadiusKm());
    const origin = await this.repository.findByCep(cep.value);

    if (!origin) {
      throw new CepNotFoundError(cep.value);
    }

    const boundingBox = this.boundingBoxService.calculate(origin, radius.value);
    const candidates = await this.repository.findWithinBoundingBox(boundingBox);

    const items = candidates
      .map((candidate) => ({
        cep: candidate.cep,
        distanceKm: this.roundDistance(
          this.distanceService.calculateKm(origin, candidate),
        ),
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        state: candidate.state,
        city: candidate.city,
        neighborhood: candidate.neighborhood,
        street: candidate.street,
      }))
      .filter((item) => item.distanceKm <= radius.value)
      .sort(
        (a, b) => a.distanceKm - b.distanceKm || a.cep.localeCompare(b.cep),
      );

    return {
      originCep: origin.cep,
      radiusKm: radius.value,
      total: items.length,
      items,
    };
  }

  private getMaxRadiusKm(): number {
    return Number(this.configService.get<string>('MAX_RADIUS_KM') ?? 200);
  }

  private roundDistance(distanceKm: number): number {
    return Math.round((distanceKm + Number.EPSILON) * 1000) / 1000;
  }
}
