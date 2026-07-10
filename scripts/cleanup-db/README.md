# Scripts de Limpieza de Base de Datos EDC

Scripts para limpiar negociaciones, transferencias y EDRs de las bases de datos PostgreSQL de los conectores EDC.

## Estructura

```
scripts/cleanup-db/
├── check-db-status.sh               (genérico - verificación) ⭐ NUEVO
├── check-db-status-IKLN.sh          (wrapper IKLN - verificación) ⭐ NUEVO
├── check-db-status-MASS.sh          (wrapper MASS - verificación) ⭐ NUEVO
├── cleanup-negotiations-from-db.sh  (genérico - limpieza)
├── cleanup-transfers-from-db.sh     (genérico - limpieza)
├── cleanup-edrs-from-db.sh          (genérico - limpieza)
├── cleanup-db-negotiations-IKLN.sh  (wrapper IKLN - limpieza)
├── cleanup-db-negotiations-MASS.sh  (wrapper MASS - limpieza)
├── cleanup-db-transfers-IKLN.sh     (wrapper IKLN - limpieza)
├── cleanup-db-transfers-MASS.sh     (wrapper MASS - limpieza)
├── cleanup-db-edrs-IKLN.sh          (wrapper IKLN - limpieza)
└── cleanup-db-edrs-MASS.sh          (wrapper MASS - limpieza)
```

## Scripts de Verificación

### check-db-status.sh
Script genérico para verificar el estado de la base de datos de cualquier conector EDC.

**Uso:**
```bash
./check-db-status.sh <POD_NAME> <DB_PASSWORD> <CONNECTOR_NAME>
```

**Muestra:**
- Número de transferencias por estado
- Número de negociaciones por estado
- Número de EDRs almacenados
- Sugerencias de limpieza según los datos encontrados

**Ejemplo:**
```bash
./check-db-status.sh ikln-edc-postgresql-0 dbpassworddataconsumerone IKLN
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

## Verificar Estado Antes de Limpiar

**⚠️ IMPORTANTE**: Antes de ejecutar los scripts de limpieza, verifica qué estados tienen tus datos:

```bash
# Ver estado de IKLN
./check-db-status-IKLN.sh

# Ver estado de MASS
./check-db-status-MASS.sh
```

### ¿Por qué es importante?

Los scripts por defecto solo limpian estados específicos:
- **Negociaciones**: Solo `1500` (TERMINATED)
- **Transferencias**: Solo `850` (TERMINATED)

Si tus datos están en **otros estados** (ej: `600` STARTED, `1200`, `1400`), no se eliminarán.

### Solución: Usar el parámetro `all`

Si necesitas eliminar **todos** los datos independientemente del estado:

```bash
# Limpiar TODAS las negociaciones (cualquier estado)
./cleanup-db-negotiations-IKLN.sh all

# Limpiar TODAS las transferencias (cualquier estado)
./cleanup-db-transfers-IKLN.sh all

# Limpiar TODOS los EDRs
./cleanup-db-edrs-IKLN.sh all
```

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

# Limpiar TODAS las transferencias (cualquier estado)
./cleanup-db-transfers-IKLN.sh all

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

# Limpiar TODAS las transferencias de MASS (cualquier estado)
./cleanup-db-transfers-MASS.sh all

# Limpiar todos los EDRs de MASS
./cleanup-db-edrs-MASS.sh all
```

## Flujo de Trabajo Recomendado

1. **Verificar estado actual:**
   ```bash
   ./check-db-status-IKLN.sh
   ```

2. **Analizar los resultados:**
   - Si ves estados como `600` (STARTED), `1200`, `1400` → usa `all`
   - Si ves estados como `850` (TERMINATED), `1500` → usa `terminated`

3. **Ejecutar limpieza apropiada:**
   ```bash
   # Si hay datos en estados no estándar
   ./cleanup-db-transfers-IKLN.sh all
   ./cleanup-db-negotiations-IKLN.sh all
   
   # O si solo quieres limpiar terminados
   ./cleanup-db-transfers-IKLN.sh terminated
   ./cleanup-db-negotiations-IKLN.sh terminated
   ```

4. **Verificar que quedó limpio:**
   ```bash
   ./check-db-status-IKLN.sh
   ```

## Añadir Nuevos Conectores

Para añadir un nuevo conector (ej: FORD), crea 4 scripts wrapper:

### 1. Script de Verificación
```bash
# check-db-status-FORD.sh
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERIC_SCRIPT="$SCRIPT_DIR/check-db-status.sh"

POD_NAME="ford-edc-postgresql-0"
DB_PASSWORD="<password_de_ford>"
CONNECTOR_NAME="FORD"

exec "$GENERIC_SCRIPT" "$POD_NAME" "$DB_PASSWORD" "$CONNECTOR_NAME"
```

### 2. Script de Limpieza de Negociaciones
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

### 3. Script de Limpieza de Transferencias
(Repetir patrón similar con cleanup-transfers-from-db.sh)

### 4. Script de Limpieza de EDRs
(Repetir patrón similar con cleanup-edrs-from-db.sh)

Finalmente, dale permisos de ejecución:
```bash
chmod +x check-db-status-FORD.sh cleanup-db-*-FORD.sh
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
