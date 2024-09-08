/* eslint-disable @typescript-eslint/no-var-requires */
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import { useContainer } from 'class-validator';
// import * as proxy from 'express-http-proxy';
import { createKeyFile } from './create-key-file';
config();

async function bootstrap() {
  process.env.TZ = 'Africa/Lagos';

  const logger = new Logger('AppBootstrap');
  createKeyFile();
  const app = await NestFactory.create(AppModule);

  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  // if (process.env.NODE_ENV === 'prod') {
  //   app.use(
  //     `bus-stop/api/v${process.env.API_VERSION}/`,
  //     proxy(process.env.QUOTAGUARDSTATIC_URL),
  //   );
  // }

  app.setGlobalPrefix(`bus-stop/api/v${process.env.API_VERSION}/`);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT || 8081);

  logger.log(
    `Stark Pay Api version ${process.env.API_VERSION}  Listening on Port [${process.env.PORT}] in [${process.env.NODE_ENV}] mode`,
  );
}
bootstrap();
