import { ConfigService } from '@nestjs/config';
import { seeder } from 'nestjs-seeder';
// import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminSeeder } from './admin.seeder';
import { CountriesSeeder } from './countries.seeder';
import { banksSeeder } from './banks.seeder';
import { CacheModule } from '@nestjs/common';
import { ConfigTableSeeder } from './config.seeder';

seeder({
  imports: [CacheModule.register()],
  providers: [PrismaService, ConfigService],
}).run([CountriesSeeder, AdminSeeder, banksSeeder, ConfigTableSeeder]);
