// =================================================================
// GOOGLE APPS SCRIPT - VIS WEB DATA SAVER (UNIFIED VERSION)
// =================================================================
// Este código debe copiarse en script.google.com
// 
// INSTRUCCIONES PASO A PASO:
// 1. Ve a script.google.com
// 2. Crea un nuevo proyecto
// 3. Reemplaza el código por defecto con TODO este código
// 4. Guarda el proyecto con nombre "VIS Web Data Saver - Unified"
// 5. Ve a Implementar > Nueva implementación
// 6. Tipo: Aplicación web
// 7. Ejecutar como: Yo
// 8. Acceso: Cualquier persona
// 9. Copia la URL de la aplicación web que te den
// 10. Pega esa URL en script.js línea 27 (reemplaza TU_URL_DE_APPS_SCRIPT_AQUI)
// =================================================================

function doPost(e) {
  try {
    let data;
    
    // Intentar parsear datos del cuerpo JSON primero
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonError) {
        console.log('No se pudo parsear como JSON, intentando como parámetros de formulario');
      }
    }
    
    // Si no hay datos JSON, intentar obtener de parámetros de formulario
    if (!data && e.parameter && e.parameter.postData) {
      try {
        data = JSON.parse(e.parameter.postData);
      } catch (paramError) {
        console.log('Error parsing parameter data:', paramError);
      }
    }
    
    // Si aún no hay datos, intentar directamente los parámetros
    if (!data && e.parameter) {
      // Buscar datos en cualquier parámetro que contenga JSON
      for (const [key, value] of Object.entries(e.parameter)) {
        try {
          const parsedValue = JSON.parse(value);
          if (parsedValue.user && parsedValue.records) {
            data = parsedValue;
            break;
          }
        } catch (parseError) {
          // Continuar buscando
        }
      }
    }
    
    if (!data) {
      throw new Error('No se pudieron obtener datos válidos de la petición');
    }
    
    const { user, records } = data;
    
    if (!user || !records) {
      throw new Error('Faltan datos requeridos: user o records');
    }
    
    // SIEMPRE guardar en data-update independientemente del usuario
    const sheetName = 'data-update';
    
    // Abrir el spreadsheet
    const spreadsheetId = '1uD6eUpDiDheO8aplzwzOz-d8fr4D8eoc8tcqJj04p4o';
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    let sheet = spreadsheet.getSheetByName(sheetName);
    
    // Si la sheet no existe, crearla
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      // Agregar headers
      sheet.getRange(1, 1, 1, 6).setValues([['Id', 'Object Type', 'Attribute', 'Value', 'Date', 'User']]);
    }
    
    // Encontrar la primera fila vacía
    const lastRow = sheet.getLastRow();
    let nextRow = lastRow + 1;
    
    // Si es la primera vez, empezar en fila 2 (después de headers)
    if (lastRow === 0) {
      sheet.getRange(1, 1, 1, 6).setValues([['Id', 'Object Type', 'Attribute', 'Value', 'Date', 'User']]);
      nextRow = 2;
    }
    
    // Preparar los datos para insertar
    const rowsToInsert = records.map(record => [
      record.id,
      record.objectType,
      record.attribute,
      record.value,
      record.date,
      record.user
    ]);
    
    // Insertar todas las filas de una vez
    if (rowsToInsert.length > 0) {
      sheet.getRange(nextRow, 1, rowsToInsert.length, 6).setValues(rowsToInsert);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: `Se guardaron ${rowsToInsert.length} registros en data-update`,
        recordsInserted: rowsToInsert.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =================================================================
// FUNCIÓN DE PRUEBA (OPCIONAL)
// =================================================================
// Esta función es solo para probar que todo funciona correctamente
// No es necesario usarla en producción
function testFunction() {
  // Datos de prueba
  const testData = {
    user: 'Sandra',
    records: [
      {
        id: 'TEST001',
        objectType: 'Item Group',
        attribute: 'WA_Cover_Image_01',
        value: 'test-image.jpg',
        date: '2025-10-29 15:30:00',
        user: 'Sandra'
      }
    ]
  };
  
  // Simular la llamada POST
  const e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  // Ejecutar la función
  const result = doPost(e);
  console.log('Resultado de prueba:', result.getContent());
}