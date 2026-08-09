import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function originPatternToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .split('*')
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const originPatterns = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .map(originPatternToRegExp)
    : null;

  app.enableCors({
    origin: !originPatterns
      ? true // Mirrors request origin when true (required for credentials)
      : (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          if (!origin) return callback(null, true); // non-browser clients (curl, server-to-server)
          const allowed = originPatterns.some((re) => re.test(origin));
          callback(allowed ? null : new Error('Not allowed by CORS'), allowed);
        },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With',
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
