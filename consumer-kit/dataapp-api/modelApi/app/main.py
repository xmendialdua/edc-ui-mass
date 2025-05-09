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
    """Recibe una transferencia de espacio de datos y muestra lo que se consume en los logs de la API."""

    try:
        # Leer el cuerpo de la solicitud (usualmente JSON)
        data = await request.json()

        # Mostrar en los logs los datos que se reciben
        logger.info("Recibiendo transferencia de espacio de datos con los siguientes detalles:")
        for key, value in data.items():
            logger.info(f"{key}: {value}")
        
        return {"message": "Transferencia recibida exitosamente."}
    
    except Exception as e:
        logger.error(f"Error al procesar la transferencia: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al procesar la transferencia: {str(e)}")

@app.get("/")
def root():
    return {"message": "API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
