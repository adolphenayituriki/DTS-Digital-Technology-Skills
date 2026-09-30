// Fees an applicant is told about at the moment they apply, kept in one place
// so the notice the applicant reads on screen, the amount in the confirmation
// email and anything staff quote later can never disagree.

export const EARLY_PAYMENT_AMOUNT = 2000;
export const EARLY_PAYMENT_CURRENCY = 'RWF';

// What the 2,000 RWF actually is: an early-payment amount that comes off the
// certificate fee, not a second fee on top of it. Stated plainly so nobody
// thinks they now owe the certificate fee on top of it.
export const EARLY_PAYMENT_NOTICE = {
  amount: EARLY_PAYMENT_AMOUNT,
  currency: EARLY_PAYMENT_CURRENCY,
  title: 'Pay 2,000 RWF early',
  summary: `Pay ${EARLY_PAYMENT_AMOUNT.toLocaleString('en-US')} ${EARLY_PAYMENT_CURRENCY} early to secure your place.`,
  detail: `This ${EARLY_PAYMENT_AMOUNT.toLocaleString('en-US')} ${EARLY_PAYMENT_CURRENCY} is deducted from the certificate fee you will pay later, so it is not an extra charge on top of it.`,
  action: 'Bring or send your 2,000 RWF to the DTS office at UR-Huye Campus, or pay by mobile money.',
};

export const earlyPaymentNotice = () => ({ ...EARLY_PAYMENT_NOTICE });
