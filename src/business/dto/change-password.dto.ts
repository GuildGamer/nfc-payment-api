import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class ChangeStationPasswordDto {
  @IsString()
  @IsNotEmpty()
  stationId: string;

  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6, {
    message: 'Pin must be 6 digits long',
  })
  @Matches(/[0-9]/, {
    message: 'Pin must be 6 digits long',
  })
  newPassword: string;
}
