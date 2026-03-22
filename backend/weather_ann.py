import os
import requests
import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import MinMaxScaler
from dotenv import load_dotenv
from contextlib import asynccontextmanager

# 1. Çevresel Değişkenleri Yükle
load_dotenv()
API_KEY = os.getenv("OPENWEATHER_API_KEY")

# Sabit Dosya Yolları
MODEL_PATH = "weather_model.pkl"
SCALER_PATH = "scaler.pkl"
LABELS_PATH = "labels.pkl"

# --- YARDIMCI FONKSİYONLAR ---

def get_training_data():
    """OpenWeather API'den eğitim verisi çeker."""
    all_data = []
    lat, lon = 41.0082, 28.9784  # İstanbul
    
    url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        res = response.json()
        
        if 'list' in res:
            for item in res['list']:
                all_data.append({
                    "temp": item['main']['temp'],
                    "humidity": item['main']['humidity'],
                    "wind": item['wind']['speed'],
                    "clouds": item['clouds']['all'],
                    "pressure": item['main']['pressure'],
                    "weather_main": item['weather'][0]['main']
                })
        return pd.DataFrame(all_data)
    except Exception as e:
        print(f"⚠️ Veri çekme hatası: {e}")
        return pd.DataFrame()

def train_model():
    """Modeli eğitir ve kaydeder. Eğer dosyalar varsa eğitimi atlar (isteğe bağlı)."""
    if not API_KEY:
        print("❌ HATA: .env dosyasında OPENWEATHER_API_KEY bulunamadı!")
        return False

    print(">>> Veriler çekiliyor ve model eğitiliyor...")
    df = get_training_data()
    
    if df.empty:
        print("❌ HATA: Veri çekilemedi. Eğitim durduruldu.")
        return False

    # Etiketleme ve Hazırlık
    df['weather_code'] = df['weather_main'].astype('category').cat.codes
    labels_list = df['weather_main'].astype('category').cat.categories.tolist()
    
    X = df[['temp', 'humidity', 'wind', 'clouds', 'pressure']]
    y = df['weather_code']
    
    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Basit bir Sinir Ağı (ANN)
    mlp = MLPClassifier(hidden_layer_sizes=(10, 10), max_iter=2000, random_state=42)
    mlp.fit(X_scaled, y)
    
    # Kayıt
    joblib.dump(mlp, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(labels_list, LABELS_PATH)
    print(f"✅ Model eğitildi. Sınıflar: {labels_list}")
    return True

# --- YAŞAM DÖNGÜSÜ ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Uygulama açılırken model dosyaları yoksa eğit
    if not os.path.exists(MODEL_PATH):
        print(">>> Model bulunamadı, eğitim başlatılıyor...")
        train_model()
    else:
        print(">>> Mevcut model dosyaları yüklendi.")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ENDPOINT'LER ---

@app.get("/")
def read_root():
    return {"status": "Hava Durumu API Çalışıyor", "model_ready": os.path.exists(MODEL_PATH)}

@app.post("/predict")
async def predict(data: dict):
    try:
        # Gerekli anahtarların varlığını kontrol et
        required_fields = ['temp', 'humidity', 'wind', 'clouds', 'pressure']
        for field in required_fields:
            if field not in data:
                raise HTTPException(status_code=400, detail=f"Eksik veri: {field}")

        # Modelleri yükle
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        labels = joblib.load(LABELS_PATH)
        
        # Giriş verisini işle
        input_array = np.array([[
            float(data['temp']), 
            float(data['humidity']), 
            float(data['wind']), 
            float(data['clouds']), 
            float(data['pressure'])
        ]])
        
        scaled = scaler.transform(input_array)
        prediction_idx = model.predict(scaled)[0]
        
        return {
            "prediction": labels[prediction_idx],
            "confidence": float(np.max(model.predict_proba(scaled))) # Güven oranı ekledik
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)