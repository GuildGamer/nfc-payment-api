import { config } from 'dotenv';
config();

export const getCountries = async () => {
  return [
    {
      name: 'Nigeria',
      ext: '+234',
      code: 'NG',
      regex: '^[\'"]?\\d{10,11}[\'"]?$',
    },
  ];
};
