import { config } from 'dotenv';
config();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

export const getBanks = async () => {
  const rawdata = fs.readFileSync('banks.json');
  const banks = JSON.parse(rawdata);

  return banks;
};
