// Fees an applicant is told about at the moment they apply, kept in one place
// so the notice the applicant reads on screen, the amount in the confirmation
// email and anything staff quote later can never disagree.

export const EARLY_PAYMENT_AMOUNT = 2000;
export const EARLY_PAYMENT_CURRENCY = 'RWF';

// What the 2,000 RWF actually is: money paid now that comes off the
// certificate fee later, NOT a second fee on top of it.
//
// This was reworded after the original phrasing was judged too easy to
// misread as an extra charge. The version below leads with the reassurance,
// then proves it with a worked example, because a number people can check is
// understood faster than a sentence they have to parse.
//
// `certificateFeeExample` is only ever illustrative, so it is phrased as one
// ("if the fee were...") and never presented as the student's real fee.
export const EARLY_PAYMENT_NOTICE = {
  amount: EARLY_PAYMENT_AMOUNT,
  currency: EARLY_PAYMENT_CURRENCY,
  title: 'Pay 2,000 RWF early',
  summary: `Pay ${EARLY_PAYMENT_AMOUNT.toLocaleString('en-US')} ${EARLY_PAYMENT_CURRENCY} early to secure your place.`,
  detail:
    'This is not an extra fee. The 2,000 RWF is taken off the certificate fee you pay later, so you only pay what is left. You never pay it twice.',
  certificateFeeExample:
    'For example, if the certificate fee were 6,000 RWF, you would pay 6,000 − 2,000 = 4,000 RWF now.',
  action:
    'Bring or send your 2,000 RWF to the DTS office at UR-Huye Campus, or pay by mobile money to +250 788 300 300 (MTN), Kamugisha Elizabeth.',
};

// The same facts in one line each. The confirmation dialog sits on top of the
// form the applicant just finished, so it has to fit without scrolling; the
// email keeps the long version above, where there is room to explain properly.
// Neither restates a figure the other does not - both read from the same
// constants, so the two can never disagree.
export const EARLY_PAYMENT_NOTICE_COMPACT = {
  detail: 'Not an extra fee — it comes off your certificate fee later.',
  certificateFeeExample: 'Fee 6,000 → you pay 6,000 − 2,000 = 4,000 now.',
  action: 'Pay at the DTS office, UR-Huye Campus, or MTN +250 788 300 300 (Kamugisha Elizabeth).',
};

// The compact lines ride along under short* keys rather than replacing the long
// ones, so the response stays a superset: a client on the older build reads
// `detail`/`action` as before and ignores these, and the email keeps the long
// wording regardless of what the dialog renders.
export const earlyPaymentNotice = () => ({
  ...EARLY_PAYMENT_NOTICE,
  shortDetail: EARLY_PAYMENT_NOTICE_COMPACT.detail,
  shortExample: EARLY_PAYMENT_NOTICE_COMPACT.certificateFeeExample,
  shortAction: EARLY_PAYMENT_NOTICE_COMPACT.action,
});