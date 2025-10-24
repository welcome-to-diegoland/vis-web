/**
 * Google Apps Script Proxy para vis-web con filtrado por Item Groups
 * Sirve datos de Google Sheets con CORS habilitado y filtrado inteligente
 * 
 * INSTRUCCIONES PARA IMPLEMENTAR:
 * 1. Ve a script.google.com
 * 2. Crea un nuevo proyecto
 * 3. Reemplaza el código por defecto con TODO este código
 * 4. Guarda el proyecto con nombre "VIS Web Data Proxy Fixed"
 * 5. Ve a Implementar > Nueva implementación
 * 6. Tipo: Aplicación web
 * 7. Ejecutar como: Yo
 * 8. Acceso: Cualquier persona
 * 9. Copia la URL de la aplicación web que te den
 * 10. Reemplaza la URL en script.js línea 42 (DATA_PROXY_URL)
 * 
 * URLs de ejemplo: 
 * - Obtener todo: https://tu_url/exec?sheet=data&format=csv
 * - Filtrar por Item Group: https://tu_url/exec?action=getItemGroupData&itemGroupId=216627
 */

function doGet(e) {
  try {
    // Obtener parámetros
    const action = e.parameter.action;
    const itemGroupId = e.parameter.itemGroupId;
    const sheetName = e.parameter.sheet || 'data';
    const format = e.parameter.format || 'csv';
    
    console.log(`📊 Solicitud recibida: action=${action}, itemGroupId=${itemGroupId}, sheet=${sheetName}, format=${format}`);
    
    // ID de tu Google Sheet - DOCUMENTO 2 (base de datos)
    const SPREADSHEET_ID = '1uD6eUpDiDheO8aplzwzOz-d8fr4D8eoc8tcqJj04p4o';
    
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
    
    // Si es una acción de filtrado por Item Group
    if (action === 'getItemGroupData' && itemGroupId) {
      console.log(`🔍 Filtrando por Item Group: ${itemGroupId}`);
      return getItemGroupData(values, itemGroupId, format);
    }
    
    // Solicitud normal - devolver todos los datos
    console.log(`✅ Datos obtenidos: ${values.length} filas, ${values[0].length} columnas`);
    return formatResponse(values, sheetName, format);
      
  } catch (error) {
    console.error('❌ Error en doGet:', error);
    
    // Respuesta de error simple
    const errorResponse = {
      success: false,
      error: error.toString(),
      sheet: e.parameter.sheet || 'unknown',
      action: e.parameter.action || 'none',
      itemGroupId: e.parameter.itemGroupId || 'none',
      timestamp: new Date().toISOString()
    };
    
    const response = ContentService
      .createTextOutput(JSON.stringify(errorResponse, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
    
    return response;
  }
}

/**
 * Función especializada para filtrar datos por Item Group
 * Busca el itemGroupId DENTRO de la columna "Item Groups" que puede contener valores concatenados
 */
function getItemGroupData(allValues, itemGroupId, format) {
  console.log(`🔍 Iniciando filtrado para Item Group: ${itemGroupId}`);
  
  const headers = allValues[0];
  const dataRows = allValues.slice(1);
  
  // Encontrar el índice de la columna "Item Groups"
  const itemGroupsColumnIndex = headers.findIndex(header => 
    header && header.toString().toLowerCase().includes('item groups')
  );
  
  if (itemGroupsColumnIndex === -1) {
    throw new Error('Columna "Item Groups" no encontrada');
  }
  
  console.log(`📍 Columna "Item Groups" encontrada en índice: ${itemGroupsColumnIndex}`);
  console.log(`📍 Header de la columna: "${headers[itemGroupsColumnIndex]}"`);
  
  // Filtrar filas que contengan el itemGroupId en la columna Item Groups
  const filteredRows = dataRows.filter(row => {
    const itemGroupsValue = row[itemGroupsColumnIndex];
    
    if (!itemGroupsValue) {
      return false;
    }
    
    // Convertir a string y buscar el ID dentro del valor
    const itemGroupsStr = itemGroupsValue.toString().trim();
    
    // Buscar el ID como:
    // - Valor exacto: "216627"
    // - Al inicio: "216627, 32195"
    // - En el medio: "32195, 216627, 12345"
    // - Al final: "32195, 216627"
    const searchPattern = new RegExp(`(^|,\\s*)${itemGroupId}(\\s*,|$)`);
    const found = searchPattern.test(itemGroupsStr);
    
    // Solo loggear algunos ejemplos para evitar spam
    if (found && filteredRows.length < 5) {
      console.log(`✅ Encontrado: "${itemGroupsStr}" contiene ${itemGroupId}`);
    }
    
    return found;
  });
  
  console.log(`🎯 Filtrado completado: ${filteredRows.length} filas encontradas de ${dataRows.length} totales`);
  
  // Crear el array completo con headers
  const resultValues = [headers, ...filteredRows];
  
  // Formatear y devolver la respuesta
  return formatResponse(resultValues, `data_filtered_${itemGroupId}`, format);
}

/**
 * Función para formatear la respuesta en el formato solicitado
 */
function formatResponse(values, sheetIdentifier, format) {
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
      sheet: sheetIdentifier,
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
  
  // Crear respuesta con CORS básico (método simplificado)
  const response = ContentService
    .createTextOutput(output)
    .setMimeType(mimeType);
  
  return response;
}

/**
 * Manejar peticiones OPTIONS para CORS preflight
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('');
}

/**
 * Función de prueba para verificar el filtrado
 */
function testItemGroupFiltering() {
  // Simular datos de prueba
  const testValues = [
    ['Item Groups', 'ID', 'Object Type', 'Attribute', 'value'],
    ['32195, 216627', 'IG-001', 'Item Group', 'Name', 'Test Item 1'],
    ['216627', 'IG-002', 'Item Group', 'Name', 'Test Item 2'],
    ['12345, 216627, 67890', 'IG-003', 'Item Group', 'Name', 'Test Item 3'],
    ['32195', 'IG-004', 'Item Group', 'Name', 'Test Item 4'],
    ['216627, 99999', 'IG-005', 'Item Group', 'Name', 'Test Item 5']
  ];
  
  console.log('🧪 Iniciando prueba de filtrado...');
  
  // Probar filtrado
  const result = getItemGroupData(testValues, '216627', 'json');
  
  console.log('🧪 Resultado de la prueba:', result.getContent());
}

/**
 * Función de prueba para la funcionalidad completa
 */
function testCompleteFlow() {
  const mockEvent = {
    parameter: {
      action: 'getItemGroupData',
      itemGroupId: '216627',
      format: 'csv'
    }
  };
  
  console.log('🧪 Iniciando prueba completa...');
  
  // Ejecutar la función principal (esto fallará si no tienes los datos reales)
  try {
    const result = doGet(mockEvent);
    console.log('🧪 Test completo exitoso:', result.getContent().substring(0, 200) + '...');
  } catch (error) {
    console.log('🧪 Test completo falló (esperado sin datos reales):', error.toString());
  }
}