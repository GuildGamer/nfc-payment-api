import { TransactionStatus, TransactionType } from '@prisma/client';
import { GetUserTransactionsDto } from './get-user-transactions.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetTransactionDto extends GetUserTransactionsDto {
  @IsOptional()
  @IsEnum(TransactionStatus, {
    message: `Valid options are ${Object.values(TransactionStatus)}`,
  })
  status: TransactionStatus;

  @IsOptional()
  @IsEnum(TransactionType, {
    message: `Valid options are ${Object.values(TransactionType)}`,
  })
  type: TransactionType;

  @IsOptional()
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  businessId: string;
}
