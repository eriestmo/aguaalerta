# AguaAlerta

Aplicación para que los vecinos reporten fugas y fallas de agua potable a su ASADA, y para que el personal los atienda.

Autor: Eric Estrada.

## Requisitos

Node 24, Docker y la CLI de Supabase.

## Correr en local

```bash
npm install
supabase start
cp .env.example .env.local   # completar con los datos de `supabase status`
npm run dev
```

En otra terminal, con un `.env.funciones` que apunte al servidor de correo local:

```bash
supabase functions serve --env-file .env.funciones
```

## Pruebas

```bash
supabase test db            # permisos de la base de datos
npm test                    # validaciones
node e2e/sembrar.mjs        # cuentas de prueba locales
npx playwright test         # recorridos completos
```

## Estructura

- `src/`: interfaz.
- `supabase/migrations/`: esquema, permisos y operaciones.
- `supabase/functions/`: inicio de sesión con bloqueo, personal y avisos por correo.
- `docs/`: historias de usuario, diagramas y guía de publicación.
- `design/`: pantallas de referencia del diseño.
