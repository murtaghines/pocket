## Por qué el login falla ahora mismo

Revisé la base de datos de usuarios y **está vacía**: no existe ningún usuario registrado (ni siquiera `ines@murtagh.net`). Por eso el endpoint devuelve `400 invalid_credentials` — no hay con qué comparar la contraseña. Las cuentas previas no se llegaron a crear (o se borraron en pruebas).

Dicho esto, el flujo de signup actual también tiene problemas que justifican rehacerlo como pides:

- Pide la contraseña en el paso 6 **sin haber verificado el email**.
- Llama a `supabase.auth.signUp(email, password)`. Como el proyecto NO tiene auto-confirm activado, Supabase responde "OK" pero el usuario queda sin confirmar y no puede hacer login hasta clickear el link del email — y ese link va a `window.location.origin/`, que no maneja el callback bien.
- Si el email no llega o se ignora, el usuario nunca confirma → "credenciales inválidas" para siempre.

## Nuevo flujo de registro propuesto

```text
Step 1 — Nombre + apellido
Step 2 — Email
Step 3 — VERIFICAR EMAIL (input de código de 6 dígitos)   ← nuevo
Step 4 — País / moneda
Step 5 — Inversiones (opcional)
Step 6 — Cuenta conjunta (opcional)
Step 7 — Crear contraseña                                 ← se mueve al final
```

### Cómo funciona técnicamente

1. **Step 2 → 3 (enviar código).** Al pulsar "Continue" en el email, llamamos `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: { first_name, last_name } } })`. Esto crea el usuario en `auth.users` (sin contraseña, sin confirmar) y le manda un email con un código de 6 dígitos.
2. **Step 3 (verificar).** El usuario pega el código. Llamamos `supabase.auth.verifyOtp({ email, token, type: 'email' })`. Si es correcto, Supabase marca `email_confirmed_at` y devuelve una sesión válida — el usuario ya está logueado, solo le falta password y datos.
   - Botón "Reenviar código" con cooldown de 30 s.
   - Mensaje de error claro si el código es incorrecto / expiró.
3. **Steps 4–6.** Se completan país, inversiones y cuenta conjunta como ahora, pero ya con el usuario logueado, así que las preferencias se guardan en cuanto avanza.
4. **Step 7 (password).** Llamamos `supabase.auth.updateUser({ password })`. Como ya hay sesión, esto solo añade la contraseña a la cuenta existente. Al confirmar, redirigimos a `/dashboard`.

### Por qué este orden es mejor

- El email queda **verificado siempre** antes de crear nada relevante.
- Si abandonan en mitad del onboarding, ya tienen una cuenta válida con la que pueden volver a entrar (con código por email) y completar el resto.
- La contraseña queda asociada a un email confirmado → el login con contraseña funciona desde el primer intento.
- El reseteo de contraseña sigue funcionando exactamente igual.

## Login

El login con `email + password` se queda igual (`signInWithPassword`). Adicionalmente:

- Si el usuario intenta entrar con un email que existe pero **no tiene contraseña** (porque dejó el onboarding antes del Step 7), mostramos un toast "Tu cuenta aún no tiene contraseña — te enviamos un código por email para entrar y terminar de configurarla", y disparamos el flujo OTP para que entre y aterrice en Step 7.
- Mensaje de error más útil para `invalid_credentials`: "Email o contraseña incorrectos. ¿Olvidaste tu contraseña?" con link a recovery.

## Plantilla del email de verificación

Como ya tienes Lovable Cloud + dominio de email, voy a generar las plantillas de auth emails con la marca **Pocket** (azul `#3391D0`, logo, copy en inglés) y desplegar el `auth-email-hook`. La plantilla de "magic link / verification code" mostrará el código de 6 dígitos bien grande y un botón secundario.

## Configuración de Supabase Auth

Voy a aplicar:
- `auto_confirm_email: false` (queremos que el OTP sea quien confirme).
- `disable_signup: false`.
- `password_hibp_enabled: true` para bloquear contraseñas filtradas.

## Archivos que tocaré

| Archivo | Cambio |
|---|---|
| `src/pages/Auth.tsx` | Reordenar pasos (1-7), añadir paso de verificación, cambiar `handleSignUp` por flujo OTP + `updateUser({ password })`, mejorar error de login |
| `src/components/onboarding/StepEmailVerification.tsx` (nuevo) | UI del input de 6 dígitos + reenvío |
| `src/components/onboarding/StepEmail.tsx` | Disparar envío de OTP al pasar al siguiente paso |
| `src/components/onboarding/StepPassword.tsx` | Usar `updateUser` en vez de signUp |
| `supabase/functions/auth-email-hook/*` y `_shared/email-templates/*` | Generados y branded con Pocket |
| Config auth | `configure_auth` con los valores arriba |

## Lo que NO cambia

- Login con contraseña sigue siendo el flujo principal.
- Reset password (`/auth?reset=true`) sigue igual.
- Onboarding modal post-login no se toca (ya casi no se usa porque el onboarding ahora es parte del signup).

¿Procedo con esta implementación o quieres ajustar algún paso (p. ej. mover país antes de verificar el email, o saltarte el código y usar magic-link en su lugar)?
