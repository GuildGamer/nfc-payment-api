import { StationType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';

export class CreateStationDto {
  @IsNotEmpty()
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

  // @IsNotEmpty()
  // @IsString()
  // businessId: string;

  @IsNotEmpty({ message: 'Pin should not be empty' })
  @IsString()
  @Length(6, 6, {
    message: 'Pin must be 6 digits long',
  })
  @Matches(/[0-9]/, {
    message: 'Pin must be a combination of digits',
  })
  pin: string;

  @IsNotEmpty()
  @IsEnum(StationType)
  type: StationType;
}
