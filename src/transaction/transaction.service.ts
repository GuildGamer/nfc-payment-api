import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CustomResponse } from 'src/common/types';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  GetBusinessTransactionsDto,
  GetStationTransactionsDto,
  GetTransactionDto,
  GetUserTransactionsDto,
  SearchTransactionsDto,
} from './dto';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
@Injectable()
export class TransactionService {
  logger = new Logger(TransactionService.name);
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async getUserTransactions(
    userId: string,
    getTransactionsDto: GetUserTransactionsDto,
  ): Promise<CustomResponse> {
    try {
      const numberOfRecords = (await this.config.get('NUMBER_OF_TRANSACTIONS'))
        ? +(await this.config.get('NUMBER_OF_TRANSACTIONS'))
        : 20;

      const skip =
        getTransactionsDto.start === 0 ? 0 : getTransactionsDto.start - 1;

      const take = getTransactionsDto.take
        ? getTransactionsDto.take
        : numberOfRecords;

      const totalUserTransactions = await this.prisma.transaction.count({
        where: {
          OR: [
            {
              createdById: userId,
            },
            {
              recipientId: userId,
            },
          ],
        },
      });

      const transactions = await this.prisma.transaction.findMany({
        take: take,
        skip: skip,
        where: {
          createdAt: {
            lte: getTransactionsDto.toDate,
            gte: getTransactionsDto.fromDate,
          },
          OR: [
            {
              createdById: userId,
            },
            {
              recipientId: userId,
            },
          ],
        },
        include: {
          createdBy: true,
          recipient: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Successfully retrieved transactions',
        data: { transactions, totalUserTransactions },
      };
    } catch (error) {
      console.log(error);

      if (typeof error.status === 'number') {
        throw error;
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to get transactions',
        data: null,
      });
    }
  }

  async getStationTransactions(
    stationId: string,
    getTransactionsDto: GetStationTransactionsDto,
  ): Promise<CustomResponse> {
    try {
      const numberOfRecords = (await this.config.get('NUMBER_OF_TRANSACTIONS'))
        ? +(await this.config.get('NUMBER_OF_TRANSACTIONS'))
        : 20;

      const skip =
        getTransactionsDto.start === 0 ? 0 : getTransactionsDto.start - 1;

      const take = getTransactionsDto.take
        ? getTransactionsDto.take
        : numberOfRecords;

      const currentDate = new Date();

      const firstHourOfDay = new Date(currentDate);
      firstHourOfDay.setHours(0, 0, 0, 0);

      const lastHourOfDay = new Date(currentDate);
      lastHourOfDay.setHours(23, 59, 59, 999);

      const totalUserTransactions = await this.prisma.transaction.count({
        where: {
          stationId,
          createdAt: {
            lte: lastHourOfDay,
            gte: firstHourOfDay,
          },
        },
      });

      const transactions = await this.prisma.transaction.findMany({
        take: take,
        skip: skip,
        where: {
          createdAt: {
            lte: lastHourOfDay,
            gte: firstHourOfDay,
          },
          stationId,
        },
        include: {
          createdBy: true,
          recipient: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Successfully retrieved transactions',
        data: { transactions, totalUserTransactions },
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving transactions for station with id [${stationId}]`,
        JSON.stringify(error, null, 2),
      );

      if (typeof error.status === 'number') {
        throw error;
      }

      return {
        success: false,
        msg: 'Failed to get transactions',
        data: null,
      };
    }
  }

  async getTransactions(
    getTransactionsDto: GetTransactionDto,
  ): Promise<CustomResponse> {
    try {
      const numberOfRecords = (await this.config.get('NUMBER_OF_TRANSACTIONS'))
        ? +(await this.config.get('NUMBER_OF_TRANSACTIONS'))
        : 20;

      const skip =
        getTransactionsDto.start === 0 ? 0 : getTransactionsDto.start - 1;

      const take = getTransactionsDto.take
        ? getTransactionsDto.take
        : numberOfRecords;

      console.log('skip', skip);
      console.log('take', take);

      if (getTransactionsDto.userId) {
        const totalTransactions = await this.prisma.transaction.count({
          where: {
            status: getTransactionsDto.status,
            type: getTransactionsDto.type,
            businessId: getTransactionsDto.businessId,
            createdAt: {
              lte: getTransactionsDto.toDate,
              gte: getTransactionsDto.fromDate,
            },
            OR: [
              {
                createdById: getTransactionsDto.userId,
              },
              {
                recipientId: getTransactionsDto.userId,
              },
            ],
          },
        });

        const transactions = await this.prisma.transaction.findMany({
          take: take,
          skip: skip,
          where: {
            status: getTransactionsDto.status,
            type: getTransactionsDto.type,
            createdAt: {
              lte: getTransactionsDto.toDate,
              gte: getTransactionsDto.fromDate,
            },
            OR: [
              {
                createdById: getTransactionsDto.userId,
              },
              {
                recipientId: getTransactionsDto.userId,
              },
            ],
          },
          include: {
            createdBy: true,
            recipient: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return <CustomResponse>{
          success: true,
          msg: 'Successfully retrieved transactions',
          data: { transactions, totalTransactions },
        };
      } else {
        const totalTransactions = await this.prisma.transaction.count({
          where: {
            status: getTransactionsDto.status,
            type: getTransactionsDto.type,
            createdAt: {
              lte: getTransactionsDto.toDate,
              gte: getTransactionsDto.fromDate,
            },
          },
        });

        const transactions = await this.prisma.transaction.findMany({
          take: take,
          skip: skip,
          where: {
            status: getTransactionsDto.status,
            type: getTransactionsDto.type,
            createdAt: {
              lte: getTransactionsDto.toDate,
              gte: getTransactionsDto.fromDate,
            },
          },
          include: {
            createdBy: true,
            recipient: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return <CustomResponse>{
          success: true,
          msg: 'Successfully retrieved transactions',
          data: { transactions, totalTransactions },
        };
      }
    } catch (error) {
      this.logger.log(
        'Error getting transactions...',
        JSON.stringify(error, null, 2),
      );

      return {
        success: false,
        msg: 'Failed to get transactions',
        data: null,
      };
    }
  }

  async searchTransactions(
    searchTransactionsDto: SearchTransactionsDto,
  ): Promise<CustomResponse> {
    try {
      const numberOfRecords = (await this.config.get('NUMBER_OF_TRANSACTIONS'))
        ? +(await this.config.get('NUMBER_OF_TRANSACTIONS'))
        : 20;

      const skip =
        searchTransactionsDto.start === 0 ? 0 : searchTransactionsDto.start - 1;

      const take = searchTransactionsDto.take
        ? searchTransactionsDto.take
        : numberOfRecords;

      const transactions = await this.prisma.transaction.findMany({
        take: take,
        skip: skip,
        where: {
          OR: [
            {
              id: { search: searchTransactionsDto.term },
            },
            {
              transactionReference: { search: searchTransactionsDto.term },
            },
            {
              walletId: { search: searchTransactionsDto.term },
            },
            {
              userId: { search: searchTransactionsDto.term },
            },
            {
              recipientId: { search: searchTransactionsDto.term },
            },
            {
              createdById: { search: searchTransactionsDto.term },
            },
            {
              card: {
                nfcCardNumber: { search: searchTransactionsDto.term },
              },
            },
            {
              recipient: {
                firstName: { search: searchTransactionsDto.term },
              },
            },
            {
              recipient: {
                lastName: { search: searchTransactionsDto.term },
              },
            },
            {
              recipient: {
                username: { search: searchTransactionsDto.term },
              },
            },
            {
              createdBy: {
                firstName: { search: searchTransactionsDto.term },
              },
            },
            {
              createdBy: {
                lastName: { search: searchTransactionsDto.term },
              },
            },
            {
              createdBy: {
                username: { search: searchTransactionsDto.term },
              },
            },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Search successful',
        data: {
          transactions,
        },
      };
    } catch (error) {
      this.logger.error(
        'Error searching transactions',
        JSON.stringify(error, null, 2),
      );

      return <CustomResponse>{
        success: false,
        msg: 'Failed to search transactions',
      };
    }
  }

  async getBusinessTransactions(
    user: User,
    getTransactionsDto: GetBusinessTransactionsDto,
  ): Promise<CustomResponse> {
    try {
      const numberOfRecords = (await this.config.get('NUMBER_OF_TRANSACTIONS'))
        ? +(await this.config.get('NUMBER_OF_TRANSACTIONS'))
        : 20;

      const skip =
        getTransactionsDto.start === 0 ? 0 : getTransactionsDto.start - 1;

      const take = getTransactionsDto.take
        ? getTransactionsDto.take
        : numberOfRecords;

      const totalBusinessTransactions = await this.prisma.transaction.count({
        where: {
          businessId: user.businessId,
        },
      });

      const transactions = await this.prisma.transaction.findMany({
        take: take,
        skip: skip,
        where: {
          type: getTransactionsDto.type,
          status: getTransactionsDto.status,
          createdAt: {
            lte: getTransactionsDto.toDate,
            gte: getTransactionsDto.fromDate,
          },
          OR: [
            {
              createdById: getTransactionsDto.userId,
            },
            {
              recipientId: getTransactionsDto.userId,
            },
          ],
        },
        include: {
          createdBy: true,
          recipient: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Successfully retrieved transactions',
        data: { transactions, totalBusinessTransactions },
      };
    } catch (error) {
      console.log(error);

      if (typeof error.status === 'number') {
        throw error;
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to get transactions',
        data: null,
      });
    }
  }
}
