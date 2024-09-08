import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { GetUser, Roles } from 'src/common/decorator';
import { JwtGuard, RolesGuard } from 'src/common/guard';

import {
  AddNFCCardDto,
  AgentAttachNFCCardDto,
  AgentDisableNFCCardDto,
  GetNFCCardsDto,
  UpdateNFCCardDto,
} from './dto';
import { CardService } from './card.service';
import { Role, User } from '@prisma/client';
import { OTPEnum } from 'src/common/types';

@Controller('card')
export class CardController {
  constructor(private cardService: CardService) {}

  @HttpCode(201)
  @Post('create-card')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async createCard(@GetUser('id') userId: string) {
    return this.cardService.createCard(userId);
  }

  @HttpCode(200)
  @Put('attach')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  addNFCCard(@Body() dto: AddNFCCardDto, @GetUser() user: any) {
    return this.cardService.addNFCCard(user.id, user, dto);
  }

  @HttpCode(200)
  @Post('agent/init-add-card/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.AGENT)
  initAddCard(@Param('id') userId: string) {
    return this.cardService.sendOTP(userId, OTPEnum.ADD_CARD);
  }

  @HttpCode(200)
  @Post('agent/init-disable-card/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.AGENT)
  initRemoveCard(@Param('id') userId: string) {
    return this.cardService.sendOTP(userId, OTPEnum.DISABLE_CARD);
  }

  @HttpCode(200)
  @Put('agent/attach')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.AGENT)
  agentAttachNFCCard(
    @Body() agentAttachNFCCardDto: AgentAttachNFCCardDto,
    @GetUser('id') userId: string,
  ) {
    return this.cardService.agentAttachNFCCard(agentAttachNFCCardDto, userId);
  }

  @HttpCode(200)
  @Patch('agent/disable')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.AGENT)
  agentDisableNFCCard(
    @Body() agentDisableNFCCardDto: AgentDisableNFCCardDto,
    @GetUser('id') userId: string,
  ) {
    return this.cardService.agentDisableNFCCard(agentDisableNFCCardDto, userId);
  }

  @HttpCode(200)
  @Get('get-all-my-cards/')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  getMyNFCCards(@GetUser('id') userId: string) {
    return this.cardService.getNFCCards(userId);
  }

  @HttpCode(200)
  @Get('agent/get-all-user-cards/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.AGENT)
  agentGetMyNFCCards(@Param('id') userId: string) {
    return this.cardService.getNFCCards(userId);
  }

  @HttpCode(200)
  @Get('get-all-cards/')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
  getCards(@Body() getAllNFCCardsDto: GetNFCCardsDto) {
    return this.cardService.getAllNFCCards(getAllNFCCardsDto);
  }

  @HttpCode(200)
  @Get('get-nfc-card/')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  getNFCCards(
    @Param('cardId', new ParseIntPipe()) cardId: number,
    @GetUser('id') userId: string,
  ) {
    return this.cardService.getNFCCard(cardId, userId);
  }

  @HttpCode(201)
  @Patch('update-nfc-card/:cardNumber')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  updateNFCCard(
    @Body() updateNFCCardDto: UpdateNFCCardDto,
    @GetUser() user: User,
    @Param('cardNumber') cardNumber: string,
  ) {
    return this.cardService.updateNFCCard(updateNFCCardDto, user, cardNumber);
  }

  @HttpCode(200)
  @Patch('remove-nfc-card/:cardId')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  removeNFCCard(
    @Param('cardId', new ParseIntPipe()) cardId: number,
    @GetUser() user: User,
  ) {
    return this.cardService.removeNFCCard(cardId, user);
  }

  @HttpCode(200)
  @Delete('delete-nfc-card/:cardId')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
  deleteNFCCard(
    @Param('cardId', new ParseIntPipe()) cardId: number,
    @GetUser(`id`) userId: string,
  ) {
    return this.cardService.deleteNFCCard(cardId, userId);
  }
}
