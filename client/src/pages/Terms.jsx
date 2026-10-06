import React from 'react';
import LegalDocument from '../components/LegalDocument';

const sections = [
  {
    heading: 'About these terms',
    body: [
      'These terms govern your use of the Digital Technology Skills website and your application to our training. By applying, or by using a student account, you agree to them.',
      'Training is run by Digital Technology Skills (DTS) at UR-Huye Campus, Rwanda.',
    ],
  },
  {
    heading: 'Applying for training',
    body: ['Applying is free. By submitting an application you confirm that:'],
    points: [
      'Everything you have told us is true and accurate.',
      'Any certificate or document you upload is genuine, belongs to you, and has not been altered.',
      'You are old enough to take part in the training you have applied for.',
      'You have read the Privacy Policy and accept how we handle your personal data.',
    ],
  },
  {
    heading: 'The 2,000 RWF early payment',
    body: [
      'Applicants who pay 2,000 RWF early to secure their place are not being charged an extra fee. That amount is deducted from the certificate fee payable later, so you pay each amount once and never twice.',
      'Paying early reserves your place; it does not by itself guarantee admission. Admission still depends on the intake having room and on meeting the requirements for the level you applied to.',
      'Where an intake is closed, full, or its deadline has passed, we do not accept applications. If we already collected an early payment for a place we could not offer, we refund it.',
    ],
  },
  {
    heading: 'Registration number and PIN',
    body: [
      'Your registration number and PIN are issued to you personally when your student profile is created. They are what identifies your record, attendance and results.',
      'Treat them like a password. Do not share them, and do not let anyone else use your account. Tell us straight away if you think someone else has your PIN.',
      'You are responsible for keeping what happens under your account, including anything submitted through it.',
    ],
  },
  {
    heading: 'What we expect from you',
    body: ['To keep the training fair for everyone:'],
    points: [
      'Attend the sessions you are registered for.',
      'Do not disrupt other students or the person teaching.',
      'Submit your own work. Copying another student\'s assignment or exam result is misconduct.',
      'Treat other students with respect.',
    ],
  },
  {
    heading: 'Certificates and results',
    body: [
      'A certificate is issued after you complete the training and meet the requirements for it. Completing the sessions alone does not guarantee one.',
      'For Advanced training we check your Basic certificate at the point of application, because Advanced is only open to people who already hold the Basic certificate. If the certificate you upload turns out not to be genuine, your application is refused and any payment made is not refunded.',
      'We may withdraw a certificate issued in error.',
    ],
  },
  {
    heading: 'Your content',
    body: [
      'You keep ownership of the work you create and of the documents you upload. By uploading a certificate you give us permission to store it, share it with DTS staff, and delete it when your application or account is deleted.',
      'Photos, videos and stories you send us for the news and gallery sections may be published on this site and on our social media accounts.',
    ],
  },
  {
    heading: 'Our content',
    body: [
      'Course material, lesson notes, exercises and the design of this site belong to DTS. You may use them for your own learning and share them for non-commercial teaching, but not sell them or republish them as your own without written permission.',
    ],
  },
  {
    heading: 'Cancelling and refunds',
    body: [
      'You can withdraw from an intake at any time by telling us. Where you have paid the early amount, tell us as early as you can so we can either keep your place for a later intake or refund you.',
      'Course fees already paid are not refundable once training has begun, except where we are at fault or the law requires otherwise.',
    ],
  },
  {
    heading: 'Ending access',
    body: [
      'We may suspend or close a student account, and refuse or withdraw an application, where we have good reason to believe the information given was false, a document was falsified, or the terms were broken.',
      'We can close the website or change how it works. We will try to give reasonable notice of anything that affects you.',
    ],
  },
  {
    heading: 'Liability',
    body: [
      'We take care to keep the site running and your data safe, but we are not liable for losses caused by things outside our reasonable control, including internet or power failures, or the loss of an unsubmitted application that you had not yet sent.',
      'Nothing in these terms limits our liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot lawfully be limited.',
    ],
  },
  {
    heading: 'Changes to these terms',
    body: [
      'We may update these terms. The date at the top of this page shows when they last changed, and the current version is always the one on this page.',
    ],
  },
  {
    heading: 'Contacting us',
    body: [
      'Questions about these terms go to digitaltechnologyskills1yahoo@gmail.com, or to the DTS office at UR-Huye Campus. These terms are governed by the laws of Rwanda.',
    ],
  },
];

export default function Terms() {
  return (
    <LegalDocument
      title="Terms of Service"
      icon="scale"
      intro="These terms set out the agreement between you and Digital Technology Skills when you apply for training, pay a fee, or use a student account. Please read them before applying."
      sections={sections}
    />
  );
}