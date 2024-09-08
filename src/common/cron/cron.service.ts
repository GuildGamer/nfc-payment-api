import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CronService {
  logger = new Logger(CronService.name);
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetStationBalances() {
    try {
      await this.prisma.station.updateMany({
        data: {
          dailyBalance: 0,
        },
      });
    } catch (error) {
      this.logger.error(
        'Failed to reset station balances',
        JSON.stringify(error, null, 2),
      );
    }
  }
}
