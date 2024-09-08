import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { EmailVerifiedGuard, JwtGuard, RolesGuard } from 'src/common/guard';
import { GetUser, Roles } from 'src/common/decorator';
import { Role, User } from '@prisma/client';
import {
  AgentFundWalletWithBankTransferDto,
  BusinessWithdrawDto,
  FundWalletWithCardDto,
  WithdrawIntoBankAccountDto,
} from './dto';
import { UserWithWallet } from 'src/common/types';

@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @HttpCode(200)
  @Get('')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.MERCHANT, Role.BUSINESS)
  getWallets(@GetUser('id') userId: string) {
    return this.walletService.getWallets(userId);
  }

  @HttpCode(200)
  @Get('fund-with-bank-transfer/:amount')
  @UseGuards(JwtGuard, RolesGuard, EmailVerifiedGuard)
  @Roles(Role.CUSTOMER)
  fundWalletWithBankTransfer(
    @GetUser() user: any,
    @Param('amount', new ParseIntPipe()) amount: number,
  ) {
    return this.walletService.fundWalletWithBankTransfer(
      user,
      user.wallets[0],
      amount,
    );
  }

  @HttpCode(200)
  @Post('agent-fund-with-bank-transfer')
  @UseGuards(JwtGuard, RolesGuard, EmailVerifiedGuard)
  @Roles(Role.AGENT, Role.ADMIN, Role.SUPER_ADMIN)
  agentFundWalletWithBankTransfer(
    @Body()
    agentFundWalletWithBankTransferDto: AgentFundWalletWithBankTransferDto,
  ) {
    return this.walletService.agentFundWalletWithBankTransfer(
      agentFundWalletWithBankTransferDto,
    );
  }

  @HttpCode(200)
  @Post('fund-with-card/')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  fundWalletWithCard(
    @GetUser() user: User,
    @Body() fundWalletWithCardDto: FundWalletWithCardDto,
  ) {
    return this.walletService.fundWalletWithCard(user, fundWalletWithCardDto);
  }

  @HttpCode(200)
  @Post('withdraw-to-bank')
  @UseGuards(JwtGuard, RolesGuard, EmailVerifiedGuard)
  @Roles(Role.CUSTOMER, Role.MERCHANT)
  withdrawToBank(
    @GetUser() user: UserWithWallet,
    @Body() dto: WithdrawIntoBankAccountDto,
  ) {
    return this.walletService.userWithdraw(user, dto);
  }

  @HttpCode(200)
  @Post('business-withdraw')
  @UseGuards(JwtGuard, RolesGuard, EmailVerifiedGuard)
  @Roles(Role.BUSINESS)
  businessWithdraw(
    @GetUser() user: UserWithWallet,
    @Body() dto: BusinessWithdrawDto,
  ) {
    return this.walletService.businessWithdraw(dto, user);
  }

  @Get('calculate-fee')
  calculateFee(@Query('amount', ParseIntPipe) amount: number) {
    return this.walletService.calculateFee(amount);
  }

  @Get('get-processor')
  getPaymentProcessor() {
    return this.walletService.getPaymentProcessor();
  }
}
