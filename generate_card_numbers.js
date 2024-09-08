/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

const startNumber = '1804837821';
const numberOfNumbers = 400;
const outputFilePath = path.join(__dirname, 'generated_numbers.txt');

let currentNumber = parseInt(startNumber, 10);

const writeStream = fs.createWriteStream(outputFilePath);

for (let i = 0; i < numberOfNumbers; i++) {
  writeStream.write(`${currentNumber}\n`);
  currentNumber++;
}

writeStream.end();

console.log(`Generated numbers written to ${outputFilePath}`);
