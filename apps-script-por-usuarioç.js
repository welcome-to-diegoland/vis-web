// =================================================================
// GOOGLE APPS SCRIPT - VIS WEB DATA SAVER
// =================================================================
// Este código debe copiarse en script.google.com
// 
// INSTRUCCIONES PASO A PASO:
// 1. Ve a script.google.com
// 2. Crea un nuevo proyecto
// 3. Reemplaza el código por defecto con TODO este código
// 4. Guarda el proyecto con nombre "VIS Web Data Saver"
// 5. Ve a Implementar > Nueva implementación
// 6. Tipo: Aplicación web
// 7. Ejecutar como: Yo
// 8. Acceso: Cualquier persona
// 9. Copia la URL de la aplicación web que te den
// 10. Pega esa URL en script.js línea 27 (reemplaza TU_URL_DE_APPS_SCRIPT_AQUI)
// =================================================================

function doPost(e) {
  try {
    // Parsear los datos recibidos
    const data = JSON.parse(e.postData.contents);
    const { user, records } = data;
    
    // Mapeo de usuarios a nombres de sheets
    const userSheetMap = {
      'Sandra': 'vis-sandra',
      'Victor': 'vis-victor', 
      'Ximena': 'vis-ximena',
      'Carlos': 'vis-carlos',
      'Kalem': 'vis-kalem',
      'Veronica': 'vis-veronica',
      'Rossana': 'vis-rossana',
      'Carla': 'vis-carla',
      'Gabriela': 'vis-gabriela',
      'Thanya': 'vis-thanya',
      'Grecia': 'vis-grecia',
      'Cinthya': 'vis-cinthya'
    };
    
    // Obtener el nombre de la sheet
    const sheetName = userSheetMap[user];
    if (!sheetName) {
      throw new Error(`Usuario no encontrado: ${user}`);
    }
    
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
        message: `Se guardaron ${rowsToInsert.length} registros en ${sheetName}`,
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
        date: '2025-10-15 15:30:00',
        user: 'Sandra'
      }
    ]
  };
  
  // Simular la llamada POST ejecutando doPost directamente
  const e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  // Ejecutar la función doPost
  const result = doPost(e);
  console.log('Resultado de prueba:', result.getContent());
  
  // También devolver el resultado para verlo en el log
  return result.getContent();
}

function testDirectInsert() {
  try {
    Logger.log('=== INICIANDO TEST ===');
    
    // Abrir el spreadsheet directamente
    const spreadsheetId = '1uD6eUpDiDheO8aplzwzOz-d8fr4D8eoc8tcqJj04p4o';
    Logger.log('Abriendo spreadsheet:', spreadsheetId);
    
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    Logger.log('Spreadsheet abierto correctamente');
    
    let sheet = spreadsheet.getSheetByName('vis-sandra');
    Logger.log('Sheet vis-sandra encontrada:', sheet ? 'SÍ' : 'NO');
    
    // Limpiar la sheet existente o crearla
    if (sheet) {
      sheet.clear();
      Logger.log('Sheet limpiada');
    } else {
      sheet = spreadsheet.insertSheet('vis-sandra');
      Logger.log('Sheet creada');
    }
    
    // Agregar headers primero
    const headers = ['Id', 'Object Type', 'Attribute', 'Value', 'Date', 'User'];
    sheet.getRange(1, 1, 1, 6).setValues([headers]);
    Logger.log('Headers insertados:', headers);
    
    // Insertar datos de prueba en la fila 2
    const testRow = [
      'TEST001',
      'Item Group', 
      'WA_Cover_Image_01',
      'test-image.jpg',
      '2025-10-15 15:30:00',
      'Sandra'
    ];
    
    sheet.getRange(2, 1, 1, 6).setValues([testRow]);
    Logger.log('Datos insertados:', testRow);
    
    // Verificar que se insertaron
    const verificacion = sheet.getRange(1, 1, 2, 6).getValues();
    Logger.log('Verificación - Fila 1:', verificacion[0]);
    Logger.log('Verificación - Fila 2:', verificacion[1]);
    
    Logger.log('=== TEST COMPLETADO ===');
    return 'SUCCESS: Headers y datos insertados correctamente';
    
  } catch (error) {
    Logger.log('ERROR:', error.toString());
    Logger.log('Stack:', error.stack);
    return 'ERROR: ' + error.toString();
  }
}