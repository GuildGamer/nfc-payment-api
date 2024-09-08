import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenType } from '../types';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: string; jwtDto: TokenType }) {
    // console.log(`Headers Refresh`, req.headers);
    // console.log(`PAYLOAD`, payload);
    let user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    // console.log(`USER`, user);

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

      const refreshToken = req.headers['authorization']
        .replace('Bearer', '')
        .trim();

      return { ...station, sentRefreshToken: refreshToken, isStation: true };
    }

    delete user.hash;

    if (!user.active) {
      user = null;
    }

    // if (!user.emailVerified) {
    //   throw new ForbiddenException('User phone number is yet to be verified');
    // }

    const refreshToken = req.headers['authorization']
      .replace('Bearer', '')
      .trim();

    return { ...user, sentRefreshToken: refreshToken, isStation: false };
  }
}
