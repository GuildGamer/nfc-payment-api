import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenType } from '../types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: { sub: string; jwtDto: TokenType }) {
    let user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      include: {
        bankAccount: true,
        wallets: true,
      },
    });

    if (user === null) {
      const station = await this.prisma.station.findUnique({
        where: {
          id: payload.sub,
        },
      });

      if (!station || station === null) {
        return false;
      }

      delete station.pinHash;

      return station;
    } else {
      if (!user.active) {
        user = null;
      }

      // if (!user.emailVerified) {
      //   throw new ForbiddenException('User phone number is yet to be verified');
      // }

      // console.log('GOT HERE 3');

      return user;
    }
  }
}
