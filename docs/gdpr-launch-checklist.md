# GDPR launch checklist

This document separates work the app can enforce automatically from business and legal steps that require the operator or a school. It is an operational checklist, not a substitute for legal advice.

## Before describing the service as GDPR compliant

- [x] Put the operator's full legal name, country, and privacy email in the Privacy Policy.
- [ ] If the service becomes an economic activity, obtain advice on the Spanish LSSI legal-notice requirements and publish a valid business/service address before charging users or otherwise monetising it.
- [x] Apply `supabase/gdpr_hardening.sql` to the production Supabase project.
- [ ] Apply `supabase/gdpr_retention.sql` and confirm the scheduled job runs successfully every hour.
- [ ] Confirm the existing 24-hour Supabase cleanup is not failing or retaining backups outside the documented provider policy.
- [x] Test that an anonymous Supabase connection cannot list live-quiz or take-home share records directly and confirm the protected student functions are installed.
- [ ] Confirm account deletion removes database records, personal uploads, school-owner files where applicable, and contact messages associated with the account email.
- [ ] Sign and retain Data Processing Agreements with Supabase, Vercel, Cloudflare, Google, and OpenAI as applicable.
- [ ] Confirm the Supabase database and storage region and document it.
- [ ] Confirm the Vercel processing/log regions and retention settings and document them.
- [ ] Use a paid/business Google Gemini API arrangement if Google is selected. Do not submit school or student material through an unpaid service that may use prompts to improve models.
- [ ] Record which international-transfer mechanism applies to each non-EEA supplier, such as an adequacy decision or Standard Contractual Clauses.
- [ ] Publish a current subprocessor list and tell school customers how material changes will be announced.
- [ ] Have a school Data Processing Agreement reviewed by a Spanish/EU privacy lawyer before signing school customers.
- [ ] Complete a Data Protection Impact Assessment for the student live-quiz and school-monitoring features. This is a written risk assessment for processing that involves children.
- [ ] Maintain a Record of Processing Activities: a private business record listing each use of personal data, purpose, legal basis, recipients, retention, and security measures.
- [ ] Create an incident-response procedure. Potential personal-data breaches must be assessed promptly, and qualifying breaches generally must be reported to the relevant authority within 72 hours.
- [ ] Create a privacy-request procedure and ownership inbox. Access, correction, deletion, restriction, objection, and portability requests generally need a response within one month.
- [ ] Recheck this list whenever a new analytics, advertising, AI, payment, or communication provider is introduced.

## Cookie-banner decision

The current repository contains essential login/session storage, guest saved content, and Cloudflare Turnstile for security. It does not contain an advertising network or third-party analytics tracker. A consent banner is therefore not currently being added.

Before adding optional analytics, advertising, session replay, marketing pixels, or similar tracking:

1. Block it by default.
2. Add a genuine accept/reject choice before it loads.
3. Record the choice and make it easy to change.
4. Update the Privacy and Cookie information.
