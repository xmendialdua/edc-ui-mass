# 📊 EDC Asset Publishing Dashboard

Dashboard web interactivo para publicar assets en EDC (Eclipse Dataspace Components) con políticas de acceso basadas en BPN (Business Partner Number).

## 🎯 Objetivo

Facilitar el proceso de:
1. Verificar prerequisitos de infraestructura EDC
2. Publicar un asset (datos) en el conector MASS
3. Configurar políticas de acceso restringidas por BPN
4. Vincular assets con políticas mediante Contract Definitions
5. Descubrir assets desde el conector IKLN
6. Negociar contratos y transferir datos

## 🏗️ Arquitectura

```
┌─────────────────────┐         ┌──────────────────────┐
│   Frontend HTML     │ ◄─────► │   Backend Flask      │
│   (Dashboard UI)    │  HTTP   │   (Proxy + kubectl)  │
└─────────────────────┘         └──────────┬───────────┘
                                           │
                        ┌──────────────────┼──────────────────┐
                        │                  │                  │
                        ▼                  ▼                  ▼
              ┌─────────────────┐  ┌─────────────┐  ┌──────────────┐
              │  MASS EDC API   │  │  IKLN EDC   │  │  Kubernetes  │
              │  (OVH Cluster)  │  │     API     │  │   kubectl    │
              └─────────────────┘  └─────────────┘  └──────────────┘
```

## 🚀 Inicio Rápido

### Prerequisitos

- Python 3.8+
- kubectl configurado con acceso al cluster OVH
- KUBECONFIG válido en el directorio raíz del proyecto

### Instalación

1. **Instalar herramientas del sistema:**

```bash
# Instalar pip y venv si no están instalados
sudo apt install python3-pip python3.12-venv -y
```

2. **Crear y activar entorno virtual:**

```bash
cd dashboards
python3 -m venv venv
source venv/bin/activate
```

3. **Instalar dependencias Python:**

```bash
pip install -r requirements.txt
```

4. **Verificar KUBECONFIG:**

```bash
# Asegúrate de que existe ../kubeconfig.yaml
ls -la ../kubeconfig.yaml
```

5. **Iniciar la aplicación:**

```bash
# Asegúrate de activar el entorno virtual primero
source venv/bin/activate
./start.sh
```

O manualmente:

```bash
# Activar entorno virtual
source venv/bin/activate

# Terminal 1 - Backend
python3 backend.py

# Terminal 2 - Frontend (servir HTML)
python3 -m http.server 8083
```

6. **Abrir el dashboard:**

```
http://localhost:8083
```

## 📋 Estructura de Fases

### FASE 1: Verificación de Prerequisitos *(5 min)*
- ✅ Verificar conectividad a Management APIs (MASS e IKLN)
- ✅ Comprobar estado de pods en namespace `umbrella`
- ✅ Verificar relación de trust entre Business Partners
- 🌱 Ejecutar seeding si es necesario

### FASE 2: Publicación del Asset *(5 min)*
- 📦 Crear asset en MASS-EDC apuntando al PDF público
- 📋 Verificar que el asset se creó correctamente

### FASE 3: Configuración de Políticas *(5 min)*
- 🔐 Crear Access Policy (visibilidad en catálogo)
- 📜 Crear Contract Policy (derechos de uso)
- 📋 Verificar políticas creadas

### FASE 4: Vinculación Asset-Políticas *(3 min)*
- 🔗 Crear Contract Definition
- 📋 Verificar Contract Definition

### FASE 5: Descubrimiento desde IKLN *(5 min)*
- 🔍 Catalog Request desde IKLN hacia MASS
- ✅ Verificar que el asset aparece en el catálogo

### FASE 6: Negociación y Acceso *(10 min)*
- 🤝 Negociar contrato
- 📥 Iniciar transferencia de datos

## 🔧 Configuración

### Backend (backend.py)

El backend expone endpoints REST para:
- Verificación de infraestructura (conectividad, pods, trust)
- Operaciones CRUD en EDC (assets, policies, contract definitions)
- Catalog discovery y contract negotiation
- Ejecución de comandos kubectl

**Variables de configuración:**

```python
MASS_API = "https://edc-mass-control.51.178.94.25.nip.io/management"
MASS_API_KEY = "mass-api-key-change-in-production"
MASS_BPN = "BPNL00000000MASS"

IKLN_API = "https://edc-ikln-control.51.178.94.25.nip.io/management"
IKLN_API_KEY = "ikln-api-key-change-in-production"
IKLN_BPN = "BPNL00000002IKLN"

PDF_URL = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
```

### Frontend (index.html)

Dashboard HTML con JavaScript vanilla. Configuración:

```javascript
const API_BASE = 'http://localhost:5000/api';
```

## 🔑 Conceptos Clave

### Asset
Representación lógica de los datos a compartir (metadatos + ubicación física).

### Access Policy
Controla quién puede **VER** el asset en el catálogo (catalog discovery).

### Contract Policy
Controla quién puede **USAR** el asset (derechos de uso).

### Contract Definition
Vincula assets con políticas mediante un selector.

### BPN (Business Partner Number)
Identificador único del partner en Catena-X/Tractus-X.

### DSP (Dataspace Protocol)
Protocolo estándar para comunicación entre conectores EDC.

## 📡 Endpoints del Backend

### FASE 1 - Verificación
- `POST /api/phase1/check-connectivity` - Verificar APIs
- `POST /api/phase1/check-pods` - Estado de pods
- `POST /api/phase1/check-trust` - Verificar trust
- `POST /api/phase1/seed-partners` - Ejecutar seeding

### FASE 2 - Assets
- `POST /api/phase2/create-asset` - Crear asset
- `POST /api/phase2/list-assets` - Listar assets

### FASE 3 - Políticas
- `POST /api/phase3/create-access-policy` - Crear Access Policy
- `POST /api/phase3/create-contract-policy` - Crear Contract Policy
- `POST /api/phase3/list-policies` - Listar políticas

### FASE 4 - Contract Definitions
- `POST /api/phase4/create-contract-definition` - Crear Contract Definition
- `POST /api/phase4/list-contract-definitions` - Listar Contract Definitions

### FASE 5 - Catalog Discovery
- `POST /api/phase5/catalog-request` - Consultar catálogo

### FASE 6 - Negociación y Transferencia
- `POST /api/phase6/negotiate-contract` - Iniciar negociación
- `GET /api/phase6/check-negotiation/<id>` - Verificar estado
- `POST /api/phase6/initiate-transfer` - Iniciar transferencia

## 🐛 Troubleshooting

### Backend no inicia
```bash
# Verificar instalación de dependencias
pip list | grep -i flask

# Verificar KUBECONFIG
echo $KUBECONFIG
kubectl get pods -A
```

### Error de conectividad a APIs
```bash
# Verificar acceso a Management APIs
curl -k -H "X-Api-Key: mass-api-key-change-in-production" \
  https://edc-mass-control.51.178.94.25.nip.io/management/v2/assets
```

### Pods not found
```bash
# Verificar namespace y pods
kubectl get namespaces | grep umbrella
kubectl get pods -n umbrella
```

### CORS errors en navegador
- Asegúrate de que el backend está ejecutándose en puerto 5000
- Verifica que flask-cors está instalado

## 📚 Referencias

- [EDC Management API Documentation](https://eclipse-edc.github.io/docs/)
- [Tractus-X EDC](https://github.com/eclipse-tractusx/tractusx-edc)
- [ODRL Policy Language](https://www.w3.org/TR/odrl-model/)
- [Dataspace Protocol Specification](https://docs.internationaldataspaces.org/)

## 📝 Notas

- Los certificados son self-signed, por lo que se usa `verify=False` en requests
- El backend maneja automáticamente el KUBECONFIG
- Todos los logs se muestran en tiempo real en el dashboard
- Las operaciones son idempotentes (pueden ejecutarse múltiples veces)

## 🎯 Casos de Uso

Este dashboard es ideal para:
- 📚 **Aprendizaje**: Entender el flujo completo de EDC
- 🧪 **Testing**: Probar políticas y restricciones BPN
- 🐛 **Debugging**: Identificar problemas en catalog discovery
- 📊 **Demos**: Demostrar capacidades de EDC visualmente

## 🤝 Contribuciones

Para mejorar el dashboard:
1. Añadir más validaciones de estado
2. Implementar cleanup de recursos
3. Añadir métricas y estadísticas
4. Mejorar el manejo de errores
5. Añadir autenticación al backend

## 📄 Licencia

Apache License 2.0 - Alineado con el proyecto Tractus-X

---

**Autor:** Tractus-X Team  
**Fecha:** Marzo 2026  
**Versión:** 1.0.0
