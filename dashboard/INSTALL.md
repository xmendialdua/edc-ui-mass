# 🚀 Instalación en Nuevo Proyecto

Este documento explica cómo instalar el dashboard EDC en un proyecto nuevo.

## 📋 Prerequisitos

- Python 3.8+
- kubectl (opcional, solo si usas funciones de Kubernetes)
- Acceso a los conectores EDC (MASS e IKLN)

## 📦 Instalación

### 1. Copiar archivos

Copia estos archivos a tu nuevo proyecto:

```bash
# Desde el directorio actual
cp -r backend.py index.html requirements.txt config.json start.sh stop.sh .gitignore .env.example README.md /ruta/a/tu/nuevo/proyecto/
```

O copia manualmente:
- `backend.py`
- `index.html`
- `requirements.txt`
- `config.json`
- `start.sh`
- `stop.sh`
- `.gitignore`
- `.env.example`
- `README.md`

### 2. Configurar el entorno

```bash
cd /ruta/a/tu/nuevo/proyecto

# Copiar configuración de ejemplo
cp .env.example .env

# Editar .env con tus valores
nano .env  # o tu editor preferido
```

### 3. Configurar kubeconfig (opcional)

Si usas funciones de Kubernetes, coloca tu `kubeconfig.yaml` en una de estas ubicaciones:

**Opción 1:** En el mismo directorio del dashboard
```bash
cp /ruta/a/tu/kubeconfig.yaml ./kubeconfig.yaml
```

**Opción 2:** Variable de entorno
```bash
export KUBECONFIG=/ruta/a/tu/kubeconfig.yaml
```

**Opción 3:** Ubicación estándar de kubectl
```bash
cp /ruta/a/tu/kubeconfig.yaml ~/.kube/config
```

### 4. Crear entorno virtual e instalar dependencias

```bash
# Instalar herramientas necesarias
sudo apt install python3-pip python3.12-venv -y

# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### 5. Hacer scripts ejecutables

```bash
chmod +x start.sh stop.sh
```

### 6. Iniciar el dashboard

```bash
# Asegúrate de tener el entorno virtual activado
source venv/bin/activate

# Iniciar
./start.sh
```

El dashboard estará disponible en: **http://localhost:8083**

## 🔧 Configuración Avanzada

### Variables de entorno

Puedes configurar el dashboard mediante variables de entorno en `.env`:

```bash
# Ubicación del kubeconfig
KUBECONFIG=/ruta/personalizada/kubeconfig.yaml

# Endpoints de los conectores EDC
MASS_API=https://tu-mass-edc.example.com/management
MASS_API_KEY=tu-api-key-mass
MASS_BPN=BPNL00000000MASS

IKLN_API=https://tu-ikln-edc.example.com/management
IKLN_API_KEY=tu-api-key-ikln
IKLN_BPN=BPNL00000002IKLN
```

### Cargar variables de entorno

El backend carga automáticamente desde variables de entorno. Para cargar desde `.env`:

```bash
# Opción 1: Usar python-dotenv (añade al requirements.txt)
pip install python-dotenv

# Opción 2: Exportar manualmente
export $(grep -v '^#' .env | xargs)
```

## 🐛 Solución de Problemas

### Puerto ocupado

Si el puerto 8083 está ocupado:

```bash
# Buscar puerto libre
for port in {8083..8090}; do ! ss -tln | grep -q ":$port " && echo "Puerto $port libre" && break; done

# Modificar start.sh con el puerto libre
```

### KUBECONFIG no encontrado

Si no necesitas funciones de Kubernetes, el dashboard funcionará sin kubeconfig (solo funciones de EDC API).

## 📁 Estructura de Archivos

```
tu-proyecto/
├── backend.py           # Backend Flask
├── index.html          # Frontend HTML/JS
├── requirements.txt    # Dependencias Python
├── config.json        # Configuración JSON
├── start.sh           # Script de inicio
├── stop.sh            # Script de parada
├── .env               # Variables de entorno (crear desde .env.example)
├── .env.example       # Plantilla de configuración
├── .gitignore         # Exclusiones de Git
├── README.md          # Documentación principal
├── INSTALL.md         # Este archivo
├── kubeconfig.yaml    # (Opcional) Configuración de Kubernetes
└── venv/              # Entorno virtual (crear con python3 -m venv venv)
```

## 🚀 Uso Rápido

```bash
# Una vez instalado, para iniciar:
cd /ruta/a/tu/proyecto
source venv/bin/activate
./start.sh

# Para detener:
./stop.sh
```

## 📚 Más Información

Consulta `README.md` para documentación completa sobre el uso del dashboard.
