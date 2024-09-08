import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateCollectionDurationDto {
  @IsNumber()
  @IsNotEmpty()
  duration: number;
}
