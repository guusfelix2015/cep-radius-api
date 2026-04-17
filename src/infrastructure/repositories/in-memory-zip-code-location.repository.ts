import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAbsolute, join } from 'node:path';
import { ZipCodeLocation } from '../../domain/entities/zip-code-location.entity';
import {
  BoundingBoxParams,
  ZipCodeLocationRepository,
} from '../../domain/repositories/zip-code-location.repository';
import { CepLoaderService } from '../data/csv/cep-loader.service';
import { GeoGridIndex } from '../spatial/geo-grid-index';

@Injectable()
export class InMemoryZipCodeLocationRepository
  implements ZipCodeLocationRepository, OnModuleInit
{
  private cepIndex = new Map<string, ZipCodeLocation>();
  private gridIndex = new GeoGridIndex();

  constructor(
    private readonly configService: ConfigService,
    private readonly loader: CepLoaderService,
  ) {}

  async onModuleInit(): Promise<void> {
    const csvPath = this.resolveFromCwd(
      this.configService.get<string>('CSV_PATH') ?? 'data/ceps.csv',
    );
    const cellSize = Number(
      this.configService.get<string>('GRID_CELL_SIZE_DEGREES') ?? 0.1,
    );
    const result = await this.loader.load(csvPath);

    if (result.records.length === 0) {
      throw new Error(
        `CSV ${csvPath} nao possui registros validos com cep, latitude e longitude.`,
      );
    }

    this.cepIndex = new Map(
      result.records.map((record) => [record.cep, record]),
    );
    this.gridIndex = new GeoGridIndex(cellSize);
    this.gridIndex.build(result.records);

    console.info(
      `CSV carregado: ${result.records.length} registros validos, ${result.skipped} ignorados.`,
    );
  }

  findByCep(cep: string): Promise<ZipCodeLocation | null> {
    return Promise.resolve(this.cepIndex.get(cep) ?? null);
  }

  findWithinBoundingBox(params: BoundingBoxParams): Promise<ZipCodeLocation[]> {
    return Promise.resolve(this.gridIndex.search(params));
  }

  private resolveFromCwd(configuredPath: string): string {
    return isAbsolute(configuredPath)
      ? configuredPath
      : join(process.cwd(), configuredPath);
  }
}
