import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { AssignableRoles } from 'src/common/types';

export class UpdateStaffDto {
  @IsNotEmpty()
  @IsEnum(AssignableRoles, { each: true })
  roles: AssignableRoles[];

  @IsUUID()
  @IsNotEmpty()
  id: string;
}
