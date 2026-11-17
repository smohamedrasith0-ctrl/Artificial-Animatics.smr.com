# Security Specification — Artificial Animatics

## 1. Data Invariants
1. Default-deny catch-all at root prevents access to any undeclared collection.
2. Public catalog collections (`siteSettings`, `services`, `portfolio`, `pricingTiers`, `testimonials`) are read-only for the public and writable strictly by verified admins (`isAdmin()`).
3. Customer enquiries (`enquiries`) contain PII (`email`, `whatsapp`, `name`, `businessName`, `projectDescription`). Public visitors may ONLY `create` new enquiries with `status == 'new'`, `adminNotes == ''`, server timestamps (`request.time`), and strict schema/size constraints. Only verified admins may `get`, `list`, `update`, or `delete` enquiries.
4. `admins` collection is readable and writable strictly by verified admins (`smohamedrasith0@gmail.com` with `email_verified == true` or existing `/admins/$(uid)` record).
5. All document ID path variables are guarded with `isValidId(id)` (`^[a-zA-Z0-9_-]+$`, `<= 128` chars) on single-doc operations.
6. All string fields enforce explicit `.size()` boundaries and all arrays enforce `.size() <= 10` plus element type validation.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Portfolio Write**: Anonymous user creates `/portfolio/p1` -> DENIED.
2. **Unverified Admin Email Spoof**: Signed-in user with `email_verified: false` attempts `/services/s1` write -> DENIED.
3. **Shadow Field Injection on Enquiry**: Visitor creates `/enquiries/e1` with extra field `isVip: true` -> DENIED by `hasOnly`.
4. **Pre-Completed Status Injection on Enquiry**: Visitor creates `/enquiries/e1` with `status: 'replied'` -> DENIED (`status == 'new'` required).
5. **Pre-Populated Admin Notes on Enquiry**: Visitor creates `/enquiries/e1` with non-empty `adminNotes` -> DENIED.
6. **Timestamp Spoofing on Enquiry**: Visitor sends a client-forged `createdAt` != `request.time` -> DENIED.
7. **Resource Exhaustion / 1MB String**: Visitor sends `projectDescription` > 3000 chars -> DENIED.
8. **ID Poisoning**: Creating `/enquiries/../../admin` or >128 char ID -> DENIED by `isValidId`.
9. **PII Leak via Enquiry List**: Non-admin user attempts `list` on `/enquiries` -> DENIED.
10. **PII Leak via Enquiry Get**: Non-admin user attempts `get` on `/enquiries/e1` -> DENIED.
11. **Self-Privilege Escalation**: Regular signed-in user attempts to write `/admins/{ownUid}` -> DENIED.
12. **Unbounded Features Array**: Admin attempts to write `pricingTiers/t1` with 25 features or non-string element -> DENIED by `features.size() <= 10`.
