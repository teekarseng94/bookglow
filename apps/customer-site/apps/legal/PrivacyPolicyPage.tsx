import React from 'react';
import { LegalLayout } from './LegalLayout';
import {
  BOOKGLOW_ACCOUNT_DELETION_PATH,
  BOOKGLOW_ACCOUNT_DELETION_URL,
  BOOKGLOW_LEGAL_ENTITY,
  BOOKGLOW_PRIVACY_EMAIL,
  BOOKGLOW_PRIVACY_PATH,
  BOOKGLOW_PRIVACY_URL,
  BOOKGLOW_PUBLIC_ORIGIN,
  PRIVACY_POLICY_EFFECTIVE_DATE,
  PRIVACY_POLICY_LAST_UPDATED,
} from '../../src/legal/legalContact';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <LegalLayout
      title="Privacy Policy"
      description="How BookGlow collects, uses, stores, and protects information on the BookGlow platform and BookGlow Merchant application."
      canonicalPath={BOOKGLOW_PRIVACY_PATH}
    >
      <article className="bookglow-legal-article">
        <h1>Privacy Policy</h1>
        <p className="bookglow-legal-meta">
          Effective date: {PRIVACY_POLICY_EFFECTIVE_DATE}
          <br />
          Last updated: {PRIVACY_POLICY_LAST_UPDATED}
        </p>

        <h2>1. Introduction</h2>
        <p>
          BookGlow ("BookGlow", "we", "our", or "us") provides appointment scheduling, merchant
          management, customer management, staff management, sales management, and related
          business services through the BookGlow platform and BookGlow Merchant application.
        </p>
        <p>
          This Privacy Policy explains how information is collected, used, stored, disclosed, and
          protected when users access or use BookGlow.
        </p>
        <p>By using BookGlow, users acknowledge the practices described in this Privacy Policy.</p>

        <h2>2. Information We Collect</h2>
        <p>Depending on how BookGlow is used, we may collect the following categories of information.</p>

        <h3>Account Information</h3>
        <p>This may include:</p>
        <ul>
          <li>Name</li>
          <li>Email address</li>
          <li>Profile information</li>
          <li>Authentication identifiers</li>
          <li>Google account information when a user chooses "Continue with Google"</li>
        </ul>
        <p>
          We use this information to authenticate users, maintain accounts, and provide access to
          BookGlow services.
        </p>

        <h3>Merchant and Business Information</h3>
        <p>Merchants may provide information including:</p>
        <ul>
          <li>Business or outlet name</li>
          <li>Business contact information</li>
          <li>Business address</li>
          <li>Operating hours</li>
          <li>Services</li>
          <li>Prices</li>
          <li>Staff information</li>
          <li>Appointment settings</li>
          <li>Business configuration information</li>
          <li>Booking-page settings and public booking URL</li>
        </ul>
        <p>This information is used to operate and manage the merchant's BookGlow account.</p>

        <h3>Customer and Member Information</h3>
        <p>
          When merchants use BookGlow to manage customers, appointments, or members, or when a
          customer submits a public booking, information may include:
        </p>
        <ul>
          <li>Customer or member name</li>
          <li>Telephone number</li>
          <li>Email address</li>
          <li>Appointment information</li>
          <li>Membership information, including membership tier where recorded</li>
          <li>Service history</li>
          <li>Notes or information entered by an authorized merchant user</li>
          <li>Birthday, tags, or voucher information if entered by the merchant</li>
          <li>Marketing communication preferences (email, SMS, or WhatsApp consent)</li>
        </ul>
        <p>
          This information is processed to provide booking, customer-management, membership,
          marketing, and merchant-management functions.
        </p>

        <h3>Appointment and Transaction Information</h3>
        <p>BookGlow may process information relating to:</p>
        <ul>
          <li>Appointment dates and times</li>
          <li>Services selected</li>
          <li>Assigned staff</li>
          <li>Order or transaction records</li>
          <li>Sales records</li>
          <li>Payment status and merchant-configured payment method labels</li>
          <li>Membership transactions</li>
          <li>BookGlow subscription billing status for the merchant account</li>
        </ul>
        <p>
          BookGlow does not collect full payment card credentials. Card payments for BookGlow
          subscriptions are handled by HitPay. Payment information handled by HitPay or any other
          external payment provider is subject to that provider's own privacy and security
          practices. Point-of-sale records in BookGlow store payment status and the payment method
          name configured by the merchant, not card numbers.
        </p>

        <h3>Technical Information</h3>
        <p>
          We may automatically receive technical information necessary to operate and secure the
          service, including:
        </p>
        <ul>
          <li>Device type</li>
          <li>Operating system</li>
          <li>App version</li>
          <li>Browser information</li>
          <li>IP address</li>
          <li>Authentication events</li>
          <li>Diagnostic information</li>
          <li>Error information recorded by our hosting and authentication providers</li>
          <li>Security and activity logs</li>
        </ul>
        <p>
          Session tokens and related authentication state may be stored in the browser or, in the
          BookGlow Merchant Android application, in on-device app storage so that a signed-in user
          can remain authenticated. The Android application currently requests network access in
          order to communicate with BookGlow services. BookGlow does not currently include a
          separate advertising-analytics, crash-reporting, or push-notification SDK in the Merchant
          application.
        </p>
        <p>
          This information may be used for security, troubleshooting, fraud prevention, service
          reliability, and performance improvement.
        </p>

        <h3>Uploaded Content</h3>
        <p>
          Where BookGlow provides features that allow users to upload images, documents, or other
          content, including outlet or booking-page media, that information may be stored and
          processed for the feature requested by the user.
        </p>

        <h3>Google Business Profile information</h3>
        <p>
          If a merchant connects Google Business Profile, BookGlow may receive location identifiers,
          review content, ratings, and related public review information needed to display Google
          reviews on the merchant's booking page and to maintain the connection the merchant
          requested.
        </p>

        <h2>3. How We Use Information</h2>
        <p>We may use information to:</p>
        <ul>
          <li>Create and authenticate accounts</li>
          <li>Provide BookGlow services</li>
          <li>Manage appointments and schedules</li>
          <li>Manage merchants, outlets, staff, customers, and members</li>
          <li>Process and maintain transaction records</li>
          <li>Send operational messages such as invitations or password-reset emails</li>
          <li>Send marketing messages that a merchant chooses to send to consenting customers</li>
          <li>Generate reminder-message drafts when a merchant uses that feature</li>
          <li>Provide customer support</li>
          <li>Maintain account and service security</li>
          <li>Detect misuse, fraud, or unauthorized access</li>
          <li>Diagnose technical problems</li>
          <li>Improve application reliability and functionality</li>
          <li>Comply with applicable legal and regulatory obligations</li>
        </ul>
        <p>We do not sell personal information.</p>

        <h2>4. Google Sign-In</h2>
        <p>BookGlow may allow users to sign in using Google.</p>
        <p>
          When Google Sign-In is used, BookGlow may receive information authorized by the user, such
          as the user's name, email address, profile information, and a unique authentication
          identifier.
        </p>
        <p>BookGlow uses this information for authentication and account management.</p>
        <p>Google's handling of information is governed by Google's own privacy policies.</p>

        <h2>5. Service Providers and Third Parties</h2>
        <p>
          BookGlow uses trusted third-party service providers to operate parts of the service. Based
          on the current BookGlow production applications, those providers include:
        </p>
        <ul>
          <li>Supabase, for authentication, database storage, file storage, and backend functions</li>
          <li>Vercel, for website and application hosting</li>
          <li>Google, for Sign-In, Google Business Profile reviews, and Gemini AI reminder drafts</li>
          <li>HitPay, for BookGlow subscription billing</li>
          <li>Resend, for email delivery of marketing or operational messages when that feature is used</li>
          <li>Twilio, for SMS or WhatsApp delivery when a merchant sends those messages</li>
        </ul>
        <p>
          These providers may process information only where necessary to provide their respective
          services. When a merchant generates an AI reminder draft, appointment or customer context
          entered for that draft may be sent to Google Gemini to produce the message.
        </p>

        <h2>6. Data Sharing</h2>
        <p>BookGlow may disclose information:</p>
        <ul>
          <li>To service providers that help operate BookGlow</li>
          <li>At the direction of an authorized merchant or user</li>
          <li>Where necessary to provide a requested integration or service</li>
          <li>Where required by law, regulation, legal process, or governmental request</li>
          <li>
            Where reasonably necessary to protect BookGlow, its users, or others from fraud,
            security threats, or harmful activity
          </li>
          <li>
            In connection with a merger, acquisition, restructuring, or transfer of the business,
            subject to applicable law
          </li>
        </ul>
        <p>BookGlow does not sell users' personal information to third parties.</p>

        <h2>7. Data Security</h2>
        <p>
          We use reasonable technical and organizational measures designed to protect personal
          information against unauthorized access, loss, misuse, alteration, or disclosure.
        </p>
        <p>
          These measures may include authentication controls, access restrictions, encrypted network
          connections, and security protections provided by our infrastructure providers.
        </p>
        <p>No internet-based service can guarantee absolute security.</p>

        <h2>8. Data Retention</h2>
        <p>We retain information for as long as reasonably necessary to:</p>
        <ul>
          <li>Provide BookGlow services</li>
          <li>Maintain legitimate business and transaction records</li>
          <li>Meet legal, accounting, or regulatory requirements</li>
          <li>Resolve disputes</li>
          <li>Protect the security and integrity of the service</li>
        </ul>
        <p>
          When information is no longer required, we may delete or anonymize it in accordance with
          applicable requirements.
        </p>

        <h2>9. Account and Data Deletion</h2>
        <p>
          Users may request deletion of their BookGlow account and associated personal information.
        </p>
        <p>Requests can be submitted in either of these ways:</p>
        <ul>
          <li>
            In the BookGlow Merchant app or web portal under Settings → About &amp; legal → Delete
            account
          </li>
          <li>
            On the public account deletion page at{' '}
            <a href={BOOKGLOW_ACCOUNT_DELETION_PATH}>{BOOKGLOW_ACCOUNT_DELETION_URL}</a>
          </li>
        </ul>
        <p>
          Submitting a request starts a review. It does not immediately delete the account.
        </p>
        <h3>Data that may be deleted</h3>
        <ul>
          <li>Authentication account and profile information for the requesting user</li>
          <li>Merchant account settings and personal preferences linked to that user</li>
          <li>Uploaded account media and personal account metadata where eligible for removal</li>
        </ul>
        <h3>Data that may be retained or anonymized</h3>
        <ul>
          <li>Transaction, billing, subscription, and accounting records where retention is legally required</li>
          <li>Security, fraud-prevention, and audit logs</li>
          <li>Shared outlet business records that must remain available to other authorized users</li>
          <li>Merchant-controlled customer or member records that must be handled with the relevant business</li>
        </ul>
        <p>
          Where an account is eligible for deletion, associated personal information will be deleted or
          anonymized unless retention is required for legal, regulatory, fraud-prevention, security,
          accounting, or legitimate business-record requirements.
        </p>
        <p>
          For privacy or account-deletion questions, contact{' '}
          <a href={`mailto:${BOOKGLOW_PRIVACY_EMAIL}`}>{BOOKGLOW_PRIVACY_EMAIL}</a>.
        </p>

        <h2>10. Merchant-Controlled Customer Data</h2>
        <p>BookGlow is a business-management platform.</p>
        <p>
          Information relating to customers or members may be entered and managed by merchants using
          BookGlow.
        </p>
        <p>
          Merchants are responsible for ensuring that they have an appropriate lawful basis or
          authorization to collect and use customer information through BookGlow and for complying
          with applicable privacy obligations relating to their customers.
        </p>

        <h2>11. Children's Privacy</h2>
        <p>
          BookGlow Merchant is intended for business users and is not designed or directed
          specifically toward children.
        </p>
        <p>
          We do not knowingly use the Merchant application to solicit personal information directly
          from children.
        </p>

        <h2>12. International Processing</h2>
        <p>
          Depending on the service providers used to operate BookGlow, information may be processed
          or stored in countries other than the user's country.
        </p>
        <p>
          Where applicable, we take reasonable steps to ensure that information is handled in
          accordance with applicable privacy requirements.
        </p>

        <h2>13. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy when BookGlow features, services, legal requirements, or
          data-processing practices change.
        </p>
        <p>
          The latest version will be published at{' '}
          <a href={BOOKGLOW_PRIVACY_PATH}>{BOOKGLOW_PRIVACY_URL}</a>.
        </p>
        <p>The "Last updated" date will indicate when the policy was most recently revised.</p>

        <h2>14. Contact Us</h2>
        <p>For privacy questions, requests, or concerns regarding BookGlow, contact:</p>
        <p>
          BookGlow
          <br />
          Email:{' '}
          <a href={`mailto:${BOOKGLOW_PRIVACY_EMAIL}`}>{BOOKGLOW_PRIVACY_EMAIL}</a>
          <br />
          Website:{' '}
          <a href={BOOKGLOW_PUBLIC_ORIGIN}>{BOOKGLOW_PUBLIC_ORIGIN}</a>
        </p>
        <p>
          Developer / legal entity:
          <br />
          {BOOKGLOW_LEGAL_ENTITY}
        </p>
      </article>
    </LegalLayout>
  );
};

export default PrivacyPolicyPage;
