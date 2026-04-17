import { join } from 'node:path';
import { CepLoaderService } from './cep-loader.service';

describe('CepLoaderService', () => {
  it('loads valid rows and skips invalid rows', async () => {
    const loader = new CepLoaderService();
    const result = await loader.load(
      join(process.cwd(), 'test/fixtures/ceps.sample.csv'),
    );

    expect(result.records).toHaveLength(4);
    expect(result.skipped).toBe(2);
    expect(result.records[0]).toMatchObject({
      cep: '38400000',
      state: 'MG',
      city: 'Uberlandia',
    });
  });
});
