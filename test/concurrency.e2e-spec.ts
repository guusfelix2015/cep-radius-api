import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { AppModule } from '../src/app.module';

type SearchResponseBody = {
  originCep: string;
  radiusKm: number;
  total: number;
  items: Array<{ cep: string; distanceKm: number }>;
};

describe('Concurrency (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  const telemetryPath = join(
    process.cwd(),
    'test/tmp/telemetry-concurrency.log',
  );

  beforeEach(async () => {
    process.env.CSV_PATH = 'test/fixtures/ceps.sample.csv';
    process.env.TELEMETRY_LOG_PATH = 'test/tmp/telemetry-concurrency.log';
    process.env.MAX_RADIUS_KM = '200';
    process.env.GRID_CELL_SIZE_DEGREES = '0.1';
    await rm(telemetryPath, { force: true });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterEach(async () => {
    await app.close();
  });

  it('handles multiple simultaneous successful requests', async () => {
    const totalRequests = 50;

    const responses = await Promise.all(
      Array.from({ length: totalRequests }, () =>
        request(baseUrl)
          .get('/api/ceps/search-by-radius')
          .query({ cep: '38400000', raioKm: 10 }),
      ),
    );

    expect(responses).toHaveLength(totalRequests);

    for (const response of responses) {
      const body = response.body as SearchResponseBody;

      expect(response.status).toBe(200);
      expect(body.originCep).toBe('38400000');
      expect(body.radiusKm).toBe(10);
      expect(body.total).toBeGreaterThan(0);
      expect(body.items[0]).toMatchObject({
        cep: '38400000',
        distanceKm: 0,
      });
    }
  });

  it('handles mixed concurrent success and error requests', async () => {
    const requests = [
      { cep: '38400000', raioKm: 10, expectedStatus: 200 },
      { cep: '123', raioKm: 10, expectedStatus: 400 },
      { cep: '99999999', raioKm: 10, expectedStatus: 404 },
      { cep: '38400000', raioKm: 0, expectedStatus: 400 },
    ];

    const responses: Response[] = await Promise.all(
      Array.from({ length: 40 }, (_, index) => {
        const input = requests[index % requests.length];

        return request(baseUrl)
          .get('/api/ceps/search-by-radius')
          .query({ cep: input.cep, raioKm: input.raioKm });
      }),
    );

    expect(responses).toHaveLength(40);

    for (const [index, response] of responses.entries()) {
      const expected = requests[index % requests.length].expectedStatus;
      expect(response.status).toBe(expected);
    }
  });
});
