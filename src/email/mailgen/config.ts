// eslint-disable-next-line @typescript-eslint/no-var-requires
const Mailgen = require('mailgen');

// Configure mailgen by setting a theme and your product info
export const mailGenerator = new Mailgen({
  theme: 'default',
  product: {
    name: 'StarkPay',
    link: 'https://www.starkpay.africa/',
    logo: 'https://iili.io/J84yEZX.png',
  },
});
