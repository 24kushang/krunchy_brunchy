import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const corsLogger = new Logger('CORS');

function originPatternToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .split('*')
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  corsLogger.log(
    `ALLOWED_ORIGINS raw value: ${JSON.stringify(process.env.ALLOWED_ORIGINS ?? null)}`,
  );

  const rawPatterns = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
        .map((p) => p.trim())
        .filter(Boolean)
    : null;
  const originPatterns = rawPatterns
    ? rawPatterns.map((p) => ({ raw: p, re: originPatternToRegExp(p) }))
    : null;

  if (originPatterns) {
    corsLogger.log(
      `CORS origin allowlist active (${originPatterns.length} pattern(s)): ${rawPatterns!.join(', ')}`,
    );
  } else {
    corsLogger.warn(
      'ALLOWED_ORIGINS not set — mirroring any request origin (no allowlist enforced)',
    );
  }

  app.enableCors({
    origin: !originPatterns
      ? true // Mirrors request origin when true (required for credentials)
      : (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          if (!origin) {
            corsLogger.debug('Request with no Origin header — allowing (non-browser client)');
            return callback(null, true);
          }
          const match = originPatterns.find(({ re }) => re.test(origin));
          if (match) {
            corsLogger.debug(`Origin '${origin}' allowed (matched pattern '${match.raw}')`);
            return callback(null, true);
          }
          corsLogger.warn(
            `Origin '${origin}' REJECTED — no match in allowlist [${rawPatterns!.join(', ')}]`,
          );
          callback(new Error('Not allowed by CORS'), false);
        },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With',
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
