import React from 'react';
import LegalDocument from '../components/LegalDocument';

// Describes what the application form actually stores, taken from the fields the
// form collects and where they are kept.
const sections = [
  {
    heading: 'What we collect',
    body: ['We only collect what we need to run training. Applying through this site means giving us:'],
    points: [
      'Your name, email address and phone number.',
      'The campus and learning place you prefer, your level of study and department, and the courses you are interested in.',
      'Your registration number, where one exists.',
      'A short note about your goals after training.',
      'For applicants to Advanced training, a photo or PDF of your Basic certificate. Advanced training is only open to people who already hold the Basic certificate, so this file is required rather than optional.',
    ],
  },
  {
    heading: 'Why we ask for it',
    body: [
      'We use your details to assess your application, create your student profile, and email you your registration number and PIN so you can follow your training. Without a phone number and email address we cannot create an account for you.',
      'We also send you occasional email about training dates and intake openings. Every such message has an unsubscribe link.',
    ],
  },
  {
    heading: 'Where it is stored',
    body: [
      'Your application details are held in our own database, which only DTS staff and administrators can reach. Every account is password protected.',
      'Certificates you upload are stored in a private Google Drive folder shared only with DTS staff. The file is renamed to your DTS registration number so it can be matched to your profile without exposing your name on the file itself. Drive access is limited to the account we authorised for uploads.',
      'Transactional email is delivered through Brevo, our email delivery provider. It receives the address and the content of the message, and nothing else.',
    ],
  },
  {
    heading: 'Cookies',
    body: [
      'We use a session token stored in your browser so you stay signed in, and a local record of dismissed notices. Neither is used to track you across other websites, and we do not run advertising or analytics trackers.',
    ],
  },
  {
    heading: 'Who we share it with',
    body: [
      'We do not sell, rent or trade your personal information. We share it only where it is necessary to deliver the service: with our email delivery provider, with our hosting provider, and with Google Drive for certificate storage.',
      'We may disclose information where the law requires it, for example in response to a lawful request from a court or regulator.',
    ],
  },
  {
    heading: 'How long we keep it',
    body: [
      'We keep your application for as long as you are a student and for the records we are required to keep afterwards. If your application is rejected and you ask us to remove it, we delete it, including the certificate file.',
      'Deleting an application also deletes the uploaded certificate from Drive. That is why deleting your own account removes the file rather than leaving it behind.',
    ],
  },
  {
    heading: 'Your rights',
    body: [
      'You can ask us at any time to show you the personal data we hold about you, correct anything wrong in it, or delete it. You can do this from your profile page, or by emailing us.',
      'You can withdraw from a training intake at any point by contacting us. We will confirm what happens to the certificate you uploaded.',
    ],
  },
  {
    heading: 'Security',
    body: [
      'Passwords are stored as salted hashes and are never readable, including by us. Access to the database and the certificate folder is restricted to DTS administrators.',
      'No method of transmission or storage is completely secure. We take reasonable steps to protect your data, but we cannot guarantee absolute security.',
    ],
  },
  {
    heading: 'Contacting us about your data',
    body: [
      'Questions, corrections or deletion requests go to digitaltechnologyskills1yahoo@gmail.com. If you are not happy with how we have handled your data you also have the right to complain to the relevant data protection authority in Rwanda.',
    ],
  },
];

export default function Privacy() {
  return (
    <LegalDocument
      title="Privacy Policy"
      intro="This policy explains what personal information Digital Technology Skills collects through this website, why we collect it, and what we do with it. It covers applications, student accounts, contact messages and any files you upload."
      sections={sections}
    />
  );
}