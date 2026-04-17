import { ZipCodeLocation } from '../entities/zip-code-location.entity';

export const ZIP_CODE_LOCATION_REPOSITORY = Symbol(
  'ZIP_CODE_LOCATION_REPOSITORY',
);

export type BoundingBoxParams = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

export interface ZipCodeLocationRepository {
  findByCep(cep: string): Promise<ZipCodeLocation | null>;
  findWithinBoundingBox(params: BoundingBoxParams): Promise<ZipCodeLocation[]>;
}
