# Implementación del Flujo de Publicación de Documentos

## Resumen

Se ha implementado el flujo completo de publicación de documentos en el conector de Mondragon Assembly (EDC-MASS), que incluye:

1. Creación de Assets en el conector EDC
2. Generación de Políticas ODRL específicas por partner
3. Creación de Contract Definitions que vinculan assets con políticas

## Funcionalidades Implementadas

### 1. Publicación de Nuevo Documento

**Ubicación:** Vista `publish-data` → Botón "Publish New Document"

**Flujo:**
- Al hacer clic en "Publish New Document", se abre un diálogo para introducir:
  - Nombre del documento
  - URL del documento (pre-rellenada con un PDF público de ejemplo)
- Al confirmar, se ejecuta automáticamente:
  1. Se añade el documento al storage local
  2. Se crea un **Asset** en el conector EDC-MASS con:
     - ID: `asset-{nombre-documento}`
     - Nombre y descripción del documento
     - URL del documento como `baseUrl` en el DataAddress
     - Tipo: HttpData

### 2. Compartir Documento con un Partner

**Ubicación:** Vista `publish-data` → Cada documento → Botón "Share" (menú desplegable)

**Flujo:**
- Hacer clic derecho (o en el botón "Share") sobre un documento
- Seleccionar el partner con el que se desea compartir (Ikerlan, Ederlan, Gestamp, o Bexen)
- Se ejecuta automáticamente el flujo completo:

  **a) Verificar/Crear Política ODRL**
  - Se busca si ya existe una política para el partner seleccionado
  - Si existe, se reutiliza (ID: `policy-{nombre-partner}`)
  - Si no existe, se crea una nueva política ODRL con:
    - Restricción por BPN (Business Partner Number)
    - Solo el partner específico puede acceder
    - Cumple con estándares ODRL de Tractus-X

  **b) Crear Contract Definition**
  - Se crea un contrato que vincula:
    - El asset del documento
    - La política del partner
  - ID: `contract-{nombre-documento}-{nombre-partner}`
  - Usa la misma política para accessPolicy y contractPolicy

### 3. Panel de Logs

**Ubicación:** Vista `publish-data` → Sección "Documents" → Parte inferior

**Características:**
- Fondo negro con texto verde (estilo terminal)
- Muestra todas las operaciones en tiempo real:
  - Creación de assets
  - Verificación/creación de políticas
  - Creación de contratos
- Tipos de mensajes:
  - Info (verde claro): Operaciones en curso
  - Success (verde): Operaciones completadas exitosamente
  - Warning (amarillo): Avisos (ej: asset ya existe)
  - Error (rojo): Errores durante el proceso
- Auto-scroll al final cuando se añaden nuevas entradas

### 4. Visualización de Documentos

**Formato de visualización:**
```
[Icono] Nombre del documento
        https://url-del-documento.pdf
[ Botón Share / Partner compartido ]
```

- El nombre se muestra en negrita
- La URL se muestra debajo en texto más pequeño y gris
- Tooltip completo al hacer hover sobre la URL truncada

## Mapeo de Partners a BPNs

Los Business Partner Numbers (BPNs) asignados son:

- **Ikerlan**: `BPNL00000000IKLN`
- **Ederlan**: `BPNL00000000EDER`
- **Gestamp**: `BPNL00000000GEST`
- **Bexen**: `BPNL00000000BEXN`

## URL de PDF Público

Se utiliza como ejemplo un PDF público de W3C:
```
https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf
```

Este PDF es de acceso público global y se puede usar para pruebas.

## Estructura de Archivos

Archivos nuevos creados:

```
ui/
├── lib/
│   └── publish-flow.ts          # Lógica del flujo de publicación completo
├── app/
│   └── publish-data/
│       └── components/
│           ├── log-panel.tsx    # Componente del panel de logs
│           └── add-document-dialog.tsx  # Actualizado para incluir URL
```

Archivos modificados:

```
ui/
├── lib/
│   └── documents-storage.ts     # Añadido campo 'url' al tipo Document
└── app/
    └── publish-data/
        └── page.tsx             # Integración del flujo completo
```

## Documentación de Referencia

La implementación se basa en la documentación oficial de Tractus-X EDC:
- Repository: https://github.com/eclipse-tractusx/tractus-x-umbrella
- APIs Management v3: `/v3/assets`, `/v3/policydefinitions`, `/v3/contractdefinitions`
- Estándares ODRL (Open Digital Rights Language)

## Notas Técnicas

1. **Políticas ODRL**: Las políticas creadas siguen el estándar ODRL 2.0 con restricciones basadas en BPN
2. **IDs únicos**: Se generan IDs únicos basados en nombres para evitar duplicados
3. **Manejo de errores**: Si un asset ya existe, se reutiliza y se continúa con el flujo
4. **Actualización automática**: Después de publicar, se refresca la lista de assets/políticas/contratos
5. **Migración de datos**: Los documentos existentes sin URL se actualizan automáticamente

## Uso del Sistema

### Para publicar un documento nuevo:

1. Ir a `publish-data`
2. Hacer clic en "Publish New Document"
3. Introducir nombre del documento
4. Opcionalmente, cambiar la URL del PDF
5. Confirmar

El documento aparecerá en la lista con estado "Share" (no compartido).

### Para compartir con un partner:

1. Localizar el documento en la lista
2. Hacer clic en el botón "Share"
3. Seleccionar el partner (Ikerlan, Ederlan, Gestamp o Bexen)
4. Observar el log para ver el progreso de las operaciones

El documento mostrará el partner con el que está compartido en un botón verde. Hacer clic en ese botón lo descompartirá.

## Próximos Pasos Sugeridos

- Implementar borrado de contratos al descompartir un documento
- Añadir soporte para múltiples partners por documento
- Implementar políticas más complejas (restricciones de tiempo, uso, etc.)
- Añadir validación de URLs de documentos
- Implementar preview de documentos PDF
