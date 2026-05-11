## Plan

### 1) Resetear tu contraseña ahora
- Voy a setear directamente la contraseña de `ines@murtagh.net` a **`Pocket1234!`** desde el backend (admin API).
- Vas a poder iniciar sesión enseguida con ese usuario y email.
- Importante: cambiala desde la app cuando entres (Settings) por seguridad, ya que la temporal me la dijiste por chat.

### 2) Arreglar el flujo de recuperación de contraseña
Hoy pasa esto: el link del email te loguea correctamente, pero el `redirectTo` te manda a `/auth?reset=true` con la sesión ya iniciada — y como hay lógica que redirige a usuarios autenticados al dashboard, nunca llegás a ver el formulario de nueva contraseña.

Cambios:
- Detectar el evento `PASSWORD_RECOVERY` de la autenticación: cuando llega ese evento, forzar la ruta `/auth?reset=true` y NO redirigir al dashboard aunque haya sesión.
- En la pantalla `Auth` con `?reset=true`, asegurarse de que se muestre el formulario "Set New Password" siempre, incluso si ya hay sesión activa.
- En el guard de rutas autenticadas, agregar una excepción: si la URL es `/auth?reset=true` o si recién ocurrió un `PASSWORD_RECOVERY`, dejar pasar al formulario en vez de mandarlo al dashboard.
- Después de actualizar la contraseña, cerrar sesión y mandar a login para que entre con la nueva contraseña limpia.

### 3) Resultado esperado
- Podés entrar ya con `Pocket1234!`.
- Cuando alguien (vos u otra persona) use "Forgot password?" en el futuro, el link del email abrirá correctamente el formulario para fijar la nueva contraseña.