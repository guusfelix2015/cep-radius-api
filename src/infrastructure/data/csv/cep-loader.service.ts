import { Injectable } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import csv from 'csv-parser';
import { ZipCodeLocation } from '../../../domain/entities/zip-code-location.entity';

type CsvRow = Record<string, string | undefined>;

export type CepLoadResult = {
  records: ZipCodeLocation[];
  skipped: number;
};

@Injectable()
export class CepLoaderService {
  async load(filePath: string): Promise<CepLoadResult> {
    return new Promise((resolve, reject) => {
      const records: ZipCodeLocation[] = [];
      let skipped = 0;

      createReadStream(filePath)
        .on('error', reject)
        .pipe(
          csv({
            mapHeaders: ({ header }) => this.normalizeHeader(header),
          }),
        )
        .on('data', (row: CsvRow) => {
          try {
            const location = this.toLocation(row);

            if (location) {
              records.push(location);
              return;
            }

            skipped += 1;
          } catch {
            skipped += 1;
          }
        })
        .on('error', reject)
        .on('end', () => resolve({ records, skipped }));
    });
  }

  private toLocation(row: CsvRow): ZipCodeLocation | null {
    const cep = this.first(row, ['cep']);
    const latitude = this.parseCoordinate(this.first(row, ['latitude', 'lat']));
    const longitude = this.parseCoordinate(
      this.first(row, ['longitude', 'lng', 'lon']),
    );

    if (!cep || latitude === null || longitude === null) {
      return null;
    }

    return new ZipCodeLocation({
      cep,
      latitude,
      longitude,
      state: this.first(row, ['state', 'uf', 'estado']),
      city: this.first(row, ['city', 'cidade', 'localidade']),
      neighborhood: this.first(row, ['neighborhood', 'bairro']),
      street: this.first(row, ['street', 'logradouro', 'endereco']),
    });
  }

  private first(row: CsvRow, aliases: string[]): string | undefined {
    for (const alias of aliases) {
      const value = row[alias]?.trim();

      if (value) {
        return value;
      }
    }

    return undefined;
  }

  private parseCoordinate(value: string | undefined): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeHeader(header: string | null): string | null {
    if (!header) {
      return null;
    }

    return header
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
