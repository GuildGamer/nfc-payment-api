import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  HttpCode,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorator';
import { JwtGuard, RolesGuard } from 'src/common/guard';
import { AdminService } from './admin.service';
import {
  ActivateUserDto,
  AddBankDto,
  DeactivateUserDto,
  GetDashboardDataDto,
  UpdateBankDto,
  UpdateCollectionDurationDto,
  UpdatePaymentProcessorDto,
  UpdateStaffDto,
} from './dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { RegisterStaffDto } from './dto/register-staff.dto';

@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}
  @Get('dashboard')
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
  getDashboardData(@Query() getDashboardDataDto: GetDashboardDataDto) {
    return this.adminService.getDashboardData(getDashboardDataDto);
  }

  @Post('register-staff')
  @Roles(Role.SUPER_ADMIN)
  registerStaff(@Body() registerStaffDto: RegisterStaffDto) {
    return this.adminService.registerStaff(registerStaffDto);
  }

  @Patch('deactivate-user')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  deactivateUser(@Body() deactivateUserDto: DeactivateUserDto) {
    return this.adminService.deactivateUser(deactivateUserDto);
  }

  @Patch('activate-user')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  activateUser(@Body() { userId }: ActivateUserDto) {
    return this.adminService.activateUser(userId);
  }

  @Patch('update-roles')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  updateStaffRoles(@Body() body: UpdateStaffDto) {
    return this.adminService.updateStaffRoles(body);
  }

  @Post('upload-banks')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  uploadBanks(@UploadedFile() file: Express.Multer.File) {
    return this.adminService.uploadBanks(file);
  }

  @Patch('update-processor')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  updatePaymentProcessor(@Body() dto: UpdatePaymentProcessorDto) {
    return this.adminService.updatePaymentProcessor(dto);
  }

  @Patch('update-collection-duration')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  updateCollectionDuration(@Body() dto: UpdateCollectionDurationDto) {
    return this.adminService.updateCollectionDuration(dto);
  }

  @Post('add-bank')
  @UseInterceptors(FileInterceptor('logo'))
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  addBank(
    @Body() addBankDto: AddBankDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1000000 }),
          new FileTypeValidator({ fileType: /png/ }),
        ],
      }),
    )
    logo: Express.Multer.File,
  ) {
    return this.adminService.addBank(addBankDto, logo);
  }

  @Patch('update-bank')
  @UseInterceptors(FileInterceptor('logo'))
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  updateBank(
    @Body() updateBankDto: UpdateBankDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1000000 }),
          new FileTypeValidator({ fileType: /png/ }),
        ],
        fileIsRequired: false,
      }),
    )
    logo?: Express.Multer.File,
  ) {
    return this.adminService.updateBank(updateBankDto, logo);
  }
}
