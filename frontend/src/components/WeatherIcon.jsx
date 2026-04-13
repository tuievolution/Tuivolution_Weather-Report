import React from 'react';
import { Sun, Moon, Cloud, CloudRain, CloudLightning, Snowflake, CloudDrizzle, CloudSun, CloudFog } from 'lucide-react';

export default function WeatherIcon({ condition, iconCode, size = 48, isDarkMode = true }) {
  // İNCE AYAR: Temaya göre ikon renklerini dinamik olarak belirliyoruz
  const colors = {
    sun: isDarkMode ? "text-yellow-400" : "text-yellow-500", // Açık temada sarıyı biraz koyulaştırdık
    moon: isDarkMode ? "text-blue-200" : "text-blue-800", // Açık temada ay artık belirgin lacivert
    cloudSun: isDarkMode ? "text-yellow-200" : "text-blue-600",
    cloud: isDarkMode ? "text-gray-300" : "text-slate-600", // Açık temada bulutlar koyu gri
    rain: isDarkMode ? "text-blue-400" : "text-blue-700", // Yağmur damlaları daha koyu mavi
    lightning: isDarkMode ? "text-purple-500" : "text-purple-800",
    snow: isDarkMode ? "text-sky-200" : "text-sky-700",
    fog: isDarkMode ? "text-gray-400" : "text-slate-600",
  };

  if (iconCode) {
    const prefix = iconCode.slice(0, 2);
    const isDay = iconCode.includes('d');

    switch (prefix) {
      case '01': return isDay ? <Sun size={size} className={`${colors.sun} drop-shadow-md`} /> : <Moon size={size} className={`${colors.moon} drop-shadow-md`} />;
      case '02': return isDay ? <CloudSun size={size} className={`${colors.cloudSun} drop-shadow-md`} /> : <Cloud size={size} className={`${colors.cloud} drop-shadow-md`} />;
      case '03': 
      case '04': return <Cloud size={size} className={`${colors.cloud} drop-shadow-md`} />;
      case '09': 
      case '10': return <CloudRain size={size} className={`${colors.rain} drop-shadow-md`} />;
      case '11': return <CloudLightning size={size} className={`${colors.lightning} drop-shadow-md`} />;
      case '13': return <Snowflake size={size} className={`${colors.snow} drop-shadow-md`} />;
      case '50': return <CloudFog size={size} className={`${colors.fog} drop-shadow-md`} />;
    }
  }

  // Fallback (Eğer API'den id gelmezse)
  switch (condition?.toLowerCase()) {
    case 'clear': return <Sun size={size} className={`${colors.sun} drop-shadow-md`} />;
    case 'partly cloudy': return <CloudSun size={size} className={`${colors.cloudSun} drop-shadow-md`} />;
    case 'clouds': return <Cloud size={size} className={`${colors.cloud} drop-shadow-md`} />;
    case 'rain': return <CloudRain size={size} className={`${colors.rain} drop-shadow-md`} />;
    case 'drizzle': return <CloudDrizzle size={size} className={`${colors.rain} drop-shadow-md`} />;
    case 'thunderstorm': return <CloudLightning size={size} className={`${colors.lightning} drop-shadow-md`} />;
    case 'snow': return <Snowflake size={size} className={`${colors.snow} drop-shadow-md`} />;
    default: return <Sun size={size} className={`${colors.sun} drop-shadow-md`} />;
  }
}