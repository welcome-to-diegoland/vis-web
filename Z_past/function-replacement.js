// Para reemplazar en script.js - función optimizada con caché

// Función para cargar datos de un Item Group específico (MÉTODO OPTIMIZADO CON CACHÉ)
async function loadItemGroupFromDatabase(itemGroupId) {
  const totalStartTime = performance.now();
  
  try {
    console.log(`🚀 Obteniendo Item Group ${itemGroupId} del caché...`);
    
    // MÉTODO CACHÉ: Obtener del caché (súper rápido después de la primera carga)
    const cachedData = await getItemGroupFromCache(itemGroupId);
    
    if (cachedData && cachedData.length > 0) {
      const totalTime = performance.now() - totalStartTime;
      console.log(`✅ Datos obtenidos del caché en ${totalTime.toFixed(2)}ms`);
      console.log(`📊 Filas obtenidas del caché: ${cachedData.length}`);
      return cachedData;
    }
    
    // FALLBACK: Si no hay caché, usar el método directo (lento)
    console.log(`⚠️ Caché vacío, usando método directo como fallback...`);
    
    const directUrl = `${GOOGLE_SHEETS_CONFIG.DATA_PROXY_URL}?action=getItemGroupData&itemGroupId=${itemGroupId}&timestamp=${Date.now()}`;
    
    console.log(`🔗 Llamando a Apps Script (método directo): ${directUrl}`);
    
    const fetchStartTime = performance.now();
    const directResponse = await fetch(directUrl, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Accept': 'text/csv,text/plain,application/json,*/*'
      },
      timeout: 15000  // Timeout para método directo
    });
    const fetchEndTime = performance.now();
    console.log(`⏱️ Tiempo de FETCH (directo): ${(fetchEndTime - fetchStartTime).toFixed(2)}ms`);
    
    if (directResponse.ok) {
      const parseStartTime = performance.now();
      const directData = await directResponse.text();
      console.log(`✅ Método directo exitoso, parseando datos...`);
      console.log(`📏 Tamaño de datos (directo): ${directData.length} caracteres`);
      
      const parsedDirectData = parseCSVToObjects(directData, 'data');
      const parseEndTime = performance.now();
      console.log(`📊 Filas cargadas (método directo): ${parsedDirectData.length}`);
      console.log(`⏱️ Tiempo de PARSING CSV: ${(parseEndTime - parseStartTime).toFixed(2)}ms`);
      
      return parsedDirectData;
    }
    
    throw new Error(`Método directo falló: ${directResponse.status}`);
    
  } catch (error) {
    console.error(`❌ Error en loadItemGroupFromDatabase:`, error);
    throw error;
  }
}