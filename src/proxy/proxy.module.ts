// src/proxy/proxy.module.ts

import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
})
export class ProxyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const targetUrl = 'https://staging.starkpay.africa/';
    const proxyUrl = process.env.QUOTAGUARDSTATIC_URL;

    const proxyMiddleware = createProxyMiddleware({
      target: targetUrl,
      changeOrigin: true,
      pathRewrite: {
        [`^/proxy`]: '',
      },
      headers: {
        'Proxy-Authorization': `Basic ${Buffer.from(proxyUrl).toString(
          'base64',
        )}`,
      },
    });

    consumer.apply(proxyMiddleware).forRoutes('*');
  }
}
