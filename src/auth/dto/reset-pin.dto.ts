import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class ResetPinDto {
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, {
    message: 'Pin must be 6 digits long',
  })
  @Matches(/[0-9]/, {
    message: 'Pin must be 6 digits long',
  })
  pin: string;

  @IsNotEmpty()
  @IsString()
  otp: string;
}
