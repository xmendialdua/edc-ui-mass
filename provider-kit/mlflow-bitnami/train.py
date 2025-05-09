import mlflow
import mlflow.sklearn
from mlflow.models import infer_signature
import numpy as np
import pandas as pd
from sklearn.linear_model import ElasticNet
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
import logging
import warnings

logging.basicConfig(level=logging.WARN)
logger = logging.getLogger(__name__)

def eval_metrics(actual, pred):
    rmse = np.sqrt(mean_squared_error(actual, pred))
    mae = mean_absolute_error(actual, pred)
    r2 = r2_score(actual, pred)
    return rmse, mae, r2

def train(in_alpha, in_l1_ratio):
    warnings.filterwarnings("ignore")
    np.random.seed(40)
    
    csv_url = "http://archive.ics.uci.edu/ml/machine-learning-databases/wine-quality/winequality-red.csv"
    try:
        data = pd.read_csv(csv_url, sep=";")
    except Exception as e:
        logger.exception("Unable to download dataset. Error: %s", e)
        return
    
    train, test = train_test_split(data)
    train_x = train.drop(["quality"], axis=1)
    test_x = test.drop(["quality"], axis=1)
    train_y = train[["quality"]]
    test_y = test[["quality"]]
    
    alpha = float(in_alpha) if in_alpha is not None else 0.5
    l1_ratio = float(in_l1_ratio) if in_l1_ratio is not None else 0.5
    
    mlflow.set_tracking_uri("http://localhost:30011")
    mlflow.set_experiment("animalDetector")
    
    with mlflow.start_run():
        model = ElasticNet(alpha=alpha, l1_ratio=l1_ratio, random_state=42)
        model.fit(train_x, train_y)
        
        predicted_qualities = model.predict(test_x)
        rmse, mae, r2 = eval_metrics(test_y, predicted_qualities)
        
        print(f"ElasticNet model (alpha={alpha}, l1_ratio={l1_ratio}):")
        print(f"  RMSE: {rmse}")
        print(f"  MAE: {mae}")
        print(f"  R2: {r2}")
        
        signature = infer_signature(train_x, model.predict(train_x))
        
        mlflow.log_param("alpha", alpha)
        mlflow.log_param("l1_ratio", l1_ratio)
        mlflow.log_metric("rmse", rmse)
        mlflow.log_metric("r2", r2)
        mlflow.log_metric("mae", mae)
        
        mlflow.sklearn.log_model(model, "model", signature=signature)

if __name__ == "__main__":
    train(0.3, 0.2)
