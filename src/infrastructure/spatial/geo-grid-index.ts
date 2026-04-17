import { ZipCodeLocation } from '../../domain/entities/zip-code-location.entity';
import { BoundingBoxParams } from '../../domain/repositories/zip-code-location.repository';

export class GeoGridIndex {
  private readonly cells = new Map<string, ZipCodeLocation[]>();

  constructor(private readonly cellSizeDegrees = 0.1) {
    if (!Number.isFinite(cellSizeDegrees) || cellSizeDegrees <= 0) {
      throw new Error('GRID_CELL_SIZE_DEGREES deve ser maior que 0.');
    }
  }

  build(records: ZipCodeLocation[]): void {
    this.cells.clear();

    for (const record of records) {
      const key = this.keyFor(record.latitude, record.longitude);
      const cell = this.cells.get(key) ?? [];
      cell.push(record);
      this.cells.set(key, cell);
    }
  }

  search(params: BoundingBoxParams): ZipCodeLocation[] {
    const result: ZipCodeLocation[] = [];
    const minLatCell = this.cellCoordinate(params.minLat);
    const maxLatCell = this.cellCoordinate(params.maxLat);
    const minLonCell = this.cellCoordinate(params.minLon);
    const maxLonCell = this.cellCoordinate(params.maxLon);

    for (let latCell = minLatCell; latCell <= maxLatCell; latCell += 1) {
      for (let lonCell = minLonCell; lonCell <= maxLonCell; lonCell += 1) {
        const cell = this.cells.get(this.key(latCell, lonCell));

        if (!cell) {
          continue;
        }

        for (const record of cell) {
          if (
            record.latitude >= params.minLat &&
            record.latitude <= params.maxLat &&
            record.longitude >= params.minLon &&
            record.longitude <= params.maxLon
          ) {
            result.push(record);
          }
        }
      }
    }

    return result;
  }

  private keyFor(latitude: number, longitude: number): string {
    return this.key(
      this.cellCoordinate(latitude),
      this.cellCoordinate(longitude),
    );
  }

  private cellCoordinate(value: number): number {
    return Math.floor(value / this.cellSizeDegrees);
  }

  private key(latCell: number, lonCell: number): string {
    return `${latCell}:${lonCell}`;
  }
}
