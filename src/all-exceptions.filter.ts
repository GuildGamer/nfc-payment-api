import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ResponseState } from './common/types';
const ERROR_MESSAGE = 'An error occurred, please contact support';
const ERROR_MESSAGES = [];

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  errorMessage(error: any) {
    if (error.message) return error.message;
    if (error.responseMessage) return error.responseMessage; // external service
    return ERROR_MESSAGE;
  }

  async catch(error: any, host: ArgumentsHost): Promise<void> {
    console.log('====== error =======');
    console.log(error);
    console.log('====== error =======');

    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    const httpStatus =
      error instanceof HttpException
        ? error.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const response = {
      technicalMessage: error.message,
      message: ERROR_MESSAGES.includes(error.message)
        ? error.message
        : 'An error has occurred, please contact support.',
      status: httpStatus,
      state: ResponseState.ERROR,
    };

    httpAdapter.reply(ctx.getResponse(), response, httpStatus);
  }
}
