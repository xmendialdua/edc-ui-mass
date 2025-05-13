from fastapi import FastAPI, Request, HTTPException
from app.routes import mlflow, flower

import logging

app = FastAPI()

# Registrar los routers de cada módulo
app.include_router(mlflow.router, prefix="/mlflow", tags=["MLflow"])
app.include_router(flower.router, prefix="/flower", tags=["Flower"])

# Configurar el logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.post("/listener")
async def receive_data_transfer(request: Request):
    """Recibe cualquier POST y muestra el cuerpo en los logs."""

    try:
        data = await request.json()
    except Exception:
        data = await request.body()  # fallback por si no es JSON válido
        data = data.decode("utf-8")  # convertir de bytes a string

    logger.info("Datos recibidos en /listener:")
    logger.info(data)

    return {"message": "Transferencia recibida exitosamente."}

@app.get("/")
def root():
    return {"message": "API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
