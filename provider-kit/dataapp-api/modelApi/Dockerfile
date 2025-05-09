# Usa la imagen base de Python
FROM python:3.10.13-slim

# Establece el directorio de trabajo
WORKDIR /code

# Copia el archivo requirements.txt al directorio de trabajo
COPY ./requirements.txt /code/requirements.txt

# Actualiza pip
RUN pip install --upgrade pip

# Instala las dependencias del proyecto desde requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copia la aplicación al directorio de trabajo
COPY ./app /code/app

# Instala CURL
RUN apt-get update && apt-get install -y curl

# Crea un directorio llamado "data"
RUN mkdir -p /tmp/airflowtmpjgiydwn6

# Comando para ejecutar la aplicación
CMD ["uvicorn", "app.main:app", "--proxy-headers", "--host", "0.0.0.0", "--port", "380"]
