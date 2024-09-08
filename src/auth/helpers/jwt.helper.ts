import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtBody, TokenType } from '../types';

@Injectable()
export class JwtHelper {
  constructor(
    private config: ConfigService,
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async signToken(
    sub: string,
    jwtBody?: JwtBody,
  ): Promise<{ token: string; refreshToken?: string }> {
    const payload = {
      sub: sub,
      jwtBody,
    };

    let secret: string;
    let expiresIn: string;

    let refreshSecret: string;
    let refreshExpiresIn: string;

    if (jwtBody) {
      switch (jwtBody.type.toString()) {
        case TokenType.ACCESS:
          secret = this.config.get<string>('JWT_ACCESS_SECRET');
          expiresIn = this.config.get<string>('ACCESS_TOKEN_EXPIRATION');

          refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
          refreshExpiresIn = this.config.get<string>(
            'REFRESH_TOKEN_EXPIRATION',
          );
          break;

        case TokenType.PASSWORD_RESET:
          secret = this.config.get<string>('JWT_PASSWORD_RESET_SECRET');
          expiresIn = this.config.get<string>(
            'PASSWORD_RESET_TOKEN_EXPIRATION',
          );
          break;

        case TokenType.EMAIL_VERIFICATION:
          secret = this.config.get<string>('JWT_VERIFICATION_SECRET');
          expiresIn = this.config.get<string>('VERIFICATION_TOKEN_EXPIRATION');
          break;

        default:
          throw new Error('Invalid token type');
      }
    } else {
      secret = this.config.get<string>('JWT_MICROSERVICES_ACCESS_SECRET');
      expiresIn = this.config.get<string>(
        'MICROSERVICES_ACCESS_TOKEN_EXPIRATION',
      );
    }

    const token = await this.jwt.signAsync(payload, {
      expiresIn: expiresIn,
      secret: secret,
    });

    if (refreshExpiresIn && refreshSecret) {
      const refreshToken = await this.jwt.signAsync(payload, {
        expiresIn: refreshExpiresIn,
        secret: refreshSecret,
      });

      return {
        token: token,
        refreshToken,
      };
    }

    return {
      token: token,
    };
  }

  async decodeToken(token: string) {
    return this.jwt.decode(token);
  }

  async getUserFromAuthToken(token: string) {
    const payload: { sub: string; jwtDto: TokenType } = this.jwt.verify(token, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
    });

    if (payload.sub && payload.jwtDto['type'] === TokenType.ACCESS) {
      const user = await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
        },
      });

      return user;
    }
  }
}
