---
paths:
  - "src/pages/Auth.tsx"
  - "src/hooks/useAuth.tsx"
  - "src/components/onboarding/**"
---
# Users & login
- El onboarding es un wizard de steps (Step*.tsx) — cada step es un componente independiente, no metas lógica de otro step ahí
- La disponibilidad de email se valida contra la edge function `check-email-availability`, no contra una query directa
- OTP: `send-otp-code` / `verify-otp-code` son dos funciones separadas, mantenelas así
- Cualquier cambio en el flujo de auth: probar tanto signup como el flujo de recuperación de contraseña (hay lógica especial de `isResetFlow` en App.tsx)