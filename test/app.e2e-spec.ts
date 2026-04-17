import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { join } from 'node:path';
import { readFile, rm } from 'node:fs/promises';
import { AppModule } from '../src/app.module';
import { AsyncFileLoggerService } from '../src/infrastructure/logging/async-file-logger.service';

describe('ZipCodeSearchController (e2e)', () => {
  let app: INestApplication<App>;
  const telemetryPath = join(process.cwd(), 'test/tmp/telemetry-e2e.log');

  beforeEach(async () => {
    process.env.CSV_PATH = 'test/fixtures/ceps.sample.csv';
    process.env.TELEMETRY_LOG_PATH = 'test/tmp/telemetry-e2e.log';
    process.env.MAX_RADIUS_KM = '200';
    process.env.GRID_CELL_SIZE_DEGREES = '0.1';
    await rm(telemetryPath, { force: true });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns CEPs inside the radius', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/ceps/search-by-radius')
      .query({ cep: '38400000', raioKm: 10 })
      .expect(200);
    const body = response.body as {
      originCep: string;
      radiusKm: number;
      total: number;
      items: Array<{ cep: string; distanceKm: number }>;
    };

    expect(body).toMatchObject({
      originCep: '38400000',
      radiusKm: 10,
      total: 3,
    });
    expect(body.items[0]).toMatchObject({
      cep: '38400000',
      distanceKm: 0,
    });
  });

  it('returns 400 for invalid CEP', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/ceps/search-by-radius')
      .query({ cep: '123', raioKm: 10 })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'CEP invalido',
      path: '/api/ceps/search-by-radius?cep=123&raioKm=10',
    });
  });

  it('returns 400 for invalid radius', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/ceps/search-by-radius')
      .query({ cep: '38400000', raioKm: 0 })
      .expect(400);
    const body = response.body as { message: string };

    expect(body.message).toContain('Raio invalido');
  });

  it('returns 404 for unknown CEP', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/ceps/search-by-radius')
      .query({ cep: '99999999', raioKm: 10 })
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
    });
  });

  it('writes one structured telemetry line per request', async () => {
    await request(app.getHttpServer())
      .get('/api/ceps/search-by-radius')
      .query({ cep: '38400000', raioKm: 10 })
      .expect(200);

    await app.get(AsyncFileLoggerService).flush();
    const content = await readFile(telemetryPath, 'utf8');
    const line = JSON.parse(content.trim().split('\n')[0]) as Record<
      string,
      unknown
    >;

    expect(line).toMatchObject({
      method: 'GET',
      path: '/api/ceps/search-by-radius',
      statusCode: 200,
      resultCount: 3,
    });
    expect(line).toHaveProperty('durationMs');
    expect(line).toHaveProperty('memory');
    expect(line).toHaveProperty('cpu');
  });
});
