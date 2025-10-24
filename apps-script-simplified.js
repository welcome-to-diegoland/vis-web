/**
 * Google Apps Script Proxy SIMPLIFICADO para vis-web
 * Versión optimizada para resolver problemas de CORS y conectividad
 * 
 * INSTRUCCIONES:
 * 1. Copia TODO este código en tu Google Apps Script
 * 2. Guarda el proyecto
 * 3. Implementa como aplicación web con acceso "Cualquier persona"
 */

function doGet(e) {
  try {
    // Obtener parámetros
    const action = e.parameter.action;
    const itemGroupId = e.parameter.itemGroupId;
    const sheetName = e.parameter.sheet || 'data';
    const format = e.parameter.format || 'csv';
    
    // ID de tu Google Sheet
    const SPREADSHEET_ID = '1uD6eUpDiDheO8aplzwzOz-d8fr4D8eoc8tcqJj04p4o';
    
    // Abrir el spreadsheet
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return createErrorResponse(`Pestaña '${sheetName}' no encontrada`);
    }
    
    // Obtener todos los datos
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    if (values.length === 0) {
      return createErrorResponse(`Pestaña '${sheetName}' está vacía`);
    }
    
    // Si es filtrado por Item Group
    if (action === 'getItemGroupData' && itemGroupId) {
      return filterByItemGroup(values, itemGroupId, format);
    }
    
    // Devolver todos los datos
    return formatData(values, sheetName, format);
      
  } catch (error) {
    return createErrorResponse(error.toString());
  }
}

/**
 * Filtrar datos por Item Group
 */
function filterByItemGroup(allValues, itemGroupId, format) {
  const headers = allValues[0];
  const dataRows = allValues.slice(1);
  
  // Encontrar columna Item Groups
  const itemGroupsColumnIndex = headers.findIndex(header => 
    header && header.toString().toLowerCase().includes('item groups')
  );
  
  if (itemGroupsColumnIndex === -1) {
    return createErrorResponse('Columna Item Groups no encontrada');
  }
  
  // Filtrar filas
  const filteredRows = dataRows.filter(row => {
    const itemGroupsValue = row[itemGroupsColumnIndex];
    if (!itemGroupsValue) return false;
    
    const itemGroupsStr = itemGroupsValue.toString().trim();
    const searchPattern = new RegExp(`(^|,\\s*)${itemGroupId}(\\s*,|$)`);
    return searchPattern.test(itemGroupsStr);
  });
  
  // Crear resultado
  const resultValues = [headers, ...filteredRows];
  return formatData(resultValues, `filtered_${itemGroupId}`, format);
}

/**
 * Formatear datos
 */
function formatData(values, identifier, format) {
  if (format === 'json') {
    const headers = values[0];
    const data = values.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
    
    const output = JSON.stringify({
      success: true,
      sheet: identifier,
      rows: data.length,
      data: data
    });
    
    return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
  } else {
    // CSV
    const output = values.map(row => 
      row.map(cell => {
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return '"' + cellStr.replace(/"/g, '""') + '"';
        }
        return cellStr;
      }).join(',')
    ).join('\n');
    
    return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * Crear respuesta de error
 */
function createErrorResponse(errorMessage) {
  const errorResponse = {
    success: false,
    error: errorMessage,
    timestamp: new Date().toISOString()
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(errorResponse))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Función de prueba rápida
 */
function testQuick() {
  const mockEvent = {
    parameter: {
      action: 'getItemGroupData',
      itemGroupId: '216627',
      format: 'csv'
    }
  };
  
  const result = doGet(mockEvent);
  console.log('Test result:', result.getContent().substring(0, 100));
}