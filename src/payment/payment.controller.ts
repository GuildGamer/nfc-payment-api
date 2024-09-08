import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, SendPaymentDto } from './dto';
import { GetUser, Roles } from 'src/common/decorator';
import { JwtGuard, RolesGuard } from 'src/common/guard';
import { Role } from '@prisma/client';
import { UserWithWallet } from 'src/common/types';

@Controller('payments')
@UseGuards(JwtGuard, RolesGuard)
@Roles(Role.CUSTOMER, Role.MERCHANT)
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('collect')
  collectPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @GetUser() entity: any,
  ) {
    return this.paymentService.collectPayment(entity, createPaymentDto);
  }

  @Post('send')
  sendPayment(
    @Body() sendPaymentDto: SendPaymentDto,
    @GetUser() user: UserWithWallet,
  ) {
    return this.paymentService.sendPayment(user, sendPaymentDto);
  }
}
