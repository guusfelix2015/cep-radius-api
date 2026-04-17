import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';

export type TelemetryLogEntry = Record<string, unknown>;

@Injectable()
export class AsyncFileLoggerService implements OnModuleInit, OnModuleDestroy {
  private readonly buffer: TelemetryLogEntry[] = [];
  private readonly batchSize = 100;
  private readonly flushIntervalMs = 1000;
  private flushTask?: Promise<void>;
  private interval?: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.interval = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
    this.interval.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
    }

    await this.flush();
  }

  log(entry: TelemetryLogEntry): void {
    this.buffer.push(entry);

    if (this.buffer.length >= this.batchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.flushTask) {
      return this.flushTask;
    }

    if (this.buffer.length === 0) {
      return;
    }

    const entries = this.buffer.splice(0, this.buffer.length);
    this.flushTask = this.writeEntries(entries).finally(() => {
      this.flushTask = undefined;
    });

    return this.flushTask;
  }

  private async writeEntries(entries: TelemetryLogEntry[]): Promise<void> {
    const logPath = this.resolveLogPath();
    const lines = entries.map((entry) => JSON.stringify(entry)).join('\n');

    await mkdir(dirname(logPath), { recursive: true });
    await appendFile(logPath, `${lines}\n`, 'utf8');
  }

  private resolveLogPath(): string {
    const configuredPath =
      this.configService.get<string>('TELEMETRY_LOG_PATH') ??
      'logs/telemetry.log';
    return isAbsolute(configuredPath)
      ? configuredPath
      : join(process.cwd(), configuredPath);
  }
}
