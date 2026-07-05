---
paths:
  - "src/pages/Auth.tsx"
  - "src/hooks/useAuth.tsx"
  - "src/components/onboarding/**"
---
# Users & login
- Onboarding is a step wizard (`Step*.tsx`) — each step is an independent component; don't put another step's logic in it
- Email availability is validated against the `check-email-availability` edge function, not a direct query
- OTP: `send-otp-code` / `verify-otp-code` are two separate functions — keep them that way
- Any change to the auth flow: test both signup and the password-recovery flow (there's special `isResetFlow` logic in `App.tsx`)
