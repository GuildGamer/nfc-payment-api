import { Role } from '@prisma/client';
import * as argon from 'argon2';
import { config } from 'dotenv';
config();

export const getSuperAdmin = async () => {
  return {
    firstName: 'Super',
    lastName: 'Admin',
    phoneNumber: '2348161821436',
    countryId: 1,
    email: process.env.SUPER_ADMIN_EMAIL
      ? process.env.SUPER_ADMIN_EMAIL
      : 'superadmin@starkpay.africa',
    emailVerified: true,
    phoneNumberVerified: true,
    roles: [Role.SUPER_ADMIN],
    hash: `${await argon.hash(
      process.env.SUPER_ADMIN_PASSWORD
        ? process.env.SUPER_ADMIN_PASSWORD
        : 'MySuperStrongP@ssword1',
    )}`,
  };
};
