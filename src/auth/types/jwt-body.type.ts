import { TokenType } from './jwt-token.type';

export type JwtBody = {
  phone?: string;

  type: TokenType;
};
