import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Bileşenleri İçe Aktar
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import CurrentWeather from './components/CurrentWeather';
import Forecast from './components/Forecast';

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

const IMPORTANT_CITIES = [
  "Adana", "Ankara", "Antalya", "Bursa", "Diyarbakır", "Erzurum", "Gaziantep",
  "İstanbul", "İzmir", "Kayseri", "Konya", "Trabzon", "Amsterdam", "Atina",
  "Bakü", "Berlin", "Dubai", "Londra", "Moskova", "New York", "Paris",
  "Roma", "Tokyo", "Seul", "Pekin", "Madrid"
].sort((a, b) => a.localeCompare(b));

function App() {
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [aiPrediction, setAiPrediction] = useState(null); // Yapay Zeka State'i
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [globalCities, setGlobalCities] = useState([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [isCelsius, setIsCelsius] = useState(true);

  // --- API VE ARAMA FONKSİYONLARI ---
  useEffect(() => {
    const fetchGlobalCities = async () => {
      if (searchQuery.length >= 3) {
        setIsSearchingGlobal(true);
        try {
          const res = await axios.get(`https://api.openweathermap.org/geo/1.0/direct?q=${searchQuery}&limit=10&appid=${API_KEY}`);
          const uniqueCities = res.data.map(item => ({
            name: item.name, state: item.state || "", country: item.country, lat: item.lat, lon: item.lon
          }));
          setGlobalCities(uniqueCities);
        } catch (error) { console.error("Arama hatası:", error); }
        finally { setIsSearchingGlobal(false); }
      } else { setGlobalCities([]); }
    };
    const delayDebounceFn = setTimeout(() => { fetchGlobalCities(); }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const filteredImportantCities = IMPORTANT_CITIES.filter(city =>
    city.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'))
  );

  const fetchWeatherByCoords = async (lat, lon, cityName = null) => {
    setLoading(true); setShowDropdown(false); setSearchQuery(""); setAiPrediction(null);
    try {
      // 1. Güncel Hava Durumu
      const currentRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=tr`);

      const currentWeatherData = {
        name: cityName || currentRes.data.name, temp: currentRes.data.main.temp, feels_like: currentRes.data.main.feels_like,
        humidity: currentRes.data.main.humidity, wind: currentRes.data.wind.speed, clouds: currentRes.data.clouds.all,
        pressure: currentRes.data.main.pressure, weatherMain: currentRes.data.weather[0].main, desc: currentRes.data.weather[0].description,
        iconCode: currentRes.data.weather[0].icon
      };
      setWeatherData(currentWeatherData);

      // 2. Yapay Zeka Modelinize İstek (Localhost veya Render)
      try {
        const aiRes = await axios.post(`${import.meta.env.VITE_API_URL}/predict`, {
          temp: currentWeatherData.temp,
          humidity: currentWeatherData.humidity,
          wind: currentWeatherData.wind,
          clouds: currentWeatherData.clouds,
          pressure: currentWeatherData.pressure
        });
        setAiPrediction(aiRes.data.prediction);
      } catch (aiError) {
        console.error("Yapay Zeka API Hatası:", aiError);
        setAiPrediction("Model Bağlantı Hatası");
      }

      // 3. 5 Günlük Tahmin
      const forecastRes = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=tr`);

      const dailyData = {};
      forecastRes.data.list.forEach(item => {
        const date = item.dt_txt.split(" ")[0];
        if (!dailyData[date]) {
          dailyData[date] = { ...item };
        } else {
          if (item.main.temp_max > dailyData[date].main.temp_max) {
            dailyData[date].main.temp_max = item.main.temp_max;
          }
          if (item.dt_txt.includes("12:00:00") || item.dt_txt.includes("15:00:00")) {
            dailyData[date].weather = item.weather;
          }
        }
      });

      const today = new Date().toISOString().split('T')[0];
      const next5Days = Object.values(dailyData).filter(item => !item.dt_txt.startsWith(today)).slice(0, 5);

      setForecastData(next5Days);
    } catch (err) { alert("Veri çekilemedi."); }
    finally { setLoading(false); }
  };

  const fetchWeatherByCityName = async (cityName) => {
    setLoading(true); setShowDropdown(false); setSearchQuery("");
    try {
      const geoRes = await axios.get(`https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${API_KEY}`);
      if (geoRes.data.length > 0) fetchWeatherByCoords(geoRes.data[0].lat, geoRes.data[0].lon, geoRes.data[0].name);
      else { alert("Şehir bulunamadı."); setLoading(false); }
    } catch (err) { setLoading(false); }
  };

  const handleLocationClick = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setIsLocating(false); fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude); },
      () => { setIsLocating(false); alert("Konum izni reddedildi."); }, { timeout: 10000 }
    );
  };

  const formatTemp = (tempInCelsius) => isCelsius ? Math.round(tempInCelsius) : Math.round((tempInCelsius * 9 / 5) + 32);

  // --- ARKAPLAN GÖRSELİ MANTIĞI ---
  const getBackground = () => {
    // 1. Henüz veri çekilmediyse gösterilecek standart renkler
    // DÜZELTME: Açık tema için backgroundImage formatına uygun linear-gradient eklendi
    if (!weatherData) {
      return isDarkMode
        ? "linear-gradient(to bottom right, #040d1f, #0b1a38)"
        : "linear-gradient(to bottom right, #d8fafa, #d4fafa)";
    }

    // 2. İkon koduna göre KESİN ve SADE eşleşme
    if (weatherData.iconCode) {
      const prefix = weatherData.iconCode.slice(0, 2);

      switch (prefix) {
        case '01': return "url('/pic/clear.jpg')";
        case '02': return "url('/pic/littlecloud.jpg')";
        case '03':
        case '04': return "url('/pic/cloud.jpg')";
        case '09':
        case '10': return "url('/pic/rain.jpg')";
        case '11': return "url('/pic/thunderstorm.jpg')";
        case '13': return "url('/pic/snow.jpg')";
        case '50': return "url('/pic/mist.jpg')";
      }
    }

    // 3. Fallback: Eğer iconCode gelmezse kelimeye göre arar
    const condition = weatherData.weatherMain.toLowerCase();

    if (condition.includes("thunderstorm")) return "url('/pic/thunderstorm.jpg')";
    if (condition.includes("rain") || condition.includes("drizzle")) return "url('/pic/rain.jpg')";
    if (condition.includes("snow")) return "url('/pic/snow.jpg')";
    if (condition.includes("clear")) return "url('/pic/clear.jpg')";

    const description = weatherData.desc ? weatherData.desc.toLowerCase() : "";
    if (description.includes("az bulutlu") || description.includes("parçalı") || description.includes("partly")) {
      return "url('/pic/littlecloud.jpg')";
    } else if (condition.includes("cloud")) {
      return "url('/pic/cloud.jpg')";
    }

    if (condition.includes("mist") || condition.includes("fog")) return "url('/pic/mist.jpg')";

    // Hiçbir şart uymazsa standart dönüş
    // DÜZELTME: Burası da açık tema için uygun formatla değiştirildi
    return isDarkMode
      ? "linear-gradient(to bottom right, #040d1f, #0b1a38)"
      : "linear-gradient(to bottom right, #d4fafa, #e0f2fe)";
  };
  // --- TEMA RENKLERİ ---
  const themeClasses = {
    overlayBg: weatherData ? "bg-black/20" : "bg-transparent",

    // İNCE AYAR: Light mode kard arka planı beyazdan #d4fafa açık mavi rengine çevrildi
    cardBg: isDarkMode ? "bg-[#0b1a38]/80 border-[#1e3a8a]/50 text-white" : "bg-[#d5fafa]/90 border-cyan-200 text-[#1e3a8a]",

    subText: isDarkMode ? "text-gray-300" : "text-slate-600",

    // Arama kutusu ve açılır menü (dropdown) renkleri de yeni kard rengiyle uyumlu hale getirildi
    inputBg: isDarkMode ? "bg-[#040d1f]/70 text-white placeholder-gray-400 border-blue-500/30" : "bg-white/60 text-[#1e3a8a] placeholder-blue-400 border-cyan-200",
    dropdownBg: isDarkMode ? "bg-[#0b1a38] border-[#1e3a8a] text-white" : "bg-[#d4fafa] border-cyan-200 text-[#1e3a8a]",

    hoverBg: isDarkMode ? "hover:bg-blue-500/20" : "hover:bg-cyan-100/50",
    gradientText: isDarkMode ? "from-sky-300 to-blue-400" : "from-blue-800 to-blue-600"
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed transition-all duration-1000" style={{ backgroundImage: getBackground() }}>
      <div className={`min-h-screen ${themeClasses.overlayBg} backdrop-blur-[2px] p-4 md:p-8 flex items-center justify-center transition-colors duration-1000`}>
        <div className="max-w-6xl w-full flex flex-col gap-6">

          <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} themeClasses={themeClasses} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 flex flex-col gap-6">
              <SearchBar
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                showDropdown={showDropdown} setShowDropdown={setShowDropdown}
                handleLocationClick={handleLocationClick} isLocating={isLocating}
                isSearchingGlobal={isSearchingGlobal} globalCities={globalCities}
                filteredImportantCities={filteredImportantCities}
                fetchWeatherByCityName={fetchWeatherByCityName} fetchWeatherByCoords={fetchWeatherByCoords}
                themeClasses={themeClasses} isDarkMode={isDarkMode}
              />

              <CurrentWeather
                weatherData={weatherData} loading={loading} isLocating={isLocating}
                isCelsius={isCelsius} setIsCelsius={setIsCelsius}
                themeClasses={themeClasses} isDarkMode={isDarkMode} formatTemp={formatTemp}
                aiPrediction={aiPrediction}
              />
            </div>

            <Forecast
              forecastData={forecastData} themeClasses={themeClasses}
              isDarkMode={isDarkMode} formatTemp={formatTemp}
            />
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;