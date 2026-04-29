# 🔧 Resolución: Error en Transferencias EDC - tokenSignerPrivateKey

**Fecha:** 27 de Marzo de 2026  
**Problema:** Transferencias terminan prematuramente sin generar EDR  
**Root Cause:** Clave privada `tokenSignerPrivateKey` tiene formato inválido en Data Plane de MASS

---

## 📋 Resumen del Problema

### Síntomas Identificados

- ✅ Negociación de contratos exitosa (estado: FINALIZED)
- ✅ Iniciación de transferencia exitosa (estado: REQUESTED)
- ❌ Transferencia termina inmediatamente (estado: TERMINATED)
- ❌ NO se genera EDR (Endpoint Data Reference)
- ❌ 23 transferencias fallidas acumuladas

### Flujo Observado

```
IKLN (Consumer) → MASS (Provider)
    ↓
Contract Negotiation: ✅ FINALIZED
    ↓
Transfer Request: ✅ REQUESTED
    ↓
MASS Control Plane → MASS Data Plane
    ↓
❌ ERROR: "Could not generate refresh token: 
         JWSSigner cannot be generated for private key 'tokenSignerPrivateKey': 
         No parser found that can handle that format."
    ↓
MASS → IKLN: TransferTerminationMessage
    ↓
Transfer State: TERMINATED (sin EDR)
```

---

## 🔍 Análisis Técnico

### Logs del Control Plane de MASS

```json
{
  "timestamp": "2026-03-27T10:47:42.7830630",
  "level": "ERROR",
  "message": "TransferProcess: ID 3c185615-fe6b-4b76-bb92-5e3115acdf5f. Attempt #1 failed to Start DataFlow. Fatal error occurred. Cause: Transfer request for process 3c185615-fe6b-4b76-bb92-5e3115acdf5f failed: Remote API returned HTTP 400. [{\"message\":\"Could not generate refresh token: JWSSigner cannot be generated for private key 'tokenSignerPrivateKey': No parser found that can handle that format.\",\"type\":\"InvalidRequest\",\"path\":null,\"invalidValue\":null}]"
}
```

### Root Cause

El **Data Plane de MASS** necesita generar un token JWT (JSON Web Token) para autenticar la descarga de datos. Este token debe firmarse con una clave privada RSA/ECDSA.

**El problema:** La clave privada `tokenSignerPrivateKey` almacenada en Vault:
- ❌ Tiene un formato que el parser JWS no puede interpretar
- ❌ Puede estar corrupta o incompleta
- ❌ No está en formato PEM válido

**Consecuencia:** El data plane no puede firmar el token → devuelve HTTP 400 → control plane termina la transferencia.

---

## ✅ Solución Implementada

### Script de Reparación: `fix-mass-dataplane-keys.sh`

El script realiza las siguientes acciones:

1. **Genera nueva clave RSA privada** (4096 bits, formato PEM)
   ```bash
   openssl genrsa -out tokenSignerPrivateKey.pem 4096
   ```

2. **Extrae la clave pública** correspondiente
   ```bash
   openssl rsa -in tokenSignerPrivateKey.pem -pubout -out tokenSignerPublicKey.pem
   ```

3. **Genera clave AES** para encriptación de tokens (256 bits)
   ```bash
   openssl rand -hex 32
   ```

4. **Carga las claves en Vault** del conector MASS
   ```bash
   kubectl exec -n umbrella mass-edc-vault-0 -- \
     vault kv put secret/tokenSignerPrivateKey content="<PEM_CONTENT>"
   ```

5. **Reinicia el Data Plane** para aplicar los cambios
   ```bash
   kubectl rollout restart deployment -n umbrella mass-edc-dataplane
   ```

---

## 🚀 Pasos para Aplicar la Solución

### 1. Ejecutar el Script de Reparación

```bash
cd /home/xmendialdua/projects/assembly/iflex
./fix-mass-dataplane-keys.sh
```

**Salida esperada:**
```
🔧 Reparando claves del Data Plane de MASS
==========================================

1️⃣ Generando nueva clave RSA privada (4096 bits)...
2️⃣ Extrayendo clave pública correspondiente...
3️⃣ Generando clave AES para encriptación...

✅ Claves generadas exitosamente

4️⃣ Cargando claves en Vault del conector MASS...
✅ Claves cargadas en Vault

5️⃣ Reiniciando pods del Data Plane para aplicar cambios...
⏳ Esperando a que el data plane reinicie...
deployment "mass-edc-dataplane" successfully rolled out

🎉 Reparación completada exitosamente
```

### 2. Verificar Estado del Data Plane

```bash
kubectl get pods -n umbrella | grep mass-edc-dataplane
```

**Debe mostrar:**
```
mass-edc-dataplane-xxxxxxxxx-xxxxx   1/1     Running   0          2m
```

### 3. Revisar Logs (Opcional)

```bash
kubectl logs -n umbrella -l app.kubernetes.io/instance=mass-edc,app.kubernetes.io/component=dataplane --tail=50
```

**NO deben aparecer** más errores de `tokenSignerPrivateKey`.

### 4. Limpiar Transferencias Antiguas

Desde el dashboard:
1. Ir a **FASE 6 - Consumo de Datos**
2. Click en botón **🧹 Limpiar Transfers**
3. Confirmar la eliminación de las 23 transferencias fallidas

O ejecutar manualmente:
```bash
cd dashboard
# Desde el dashboard, usar el endpoint /api/phase6/cleanup-transfers
```

### 5. Probar Nueva Transferencia

1. **Consultar Catálogo** (debe seguir funcionando)
2. **Consultar Contratos** (debe mostrar contratos finalizados)
3. **Iniciar Transfer** en un contrato
4. **Monitorear estado:**
   - Debería pasar de `REQUESTED` → `STARTING` → `STARTED`
   - En estado `STARTED` o `COMPLETED`, el EDR debe generarse
   - El botón **📥 Download File** debe aparecer

---

## 🔬 Verificación de la Solución

### Test Completo

```bash
# 1. Verificar que el data plane esté sano
kubectl logs -n umbrella -l app.kubernetes.io/instance=mass-edc,app.kubernetes.io/component=dataplane --tail=20 | grep -i error

# 2. Desde el dashboard, iniciar una nueva transferencia

# 3. Monitorear logs en tiempo real
kubectl logs -f -n umbrella mass-edc-controlplane-xxxxxxxxx-xxxxx | grep -i transfer
```

### Criterios de Éxito

✅ **NO aparecen errores** de `tokenSignerPrivateKey`  
✅ **Transferencia alcanza estado** `STARTED`  
✅ **EDR se genera** y aparece en `/v3/edrs/request`  
✅ **Endpoint de descarga** accesible con token válido  
✅ **Archivo CSV** se descarga correctamente

---

## 📊 Estado Actual (Post-Fix)

### Antes

- 23 transferencias TERMINATED sin EDR
- Error HTTP 400 en cada transferencia
- Data plane corrupto

### Después (Esperado)

- Transferencias limpias (0 acumuladas)
- Nuevas transferencias completan correctamente
- EDRs disponibles para descarga
- Data plane funcionando correctamente

---

## 🔧 Mantenimiento Futuro

### Buenas Prácticas

1. **Generar claves robustas:**
   - Usar RSA 4096 bits mínimo
   - Formato PEM estándar OpenSSL
   - Almacenar backup seguro

2. **Monitorizar logs:**
   ```bash
   kubectl logs -n umbrella --selector app.kubernetes.io/component=dataplane --tail=100 | grep ERROR
   ```

3. **Limpiar transferencias periódicamente:**
   - Usar endpoint `/api/phase6/cleanup-transfers`
   - Ejecutar semanalmente o cuando superen 50 transfers

4. **Validar claves antes del despliegue:**
   ```bash
   openssl rsa -in tokenSignerPrivateKey.pem -check
   ```

### Troubleshooting

**Si el problema persiste:**

1. Verificar que Vault esté accesible:
   ```bash
   kubectl exec -n umbrella mass-edc-vault-0 -- vault status
   ```

2. Verificar que las claves se cargaron correctamente:
   ```bash
   kubectl exec -n umbrella mass-edc-vault-0 -- vault kv get secret/tokenSignerPrivateKey
   ```

3. Verificar variables de entorno del data plane:
   ```bash
   kubectl get deployment -n umbrella mass-edc-dataplane -o yaml | grep -A 20 "env:"
   ```

4. Consultar documentación oficial de Tractus-X EDC:
   - [Eclipse Tractus-X Documentation](https://eclipse-tractusx.github.io/)
   - [EDC Connector Documentation](https://github.com/eclipse-edc/Connector)

---

## 📚 Referencias

- **Eclipse EDC:** https://github.com/eclipse-edc/Connector
- **Tractus-X:** https://eclipse-tractusx.github.io/
- **JWT Signing:** https://jwt.io/introduction
- **OpenSSL RSA:** https://www.openssl.org/docs/man1.1.1/man1/genrsa.html

---

## ✅ Conclusión

El problema de las transferencias TERMINATED sin EDR estaba causado por una **clave privada corrupta** en el Data Plane de MASS. La solución consiste en:

1. ✅ Generar nuevas claves RSA válidas
2. ✅ Cargarlas en Vault
3. ✅ Reiniciar el data plane
4. ✅ Limpiar transferencias antiguas
5. ✅ Probar nuevas transferencias

Con esta reparación, el flujo completo de transferencias y descarga de datos debería funcionar correctamente.

---

**Autor:** GitHub Copilot (Tractus-X Expert Mode)  
**Contacto:** Para soporte adicional, consultar documentación de Tractus-X
