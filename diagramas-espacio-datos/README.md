# Diagramas de Espacio de Datos - Tractus-X

Esta carpeta contiene los diagramas ilustrativos para explicar el concepto de espacio de datos y su implementación con Tractus-X en el proyecto IFLEX.

## 📁 Archivos Disponibles

### Presentación HTML Interactiva
- **`presentacion-completa.html`**: Abre este archivo en tu navegador para ver todos los diagramas renderizados de forma interactiva. Incluye la opción de imprimir o exportar a PDF.

### Archivos Mermaid Individuales (.mmd)
Estos archivos contienen el código fuente de cada diagrama y pueden ser usados en:
- [Mermaid Live Editor](https://mermaid.live/)
- Draw.io / Diagrams.net (con plugin Mermaid)
- Documentación Markdown (GitHub, GitLab, etc.)
- Herramientas de presentación que soporten Mermaid

1. **`01-arquitectura-tractus-x.mmd`**: Arquitectura completa del espacio de datos
2. **`02-flujo-intercambio-datos.mmd`**: Diagrama de secuencia del flujo de intercambio
3. **`03-implementacion-iflex.mmd`**: Implementación específica del proyecto IFLEX
4. **`04-concepto-valor.mmd`**: Concepto y valor de un espacio de datos

## 🚀 Cómo Usar

### Opción 1: Visualización Rápida
1. Abre `presentacion-completa.html` en tu navegador web
2. Los diagramas se renderizarán automáticamente
3. Usa la función de impresión del navegador para exportar a PDF

### Opción 2: Editar y Personalizar
1. Copia el contenido de cualquier archivo `.mmd`
2. Pégalo en [Mermaid Live Editor](https://mermaid.live/)
3. Edita según necesites
4. Exporta como PNG, SVG o PDF

### Opción 3: Incluir en Presentaciones
- **PowerPoint/Keynote**: Exporta los diagramas como imágenes PNG/SVG desde Mermaid Live Editor
- **Google Slides**: Inserta las imágenes exportadas
- **Markdown**: Copia el código directamente en tus documentos .md

## 📊 Contenido de los Diagramas

### 1. Arquitectura de Espacio de Datos Tractus-X
Muestra los componentes principales:
- Organización Proveedor (Provider) con DataApp API y EDC Connector
- Organización Consumidor (Consumer) con DataApp API y EDC Connector
- Capa de Confianza (IAM, Catálogo de Participantes, Marco de Políticas)
- Flujo de comunicación entre componentes

### 2. Flujo de Intercambio de Datos
Diagrama de secuencia con 4 fases:
1. **Descubrimiento**: Búsqueda de datos en catálogo
2. **Autenticación**: Validación de identidades con SSI
3. **Negociación**: Acuerdo de contrato con políticas
4. **Transferencia**: Intercambio seguro de datos

### 3. Implementación Real IFLEX
Despliegue específico en Kubernetes mostrando:
- Provider Kit: MLflow Server, Flower Server, DataApp API
- Consumer Kit: ModelAPI, DataApp API
- EDC Connectors: Control Plane y Data Plane
- Infraestructura: Kubernetes (OVH), Terraform, Certificados TLS/SSL
- UI Dashboard: Interfaz web Next.js

### 4. Concepto y Valor del Espacio de Datos
Diagrama conceptual destacando:
- **Principios Clave**: Soberanía, Interoperabilidad, Confianza, Políticas
- **Beneficios**: Colaboración segura, Monetización, Innovación, Cumplimiento
- **Comparativa**: Data Space vs APIs Tradicionales

## 🎯 Puntos Clave para la Presentación

**¿Qué es un Espacio de Datos?**
Un espacio de datos permite que múltiples organizaciones compartan datos de manera segura manteniendo el control total sobre ellos. A diferencia de compartir mediante APIs tradicionales, el proveedor siempre mantiene la soberanía sobre sus datos y puede aplicar políticas de uso.

**Tractus-X**
Es el estándar open-source de Catena-X que implementa estos conceptos mediante Eclipse Dataspace Components (EDC).

**Características Principales**:
- 🛡️ **Soberanía de Datos**: Control total en todo momento
- 🔐 **Confianza Verificada**: Identidades basadas en SSI (Self-Sovereign Identity)
- 📜 **Políticas Inteligentes**: Contratos que definen uso de datos
- 🔗 **Interoperabilidad**: Estándares comunes entre organizaciones

## 🛠️ Herramientas Recomendadas

- **Mermaid Live Editor**: https://mermaid.live/
- **Draw.io**: https://app.diagrams.net/
- **Visual Studio Code**: Con extensión "Markdown Preview Mermaid Support"
- **Obsidian**: Para notas con soporte Mermaid nativo

## 📞 Soporte

Para más información sobre el proyecto IFLEX o actualización de diagramas, contacta con el equipo de desarrollo.

---

Generado para el proyecto IFLEX - Marzo 2026
