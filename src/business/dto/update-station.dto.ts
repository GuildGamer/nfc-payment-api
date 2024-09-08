import { IsBoolean } from '@nestjs/class-validator';
import { StationType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';

export class UpdateStationDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  @Transform(({ value }) => value?.toLowerCase())
  name: string;

  @IsOptional()
  @IsBoolean()
  amountIsFixed: boolean;

  @ValidateIf((o) => o.amountIsFixed)
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsOptional({ message: 'Pin should not be empty' })
  @IsString()
  currentPin: string;

  @ValidateIf((o) => o.currentPin)
  @IsNotEmpty({ message: 'New Pin should not be empty' })
  @IsString()
  @Length(6, 6, {
    message: 'Pin must be 6 digits long',
  })
  @Matches(/[0-9]/, {
    message: 'Pin must be a combination of digits',
  })
  newPin: string;

  @IsOptional()
  @IsEnum(StationType)
  type: StationType;
}
