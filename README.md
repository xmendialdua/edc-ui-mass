# IFLEX: Ikerlan Federated Learning EXtension

Este desarrollo conocido como IFLEX o FL-KIT, es un conjunto de herramientas que permiten la integración de un escenario basado en los espacios de datos junto al entrenamiento federado de modelos de inteligencia artificial y registro y compartición de modelos. A través de los espacios de datos, un proveedor o agregador es capaz de exponer a los consumidores del espacio la posibilidad de participar en un entrenamiento federado específico. Así se pueden entrenar modelos de inteligencia artificial con los datos de los clientes en un entorno seguro, fiable y soberano — pilares clave de los espacios de datos.

Este servicio, denominado **FL-Service**, se materializa mediante una **Data App** que automatiza todo el proceso: desde exponer el asset correspondiente, desplegar Clientes Federados que se conectan al Agregador automáticamente (siguiendo las especificaciones del usuario), hasta realizar el entrenamiento y el registro automático del modelo en un **Model Registry**.

Además, IFLEX permite que los modelos registrados se ofrezcan como assets en el espacio de datos para su consumo por otros participantes, quienes pueden especificar el Model Registry donde almacenar los modelos obtenidos.

Todo ello se realiza mediante una interfaz interoperable e intuitiva que no solo sirve para este caso de uso específico, sino que también facilita el uso de conectores EDC. Esta interfaz permite una gestión diferenciada entre los modos Provider y Consumer, además de visualizar la interacción entre clientes y agregadores FL y los modelos registrados.

---

## Tabla de Contenidos

1. [Arquitectura](#arquitectura)
2. [Requisitos del Despliegue](#requisitos-del-despliegue)
3. [Despliegue](#despliegue)
    - [Parte Común](#parte-común)
    - [Proveedor](#proveedor)
    - [Consumidor](#consumidor)
4. [Uso](#uso)
    - [Uso genérico de los espacios de datos](#uso-genérico-de-los-espacios-de-datos)
    - [Uso específico del caso de FL](#uso-específico-del-caso-de-fl)
5. [Licencia y Autores](#licencia-y-autores)

---

## Arquitectura

*Por completar...*

---

## Requisitos del Despliegue

- [Docker](https://docs.docker.com/get-docker/)
- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [k9s](https://k9scli.io/)
- [microk8s](https://microk8s.io/)
- [Helm](https://helm.sh/docs/intro/install/)
- [Kubernetes](https://kubernetes.io/docs/tasks/tools/)
- [Python](https://www.python.org/downloads/)

---

## Despliegue

### Parte Común

1. Clonar el repositorio.
2. Iniciar microk8s:
```bash
microk8s start
microk8s enable ingress dns hostpath-storage
```
3. Preparar dependencias de Helm:
```bash
cd edc
bash ./hack/helm-dependencies.bash
```
4. Refactorizar `Charts.yaml` y los archivos `values-mondragon-x-ikerlan-connector-?.yaml`, renombrando con un número o etiqueta adecuada.

5. Configurar valores personalizados:
   - BPN, dominio del control-plane/data-plane
   - authKey
   - Nombres de secretos (ej. `control-plane-connector1`)

6. Desplegar con Helm:
```bash
kubectl create namespace umbrella
helm install -f ./charts/umbrella/values-mondragon-x-ikerlan-connector-[1].yaml [connector-1] ./charts/umbrella -n umbrella
```

7. Despliegue de la UI:
```bash
cd ../ui/k8s
chmod +x deploy.sh
./deploy.sh
```

8. Crear secretos TLS:
```bash
cd ../../crts
kubectl create secret tls control-plane-connector[1] --cert=control-plane-connector[1]/fullchain.pem --key=control-plane-connector[1]/privkey.pem -n umbrella
kubectl create secret tls data-plane-connector[1] --cert=data-plane-connector[1]/fullchain.pem --key=data-plane-connector[1]/privkey.pem -n umbrella
```

### Proveedor

1. Desplegar el Agregador FL:
```bash
cd provider-kit/flower-server
kubectl create namespace flower
terraform init && terraform apply --auto-approve
```
2. Ingress del FL-server (opcional según el entorno):
```bash
kubectl apply -f ingress_flower.yaml -n flower
```

3. Desplegar MLflow:
```bash
cd ../mlflow-bitnami
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install mlflow bitnami/mlflow -f values-mlflow-stack.yaml --namespace mlflow --create-namespace
```
4. Entrenar modelo de prueba:
```bash
python3 train.py
```

5. Desplegar Data App del Provider:

Primero edita el archivo main.py de la API para configurar los datos de conexion al agregador deseados. Si realizas cambios, utiliza el script de agilP.sh para generar la imagen en base a ese codigo. Solamente deberias modificar el nombre y tag de la imagen (actualmente se usa un repo privado de Docker Hub).

```bash
cd ../dataapp-api/
terraform init
terraform apply --auto-approve
```
6. Desplegar ingress del proveedor:
```bash
kubectl apply -f ingress_provider_ikerlan.yaml -n fl-api-provider
```

### Consumidor

1. Desplegar Data App del Consumer:
```bash
cd consumer-kit/dataapp-api
terraform init
terraform apply --auto-approve
```
2. Desplegar ingress del consumidor:
```bash
kubectl apply -f ingress_consumer_ikerlan.yaml -n fl-api-consumer
```

---

## Uso

### Uso genérico de los espacios de datos

Desde la interfaz, el Provider puede definir assets, políticas y contratos. El Consumer puede buscar catálogos, negociar contratos e iniciar transferencias.

### Uso específico del caso de FL

- **Provider Mode**: visualizar modelos registrados en el Model Registry y el estado del Agregador FL.
- **Consumer Mode**: ver modelos registrados por cada asset y el estado de los clientes FL.

*Nota: en futuras versiones se incluirán pantallazos de la interfaz.*

---

## Licencia y Autores

Autor: Joseba Álvaro Hernández