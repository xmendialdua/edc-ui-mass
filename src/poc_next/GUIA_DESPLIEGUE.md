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

### Opción 1: Scripts Automatizados (Recomendado)

La forma más sencilla de iniciar la aplicación es usando los scripts automatizados que gestionan ambos servicios (Backend + Frontend).

#### Iniciar la Aplicación

```bash
cd /home/xmendialdua/projects/assembly/iflex/src/poc_next
./start.sh
```

**El script realiza automáticamente:**
- ✅ Verifica requisitos (Python 3.9+, Node.js 18.19+, pnpm 10+)
- ✅ Detecta y limpia puertos ocupados (5001, 3001)
- ✅ Configura entornos virtuales y dependencias
- ✅ Inicia el backend y espera a que esté operativo
- ✅ Inicia el frontend y verifica disponibilidad
- ✅ Muestra URLs de acceso y estado de los servicios
- ✅ Guarda logs en `backend.log` y `frontend.log`
- ✅ Maneja Ctrl+C para detención limpia

**Salida esperada:**
```
════════════════════════════════════════════════════════
   🚀 Iniciando POC Next - Dashboard de Tractus-X
════════════════════════════════════════════════════════

📋 Verificando requisitos...
✓ Python 3.9.x encontrado
✓ Node.js v18.19.x encontrado
✓ pnpm 10.x encontrado

🔍 Verificando puertos...
✓ Puertos disponibles

📡 Configurando Backend (FastAPI)...
✓ Iniciando servidor backend en puerto 5001...
   Esperando a que el backend esté listo........
✓ Backend operativo en http://localhost:5001

🎨 Configurando Frontend (Next.js)...
✓ Iniciando servidor frontend en puerto 3001...
   Esperando a que el frontend esté listo......
✓ Frontend operativo en http://localhost:3001

════════════════════════════════════════════════════════
   ✅ POC Next iniciado correctamente
════════════════════════════════════════════════════════

📍 URLs disponibles:
   ● Backend API:        http://localhost:5001
   ● Health Check:       http://localhost:5001/health
   ● API Docs:           http://localhost:5001/docs

   ● Data Publication:   http://localhost:3001/data-publication
   ● Partner Data:       http://localhost:3001/partner-data

📝 Logs:
   Backend:  tail -f backend.log
   Frontend: tail -f frontend.log

⏹️  Para detener: Ctrl+C o ejecuta ./stop.sh

═══════════════════════════════════════════════════════
   Presiona Ctrl+C para detener los servicios
═══════════════════════════════════════════════════════
```

#### Reiniciar la Aplicación

Para reiniciar ambos servicios:

```bash
cd /home/xmendialdua/projects/assembly/iflex/src/poc_next
./restart.sh
```

Este script ejecuta automáticamente `stop.sh` seguido de `start.sh`.

#### Ver Logs en Tiempo Real

Durante la ejecución, los logs se guardan en archivos:

```bash
# Ver logs del backend
tail -f backend.log

# Ver logs del frontend
tail -f frontend.log

# Ver ambos simultáneamente
tail -f backend.log frontend.log
```

---

### Opción 2: Lanzamiento Manual (Para Desarrollo/Debug)

Si prefieres iniciar cada servicio manualmente para debugging:

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

---

### Verificación del Lanzamiento

Una vez iniciados los servidores, verifica que estén funcionando correctamente:

```bash
# Verificar backend
curl http://localhost:5001/health
# Debe devolver: {"status":"healthy"}

# Verificar API docs
curl -I http://localhost:5001/docs
# Debe devolver: HTTP/1.1 200 OK

# Verificar frontend
curl -I http://localhost:3001/data-publication
# Debe devolver: HTTP/1.1 200 OK
```

**Verificar puertos en uso:**

```bash
# Ver procesos en puerto 5001 (Backend)
lsof -i :5001

# Ver procesos en puerto 3001 (Frontend)
lsof -i :3001
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

### Opción 1: Detener con Script (Recomendado)

Para detener ambos servicios de forma limpia:

```bash
cd /home/xmendialdua/projects/assembly/iflex/src/poc_next
./stop.sh
```

**El script realiza automáticamente:**
- ✅ Detiene el backend por PID guardado
- ✅ Detiene el frontend por PID guardado
- ✅ Libera los puertos 5001 y 3001
- ✅ Limpia procesos huérfanos (uvicorn, next-server)
- ✅ Verifica que los puertos queden liberados
- ✅ Elimina archivos temporales (.backend.pid, .frontend.pid)

**Salida esperada:**
```
════════════════════════════════════════════════════════
   ⏹️  Deteniendo POC Next
════════════════════════════════════════════════════════

📡 Deteniendo Backend...
⏹️  Deteniendo Backend (PID: 12345)...
✓ Backend detenido correctamente
✓ Puerto 5001 liberado

🎨 Deteniendo Frontend...
⏹️  Deteniendo Frontend (PID: 12346)...
✓ Frontend detenido correctamente
✓ Puerto 3001 liberado

🧹 Limpiando procesos huérfanos...
✓ Limpieza completada

════════════════════════════════════════════════════════
   ✅ POC Next detenido correctamente
      (2 servicio(s) detenido(s))
════════════════════════════════════════════════════════

📊 Estado de puertos:
   ✓ Puerto 5001 (Backend): Libre
   ✓ Puerto 3001 (Frontend): Libre
```

### Opción 2: Detener con Ctrl+C

Si iniciaste la aplicación con `./start.sh`, puedes detenerla presionando:

```
Ctrl+C
```

El script `start.sh` captura la señal y ejecuta una detención limpia automáticamente.

### Opción 3: Detener Manualmente

Si iniciaste los servicios manualmente en terminales separadas:

```bash
# En cada terminal donde arrancaste los servidores:
Ctrl+C
```

### Verificar que los Servicios se Detuvieron

```bash
# Verificar que no haya procesos en los puertos
lsof -i :5001  # Debe estar vacío
lsof -i :3001  # Debe estar vacío

# Verificar procesos de Python/Node relacionados
ps aux | grep uvicorn
ps aux | grep next-server
```

### Forzar Detención de Puertos (Si es necesario)

Si los puertos siguen ocupados después de ejecutar `stop.sh`:

```bash
# Liberar puerto 5001 (Backend)
kill $(lsof -t -i:5001) 2>/dev/null
# o
fuser -k 5001/tcp

# Liberar puerto 3001 (Frontend)
kill $(lsof -t -i:3001) 2>/dev/null
# o
fuser -k 3001/tcp
```

---

## 🔧 Troubleshooting

### Problema: Puerto ya en uso

**Error**: `EADDRINUSE: address already in use :::3001` o similar para puerto 5001

**Causa**: Hay una instancia previa de la aplicación corriendo.

**Solución 1 (Recomendada)**: Usar el script de detención
```bash
cd /home/xmendialdua/projects/assembly/iflex/src/poc_next
./stop.sh
./start.sh
```

**Solución 2**: Liberar puertos manualmente
```bash
# Liberar puerto 3001 (frontend)
kill $(lsof -t -i:3001) 2>/dev/null
# o
fuser -k 3001/tcp

# Liberar puerto 5001 (backend)
kill $(lsof -t -i:5001) 2>/dev/null
# o
fuser -k 5001/tcp

# Reintentar el lanzamiento
./start.sh
```

**Solución 3**: Dejar que el script lo maneje
```bash
./start.sh
# El script detectará los puertos ocupados y preguntará si deseas detener los procesos
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

### Problema: El script start.sh no se puede ejecutar

**Error**: `bash: ./start.sh: Permission denied`

**Solución**:
```bash
cd /home/xmendialdua/projects/assembly/iflex/src/poc_next
chmod +x start.sh stop.sh restart.sh
./start.sh
```

---

### Problema: Backend no responde después de iniciar

**Síntoma**: El script `start.sh` se queda esperando en "Esperando a que el backend esté listo..."

**Solución**:
```bash
# 1. Revisar el log del backend
cat backend.log

# 2. Verificar el entorno virtual
cd backend
source venv/bin/activate
python3 -c "import fastapi; print('FastAPI OK')"

# 3. Verificar el archivo .env
cat .env

# 4. Intentar arrancar manualmente para ver el error
python3 main.py
```

---

### Problema: Frontend no compila

**Síntoma**: El script se queda esperando en "Esperando a que el frontend esté listo..."

**Solución**:
```bash
# 1. Revisar el log del frontend
cat frontend.log

# 2. Verificar dependencias
cd frontend
pnpm install

# 3. Limpiar caché y reconstruir
rm -rf .next node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

---

### Problema: Procesos zombies o huérfanos

**Síntoma**: Después de detener la aplicación, los puertos siguen ocupados

**Solución**:
```bash
# Ejecutar el script de detención (ya incluye limpieza de zombies)
./stop.sh

# Si persiste, buscar y matar procesos manualmente
ps aux | grep uvicorn
ps aux | grep next-server

# Matar todos los procesos de uvicorn en puerto 5001
ps aux | grep "uvicorn.*5001" | awk '{print $2}' | xargs kill -9

# Matar todos los procesos de next-server en puerto 3001
ps aux | grep "next-server.*3001" | awk '{print $2}' | xargs kill -9
```

---

### Problema: Backend no conecta con EDC

**Síntoma**: Errores de conexión a MASS o IKLN connectors

**Solución**:
```bash
# Verificar que las URLs en .env sean correctas
cd backend
cat .env | grep EDC

# Probar conectividad
curl https://edc-mass-control.51.178.34.25.nip.io/management/v3/assets

# Verificar el API Key
echo $EDC_API_KEY
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

#### Archivos de Log

Cuando usas los scripts automatizados, los logs se guardan en:

- **backend.log**: Logs del servidor FastAPI/Uvicorn
- **frontend.log**: Logs del servidor Next.js

```bash
# Ver logs en tiempo real
tail -f backend.log
tail -f frontend.log

# Ver ambos simultáneamente
tail -f backend.log frontend.log

# Buscar errores en los logs
grep -i error backend.log
grep -i error frontend.log
```

#### Otras Fuentes de Logs

- **Logs en terminal**: Si inicias manualmente, los logs aparecen directamente en la terminal
- **Logs del navegador**: 
  - Consola del navegador (F12 → Console)
  - Network tab para ver requests HTTP
- **Panel de operaciones**: Logs en tiempo real en la interfaz web (Dashboard)

#### Limpiar Logs

```bash
# Limpiar logs antiguos
cd /home/xmendialdua/projects/assembly/iflex/src/poc_next
rm -f backend.log frontend.log
```

#### Archivos Temporales

Los scripts crean archivos temporales que se limpian automáticamente:

- `.backend.pid`: PID del proceso backend
- `.frontend.pid`: PID del proceso frontend

Estos archivos se eliminan automáticamente al ejecutar `./stop.sh` o presionar Ctrl+C.

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

## 📚 Scripts Disponibles

La aplicación incluye tres scripts principales para gestionar el ciclo de vida:

### start.sh - Iniciar la Aplicación

```bash
./start.sh
```

**Características completas:**
- Verifica requisitos del sistema (Python, Node.js, pnpm)
- Detecta puertos ocupados y ofrece liberarlos
- Configura entornos virtuales automáticamente
- Instala/actualiza dependencias si es necesario
- Inicia backend con verificación de health check
- Inicia frontend con verificación de disponibilidad
- Guarda PIDs para detención posterior
- Genera logs en archivos separados
- Maneja Ctrl+C para detención limpia

### stop.sh - Detener la Aplicación

```bash
./stop.sh
```

**Características completas:**
- Detiene procesos por PID guardado
- Detiene procesos por puerto si PID no disponible
- Limpia procesos huérfanos (uvicorn, next-server)
- Libera puertos 5001 y 3001
- Elimina archivos temporales (.pid)
- Verifica que los puertos queden libres

### restart.sh - Reiniciar la Aplicación

```bash
./restart.sh
```

Equivalente a ejecutar `./stop.sh` seguido de `./start.sh`.

---

## 🔄 Comandos Útiles

### Verificar Estado de Servicios

```bash
# Verificar que el backend está corriendo
curl http://localhost:5001/health

# Verificar que el frontend está corriendo
curl http://localhost:3001

# Ver procesos activos
ps aux | grep uvicorn
ps aux | grep next-server

# Ver puertos en uso
lsof -i :5001
lsof -i :3001
netstat -tulpn | grep -E '5001|3001'
```

### Ver Logs en Tiempo Real

```bash
# Backend
tail -f backend.log

# Frontend
tail -f frontend.log

# Ambos
tail -f backend.log frontend.log

# Últimas 50 líneas de cada log
tail -n 50 backend.log
tail -n 50 frontend.log
```

### Reinicio Completo (Limpiar Todo)

```bash
# Detener servicios
./stop.sh

# Limpiar logs y archivos temporales
rm -f backend.log frontend.log .backend.pid .frontend.pid

# Limpiar caché de Next.js
rm -rf frontend/.next

# Reiniciar
./start.sh
```

---

## 🆘 Soporte

Para problemas o dudas:

1. **Revisar esta guía**: Especialmente la sección de [Troubleshooting](#-troubleshooting)
2. **Consultar los logs**: 
   ```bash
   tail -f backend.log frontend.log
   ```
3. **Verificar el estado de los servicios**:
   ```bash
   curl http://localhost:5001/health
   curl http://localhost:3001
   ```
4. **Reinicio limpio**:
   ```bash
   ./stop.sh && rm -f *.log && ./start.sh
   ```
5. **Verificar conectores EDC**: Comprobar que MASS e IKLN estén operativos
6. **Contactar con el equipo de desarrollo**

---

## 📖 Documentación Adicional

- **README.md**: Descripción general del proyecto
- **SCRIPTS_README.md**: Documentación detallada de los scripts de automatización
- **Backend API Docs**: http://localhost:5001/docs (cuando el backend está corriendo)

---

**Última actualización**: 21 de abril de 2026
**Versión**: 2.0.0
