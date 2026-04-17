import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from '../../../domain/errors/domain.error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const statusCode = this.getStatusCode(exception);

    response.status(statusCode).json({
      statusCode,
      error: this.getErrorName(statusCode),
      message: this.getMessage(exception),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof DomainError) {
      return exception.statusCode;
    }

    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getMessage(exception: unknown): string {
    if (exception instanceof DomainError) {
      return exception.message;
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();

      if (typeof body === 'string') {
        return body;
      }

      if (this.hasMessage(body)) {
        return Array.isArray(body.message)
          ? body.message.join('; ')
          : body.message;
      }
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Erro inesperado';
  }

  private getErrorName(statusCode: number): string {
    const names: Record<number, string> = {
      400: 'Bad Request',
      404: 'Not Found',
      500: 'Internal Server Error',
    };

    return names[statusCode] ?? 'Error';
  }

  private hasMessage(value: unknown): value is { message: string | string[] } {
    return typeof value === 'object' && value !== null && 'message' in value;
  }
}
