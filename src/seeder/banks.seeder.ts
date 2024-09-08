import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Seeder } from 'nestjs-seeder';
import { PrismaService } from '../prisma/prisma.service';
import { getBanks } from './seedData';
import { Cache } from 'cache-manager';

@Injectable()
export class banksSeeder implements Seeder {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async seed(): Promise<any> {
    // try {
    //   await this.prisma.bank.deleteMany();
    // } catch (error) {
    //   console.log('Error seeding banks');
    // }

    // Insert into the database.;
    const banks = await getBanks();

    for (let i = 0; i < banks.length; i++) {
      try {
        await this.prisma.bank.create({
          data: { ...banks[i] },
        });
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`${banks[i].name} already exists`);
        } else {
          console.log(`Error seeding bank ${banks[i].name}`);
        }
      }
      const banksInDB = await this.prisma.bank.findMany();

      await this.cacheManager.set('banks', banksInDB);
    }

    return { msg: 'banks seeded successfully' };
  }

  async drop(): Promise<any> {
    try {
      await this.prisma.bank.deleteMany();
      return { msg: 'banks dropped successfully' };
    } catch (error) {
      console.log('Error dropping banks');
    }
  }
}
