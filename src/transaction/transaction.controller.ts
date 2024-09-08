import { Controller, Get, HttpCode, Query, UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { JwtGuard, RolesGuard } from 'src/common/guard';
import { GetUser, Roles } from 'src/common/decorator';
import { Role, User } from '@prisma/client';
import {
  GetBusinessTransactionsDto,
  GetStationTransactionsDto,
  GetTransactionDto,
  GetUserTransactionsDto,
  SearchTransactionsDto,
} from './dto';

@Controller('transaction')
@UseGuards(JwtGuard, RolesGuard)
export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  @HttpCode(200)
  @Get('')
  @Roles(Role.CUSTOMER, Role.MERCHANT)
  getUserTransactions(
    @GetUser('id') userId: string,
    @Query() getTransactionsDto: GetUserTransactionsDto,
  ) {
    return this.transactionService.getUserTransactions(
      userId,
      getTransactionsDto,
    );
  }

  @HttpCode(200)
  @Get('station')
  @Roles(Role.MERCHANT)
  getStationTransactions(
    @GetUser('id') userId: string,
    @Query() getTransactionsDto: GetStationTransactionsDto,
  ) {
    return this.transactionService.getStationTransactions(
      userId,
      getTransactionsDto,
    );
  }

  @HttpCode(200)
  @Get('filter')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
  getTransactions(@Query() getTransactionsDto: GetTransactionDto) {
    return this.transactionService.getTransactions(getTransactionsDto);
  }

  @HttpCode(200)
  @Get('business')
  @Roles(Role.BUSINESS)
  getBusinessTransactions(
    @Query() getTransactionsDto: GetBusinessTransactionsDto,
    @GetUser() user: User,
  ) {
    return this.transactionService.getBusinessTransactions(
      user,
      getTransactionsDto,
    );
  }

  @HttpCode(200)
  @Get('search')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
  searchTransactions(@Query() searchTransactionsDto: SearchTransactionsDto) {
    return this.transactionService.searchTransactions(searchTransactionsDto);
  }
}
