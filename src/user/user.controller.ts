import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role, Station, User } from '@prisma/client';
import { Roles, GetUser } from 'src/common/decorator';
import { JwtGuard, RolesGuard } from 'src/common/guard';
import {
  AddBankAcountDto,
  ChangePasswordDto,
  ChangePinDto,
  EditPhoneDto,
  FileReportDto,
  GetBanksDto,
  GetUsersDto,
  JoinWaitListDto,
  SearchUsersDto,
  SendOTPDto,
  UpdateUserDto,
} from './dto';
import { UserService } from './user.service';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

const OTP_RATE_TIME = process.env.OTP_RATE_TIME
  ? +process.env.OTP_RATE_TIME
  : 120;

@Controller('user')
export class UserController {
  constructor(
    private userService: UserService,
    private config: ConfigService,
  ) {}

  @HttpCode(200)
  @Get('')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.CUSTOMER,
    Role.SUPPORT,
    Role.MERCHANT,
    Role.AGENT,
    Role.BUSINESS,
  )
  getUserProfile(@GetUser() user: User) {
    return this.userService.getUser(user);
  }

  @HttpCode(200)
  @Get('station')
  @UseGuards(JwtGuard)
  getStation(@Req() req: Express.Request, @GetUser() station: Station) {
    return this.userService.getStation(station);
  }

  @HttpCode(200)
  @Get('collection-duration')
  @UseGuards(JwtGuard)
  getCollectionDuration() {
    return this.userService.getCollectionDuration();
  }

  @HttpCode(200)
  @Get('get-user-by-unique-identifier/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT, Role.AGENT)
  getUserByUniqueIdentifier(@Param('id') uniqueIdentifier: string) {
    return this.userService.getUserByUniqueIdentifier(uniqueIdentifier);
  }

  @HttpCode(201)
  @Post('join-waitlist')
  joinWaitlist(@Body() joinWaitListDto: JoinWaitListDto) {
    return this.userService.joinWaitlist(joinWaitListDto);
  }

  @HttpCode(201)
  @Post('add-bank-account')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.MERCHANT)
  addBankAccount(
    @Body() addBankAccountDto: AddBankAcountDto,
    @GetUser() user: User,
  ) {
    return this.userService.addBankAccount(addBankAccountDto, user);
  }

  @HttpCode(200)
  @Get('bank-account')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.MERCHANT)
  getBankAccount(@GetUser('id') userId: string) {
    return this.userService.getBankAccount(userId);
  }

  @HttpCode(200)
  @Get('banks')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(
    Role.CUSTOMER,
    Role.MERCHANT,
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.SUPPORT,
    Role.BUSINESS,
  )
  getBanks(@Body() getBanksDto: GetBanksDto) {
    return this.userService.getBanks(getBanksDto);
  }

  // @Throttle(1, OTP_RATE_TIME)
  @HttpCode(201)
  @Get('send-otp')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.MERCHANT, Role.SUPER_ADMIN)
  sendOTP(@Body() sendOTPDto: SendOTPDto, @GetUser() user: User) {
    return this.userService.sendOTP(user, sendOTPDto);
  }

  @HttpCode(201)
  @Patch('change-pin')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.CUSTOMER)
  changePin(@Body() body: ChangePinDto, @GetUser('id') userId: string) {
    return this.userService.changePin(body, userId);
  }

  @HttpCode(201)
  @Patch('change-password')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CUSTOMER, Role.BUSINESS, Role.AGENT)
  changePassword(
    @Body() body: ChangePasswordDto,
    @GetUser('id') userId: string,
  ) {
    return this.userService.changePassword(body, userId);
  }
  @HttpCode(201)
  @Patch('update-user')
  @UseGuards(JwtGuard)
  updateUser(@Body() updateUserDto: UpdateUserDto, @GetUser() user: User) {
    return this.userService.updateUser(user, updateUserDto);
  }

  @HttpCode(200)
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.MERCHANT)
  @Delete('delete')
  deleteUser(@GetUser('id') userId: string) {
    return this.userService.deleteUser(userId);
  }

  // @HttpCode(201)
  // @Patch('update-email')
  // @UseGuards(JwtGuard, RolesGuard)
  // @Roles(Role.CUSTOMER, Role.ADMIN, Role.MERCHANT, Role.SUPER_ADMIN)
  // editEmail(@Body() editEmailDto: EditEmailDto, @GetUser() user: User) {
  //   return this.userService.editEmail(user, editEmailDto);
  // }

  @HttpCode(200)
  @Get('verify-email/:otp')
  verifyEmail(@Param('otp') otp: string) {
    return this.userService.verifyEmail(otp);
  }

  @Throttle(1, OTP_RATE_TIME)
  @HttpCode(201)
  @Patch('update-phone')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.MERCHANT, Role.SUPER_ADMIN)
  editPhoneNumber(@Body() editPhoneDto: EditPhoneDto, @GetUser() user: User) {
    return this.userService.editPhoneNumber(user, editPhoneDto);
  }

  @HttpCode(200)
  @Get('get-users')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
  getUsers(@Query() getUsersDto: GetUsersDto) {
    return this.userService.getUsers(getUsersDto);
  }

  @HttpCode(200)
  @Get('report-categories')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.SUPPORT,
    Role.AGENT,
    Role.CUSTOMER,
    Role.MERCHANT,
  )
  getReportCategories() {
    return this.userService.getReportCategories();
  }

  @HttpCode(200)
  @Post('file-report')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT, Role.AGENT)
  fileReport(
    @Body() fileReportDto: FileReportDto,
    @GetUser('id') userId: string,
  ) {
    return this.userService.fileReport(fileReportDto, userId);
  }

  @HttpCode(200)
  @Get('search')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
  searchUsers(@Query() searchUsersDto: SearchUsersDto) {
    return this.userService.searchUsers(searchUsersDto);
  }
}
