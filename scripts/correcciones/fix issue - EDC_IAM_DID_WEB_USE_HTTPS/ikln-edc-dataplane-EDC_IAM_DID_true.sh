#!/usr/bin/env bash
set -euo pipefail

kubectl -n umbrella apply --server-side --force-conflicts --field-manager=did-web-https-fix -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ikln-edc-dataplane
spec:
  template:
    spec:
      containers:
      - name: tractusx-connector
        env:
        - name: EDC_IAM_DID_WEB_USE_HTTPS
          value: "true"
EOF