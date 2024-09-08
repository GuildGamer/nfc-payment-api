import { Injectable } from '@nestjs/common';
import { Seeder } from 'nestjs-seeder';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConfigTableSeeder implements Seeder {
  constructor(private readonly prisma: PrismaService) {}

  async seed(): Promise<any> {
    const config = await this.prisma.configuration.findFirst();

    if (config) {
      console.log('Config table already exists');
      return { msg: 'Config table already exists' };
    }

    await this.prisma.configuration.create({});
    console.log('Config table created successfully');
    return { msg: 'Config table created successfully' };
  }

  async drop(): Promise<any> {
    try {
      await this.prisma.configuration.deleteMany();
      return { msg: 'config table dropped successfully' };
    } catch (error) {
      console.log('Error config table');
    }
  }
}
