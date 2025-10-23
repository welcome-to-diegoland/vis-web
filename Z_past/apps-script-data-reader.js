// =================================================================
// GOOGLE APPS SCRIPT - VIS WEB DATA READER (OPTIMIZADO)
// =================================================================
// Este código maneja las peticiones de lectura de datos concatenados
// 
// INSTRUCCIONES PASO A PASO:
// 1. Ve a script.google.com
// 2. Crea un nuevo proyecto O edita el existente para DATA_PROXY_URL
// 3. Reemplaza/agrega este código
// 4. Guarda el proyecto 
// 5. Ve a Implementar > Nueva implementación (o actualizar existente)
// 6. Tipo: Aplicación web
// 7. Ejecutar como: Yo
// 8. Acceso: Cualquier persona
// 9. Copia la URL de la aplicación web
// 10. Asegúrate de que esa URL esté en DATA_PROXY_URL en script.js
// =================================================================

// CONFIGURACIÓN - Ajustar según tu documento
const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI'; // ID del documento de Google Sheets
const SHEET_NAME = 'data'; // Nombre de la pestaña con datos concatenados

/**
 * Función principal para manejar peticiones GET
 */
function doGet(e) {
  try {
    const sheet = e.parameter.sheet;
    const format = e.parameter.format || 'json';
    
    console.log('📥 Petición recibida:', { sheet, format });
    
    // Solo manejamos peticiones para 'data'
    if (sheet !== 'data') {
      return createErrorResponse('Hoja no soportada. Solo se permite: data');
    }
    
    // Obtener datos concatenados desde Google Sheets
    const data = getDataFromSheet();
    
    if (format === 'csv') {
      return createCSVResponse(data);
    } else {
      return createJSONResponse(data);
    }
    
  } catch (error) {
    console.error('❌ Error en doGet:', error);
    return createErrorResponse(`Error del servidor: ${error.toString()}`);
  }
}

/**
 * Obtener datos concatenados desde Google Sheets
 */
function getDataFromSheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error(`No se encontró la hoja "${SHEET_NAME}"`);
    }
    
    // Obtener todos los datos (incluyendo headers)
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    if (values.length === 0) {
      throw new Error('La hoja está vacía');
    }
    
    console.log(`📊 Datos obtenidos: ${values.length} filas desde ${SHEET_NAME}`);
    
    // Convertir a array de objetos
    const headers = values[0];
    const data = [];
    
    for (let i = 1; i < values.length; i++) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[i][index] || '';
      });
      
      // Solo agregar filas que tienen datos
      if (row['Item Groups'] || row['ID'] || row['data_concatenated']) {
        data.push(row);
      }
    }
    
    console.log(`✅ Datos procesados: ${data.length} filas válidas`);
    return data;
    
  } catch (error) {
    console.error('❌ Error obteniendo datos:', error);
    throw error;
  }
}

/**
 * Crear respuesta en formato CSV
 */
function createCSVResponse(data) {
  if (!data || data.length === 0) {
    return ContentService
      .createTextOutput('Item Groups,ID,Object Type,data_concatenated\n')
      .setMimeType(ContentService.MimeType.TEXT);
  }
  
  // Headers
  const headers = Object.keys(data[0]);
  let csv = headers.join(',') + '\n';
  
  // Filas de datos
  data.forEach(row => {
    const values = headers.map(header => {
      let value = row[header] || '';
      
      // Escapar comillas y comas en CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      
      return value;
    });
    
    csv += values.join(',') + '\n';
  });
  
  console.log(`📤 Enviando respuesta CSV: ${data.length} filas`);
  
  return ContentService
    .createTextOutput(csv)
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-cache'
    });
}

/**
 * Crear respuesta en formato JSON
 */
function createJSONResponse(data) {
  console.log(`📤 Enviando respuesta JSON: ${data.length} filas`);
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      data: data,
      count: data.length,
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-cache'
    });
}

/**
 * Crear respuesta de error
 */
function createErrorResponse(message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}

/**
 * Función de prueba
 */
function testReadData() {
  console.log('🧪 Probando lectura de datos...');
  
  try {
    const data = getDataFromSheet();
    console.log('✅ Datos obtenidos exitosamente:', data.length, 'filas');
    
    // Mostrar muestra de los primeros registros
    if (data.length > 0) {
      console.log('📋 Ejemplo de datos:');
      console.log('Headers:', Object.keys(data[0]));
      console.log('Primer registro:', data[0]);
      
      if (data.length > 1) {
        console.log('Segundo registro:', data[1]);
      }
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
    return null;
  }
}

// =================================================================
// INSTRUCCIONES DE CONFIGURACIÓN:
// =================================================================
// 1. Reemplaza SPREADSHEET_ID con el ID real de tu documento
// 2. Ajusta SHEET_NAME si tu pestaña no se llama 'data'
// 3. Asegúrate de que la pestaña tenga las columnas:
//    - Item Groups
//    - ID  
//    - Object Type
//    - data_concatenated
// 4. Ejecuta testReadData() para probar
// 5. Implementa como aplicación web
// =================================================================