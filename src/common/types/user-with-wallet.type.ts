import { User, Wallet } from '@prisma/client';

export interface UserWithWallet extends User {
  wallets?: Wallet[];
}
