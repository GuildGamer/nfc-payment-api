import { Injectable } from '@nestjs/common';

@Injectable()
export class ExcludeFieldsHelper {
  async safeUser<User>(user: User) {
    try {
      const keys = ['hash', 'biometricSecret', 'otp', 'twoFactorSecret'];

      for (const key of keys) {
        delete user[key];
      }
      return user;
    } catch (error) {
      console.log(error);

      throw new Error('Failed to return safe user');
    }
  }

  static safeObject(object: any, keys: string[]) {
    try {
      for (const key of keys) {
        delete object[key];
      }
      return object;
    } catch (error) {
      console.log(error);

      throw new Error('Failed to return safe object');
    }
  }
}
