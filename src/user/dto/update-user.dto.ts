import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class UpdateUserDto {
  // @ValidateIf((o) => o.firstName)
  // @IsString()
  // @IsNotEmpty()
  // firstName: string;

  // @ValidateIf((o) => o.lastName)
  // @IsString()
  // @IsNotEmpty()
  // lastName: string;

  @ValidateIf((o) => o.email != undefined)
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  email: string;

  @ValidateIf((o) => o.username != undefined)
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => {
    return value.toLowerCase();
  })
  @Transform(({ value }) => value?.trim())
  username: string;
}
