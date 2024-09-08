import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class KycGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!(user?.identityDocument && user?.selfieImage)) {
      throw new ForbiddenException('Please complete your kyc verification');
    }
    return true;
  }
}
