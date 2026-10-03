// Mirror of server/src/utils/fees.js. The server sends its copy in the response
// to POST /api/applications, so this is the offline default the notice card
// falls back to if that response is from an older build.

export const EARLY_PAYMENT_AMOUNT = 2000;
export const EARLY_PAYMENT_CURRENCY = 'RWF';

// Keep in step with server/src/utils/fees.js word for word: the applicant
// compares what they read on screen against what arrives by email, and any
// difference between the two reads as one of them being wrong.
export const EARLY_PAYMENT_NOTICE = {
  amount: EARLY_PAYMENT_AMOUNT,
  currency: EARLY_PAYMENT_CURRENCY,
  title: 'Pay 2,000 RWF early',
  summary: `Pay ${EARLY_PAYMENT_AMOUNT.toLocaleString('en-US')} ${EARLY_PAYMENT_CURRENCY} early to secure your place.`,
  detail:
    'This is not an extra fee. The 2,000 RWF is taken off the certificate fee you pay later, so you only pay what is left — you never pay it twice.',
  certificateFeeExample: 'For example, if the certificate fee were 8,000 RWF, you would pay 8,000 − 2,000 = 6,000 RWF now.',
  action:
    'Bring or send your 2,000 RWF to the DTS office at UR-Huye Campus, or pay by mobile money to +250 788 300 300 (MTN), Kamugisha Elizabeth.',
};