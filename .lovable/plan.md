## Objetivo
Reemplazar el OTP por defecto de Supabase (que envía link) por un **código de 6 dígitos** enviado por email vía Resend, sin necesidad de dominio propio. El email saldrá de `onboarding@resend.dev` (dominio compartido de Resend).

> Nota: el secret `RESEND_API_KEY` ya está configurado en el proyecto, así que no hace falta pedirlo de nuevo.

## Cambios

### 1. Base de datos: tabla `email_otps`
Tabla nueva para guardar los códigos generados, con expiración de 10 minutos y máximo 5 intentos.

Campos: `email`, `code_hash` (hash sha256, no guardamos el código en plano), `expires_at`, `attempts`, `consumed_at`.

RLS: bloqueada para clientes (solo edge functions con service role).

Índice en `email` para búsquedas rápidas + limpieza de códigos viejos.

### 2. Edge function `send-otp-code`
- Recibe `{ email, firstName }`
- Genera código random de 6 dígitos
- Guarda hash en `email_otps` con `expires_at = now() + 10min`
- Invalida códigos previos no consumidos del mismo email
- Envía email vía Resend gateway con plantilla brandeada de Pocket (azul `#3391D0`, logo, código grande centrado)
- Subject: "Tu código de Pocket: 123456"
- Rate limit: máximo 1 envío cada 30s por email

### 3. Edge function `verify-otp-code`
- Recibe `{ email, code }`
- Busca el último OTP no consumido para ese email
- Si expirado o `attempts >= 5` → error
- Si código inválido → incrementa `attempts`, error
- Si válido → marca `consumed_at`, crea/actualiza usuario en `auth.users` usando admin API y devuelve una **session válida** (genera magic link y extrae tokens)
- Devuelve `{ access_token, refresh_token }` al cliente

### 4. Frontend `src/pages/Auth.tsx`
- En **Step 2 → 3**: en vez de `supabase.auth.signInWithOtp`, llamar `send-otp-code`
- En **Step 3 → 4**: en vez de `supabase.auth.verifyOtp`, llamar `verify-otp-code` y luego `supabase.auth.setSession(tokens)`
- Resto del flujo (steps 4-7) queda igual: country, investments, joint accounts, password
- "Resend code" llama de nuevo a `send-otp-code` con cooldown de 30s

### 5. Plantilla del email
HTML inline con branding Pocket:
- Header con logo / nombre "pocket" en azul
- Saludo "Hola {firstName}"
- Caja blanca con el código de 6 dígitos en fuente grande, monoespaciada
- "Este código expira en 10 minutos"
- Footer pequeño

## Detalles técnicos

- Resend desde `onboarding@resend.dev` (no requiere dominio verificado, free tier 3000/mes).
- Hash con `crypto.subtle.digest('SHA-256', code)` antes de guardar.
- `verify-otp-code` usa `supabase.auth.admin.generateLink({ type: 'magiclink' })` internamente solo para extraer una sesión válida — el link nunca se envía.
- Si el usuario no existe, lo creamos con `supabase.auth.admin.createUser({ email, email_confirm: true })` antes de generar la sesión.
- Limpieza: códigos vencidos quedan en la tabla (sin job de cron por ahora; volumen bajo).

## Limitaciones conocidas
- El email saldrá con remitente `onboarding@resend.dev`, no de `pocket.com`. Si en el futuro querés branding total, pasamos a comprar/conectar dominio.
- Resend free tier: 100 emails/día, 3000/mes. Suficiente para arrancar.
