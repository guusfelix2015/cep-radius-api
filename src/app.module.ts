import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'node:path';
import { SearchZipCodesByRadiusUseCase } from './application/use-cases/search-zip-codes-by-radius.use-case';
import { ZIP_CODE_LOCATION_REPOSITORY } from './domain/repositories/zip-code-location.repository';
import { GeoBoundingBoxService } from './domain/services/geo-bounding-box.service';
import { GeoDistanceService } from './domain/services/geo-distance.service';
import { CepLoaderService } from './infrastructure/data/csv/cep-loader.service';
import { AsyncFileLoggerService } from './infrastructure/logging/async-file-logger.service';
import { InMemoryZipCodeLocationRepository } from './infrastructure/repositories/in-memory-zip-code-location.repository';
import { ZipCodeSearchController } from './presentation/http/controllers/zip-code-search.controller';
import { HttpExceptionFilter } from './presentation/http/filters/http-exception.filter';
import { TelemetryInterceptor } from './presentation/http/interceptors/telemetry.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      exclude: ['/api*'],
    }),
  ],
  controllers: [ZipCodeSearchController],
  providers: [
    GeoDistanceService,
    GeoBoundingBoxService,
    CepLoaderService,
    InMemoryZipCodeLocationRepository,
    {
      provide: ZIP_CODE_LOCATION_REPOSITORY,
      useExisting: InMemoryZipCodeLocationRepository,
    },
    SearchZipCodesByRadiusUseCase,
    AsyncFileLoggerService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TelemetryInterceptor,
    },
  ],
})
export class AppModule {}
