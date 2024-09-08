import { TransactionStatus, TransactionType } from '@prisma/client';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { GetUserTransactionsDto } from './get-user-transactions.dto';

export class GetBusinessTransactionsDto extends GetUserTransactionsDto {
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
}
