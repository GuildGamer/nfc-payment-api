import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  PaymentProcessor,
  TransactionStatus,
  TransactionType,
  User,
  Wallet,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AgentFundWalletWithBankTransferDto,
  BusinessWithdrawDto,
  FundWalletWithCardDto,
  UpdateWalletDto,
  WithdrawIntoBankAccountDto,
} from './dto';
import { CustomResponse, UserWithWallet } from 'src/common/types';
import { BankTranferHelper, CollectionAccountHelper } from './helpers';
import * as argon from 'argon2';
import {
  GeneralHelpers,
  TransactionReferenceHelper,
  toValidPhoneNumber,
} from 'src/common/helpers';
import { BusinessService } from 'src/business/business.service';

@Injectable()
export class WalletService {
  logger = new Logger(WalletService.name);
  constructor(
    private prisma: PrismaService,
    private collectionAccountHelper: CollectionAccountHelper,
    private bankTranferHelper: BankTranferHelper,
    private transactionRefHelper: TransactionReferenceHelper,
    private businessService: BusinessService,
  ) {}

  async fundWalletWithBankTransfer(
    user: User,
    wallet: Wallet,
    amount: number,
  ): Promise<CustomResponse> {
    try {
      const userWithWallet: UserWithWallet = user;

      // CBN guidelines
      if (amount > 50000) {
        return {
          success: false,
          msg: 'Your cannot fund with more than 50,000 at once.',
          data: null,
        };
      }

      if (amount + userWithWallet.wallets[0].balance > 300000) {
        return {
          success: false,
          msg: 'Your cannot have more than NGN 300,000 in your wallet',
          data: null,
        };
      }

      let bankName: string;
      let accountNumber: string;
      let accountName: string;

      const name = user.firstName + ' ' + user.lastName;
      const createdBloc = null;
      // await this.collectionAccountHelper.createWithBloc(
      //   name,
      //   user.username,
      //   1,
      //   amount,
      // );
      const reference = await this.transactionRefHelper.generate(
        TransactionType.FUND_WALLET,
      );

      const created = await this.collectionAccountHelper.createWithFlw(
        user.email,
        name,
        amount,
        1,
        reference,
      );

      if (createdBloc?.success && createdBloc?.data) {
        bankName = createdBloc.data?.bank_name;
        accountNumber = createdBloc.data?.account_number;
        accountName = createdBloc.data?.name;
        console.log(createdBloc);
        console.log('Bloc');
      } else if (created.success) {
        bankName = created.data?.bank_name;
        accountNumber = created.data?.account_number;
        accountName = `${name} (StarkPay)`;
      } else {
        console.log('Both failed');
      }

      if (!created.success && !createdBloc.success) {
        return {
          success: false,
          msg: 'Failed to create bank account',
          data: null,
        };
      }

      await this.prisma.transaction.create({
        data: {
          status: TransactionStatus.PENDING,
          transactionReference: reference,
          type: TransactionType.FUND_WALLET,
          processor: PaymentProcessor.FLUTTERWAVE,
          amount: amount,
          recipientId: user.id,
          walletId: wallet.id,
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Bank account created successfully.',
        data: {
          account: {
            bankName,
            accountNumber,
            accountName,
          },
        },
      };
    } catch (error) {
      console.log(error);

      if (typeof error.status === 'number') {
        throw error;
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to create bank account',
        data: null,
      });
    }
  }

  async agentFundWalletWithBankTransfer(
    agentFundWalletWithBankTransferDto: AgentFundWalletWithBankTransferDto,
  ): Promise<CustomResponse> {
    try {
      const isEmail = GeneralHelpers.isValidEmail(
        agentFundWalletWithBankTransferDto.uniqueIdentifier,
      );

      const isPhone = GeneralHelpers.isPhone(
        agentFundWalletWithBankTransferDto.uniqueIdentifier,
      );

      let user: any;

      if (isEmail) {
        user = await this.prisma.user.findUnique({
          where: {
            email: agentFundWalletWithBankTransferDto.uniqueIdentifier,
          },
          include: {
            wallets: true,
          },
        });
      } else if (isPhone) {
        agentFundWalletWithBankTransferDto.uniqueIdentifier =
          toValidPhoneNumber(
            agentFundWalletWithBankTransferDto.uniqueIdentifier,
          );

        user = await this.prisma.user.findUnique({
          where: {
            phoneNumber: agentFundWalletWithBankTransferDto.uniqueIdentifier,
          },
          include: {
            wallets: true,
          },
        });
      } else {
        user = await this.prisma.user.findUnique({
          where: {
            username: agentFundWalletWithBankTransferDto.uniqueIdentifier,
          },
          include: {
            wallets: true,
          },
        });
      }

      if (!user) {
        return <CustomResponse>{
          success: false,
          msg: 'User not found',
        };
      }

      const response = await this.fundWalletWithBankTransfer(
        user,
        user.wallets[0],
        agentFundWalletWithBankTransferDto.amount,
      );
      return response;
    } catch (error) {
      this.logger.error(
        'ERROR while agent was funding a wallet',
        JSON.stringify(error, null, 2),
      );

      return <CustomResponse>{
        success: false,
        msg: 'Failed to generate account number',
      };
    }
  }
  async fundWalletWithCard(
    user: any,
    fundWalletWithCardDto: FundWalletWithCardDto,
  ): Promise<CustomResponse> {
    try {
      const transaction = this.prisma.transaction.create({
        data: {
          status: TransactionStatus.PENDING,
          transactionReference: fundWalletWithCardDto.transactionReference,
          type: TransactionType.FUND_WALLET,
          amount: fundWalletWithCardDto.amount,
          recipientId: user.id,
          walletId: user.wallets[0].id,
        },
      });

      return <CustomResponse>{
        success: true,
        msg: '',
        data: {
          transaction,
        },
      };
    } catch (error) {
      console.log(error);

      if (typeof error.status === 'number') {
        throw error;
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to create transaction',
        data: null,
      });
    }
  }

  async createWallet(userId: string): Promise<Wallet> {
    try {
      const wallet = await this.prisma.wallet.create({
        data: {
          userId: userId,
        },
      });

      return wallet;
    } catch (error) {
      console.log(error);
    }
  }

  async getWallets(userId: string): Promise<CustomResponse> {
    try {
      const wallets = await this.prisma.wallet.findMany({
        where: {
          userId,
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Successfully retrieved wallets',
        data: { wallets },
      };
    } catch (error) {
      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to get wallets',
        data: null,
      });
    }
  }

  async findOne(id: string): Promise<Wallet | null> {
    try {
      return await this.prisma.wallet.findUnique({
        where: { id },
      });
    } catch (error) {
      console.log(error);

      throw new Error('failed to find wallet');
    }
  }

  async update(id: string, updateWalletDto: UpdateWalletDto) {
    try {
      return await this.prisma.wallet.update({
        where: { id },
        data: updateWalletDto,
      });
    } catch (error) {
      console.log(error);

      throw new Error('failed to update wallet');
    }
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    try {
      return this.prisma.wallet.findFirst({
        where: {
          userId,
        },
      });
    } catch (error) {
      console.log(error);

      throw new Error('failed to find wallet');
    }
  }

  async withdrawToBank(
    bankAccountId: string,
    walletId: string,
    requestedAmount: number,
    narration?: string,
    withdrawalAmount?: number,
  ): Promise<{
    success: boolean;
    reference?: string;
    amount?: number;
    message?: string;
  }> {
    try {
      if (requestedAmount < 100) {
        return {
          success: false,
          message: 'Amount is below minimum limit of 100',
        };
      }

      const bankAccount = await this.prisma.bankAccount.findUnique({
        where: {
          id: bankAccountId,
        },
        include: {
          bank: true,
        },
      });

      const wallet = await this.prisma.wallet.findUnique({
        where: {
          id: walletId,
        },
      });

      if (!bankAccount) {
        return {
          success: false,
          message: 'Please add a bank account first.',
        };
      }
      if (withdrawalAmount) {
        if (requestedAmount > withdrawalAmount) {
          return {
            success: false,
            message: 'Insufficient balance',
          };
        } else if (requestedAmount > wallet.balance) {
          return {
            success: false,
            message: 'Insufficient balance',
          };
        }
      }

      const response = await this.bankTranferHelper.flutterwaveTransfer(
        requestedAmount,
        bankAccount.bank,
        bankAccount.number,
        narration,
      );

      const { reference, amount } = response.data;

      return {
        success: true,
        reference,
        amount,
        message: ``,
      };
    } catch (error) {
      this.logger.error(``);

      console.log(error);

      return {
        success: false,
        message: ``,
      };
    }
  }
  async userWithdraw(
    user: UserWithWallet,
    dto: WithdrawIntoBankAccountDto,
  ): Promise<CustomResponse> {
    try {
      const { requestedAmount, narration, password } = dto;
      const { hash, wallets, bankAccountId, id } = user;

      const passMatches = await argon.verify(hash, password);

      if (!passMatches) {
        console.log('PASSWORD DID NOT MATCH');

        return {
          success: false,
          msg: 'Incorrect password',
          data: null,
        };
      }

      const response = await this.withdrawToBank(
        bankAccountId,
        wallets[0].id,
        requestedAmount,
        narration,
      );

      const { success, message, reference, amount } = response;

      if (success) {
        const trx = await this.prisma.$transaction([
          this.prisma.wallet.update({
            where: {
              id: wallets[0].id,
            },
            data: {
              balance: { decrement: amount },
            },
          }),
          this.prisma.transaction.create({
            data: {
              status: TransactionStatus.PENDING,
              transactionReference: reference,
              type: TransactionType.WITHDRAWAL,
              processor: PaymentProcessor.FLUTTERWAVE,
              amount,
              recipientId: id,
              createdById: id,
              walletId: wallets[0].id,
              narration,
            },
          }),
        ]);

        return <CustomResponse>{
          success: true,
          msg: 'Withdrawal request made successfully',
          data: {
            ...trx[1],
          },
        };
      } else {
        const transaction = await this.prisma.transaction.create({
          data: {
            status: TransactionStatus.FAILED,
            transactionReference: reference,
            type: TransactionType.WITHDRAWAL,
            processor: PaymentProcessor.FLUTTERWAVE,
            amount,
            recipientId: user.id,
            walletId: user.wallets[0].id,
            narration,
          },
        });

        return <CustomResponse>{
          success: false,
          msg: message,
          data: {
            transaction,
          },
        };
      }
    } catch (error) {
      console.log(error);

      if (typeof error.status === 'number') {
        throw error;
      }

      return <CustomResponse>{
        success: false,
        msg: 'failed to make withdrawal request',
        data: null,
      };
    }
  }

  async businessWithdraw(
    dto: BusinessWithdrawDto,
    user: UserWithWallet,
  ): Promise<CustomResponse> {
    const { businessId, hash, id } = user;
    try {
      const { requestedAmount, password, narration } = dto;
      const { wallets, bankAccount, name } =
        await this.prisma.business.findUnique({
          where: {
            id: businessId,
          },
          include: {
            wallets: true,
            bankAccount: true,
          },
        });

      const passMatches = await argon.verify(hash, password);

      if (!passMatches) {
        console.log('PASSWORD DID NOT MATCH');

        return {
          success: false,
          msg: 'Incorrect password',
          data: null,
        };
      }

      const totalWithdrawalAmount =
        (await this.businessService.getWithdrawalBalance(businessId)) ?? 0;

      if (!bankAccount) {
        return {
          success: false,
          msg: 'Please add a bank account first.',
          data: {},
        };
      }

      const response = await this.withdrawToBank(
        bankAccount.id,
        wallets[0].id,
        requestedAmount,
        narration,
        totalWithdrawalAmount,
      );

      const { success, message, reference, amount } = response;

      if (success) {
        const trx = await this.prisma.$transaction([
          this.prisma.wallet.update({
            where: {
              id: wallets[0].id,
            },
            data: {
              balance: { decrement: amount },
            },
          }),
          this.prisma.transaction.create({
            data: {
              status: TransactionStatus.PENDING,
              transactionReference: reference,
              type: TransactionType.WITHDRAWAL,
              amount,
              processor: PaymentProcessor.FLUTTERWAVE,
              businessId,
              walletId: wallets[0].id,
              createdById: id,
              narration: `StarkPay Payout to ${name}`,
            },
          }),
        ]);

        return <CustomResponse>{
          success: true,
          msg: 'Withdrawal request made successfully',
          data: {
            ...trx[1],
          },
        };
      } else {
        if (reference) {
          const transaction = await this.prisma.transaction.create({
            data: {
              status: TransactionStatus.FAILED,
              transactionReference: reference,
              type: TransactionType.WITHDRAWAL,
              processor: PaymentProcessor.FLUTTERWAVE,
              amount,
              businessId,
              walletId: wallets[0].id,
              createdById: id,
              narration: `FAILED StarkPay Payout to ${name}`,
            },
          });

          return <CustomResponse>{
            success: false,
            msg: message,
            data: {
              transaction,
            },
          };
        }

        return <CustomResponse>{
          success: false,
          msg: message,
          data: {},
        };
      }
    } catch (error) {
      this.logger.error(`Error while making withdrawal request for business}`);

      console.log(error);

      return {
        success: false,
        msg: `Failed to make withdrawal request`,
        data: {},
      };
    }
  }

  async calculateFee(transactionAmount: number): Promise<CustomResponse> {
    let fee = 0;

    if (transactionAmount <= 5000) {
      fee = 10; // 10 Naira + 7.5% VAT for Transactions up to N5,000.
    } else if (transactionAmount <= 50000) {
      fee = 25; // 25 Naira + 7.5% VAT for Transactions from N5,001 to N50,000.
    } else {
      fee = 50; // 50 Naira + 7.5% VAT for Transactions more than N50,001.
    }

    // Calculate VAT (7.5% of the fee)
    const vat = (fee * 7.5) / 100;

    // Add VAT to the fee
    fee += vat;

    return {
      success: true,
      msg: `Fee calculated successfully`,
      data: { fee },
    };
  }

  async getPaymentProcessor(): Promise<CustomResponse> {
    try {
      const processor = (await this.prisma.configuration.findFirst())
        .paymentProcessor;
      return {
        success: true,
        msg: ``,
        data: { processor },
      };
    } catch (error) {
      this.logger.error(`Error getting payment processor`);

      console.log(error);

      return {
        success: false,
        msg: `Failed to get processor`,
        data: null,
      };
    }
  }
}
