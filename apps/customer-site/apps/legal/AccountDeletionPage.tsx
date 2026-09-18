import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { LegalLayout } from './LegalLayout';
import { submitPublicAccountDeletionRequest } from '../../services/accountDeletionService';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const id = await submitPublicAccountDeletionRequest({
        email,
        requesterName: name,
        businessName,
        reason: details,
      });
      setRequestId(id);
      setSubmitted(true);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not submit your deletion request.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LegalLayout
      title="Account deletion"
      description="Request deletion of a BookGlow account and associated personal information."
      canonicalPath={BOOKGLOW_ACCOUNT_DELETION_PATH}
    >
      <article className="bookglow-legal-article">
        <h1>Account deletion request</h1>
        <p>
          BookGlow allows merchants to request deletion of their BookGlow business account and associated
          account data. Use this page to submit a deletion request without installing the BookGlow Merchant app.
        </p>
        <p>
          Submitting a request starts a review. It does not immediately delete the account.
        </p>

        <h2>What may be deleted</h2>
        <ul>
          <li>Your BookGlow authentication account and profile information</li>
          <li>Merchant account settings linked to your user</li>
          <li>Personal account metadata associated with your BookGlow login</li>
        </ul>

        <h2>What may be retained</h2>
        <ul>
          <li>Transaction, billing, and accounting records where retention is legally required</li>
          <li>Security, fraud-prevention, and audit logs</li>
          <li>Merchant-controlled customer or member records that must be handled with the relevant business</li>
          <li>Shared business records required by other authorized outlet users</li>
        </ul>

        <p className="bookglow-legal-note">
          You can also contact {BOOKGLOW_PRIVACY_EMAIL} with the subject &ldquo;BookGlow account deletion request&rdquo;.
        </p>

        {submitted ? (
          <div className="bookglow-legal-note">
            <p>
              Your account deletion request has been submitted for review.
              {requestId ? ` Reference: ${requestId}.` : ''}
            </p>
            <p className="mt-2">
              BookGlow will contact you at the email address you provided if more information is needed.
            </p>
          </div>
        ) : (
          <form className="bookglow-legal-form" onSubmit={submit}>
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
            {error ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit deletion request'}
            </Button>
          </form>
        )}

        <p>
          Privacy Policy:{' '}
          <a href={BOOKGLOW_PRIVACY_PATH}>Privacy Policy</a>
        </p>
      </article>
    </LegalLayout>
  );
};

export default AccountDeletionPage;
