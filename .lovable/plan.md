Plan para resolverlo:

1. Validar el email en el paso 2 del registro
- Agregar una función backend segura `check-email-availability` que reciba un email y responda si ya existe una cuenta.
- Usarla cuando el usuario completa o sale del campo email.
- Si el email ya existe, mostrar el error ahí mismo y deshabilitar “Next”, para que no pueda llegar al último paso.
- Mantener la validación de formato actual y agregar estados claros: verificando, disponible, ya existe, error de red.

2. Evitar errores tardíos en el último paso
- Ajustar `Auth.tsx` para que `canProceedStep()` del paso email dependa también de “email disponible”.
- Antes de avanzar del paso email, volver a verificar si hace falta, para evitar pasar con un estado viejo.
- Mejorar el mensaje del último `signUp` por si el backend igualmente devuelve “user already exists”.

3. Ayudarte con la contraseña olvidada de `ines@murtagh.net`
- Reemplazar el botón “Forgot password?” que hoy solo dice “contact support” por un flujo real de recuperación.
- Al hacer clic, enviar un email de recuperación para el email ingresado usando la autenticación integrada.
- El link abrirá la pantalla existente `/auth?reset=true`, donde ya se puede setear una nueva contraseña.
- Importante: aunque eliminemos verificación de email para registrarse, recuperación de contraseña sí requiere mandar un email al dueño de la cuenta por seguridad.

4. Limpieza mínima del intento anterior
- Quitar referencias del frontend al flujo OTP si quedó alguna.
- Dejar las funciones OTP sin uso por ahora; eliminarlas de backend sería opcional y no necesario para destrabar el registro.

Archivos principales a tocar:
- `src/pages/Auth.tsx`
- `src/components/onboarding/StepEmail.tsx`
- Nueva función backend `supabase/functions/check-email-availability/index.ts`

Resultado esperado:
- Al escribir `ines@murtagh.net` en registro, el paso de email avisará inmediatamente si ya existe y no dejará continuar.
- Desde login, podrás pedir recuperación de contraseña para `ines@murtagh.net`.