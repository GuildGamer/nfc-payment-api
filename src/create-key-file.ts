// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
import { config } from 'dotenv';
config();

const data = process.env.BUS_STOP_FIREBASE_SDK_CONFIG;

const filePath = 'bus-stop-sdk.json';

export const createKeyFile = async () => {
  fs.writeFile(filePath, data, (err) => {
    if (err) {
      console.error('Error saving file:', err);
      return;
    }
    console.log('Google service account key file created successfully.');
  });
};
