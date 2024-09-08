import { Injectable } from '@nestjs/common';
import { Seeder } from 'nestjs-seeder';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { getSuperAdmin } from './seedData';

@Injectable()
export class AdminSeeder implements Seeder {
  constructor(private readonly prisma: PrismaService) {}

  async seed(): Promise<any> {
    try {
      const superAdmin = await getSuperAdmin();
      const email = superAdmin.email;

      const existingUser = await this.prisma.user.findUnique({
        where: {
          email: superAdmin.email,
        },
      });

      if (existingUser) {
        console.log(`Super admin already exists, updating user`);
        delete superAdmin.email;
        await this.prisma.user.update({
          where: { email: email },
          data: {
            ...superAdmin,
          },
        });
      } else {
        // Insert into the database.;
        await this.prisma.user.create({
          data: { ...superAdmin },
        });
      }
      return { msg: 'Super admin seeded successfully' };
    } catch (error) {
      if (error.code === 'P2002') {
        console.log(`Super admin already exists`);
      } else {
        console.log('Error seeding admin');
      }
    }
  }

  async drop(): Promise<any> {
    try {
      await this.prisma.user.deleteMany({
        where: {
          roles: {
            has: Role.SUPER_ADMIN,
          },
        },
      });
      return { msg: 'Super admin dropped successfully' };
    } catch (error) {
      console.log('Error dropping admin');
    }
  }
}
