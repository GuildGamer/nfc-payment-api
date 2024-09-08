// file.controller.ts
import { Controller, Get, Res, Param } from '@nestjs/common';
import { Response } from 'express';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly fileService: FilesService) {}

  @Get('/download-apk')
  async downloadFile(@Res() res: Response) {
    try {
      const fileData = await this.fileService.readFile('starkpay.apk');
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${'starkpay.apk'}`,
      );
      res.send(fileData);
    } catch (error) {
      res.status(500).send({ error: 'Failed to download file' });
    }
  }
}
