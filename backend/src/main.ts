import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend connection
  app.enableCors();

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`[NestJS API Server] Running on http://localhost:${port}`);
}

bootstrap();
