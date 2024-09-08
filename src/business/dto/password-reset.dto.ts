import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CompleteStationPasswordResetDto {
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, {
    message: 'Pin must be 6 digits long',
  })
  @Matches(/[0-9]/, {
    message: 'Pin must be 6 digits long',
  })
  password: string;

  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsString()
  stationId: string;
}
