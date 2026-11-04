#!/bin/sh
# Aplica la base de datos, las funciones y sus secretos al proyecto de Supabase de produccion.
set -eu
cd "$(dirname "$0")/.."
[ -f .env.produccion ] || { echo "Falta .env.produccion (vea .env.produccion.example)"; exit 1; }
. ./.env.produccion
for v in SUPABASE_PROJECT_REF ORIGEN_APP SMTP_HOST SMTP_USUARIO SMTP_CLAVE SMTP_REMITENTE; do
  eval "valor=\${$v:-}"
  [ -n "$valor" ] || { echo "Falta $v en .env.produccion"; exit 1; }
done
supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase db push --linked
secretos=$(mktemp)
trap 'rm -f "$secretos"' EXIT
grep -E '^(ORIGEN_APP|RUTA_APP|SMTP_[A-Z]+)=' .env.produccion > "$secretos"
supabase secrets set --env-file "$secretos" --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy --project-ref "$SUPABASE_PROJECT_REF"
echo "Listo. Siga con los pasos manuales de docs/publicacion.md."
