import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PublicKeyHelper {
  constructor(private prisma: PrismaService) {}
  async generate(): Promise<string> {
    try {
      const latestCards = await this.prisma.card.findMany({
        orderBy: {
          id: 'desc',
        },
        take: 1,
      });

      if (latestCards.length < 1) {
        return '1804837821';
      }

      const latestNfcCardNumber = +latestCards[0].nfcCardNumber;

      return (latestNfcCardNumber + 1).toString();
    } catch (error) {
      console.log(error);
    }
  }
}
