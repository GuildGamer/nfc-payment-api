import { ReportCategory } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FileReportDto {
  @IsEnum(ReportCategory)
  @IsNotEmpty()
  category: ReportCategory;

  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  userUniqueIdentifier: string;
}
