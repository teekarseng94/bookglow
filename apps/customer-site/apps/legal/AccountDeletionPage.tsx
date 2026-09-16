import React, { useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { LegalLayout } from './LegalLayout';
import {
  BOOKGLOW_ACCOUNT_DELETION_PATH,
  BOOKGLOW_PRIVACY_EMAIL,
  BOOKGLOW_PRIVACY_PATH,
} from '../../src/legal/legalContact';

export const AccountDeletionPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [details, setDetails] = useState('');

  const mailtoHref = useMemo(() => {
    const subject = 'BookGlow account deletion request';
    const body = [
      'I am requesting deletion of my BookGlow account and associated personal information.',
      '',
      `Name: ${name.trim() || '(not provided)'}`,
      `Account email: ${email.trim() || '(not provided)'}`,
      `Business / outlet name: ${businessName.trim() || '(not provided)'}`,
      '',
      'Additional details:',
      details.trim() || '(none)',
    ].join('\n');
    return `mailto:${BOOKGLOW_PRIVACY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [businessName, details, email, name]);

  return (
    <LegalLayout
      title="Account deletion"
      description="Request deletion of a BookGlow account and associated personal information."
      canonicalPath={BOOKGLOW_ACCOUNT_DELETION_PATH}
    >
      <article className="bookglow-legal-article">
        <h1>Account deletion request</h1>
        <p>
          Use this page to request deletion of a BookGlow account and associated personal
          information. Submitting a request starts a review. It does not immediately delete the
          account.
        </p>
        <p>
          Where an account is eligible for deletion, associated personal information will be deleted
          or anonymized unless retention is required for legal, regulatory, fraud-prevention,
          security, accounting, or legitimate business-record requirements. Merchant-controlled
          customer records may also need to be handled with the relevant merchant.
        </p>
        <p className="bookglow-legal-note">
          Requests are sent to {BOOKGLOW_PRIVACY_EMAIL}. You can also email that address directly
          with the subject “BookGlow account deletion request”.
        </p>

        <form
          className="bookglow-legal-form"
          onSubmit={(event) => {
            event.preventDefault();
            window.location.href = mailtoHref;
          }}
        >
          <label>
            Your name
            <input
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Account email
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Business or outlet name (optional)
            <input
              type="text"
              name="business"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
            />
          </label>
          <label>
            Additional details (optional)
            <textarea
              name="details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
            />
          </label>
          <Button type="submit">Send deletion request</Button>
        </form>

        <p>
          Privacy Policy:{' '}
          <a href={BOOKGLOW_PRIVACY_PATH}>Privacy Policy</a>
        </p>
      </article>
    </LegalLayout>
  );
};

export default AccountDeletionPage;
