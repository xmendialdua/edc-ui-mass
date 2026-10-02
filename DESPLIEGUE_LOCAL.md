# Despliegue local del Dashboard

El Dashboard se puede ejecutar en local para desarrollo y pruebas. La aplicación consta de un backend y un frontend, que se inician juntos mediante `start.sh`.

## Requisitos

- Python 3 y Node.js.
- `pnpm` instalado.
- Acceso al clúster de Kubernetes donde está desplegada la base de datos del Portal, con `kubectl` y el kubeconfig configurados.

## Configuración

Antes de iniciar la aplicación, revisa la configuración del backend en:

```text
src/poc_next/backend/.env
```

Este fichero contiene parámetros de conexión a los conectores, Kubernetes, SharePoint y la base de datos del Portal. El script de inicio crea `.env` a partir de `.env.example` si no existe, pero es necesario revisar y completar los valores antes de usar las funciones que dependan de ellos.

En particular, la conexión local a la base de datos debe apuntar al puerto `5433`:

```dotenv
PORTAL_DB_HOST=localhost
PORTAL_DB_PORT=5433
PORTAL_DB_NAME=postgres
PORTAL_DB_USER=portal
PORTAL_DB_PASSWORD=dbpasswordportal
```

El valor de `PORTAL_DB_PASSWORD` debe coincidir con la contraseña configurada para la base de datos. Si no es correcto, el backend no podrá consultar la base de datos y no aparecerá la lista de partners. Trata `.env` como un fichero sensible: no compartas ni publiques sus secretos.

El frontend no requiere configuración adicional para ejecutarse en local.

## Inicio

Abre una terminal en la raíz del repositorio y ejecuta:

```bash
cd src/poc_next
./start.sh
```

El script inicia el backend en el puerto `5001` y el frontend en el puerto `3020`. Mantén esta terminal abierta mientras uses la aplicación.

Para que el backend local pueda consultar la base de datos PostgreSQL del Portal en Kubernetes, abre una segunda terminal en la raíz del repositorio y ejecuta:

```bash
./soporte/port-forward.sh
```

Este proceso mantiene el puerto local `5433` conectado al servicio PostgreSQL del clúster, por lo que también debe permanecer activo. El script utiliza un kubeconfig ubicado en `/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml`; si el kubeconfig está en otra ubicación, actualiza la variable `KUBECONFIG` en `soporte/port-forward.sh` antes de ejecutarlo.

## Acceso

- Dashboard: <http://localhost:3020>
- Datos de partners: <http://localhost:3020/partner-data>
- Publicación de datos: <http://localhost:3020/data-publication>
- API del backend: <http://localhost:5001>
- Documentación de la API: <http://localhost:5001/docs>

Para detener los servicios, pulsa `Ctrl+C` en la terminal donde se ejecuta `start.sh`. Detén el port-forward con `Ctrl+C` en su terminal cuando hayas terminado.
