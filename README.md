# DataSpace Dashboard UI

DataSpace Dashboard UI es una aplicación web para gestionar y consumir datos compartidos en un espacio de datos basado en Eclipse Tractus-X y Eclipse Dataspace Components (EDC). Reúne en una interfaz los flujos habituales de proveedor y consumidor y se integra con los conectores EDC y los servicios de infraestructura configurados para el entorno.

## Funcionalidad

- **`data-publication`**: permite a Mondragon Assembly (MASS) publicar assets y definir los contratos que habilitan el acceso de sus partners a esos datos.
- **`partner-data`**: permite a cada partner del espacio de datos consultar los assets que MASS ha compartido con ese partner y acceder a los datos autorizados.
- **Operación del espacio de datos**: comprobar conectividad y estado de los servicios necesarios para los flujos de publicación e intercambio.
- **Integración con SharePoint de Mondragon Assembly (MASS)**: los assets publicados por MASS corresponden a ficheros o carpetas compartidos en su sitio de SharePoint. Los partners autorizados pueden consultar y descargar esos ficheros o el contenido de carpetas completas a través de la aplicación.
- **Integración con el Portal**: consultar datos de partners, según la configuración del entorno.

La aplicación está implementada como un frontend Next.js con TypeScript y un backend FastAPI en Python. El código de ambos componentes está en [`src/poc_next`](src/poc_next/).

## Despliegue

- **Desarrollo local**: consulta la [guía de despliegue local](DESPLIEGUE_LOCAL.md). Describe la configuración del backend, el inicio de frontend y backend, y el acceso opcional a la base de datos del Portal mediante port-forward.
- **Kubernetes en OVH**: consulta la [guía de despliegue en OVH](src/poc_next/DEPLOY.md), que cubre la construcción de imágenes, el despliegue en Kubernetes y el acceso a la aplicación.
- **Scripts y guía de uso**: en [`src/poc_next`](src/poc_next/) se encuentran los scripts de inicio y despliegue, así como documentación adicional del proyecto.

Antes de iniciar la aplicación, configura las variables de entorno del backend y las credenciales de acceso a los servicios que vayas a utilizar. No publiques ficheros `.env`, kubeconfig ni secretos.