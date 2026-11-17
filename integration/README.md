# Integración municipal — implementación en preparación

Este trabajador se ejecuta en Supabase Edge Functions, fuera de ChatGPT y del navegador. Esta rama NO activa cron ni conecta cuentas. Conserva los estados y responsables actuales de cada trámite.

## Lo implementado

- Cola durable por cuenta e ID Gmail, con paginación, ventana superpuesta de un día y cursor que solo avanza después de guardar todos los IDs de una página.
- Exclusiones de mensajes ya procesados mediante filas `done`/`ignored`, que la ingestión nunca sobrescribe. Registrar el piloto previamente terminado antes de activar.
- Bloqueo de diez minutos para ejecuciones solapadas; cada petición HTTP tiene quince segundos de límite y el lote inicia nuevas operaciones durante cincuenta segundos. No invocar el módulo fuera de Edge Functions sin imponer también un límite total de ejecución inferior al del bloqueo.
- Lista explícita de remitentes y asociación validada municipio+número+año+tipo+ID estable de carpeta Dropbox. Si el asunto no identifica un único expediente completo, pasa a revisión. El número en un PDF o un asunto ambiguo requiere asociación manual; todavía no hay extracción PDF/OCR.
- Adjuntos MIME anidados, comprobación de tamaño (máximo 20 MiB por adjunto), hash Dropbox, conservación de nombres originales si están disponibles, versiones con sufijo de hash ante conflictos y recuperación tras respuestas perdidas.
- Movimiento único y marcado de correo procesado en una transacción. No cambia estado, responsable, checklist ni envía correos.
- Reintentos con espera exponencial, máximo ocho intentos y estado `dead` visible para supervisión.
- Tablas nuevas con RLS, sin acceso de `anon` ni `authenticated`; funciones solo invocables por `service_role`. No modifica las políticas permisivas preexistentes de la app.

## Verificación local

`node --test integration/*.test.mjs`

Pruebas sin llamadas a cuentas reales: año incorrecto, números parciales, múltiples expedientes, adjuntos anidados, hash por bloques, fallos después de subir, respuestas perdidas, cursor tras fallo de base, paginación, exclusión de mensajes terminados, cuenta OAuth incorrecta y ejecución desactivada.

## Instalación y activación pendientes

1. Aplicar `integration/install.sql` como una migración aditiva. Inicializar `integration_control` con la cuenta real y `enabled=false`. Insertar el ID del piloto completado como `done` antes de cualquier ejecución. Esos datos privados no se incluyen en este repositorio público.
2. Revisar las relaciones de expedientes y carpetas con información real. No inferir carpetas ni completar automáticamente las 59 fichas. Cada asociación requiere evidencia y un ID Dropbox comprobado.
3. Crear aplicaciones OAuth propias. Google: Gmail API habilitada, permiso `gmail.readonly`, acceso offline y consentimiento adecuado para uso permanente. No utilizar una aplicación externa en modo de prueba con refresh tokens de corta duración para producción. Dropbox: acceso Full Dropbox al archivo ya existente, permisos `files.metadata.read`, `files.content.read`, `files.content.write`, acceso offline. Guardar secretos solamente en Supabase, nunca en Git ni en el navegador.
4. Configurar secretos: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `DROPBOX_CLIENT_ID`, `DROPBOX_CLIENT_SECRET`, `DROPBOX_REFRESH_TOKEN`, `DROPBOX_ROOT_NAMESPACE_ID` si corresponde y un secreto aleatorio `MUNICIPAL_WORKER_SECRET`. Edge suministra `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
5. Desplegar `municipal-worker` con verificación JWT del gateway desactivada: el propio handler exige el secreto independiente. No exponer ese secreto al cliente. Probar respuesta 401 sin secreto, y `disabled_or_busy` con secreto mientras sigue desactivada.
6. Implementar la bandeja de revisión autenticada dentro de Tékton y el monitor de salud antes de activar. Por ahora las filas `review`, `dead` y los campos de salud solo están disponibles a administradores del servidor. Las políticas actuales de la app y la contraseña en el navegador requieren resolver autenticación antes de exponer estas tablas a la interfaz.
7. Agregar Calendar como outbox independiente con ID de evento determinista y cierre explícito de tareas. Esta rama NO crea eventos ni recordatorios y NO interpreta plazos automáticamente.
8. Realizar una prueba autorizada con otro correo, demostrar recuperación, permisos y ejecución repetida sin duplicados; no reprocesar el piloto. Luego activar el trabajador y programar cron cada cinco minutos con el secreto en Vault.
9. Instalar un monitor independiente que avise si `last_success_at` lleva más de quince minutos sin avanzar, hay filas `dead` o errores de configuración. Un campo en base no es una alerta: no darlo por instalado hasta comprobar que llega al destinatario acordado. La monitorización de una caída completa de Supabase debe residir fuera de Supabase.

## Operación

Pausar con `integration_control.enabled=false`. No eliminar la cola para resolver fallos. Tras corregir un error, cambiar únicamente la fila afectada a `retry`, restablecer intentos y fecha de reintento. Para revisar una asociación, validar primero la relación en `integration_expedientes`, asignar `mapping_id` al mensaje y pasarlo a `retry`. El trabajador comprueba que esa relación pertenece al municipio del remitente. No hay validación masiva por coincidencia de nombre.

Sin alerta independiente, OAuth permanente, bandeja de revisión y prueba completa, la implementación sigue incompleta y no debe presentarse como una automatización en producción.

Referencias: [Supabase programado](https://supabase.com/docs/guides/functions/schedule-functions), [OAuth Google](https://developers.google.com/identity/protocols/oauth2/web-server), [OAuth Dropbox](https://developers.dropbox.com/oauth-guide).

## Instalación comprobada el 17/11/2026

La migración `municipal_integration_queue_disabled` se aplicó al proyecto existente. Se creó el control desactivado, el remitente conocido y la exclusión del piloto terminado. Los ID y la cuenta permanecen en la base privada. Se verificó que `anon` y `authenticated` no tienen acceso a las cinco tablas nuevas. No se desplegó la función ni se creó cron.

El asesor informa RLS sin políticas en estas cinco tablas: es deliberado, porque no se autoriza acceso desde clientes. También mantiene el aviso previo de [search_path mutable en asignar_numero_p](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), ajeno a las nuevas funciones, que fijan un search_path vacío.
