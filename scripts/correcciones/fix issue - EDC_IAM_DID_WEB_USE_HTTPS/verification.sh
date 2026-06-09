#!/usr/bin/env bash
set -euo pipefail

# Verificacion rapida despues de aplicar
for d in ikln-edc-controlplane ikln-edc-dataplane mass-edc-controlplane mass-edc-dataplane; do
  echo "==== $d"
  kubectl -n umbrella get deploy "$d" -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="EDC_IAM_DID_WEB_USE_HTTPS")].value}{"\n"}'
done
