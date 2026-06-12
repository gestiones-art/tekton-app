# Tekton App — Instrucciones de instalación

## Paso 1: Crear las tablas en Supabase

1. Entrá a supabase.com y abrí el proyecto **tekton-app**
2. En el menú de la izquierda tocá el ícono de base de datos (SQL Editor)
3. Pegá todo el contenido del archivo `supabase-schema.sql`
4. Tocá **Run** (o el botón verde)

## Paso 2: Subir a Vercel

1. Entrá a vercel.com con tu cuenta de Tekton
2. Tocá **Add New → Project**
3. Subí la carpeta de este proyecto (o conectá GitHub si lo usás)
4. En **Environment Variables** agregá:
   - `NEXT_PUBLIC_SUPABASE_URL` = https://nwxwxqhmzsqreptccczt.supabase.co
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = sb_publishable_ms6NC6ZDfqbNe66aAkgLNA_Rd76a0Gl
5. Tocá **Deploy**

## Listo!

La app va a estar disponible en una URL de Vercel tipo:
`tekton-app.vercel.app`

## Pantallas disponibles

- `/` → Home con resumen de pendientes
- `/consultas/nueva` → Cargar nueva consulta
- `/validar` → Lista de consultas para validar (área técnica)
- `/tramites` → Trámites en curso agrupados por etapa
- `/tramites/[id]` → Detalle de un expediente con historial
