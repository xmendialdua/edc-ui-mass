# Data Publication Dashboard

## Descripción

Página simplificada para la publicación de datos en el espacio de datos EDC. Proporciona una interfaz intuitiva para gestionar assets y publicarlos a múltiples partners mediante la creación automatizada de políticas y contract definitions.

## Ubicación

`/home/xmendialdua/projects/assembly/iflex/src/poc/static/data-publication.html`

## Características Principales

### 1. **Gestión de Assets (Panel Izquierdo)**
- ✅ Crear nuevos assets
- ✅ Visualizar assets existentes con sus detalles
- ✅ **Layout en 4 columnas** (responsive)
- ✅ Ver partners con los que cada asset está compartido
- ✅ Seleccionar múltiples assets para publicación masiva
- ✅ Eliminar assets
- ✅ Filtrar assets por partner

### 2. **Publicación a Partners**
- ✅ Seleccionar uno o varios assets
- ✅ Elegir uno o varios partners destino
- ✅ **Verificación inteligente de políticas**: Comprueba si existen antes de crearlas
- ✅ **Contract Policy General**: Una única política compartida (`contract-policy-general`)
- ✅ **Access Policy por Partner**: Específica por BPN (`access-policy-<bpn>`)
- ✅ Creación automática bajo demanda:
  - Access Policy (si no existe para ese partner)
  - Contract Policy General (solo la primera vez)
  - Contract Definition (vinculación asset-políticas-partner)
- ✅ Mensajes de error detallados y específicos

### 3. **Gestión de Contratos (Panel Derecho)**
- ✅ Visualizar todos los contratos publicados
- ✅ **Layout en 2 columnas** (responsive)
- ✅ Ver detalles de cada contrato (asset, partner, políticas)
- ✅ Eliminar contratos
- ✅ Filtrar contratos por partner

### 4. **Panel de Políticas (Colapsable)**
- ✅ Visualización de todas las políticas del conector
- ✅ **Diferenciación visual por tipo**:
  - 🔵 **Access Policy** (fondo azul): Controlan el acceso por BPN
  - 🟢 **Contract Policy** (fondo verde): Controlan los términos de uso
- ✅ Badges identificativos (ACCESS / CONTRACT)
- ✅ Layout de 2 columnas: lista + detalle JSON
- ✅ Click para ver detalles completos

### 5. **Sistema de Logs Global**
- ✅ Panel unificado en la parte inferior
- ✅ Registro detallado de todas las operaciones
- ✅ Timestamps para cada acción
- ✅ **Mensajes de error específicos** (no genéricos)
- ✅ **Resumen de éxito/fallos** al finalizar publicaciones
- ✅ Función de limpieza de logs

### 6. **Lista de Partners**
- ✅ Partners hardcodeados inicialmente:
  - **Ikerlan** (BPNL00000002IKLN)
  - **MondragonAssembly** (BPNL00000000MASS)
  - **Partner1** (BPNL00000001PTR1)
  - **Partner2** (BPNL00000001PTR2)
  - **Partner3** (BPNL00000001PTR3)
- ✅ Implementado mediante función `getAvailablePartners()` para futura escalabilidad

## Flujo de Uso

### Publicar un Asset

1. **Crear Asset** (si no existe):
   - Click en "📦 Crear Nuevo Asset"
   - Introducir nombre (solo letras minúsculas, números y guiones)
   - Confirmar creación

2. **Seleccionar Assets**:
   - Marcar checkbox de uno o varios assets en el panel izquierdo

3. **Publicar a Partners**:
   - Click en "🚀 Publicar Seleccionados"
   - Seleccionar uno o varios partners del listado
   - Confirmar publicación

4. **Resultado**:
   - El sistema creará automáticamente:
     - **Contract Policy General** (solo la primera vez, compartida por todos)
     - **Access Policy** específica para cada partner (si no existe)
     - **Contract Definition** para cada combinación asset-partner
   - Los contratos aparecerán en el panel derecho
   - Los assets mostrarán los partners con los que están compartidos
     - Contract Definition para cada combinación asset-partner
   - Los contratos aparecerán en el panel derecho
   - Los assets mostrarán los partners con los que están compartidos

### Filtrar por Partner

#### Filtrar Assets:
- Usar el dropdown "Filtrar" en el panel de Assets
- Seleccionar un partner
- Solo se mostrarán assets publicados para ese partner

#### Filtrar Contratos:
- Usar el dropdown "Filtrar" en el panel de Contratos
- Seleccionar un partner
- Solo se mostrarán contratos para ese partner

### Eliminar Elementos

#### Eliminar Asset:
- Click en 🗑️ junto al asset
- Confirmar eliminación
- ⚠️ **Importante**: Esto eliminará el asset del conector EDC

#### Eliminar Contrato:
- Click en 🗑️ junto al contrato
- Confirmar eliminación
- ℹ️ Solo elimina el vínculo, no el asset ni las políticas

## Diferencias con data-management.html

| Característica | data-management.html | data-publication.html |
|----------------|---------------------|----------------------|
| **Estructura** | Múltiples paneles colapsables (FASE 2, 3, 4) | Panel único unificado |
| **Enfoque** | Por fases (assets → políticas → contratos) | Por flujo de publicación |
| **Publicación** | Manual (1 partner a la vez) | Masiva (múltiples assets y partners) |
| **Filtros** | No disponibles | Filtros por partner para assets y contratos |
| **Visualización** | Detalles técnicos completos | Vista simplificada orientada a publicación |
| **Logs** | Por fase | Global unificado |
| **Target** | Usuarios técnicos | Usuarios publicadores de datos |

## API Endpoints Utilizados

La página utiliza los mismos endpoints del backend FastAPI:

- `POST /api/phase2/create-asset` - Crear asset
- `POST /api/phase2/list-assets` - Listar assets
- `POST /api/phase2/delete-asset` - Eliminar asset
- `POST /api/phase3/create-access-policy` - Crear Access Policy
- `POST /api/phase3/create-contract-policy` - Crear Contract Policy
- `POST /api/phase3/list-policies` - Listar políticas
- `POST /api/phase4/create-contract-definition` - Crear Contract Definition
- `POST /api/phase4/list-contract-definitions` - Listar contratos
- `POST /api/phase4/delete-contract-definition` - Eliminar contrato
- `POST /api/check-mass-status` - Verificar estado del conector

## Configuración del Backend

El backend debe estar corriendo en `http://localhost:5000`. Para iniciarlo:

```bash
cd /home/xmendialdua/projects/assembly/iflex/src/poc
./start.sh
```

## Futura Escalabilidad

### Función getAvailablePartners()

Actualmente retorna una lista hardcodeada de partners. Para integrar con la base de datos del portal:

```javascript
// Versión actual (hardcodeada)
function getAvailablePartners() {
    return [
        { bpn: "BPNL00000002IKLN", name: "Ikerlan", description: "..." },
        // ...
    ];
}

// Versión futura (desde API)
async function getAvailablePartners() {
    const response = await fetch(`${API_BASE}/partners/list`);
    const result = await response.json();
    return result.partners;
}
```

### Extensiones Posibles

1. **Edición de Assets**: Permitir modificar metadatos de assets existentes
2. **Políticas Personalizadas**: Crear políticas con restricciones específicas
3. **Historial de Publicaciones**: Registrar quién publicó qué y cuándo
4. **Validación de Contratos**: Verificar que los contratos están activos en el catálogo
5. **Notificaciones**: Alertar cuando se publican nuevos assets o se crean contratos

## Notas Técnicas

- **No modifica**: `data-management.html` ni `data-query.html` permanecen sin cambios
- **Código duplicado**: Las funciones necesarias se duplicaron para mantener independencia
- **Autocontenido**: Todo el CSS, HTML y JavaScript está en un solo archivo
- **Compatibilidad**: Usa el mismo backend que las páginas existentes

## Acceso

Una vez el backend esté corriendo, acceder a:

```
http://localhost:5000/data-publication.html
```

O añadir al servidor Flask la ruta correspondiente si es necesario.

## Estrategia de Políticas

### Contract Policy General

**ID**: `contract-policy-general`

- **Propósito**: Define los términos de uso generales para todos los partners
- **Instancia**: Una única instancia compartida por todos
- **Creación**: Solo se crea la primera vez que se publica un asset
- **Reutilización**: Todos los Contract Definitions usan esta misma política
- **Contenido**: 
  - Action: `use`
  - Constraints: Membership, FrameworkAgreement, UsagePurpose
  - No incluye restricción de BPN (es general)

### Access Policies por Partner

**ID**: `access-policy-<bpn>` (ejemplo: `access-policy-bpnl00000002ikln`)

- **Propósito**: Controla qué partners pueden VER el asset en el catálogo
- **Instancia**: Una por cada Business Partner Number (BPN)
- **Creación**: Se crea bajo demanda cuando se publica para un partner
- **Reutilización**: Si ya existe para ese BPN, se reutiliza
- **Contenido**:
  - Action: `access`
  - Constraints: Membership + BusinessPartnerNumber específico

### Ventajas de esta Estrategia

1. **Eficiencia**: No se duplican políticas innecesariamente
2. **Mantenimiento**: Una sola contract policy para modificar términos generales
3. **Escalabilidad**: Fácil añadir nuevos partners sin crear políticas duplicadas
4. **Claridad**: Separación clara entre "quién puede ver" (access) y "qué puede hacer" (contract)

### Ejemplo de Flujo

```
Asset: pdf-ejemplo

Publicación para Ikerlan:
  1. Verifica/Crea: contract-policy-general (compartida)
  2. Verifica/Crea: access-policy-bpnl00000002ikln (específica)
  3. Crea: Contract Definition -> pdf-ejemplo-ikerlan

Publicación para Partner1:
  1. Reutiliza: contract-policy-general (ya existe)
  2. Verifica/Crea: access-policy-bpnl00000001ptr1 (específica)
  3. Crea: Contract Definition -> pdf-ejemplo-partner1
```

---

**Creado**: 2026-04-15  
**Versión**: 2.0  
**Actualizado**: 2026-04-15  
**Autor**: Sistema de desarrollo automatizado
