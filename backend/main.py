from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import os

app = FastAPI()

# Frontend (React/Vite) erişimi için CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model dosyalarının yolları
MODEL_PATH = "weather_model.pkl"
SCALER_PATH = "scaler.pkl"
LABELS_PATH = "labels.pkl"

# Dosyaları yükleme (Hata kontrolü ile birlikte)
try:
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH) and os.path.exists(LABELS_PATH):
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        labels = joblib.load(LABELS_PATH)
        print("✅ Tüm model dosyaları başarıyla yüklendi.")
    else:
        print("❌ HATA: Model dosyaları eksik! Lütfen .pkl dosyalarını backend klasörüne kopyalayın.")
except Exception as e:
    print(f"❌ Dosya yükleme hatası: {e}")

# Frontend'den gelecek veri yapısı
class WeatherInput(BaseModel):
    temperature: float
    humidity: float
    wind_speed: float
    precipitation: float
    cloud_cover: int
    atmospheric_pressure: float
    uv_index: int
    season: int
    visibility: float
    location: int

@app.get("/")
def home():
    return {"message": "Hava Durumu Tahmin API'si Aktif"}

@app.post("/predict")
async def predict(data: WeatherInput):
    try:
        # 1. Gelen verileri listeye çevir
        input_list = [
            data.temperature, data.humidity, data.wind_speed, data.precipitation,
            data.cloud_cover, data.atmospheric_pressure, data.uv_index,
            data.season, data.visibility, data.location
        ]
        
        # 2. Numpy array'e dönüştür (2D formatında)
        input_features = np.array([input_list])
        
        # 3. Scaler ile veriyi normalize et
        scaled_features = scaler.transform(input_features)
        
        # 4. Model ile tahmin yap
        prediction = model.predict(scaled_features)
        
        # 5. Sayısal sonucu metin etiketine çevir
        # labels genellikle bir list veya dict olur: labels[0] -> "Cloudy" gibi
        weather_type = labels[prediction[0]]
        
        return {"weather_type": weather_type}

    except Exception as e:
        print(f"Prediction Error: {e}")
        raise HTTPException(status_code=500, detail="Tahmin yapılırken bir hata oluştu.")

if __name__ == "__main__":
    import uvicorn
    # Uygulamayı 8000 portunda başlat
    uvicorn.run(app, host="127.0.0.1", port=8000)