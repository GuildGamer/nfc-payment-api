import { Injectable } from '@nestjs/common';
import { Seeder } from 'nestjs-seeder';
import { PrismaService } from '../prisma/prisma.service';
import { getCountries } from './seedData';

@Injectable()
export class CountriesSeeder implements Seeder {
  constructor(private readonly prisma: PrismaService) {}

  async seed(): Promise<any> {
    try {
      await this.prisma.country.deleteMany();
    } catch (error) {
      console.log('Error seeding countries');
    }

    // Insert into the database.;
    const countries = await getCountries();
    for (let i = 0; i < countries.length; i++) {
      try {
        await this.prisma.country.create({
          data: { ...countries[i] },
        });
      } catch (error) {
        console.log(`Error seeding country ${countries[i].name}`);
      }
    }

    return { msg: 'Countries seeded successfully' };
  }

  async drop(): Promise<any> {
    try {
      await this.prisma.country.deleteMany();
      return { msg: 'Countries dropped successfully' };
    } catch (error) {
      console.log('Error dropping countries');
    }
  }
}
