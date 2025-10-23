/**
 * Google Apps Script Proxy para vis-web
 * Sirve datos de Google Sheets con CORS habilitado
 * 
 * URL de ejemplo: https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec?sheet=category
 */

function doGet(e) {
  try {
    // Obtener parámetros
    const sheetName = e.parameter.sheet || 'category';
    const format = e.parameter.format || 'csv';
    
    console.log(`📊 Solicitud recibida: sheet=${sheetName}, format=${format}`);
    
    // ID de tu Google Sheet
    const SPREADSHEET_ID = '1TU51Xxx50DX5dc_aM9X2xguGBYV_Lsaswztv7WOmoyw';
    
    // Abrir el spreadsheet
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`Pestaña '${sheetName}' no encontrada`);
    }
    
    // Obtener todos los datos
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    if (values.length === 0) {
      throw new Error(`Pestaña '${sheetName}' está vacía`);
    }
    
    console.log(`✅ Datos obtenidos: ${values.length} filas, ${values[0].length} columnas`);
    
    let output;
    let mimeType;
    
    if (format === 'json') {
      // Formato JSON
      const headers = values[0];
      const data = values.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });
      
      output = JSON.stringify({
        success: true,
        sheet: sheetName,
        rows: data.length,
        columns: headers.length,
        data: data
      }, null, 2);
      mimeType = ContentService.MimeType.JSON;
      
    } else {
      // Formato CSV (por defecto)
      output = values.map(row => 
        row.map(cell => {
          // Escapar comas y comillas en CSV
          const cellStr = String(cell || '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return '"' + cellStr.replace(/"/g, '""') + '"';
          }
          return cellStr;
        }).join(',')
      ).join('\n');
      mimeType = ContentService.MimeType.TEXT;
    }
    
    // Crear respuesta con CORS habilitado
    return ContentService
      .createTextOutput(output)
      .setMimeType(mimeType)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400', // 24 horas
        'Content-Type': format === 'json' ? 'application/json' : 'text/csv'
      });
      
  } catch (error) {
    console.error('❌ Error en doGet:', error);
    
    // Respuesta de error con CORS
    const errorResponse = {
      success: false,
      error: error.toString(),
      sheet: e.parameter.sheet || 'unknown',
      timestamp: new Date().toISOString()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(errorResponse, null, 2))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
  }
}

/**
 * Manejar peticiones OPTIONS para CORS preflight
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
}

/**
 * Función de prueba para verificar que funciona
 */
function test() {
  const mockEvent = {
    parameter: {
      sheet: 'category',
      format: 'csv'
    }
  };
  
  const result = doGet(mockEvent);
  console.log('🧪 Test result:', result.getContent().substring(0, 200) + '...');
}