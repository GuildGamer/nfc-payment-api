import { User } from '@prisma/client';

export type verifyOtpResponse = {
  valid: boolean;
  msg: string;
  user: User | null;
};
