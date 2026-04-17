import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AsyncFileLoggerService } from '../../../infrastructure/logging/async-file-logger.service';

@Injectable()
export class TelemetryInterceptor implements NestInterceptor {
  constructor(private readonly logger: AsyncFileLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = process.hrtime.bigint();
    const startedCpu = process.cpuUsage();

    return next.handle().pipe(
      tap((body) => {
        this.logger.log(
          this.createEntry({
            request,
            statusCode: response.statusCode,
            startedAt,
            startedCpu,
            resultCount: this.getResultCount(body),
          }),
        );
      }),
      catchError((error: unknown) => {
        this.logger.log(
          this.createEntry({
            request,
            statusCode: this.getErrorStatusCode(error),
            startedAt,
            startedCpu,
            error: this.getErrorMessage(error),
          }),
        );

        return throwError(() => error);
      }),
    );
  }

  private createEntry(params: {
    request: Request;
    statusCode: number;
    startedAt: bigint;
    startedCpu: NodeJS.CpuUsage;
    resultCount?: number;
    error?: string;
  }): Record<string, unknown> {
    const cpu = process.cpuUsage(params.startedCpu);
    const memory = process.memoryUsage();
    const durationMs =
      Number(process.hrtime.bigint() - params.startedAt) / 1_000_000;

    return {
      timestamp: new Date().toISOString(),
      method: params.request.method,
      path: params.request.path,
      query: params.request.query,
      statusCode: params.statusCode,
      durationMs: Math.round(durationMs * 1000) / 1000,
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
      },
      cpu: {
        userMs: Math.round(cpu.user / 1000),
        systemMs: Math.round(cpu.system / 1000),
      },
      resultCount: params.resultCount,
      error: params.error,
    };
  }

  private getResultCount(body: unknown): number | undefined {
    if (typeof body === 'object' && body !== null && 'total' in body) {
      const total = (body as { total?: unknown }).total;
      return typeof total === 'number' ? total : undefined;
    }

    return undefined;
  }

  private getErrorStatusCode(error: unknown): number {
    if (error instanceof HttpException) {
      return error.getStatus();
    }

    if (typeof error === 'object' && error !== null && 'statusCode' in error) {
      const statusCode = (error as { statusCode?: unknown }).statusCode;
      return typeof statusCode === 'number' ? statusCode : 500;
    }

    return 500;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Erro inesperado';
  }
}
