// Mirror of server/src/utils/fees.js. The server sends its copy in the response
// to POST /api/applications, so this is the offline default the notice card
// falls back to if that response is from an older build.

export const EARLY_PAYMENT_AMOUNT = 2000;
export const EARLY_PAYMENT_CURRENCY = 'RWF';

export const EARLY_PAYMENT_NOTICE = {
  amount: EARLY_PAYMENT_AMOUNT,
  currency: EARLY_PAYMENT_CURRENCY,
  title: 'Pay 2,000 RWF early',
  summary: `Pay ${EARLY_PAYMENT_AMOUNT.toLocaleString('en-US')} ${EARLY_PAYMENT_CURRENCY} early to secure your place.`,
  detail: `This ${EARLY_PAYMENT_AMOUNT.toLocaleString('en-US')} ${EARLY_PAYMENT_CURRENCY} is deducted from the certificate fee you will pay later, so it is not an extra charge on top of it.`,
  action: 'Bring or send your 2,000 RWF to the DTS office at UR-Huye Campus, or pay by mobile money.',
};
