# Guía de Despliegue y Uso - POC Next

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Requisitos Previos](#requisitos-previos)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Instalación](#instalación)
5. [Lanzamiento de la Aplicación](#lanzamiento-de-la-aplicación)
6. [Acceso a las Funcionalidades](#acceso-a-las-funcionalidades)
7. [Detener la Aplicación](#detener-la-aplicación)
8. [Troubleshooting](#troubleshooting)

---

## 📖 Descripción General

POC Next es una aplicación moderna para la gestión de espacios de datos basada en Eclipse Tractus-X y EDC (Eclipse Dataspace Connector). Consta de:

- **Backend**: API REST desarrollada con FastAPI (Python)
- **Frontend**: Aplicación web desarrollada con Next.js 15 (React + TypeScript)

La aplicación proporciona dos dashboards principales:
- **Data Publication**: Para la publicación y gestión de assets de datos (MASS Connector)
- **Partner Data Access**: Para el acceso y consumo de datos de partners

---

## ⚙️ Requisitos Previos

### Software Necesario

- **Python 3.9+** con pip
- **Node.js 18.19+** (se recomienda usar nvm)
- **pnpm 10+** (gestor de paquetes)
- **Git** (para control de versiones)

### Verificación de Versiones

```bash
python3 --version    # Debe mostrar 3.9 o superior
node --version       # Debe mostrar v18.19 o superior
pnpm --version       # Debe mostrar 10.0 o superior
```

---

## 📁 Estructura del Proyecto

```
src/poc_next/
├── backend/                 # Backend FastAPI
│   ├── venv/               # Entorno virtual Python
│   ├── api/                # Endpoints API organizados por fase
│   ├── clients/            # Clientes para conectores EDC
│   ├── services/           # Lógica de negocio
│   ├── main.py             # Punto de entrada del backend
│   ├── config.py           # Configuración
│   ├── requirements.txt    # Dependencias Python
│   └── .env               # Variables de entorno (no commitear)
├── frontend/               # Frontend Next.js
│   ├── app/               # Rutas y páginas
│   │   ├── data-publication/
│   │   └── partner-data/
│   ├── components/        # Componentes React
│   │   └── phases/       # Componentes por fase del flujo
│   ├── lib/              # Utilidades y API client
│   ├── public/           # Assets estáticos (logos, etc.)
│   ├── package.json      # Dependencias Node.js
│   └── next.config.ts    # Configuración Next.js
├── mass_logo.png          # Logo de Mondragon Assembly
└── README.md             # Documentación general
```

---

## 🔧 Instalación

### 1. Backend (FastAPI)

```bash
# Navegar al directorio del backend
cd src/poc_next/backend

# El entorno virtual ya existe, solo activarlo
source venv/bin/activate

# Verificar que las dependencias estén instaladas
pip list | grep fastapi

# Si necesitas reinstalar dependencias
pip install -r requirements.txt
```

### 2. Frontend (Next.js)

```bash
# Navegar al directorio del frontend
cd src/poc_next/frontend

# Instalar dependencias (solo primera vez o si package.json cambia)
pnpm install
```

---

## 🚀 Lanzamiento de la Aplicación

### Opción 1: Lanzamiento Manual (Recomendado para Desarrollo)

#### Terminal 1 - Backend

```bash
cd /home/xmendialdua/projects/assembly/iflex/src/poc_next/backend
source venv/bin/activate
python3 main.py
```

**Salida esperada:**
```
INFO:     Uvicorn running on http://0.0.0.0:5001 (Press CTRL+C to quit)
INFO:     Started server process [XXXX]
INFO:     Application startup complete.
POC Next Backend API started on 0.0.0.0:5001
```

#### Terminal 2 - Frontend

```bash
cd /home/xmendialdua/projects/assembly/iflex/src/poc_next/frontend
pnpm dev
```

**Salida esperada:**
```
▲ Next.js 15.2.4
- Local:        http://localhost:3001
- Network:      http://10.255.255.254:3001

✓ Ready in 2.6s
```

### Opción 2: Script de Lanzamiento Automatizado

```bash
# Desde el directorio raíz del proyecto
cd /home/xmendialdua/projects/assembly/iflex/src/poc_next

# Crear un script de lanzamiento (ejecutar solo una vez)
cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 Iniciando POC Next..."

# Arrancar backend en segundo plano
echo "📡 Arrancando backend en puerto 5001..."
cd backend
source venv/bin/activate
python3 main.py &
BACKEND_PID=$!
cd ..

# Esperar a que el backend esté listo
sleep 3

# Arrancar frontend en segundo plano
echo "🎨 Arrancando frontend en puerto 3001..."
cd frontend
pnpm dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Aplicación iniciada correctamente"
echo ""
echo "📍 URLs disponibles:"
echo "   - Backend:          http://localhost:5001"
echo "   - Health Check:     http://localhost:5001/health"
echo "   - Data Publication: http://localhost:3001/data-publication"
echo "   - Partner Data:     http://localhost:3001/partner-data"
echo ""
echo "⏹️  Para detener: ./stop.sh o Ctrl+C"
echo ""

# Guardar PIDs para detener después
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

# Esperar indefinidamente
wait
EOF

chmod +x start.sh

# Ejecutar
./start.sh
```

### Verificación del Lanzamiento

Una vez iniciados ambos servidores, verifica que estén funcionando:

```bash
# Verificar backend
curl http://localhost:5001/health
# Debe devolver: {"status":"healthy"}

# Verificar frontend
curl -I http://localhost:3001/data-publication
# Debe devolver: HTTP/1.1 200 OK
```

---

## 🌐 Acceso a las Funcionalidades

### 1. Data Publication Dashboard

**URL**: http://localhost:3001/data-publication

**Descripción**: Dashboard para la publicación y gestión de datos del conector MASS (Mondragon Assembly).

#### Funcionalidades Disponibles:

##### 📦 Assets Publicables (Panel Izquierdo)
- **Ver assets existentes**: Lista en grid de 4 columnas
- **Crear nuevo asset**: Botón "Crear Nuevo Asset" (verde)
- **Seleccionar assets**: Checkbox en cada card
- **Ver detalles**: Click en el icono de expansión (chevron)
- **Eliminar asset**: Botón de papelera en cada card
- **Publicar assets**: Botón "Publicar Seleccionados" (morado)
- **Refrescar lista**: Icono de refresh en el header del panel

##### 📜 Contratos Publicados (Panel Derecho)
- **Ver contratos**: Lista de contratos activos
- **Filtrar por partner**: Dropdown con lista de partners
  - Todos los partners
  - Ikerlan (BPNL00000002IKLN)
  - MondragonAssembly (BPNL00000000MASS)
  - Partner1 (BPNL00000001PTR1)
  - Partner2 (BPNL00000001PTR2)
  - Partner3 (BPNL00000001PTR3)
- **Eliminar contrato**: Botón de papelera en cada card
- **Refrescar lista**: Icono de refresh en el header

##### 🔒 Políticas de Acceso y Contrato (Panel Desplegable)
- **Expandir/Colapsar**: Click en el header del panel
- **Ver políticas**: Lista de políticas ACCESS y CONTRACT
- **Seleccionar política**: Click en una política para ver detalles JSON
- **Refrescar políticas**: Icono de refresh en el header

##### 📋 Registro de Operaciones (Panel Inferior)
- **Ver logs en tiempo real**: Todas las operaciones se registran
- **Limpiar logs**: Botón "Limpiar Logs"

---

### 2. Partner Data Access Dashboard

**URL**: http://localhost:3001/partner-data

**Descripción**: Dashboard para consulta y consumo de datos de partners (consumidor).

#### Funcionalidades Disponibles:

##### 🔍 Catálogo de Datos (Panel Izquierdo)
- **Solicitar catálogo**: Consultar datasets disponibles de MASS
- **Ver datasets**: Lista de datasets con información detallada
- **Seleccionar dataset**: Para iniciar negociación

##### 🤝 Negociación de Contratos (Panel Central)
- **Iniciar negociación**: A partir de un dataset seleccionado
- **Ver estado**: Estado de la negociación en tiempo real
- **Confirmar contrato**: Una vez aceptado

##### ⬇️ Transferencia de Datos (Panel Derecho)
- **Iniciar transferencia**: Con contrato confirmado
- **Monitorizar progreso**: Estado de la transferencia
- **Obtener EDR token**: Para acceso a los datos
- **Descargar datos**: Acceso final a los datos transferidos

---

## 🔄 Flujo Completo de Uso

### Escenario 1: Publicar un Asset

1. Acceder a http://localhost:3001/data-publication
2. Click en "Crear Nuevo Asset"
3. Ingresar ID del asset (ej: "mi-dataset-2026")
4. El asset aparece en el grid de Assets Publicables
5. Seleccionar el asset (checkbox)
6. Click en "Publicar Seleccionados"
7. El sistema crea automáticamente un contrato
8. El contrato aparece en "Contratos Publicados"

### Escenario 2: Consultar Catálogo de Partner

1. Acceder a http://localhost:3001/partner-data
2. En el panel "Catálogo de Datos", click en "Solicitar Catálogo"
3. El sistema consulta los datasets disponibles en MASS
4. Seleccionar un dataset de interés
5. Iniciar negociación desde el panel central
6. Esperar confirmación del contrato
7. Iniciar transferencia desde el panel derecho
8. Obtener EDR token y acceder a los datos

---

## ⏹️ Detener la Aplicación

### Detener Manualmente

En cada terminal donde arrancaste los servidores:
```bash
# Presionar Ctrl+C para detener cada proceso
```

### Script de Detención

```bash
# Crear script stop.sh
cat > stop.sh << 'EOF'
#!/bin/bash
echo "⏹️  Deteniendo POC Next..."

if [ -f .backend.pid ]; then
    kill $(cat .backend.pid) 2>/dev/null
    rm .backend.pid
    echo "✓ Backend detenido"
fi

if [ -f .frontend.pid ]; then
    kill $(cat .frontend.pid) 2>/dev/null
    rm .frontend.pid
    echo "✓ Frontend detenido"
fi

# Asegurar que los puertos estén liberados
fuser -k 5001/tcp 2>/dev/null
fuser -k 3001/tcp 2>/dev/null

echo "✅ Aplicación detenida completamente"
EOF

chmod +x stop.sh

# Ejecutar
./stop.sh
```

---

## 🔧 Troubleshooting

### Problema: Puerto ya en uso

**Error**: `EADDRINUSE: address already in use :::3001` o similar para puerto 5001

**Solución**:
```bash
# Liberar puerto 3001 (frontend)
fuser -k 3001/tcp

# Liberar puerto 5001 (backend)
fuser -k 5001/tcp

# Reintentar el lanzamiento
```

### Problema: Módulos de Python no encontrados

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Solución**:
```bash
cd src/poc_next/backend
source venv/bin/activate
pip install -r requirements.txt
```

### Problema: Dependencias de Node.js desactualizadas

**Error**: Errores al compilar el frontend

**Solución**:
```bash
cd src/poc_next/frontend
rm -rf node_modules pnpm-lock.yaml .next
pnpm install
pnpm dev
```

### Problema: Caché corrupta de Next.js

**Síntoma**: Página en blanco o errores 404 en archivos `_next/static`

**Solución**:
```bash
cd src/poc_next/frontend
rm -rf .next
pnpm dev
```

### Problema: Backend no conecta con EDC

**Síntoma**: Errores de conexión a MASS o IKLN connectors

**Solución**:
```bash
# Verificar que las URLs en .env sean correctas
cd src/poc_next/backend
cat .env | grep EDC

# Probar conectividad
curl https://edc-mass-control.51.178.34.25.nip.io/management/v3/assets
```

### Problema: Logs no aparecen en el frontend

**Síntoma**: Panel "Registro de Operaciones" vacío

**Solución**:
1. Abrir consola del navegador (F12)
2. Buscar mensajes de debug: `[Phase2]`, `[Phase3]`, `[Phase4]`
3. Verificar que el backend esté respondiendo:
   ```bash
   curl -X POST http://localhost:5001/api/phase2/list-assets
   ```

---

## 📝 Notas Adicionales

### Variables de Entorno

El backend utiliza las siguientes variables (archivo `backend/.env`):

```env
# Configuración de Conectores EDC
MASS_MANAGEMENT_URL=https://edc-mass-control.51.178.34.25.nip.io/management
MASS_DSP_URL=https://edc-mass-dsp.51.178.34.25.nip.io/api/v1/dsp
MASS_DATA_PLANE_URL=https://edc-mass-dataplane.51.178.34.25.nip.io
MASS_BPN=BPNL000000MASS

IKLN_MANAGEMENT_URL=https://edc-ikln-control.51.178.34.25.nip.io/management
IKLN_DSP_URL=https://edc-ikln-dsp.51.178.34.25.nip.io/api/v1/dsp
IKLN_DATA_PLANE_URL=https://edc-ikln-dataplane.51.178.34.25.nip.io
IKLN_BPN=BPNL00000002IKLN

# API Keys
EDC_API_KEY=tu-api-key-aqui
```

### Logs y Debugging

- **Backend logs**: Se muestran en la terminal donde se ejecuta `python3 main.py`
- **Frontend logs**: 
  - Consola del navegador (F12 → Console)
  - Terminal donde se ejecuta `pnpm dev`
- **Panel de operaciones**: Logs en tiempo real en la interfaz web

### Arquitectura de Red

```
┌─────────────────┐         ┌──────────────────┐
│   Frontend      │ ──────▶ │    Backend       │
│  Next.js:3001   │  HTTP   │  FastAPI:5001    │
└─────────────────┘         └──────────────────┘
                                     │
                                     │ HTTPS
                                     ▼
                            ┌──────────────────┐
                            │   EDC Connectors │
                            │  MASS & IKLN     │
                            └──────────────────┘
```

---

## 🆘 Soporte

Para problemas o dudas:
1. Revisar esta guía de troubleshooting
2. Consultar los logs del backend y frontend
3. Verificar el estado de los conectores EDC
4. Contactar con el equipo de desarrollo

---

**Última actualización**: 21 de abril de 2026
**Versión**: 1.0.0
