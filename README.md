# K21 · Control de móviles

App de la 21ª Compañía "Areguá" (CBVP) para cargar y verificar las planillas de cada móvil.

| Rol | Qué hace |
| --- | --- |
| **Chofer** | Carga el **Control mecánico** del móvil (operador, aspectos legales, luces, sirenas/balizas, tablero, neumáticos, frenos, vidrios, específicos, motor + combustible). |
| **Respondiente** | Carga el **Control de material menor** (habilitación pre hospitalaria y kits: heridas, vías aéreas, quemaduras, obstétrico, evaluación, varios, inmovilización y traslado). |
| **Admin** | Revisa los controles **pendientes**: los **aprueba** o los **observa** con un comentario. El autor corrige y reenvía. También gestiona usuarios, móviles e ítems de las planillas. |

Las fallas se marcan solas: NO, estado Malo o Inoperativo, nivel en Reserva, una cantidad menor a "debe haber" (o 0 si la planilla no indica mínimo), y SI en ítems como "Pérdida de aceite".

## Arquitectura

El front habla directo con **Supabase**, que funciona como backend:

- **Auth**: ingreso con email y contraseña. No hay registro público ni recuperación de contraseña: los usuarios los crea el admin y él mismo resetea las contraseñas.
- **Base (Postgres)**: tablas, reglas de negocio y permisos (RLS). Ninguna tabla es accesible sin sesión.
- **Edge Function** `admin-usuarios`: alta y edición de usuarios con la API de administración de Auth (necesita la clave secreta, por eso no está en el front).

| Qué | Cómo se accede | Quién |
| --- | --- | --- |
| `usuario` (perfil: nombre, código, rol, activo) | Lectura directa | Cada uno el suyo; el admin, todos |
| Altas y cambios de usuarios | Edge Function `admin-usuarios` | Admin |
| `movil`, `seccion`, `item` (planillas) | Lectura y escritura directa | Todos leen lo activo; el admin ve todo y edita |
| `control`, `control_item` | Solo por funciones RPC (`guardar_control`, `revisar_control`, `listar_controles`, `obtener_control`, `resumen_controles`) | Cada uno sus controles; el admin, todos |

Los controles pasan solo por funciones porque ahí se valida la planilla completa, se calculan las fallas y se controla quién puede cargar, corregir o revisar. Así nadie se las puede saltear desde el navegador.

Un usuario **inactivo** no puede ingresar: además de figurar inactivo en `usuario`, queda bloqueado en Auth.

## Estructura

- `k21-front/`: React 19 + Vite + Tailwind 4 + shadcn/ui, pensada para el celular.
  - `src/lib/supabase.ts`: cliente de Supabase.
  - `src/lib/sesion.ts`: sesión (login, perfil, salida).
  - `src/lib/datos.ts`: todas las consultas a Supabase y la traducción de errores al español.
  - `src/lib/reglas.ts`: reglas de fallas para marcarlas mientras se carga (la base las vuelve a calcular al guardar).
- `supabase/migrations/`: cambios a la base, en orden.
- `supabase/functions/admin-usuarios/`: Edge Function de usuarios.
- `k21-back/`: **ya no se usa**. Era la API anterior (Express + Prisma). Se conserva solo porque tiene la migración inicial de las tablas y la carga de las planillas (ver abajo). No correr `prisma migrate` contra la base actual: su esquema quedó desactualizado.

## Levantar en local

Con un proyecto de Supabase ya configurado (el actual):

```bash
cd k21-front
cp .env.example .env.local   # completar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev                  # http://localhost:5173
```

Para usarla desde el celular en la misma red: `http://<IP-de-la-PC>:5173`.

`.env.local` solo necesita las dos variables `VITE_`. La publishable key puede ir en el navegador; **la clave secreta y la contraseña de la base nunca van en el front**.

## Armar un proyecto de Supabase desde cero

Hoy las tablas y las planillas salen de `k21-back` (pendiente: pasarlas a una migración propia en `supabase/migrations/`).

1. **Tablas y planillas**, con k21-back (en su `.env`, `DATABASE_URL` y `DIRECT_URL` del botón *Connect* del proyecto):
   ```bash
   cd k21-back
   npm install
   npm run db:deploy   # crea las tablas
   npm run seed        # carga las planillas y el móvil AM21
   ```
2. **Migraciones de `supabase/migrations/`**, en orden por nombre (desde el *SQL Editor* de Supabase o con `psql`). Enlazan los usuarios con Auth y crean permisos, validaciones y funciones. La primera borra el admin que crea el seed, que ya no sirve.
3. **Edge Function** (necesita un *Personal Access Token* de Supabase en `SUPABASE_ACCESS_TOKEN`; revocarlo al terminar):
   ```bash
   npx supabase functions deploy admin-usuarios --remote=<project-ref> --no-verify-jwt --use-api
   ```
   Va con `--no-verify-jwt` porque la función verifica el token del usuario por su cuenta.
4. **Auth**, en el dashboard:
   - *Authentication → Sign In / Providers*: desactivar **Allow new users to sign up**.
   - *Authentication → Users → Add user*: crear el primer admin con **Auto Confirm User**. Queda inactivo; activarlo desde el *SQL Editor*:
     ```sql
     update public.usuario set rol = 'ADMIN', activo = true, nombre = 'Nombre Apellido' where email = 'admin@ejemplo.com';
     ```
   Los demás usuarios se crean desde la pantalla **Usuarios** de la app.
