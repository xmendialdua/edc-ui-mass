# Scripts de Limpieza de Base de Datos EDC

Scripts para limpiar negociaciones, transferencias y EDRs de las bases de datos PostgreSQL de los conectores EDC.

## Estructura

```
scripts/cleanup-db/
├── cleanup-negotiations-from-db.sh  (genérico)
├── cleanup-transfers-from-db.sh     (genérico)
├── cleanup-edrs-from-db.sh          (genérico)
├── cleanup-db-negotiations-IKLN.sh  (wrapper IKLN)
├── cleanup-db-negotiations-MASS.sh  (wrapper MASS)
├── cleanup-db-transfers-IKLN.sh     (wrapper IKLN)
├── cleanup-db-transfers-MASS.sh     (wrapper MASS)
├── cleanup-db-edrs-IKLN.sh          (wrapper IKLN)
└── cleanup-db-edrs-MASS.sh          (wrapper MASS)
```

## Scripts Genéricos

### cleanup-negotiations-from-db.sh
Elimina negociaciones de contratos de cualquier conector EDC.

**Uso:**
```bash
./cleanup-negotiations-from-db.sh <POD_NAME> <DB_PASSWORD> <CONNECTOR_NAME> [FILTER]
```

**Filtros disponibles:**
- `all` - Todas las negociaciones (⚠️ PELIGROSO)
- `terminated` - Solo TERMINATED (state=1500) [DEFAULT]
- `failed` - Negociaciones fallidas
- `old` - TERMINATED + incompletas >7 días
- `stuck` - Incompletas con >24h (posiblemente atascadas)

**Ejemplo:**
```bash
./cleanup-negotiations-from-db.sh ikln-edc-postgresql-0 dbpassworddataconsumerone IKLN terminated
```

### cleanup-transfers-from-db.sh
Elimina transferencias de datos de cualquier conector EDC.

**Uso:**
```bash
./cleanup-transfers-from-db.sh <POD_NAME> <DB_PASSWORD> <CONNECTOR_NAME> [FILTER]
```

**Filtros disponibles:**
- `all` - Todas las transferencias
- `started` - En progreso (state=600)
- `terminated` - Terminadas (state=850) [DEFAULT]
- `failed` - Fallidas (state=900)
- `completed` - Completadas (state=500)
- `old` - Todas las finalizadas (500, 850, 900)

### cleanup-edrs-from-db.sh
Elimina EDRs (Endpoint Data References) de cualquier conector EDC.

**Uso:**
```bash
./cleanup-edrs-from-db.sh <POD_NAME> <DB_PASSWORD> <CONNECTOR_NAME> [FILTER]
```

**Filtros disponibles:**
- `all` - Todos los EDRs [DEFAULT]
- `old` - EDRs con más de 7 días
- `<asset_id>` - EDRs de un asset específico

## Scripts Específicos por Conector

### Para IKLN (Consumer)

```bash
# Negociaciones
./cleanup-db-negotiations-IKLN.sh [terminated|all|failed|old|stuck]

# Transferencias
./cleanup-db-transfers-IKLN.sh [terminated|all|started|failed|completed|old]

# EDRs
./cleanup-db-edrs-IKLN.sh [all|old|<asset_id>]
```

**Ejemplos:**
```bash
# Limpiar negociaciones terminadas de IKLN
./cleanup-db-negotiations-IKLN.sh terminated

# Limpiar todas las transferencias fallidas de IKLN
./cleanup-db-transfers-IKLN.sh failed

# Limpiar EDRs antiguos (>7 días) de IKLN
./cleanup-db-edrs-IKLN.sh old
```

### Para MASS (Provider)

```bash
# Negociaciones
./cleanup-db-negotiations-MASS.sh [terminated|all|failed|old|stuck]

# Transferencias
./cleanup-db-transfers-MASS.sh [terminated|all|started|failed|completed|old]

# EDRs
./cleanup-db-edrs-MASS.sh [all|old|<asset_id>]
```

**Ejemplos:**
```bash
# Limpiar negociaciones terminadas de MASS
./cleanup-db-negotiations-MASS.sh terminated

# Limpiar transferencias completadas de MASS
./cleanup-db-transfers-MASS.sh completed

# Limpiar todos los EDRs de MASS
./cleanup-db-edrs-MASS.sh all
```

## Añadir Nuevos Conectores

Para añadir un nuevo conector (ej: FORD), crea 3 scripts wrapper:

```bash
# cleanup-db-negotiations-FORD.sh
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERIC_SCRIPT="$SCRIPT_DIR/cleanup-negotiations-from-db.sh"

POD_NAME="ford-edc-postgresql-0"
DB_PASSWORD="<password_de_ford>"
CONNECTOR_NAME="FORD"
FILTER=${1:-terminated}

exec "$GENERIC_SCRIPT" "$POD_NAME" "$DB_PASSWORD" "$CONNECTOR_NAME" "$FILTER"
```

Repite para transferencias y EDRs, y dale permisos:
```bash
chmod +x cleanup-db-*-FORD.sh
```

## Estados de EDC

### Negociaciones
- `1300` - FINALIZED (con contrato activo)
- `1500` - TERMINATED (fallida o cancelada)

### Transferencias
- `500` - COMPLETED
- `600` - STARTED
- `850` - TERMINATED
- `900` - FAILED

## Configuración

Los scripts utilizan estas variables (modificables en los scripts genéricos):

```bash
NAMESPACE="umbrella"
DB_NAME="edc"
DB_USER="user"
KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml
```

## Seguridad

- ⚠️ **Confirmación obligatoria**: Todos los scripts requieren confirmación (escribir "SI" o "si")
- 🔒 **Contraseñas**: Almacenadas en scripts wrapper (cambiar si se usa en producción)
- 📊 **Vista previa**: Siempre muestra lista antes de eliminar
- ❌ **No reversible**: Las eliminaciones no se pueden deshacer

## Notas

- Los EDRs solo se almacenan en el **consumer** (quien inició la transferencia)
- MASS normalmente NO debería tener negociaciones iniciadas (es provider)
- Usa `terminated` o `old` como filtros seguros para limpieza rutinaria
- El filtro `all` es peligroso - úsalo solo para limpiezas completas de test
