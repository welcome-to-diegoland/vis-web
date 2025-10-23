// ========================================
// ADAPTADOR PARA DATOS CONCATENADOS EN VIS-WEB
// ========================================
// Este archivo adapta los datos concatenados de Pentaho al formato
// que espera el sistema principal de VIS-Web

/**
 * Función principal para transformar datos concatenados a formato expandido
 * @param {Array} concatenatedData - Array con datos concatenados desde Pentaho
 * @returns {Array} - Array en formato expandido compatible con el sistema actual
 */
function transformConcatenatedDataToExpanded(concatenatedData) {
  console.log('🔄 Transformando datos concatenados a formato expandido...');
  
  const expandedData = [];
  
  concatenatedData.forEach(row => {
    try {
      const expandedRows = expandSingleConcatenatedRow(row);
      expandedData.push(...expandedRows);
    } catch (error) {
      console.error('❌ Error procesando fila:', row, error);
    }
  });
  
  console.log(`✅ Transformación completada: ${concatenatedData.length} → ${expandedData.length} filas`);
  return expandedData;
}

/**
 * Expandir una sola fila concatenada a múltiples filas en formato original
 * @param {Object} concatenatedRow - Fila con data_concatenated
 * @returns {Array} - Array de filas expandidas
 */
function expandSingleConcatenatedRow(concatenatedRow) {
  const itemGroups = concatenatedRow['Item Groups'];
  const id = concatenatedRow['ID'] || concatenatedRow['Id'];
  const objectType = concatenatedRow['Object Type'];
  const dataConcatenated = concatenatedRow['data_concatenated'];
  
  // Parsear según tipo de objeto usando nuestro parser universal
  const parsedData = parseUniversalConcatenatedData(concatenatedRow);
  
  const expandedRows = [];
  
  // Agregar filas base con información del objeto
  const baseRow = {
    'Item Groups': itemGroups,
    'ID': id,
    'Object Type': objectType,
    'Id': id,
    'IdPath': id,
    'NamePath': '', // Se calculará después si es necesario
    'Name': parsedData.Name || parsedData.Título || id
  };
  
  if (objectType === 'Item Group' || objectType === 'Item Code') {
    // Expandir campos fijos
    if (parsedData.Marca) {
      expandedRows.push({
        ...baseRow,
        'Attribute': 'Marca',
        'value': parsedData.Marca
      });
    }
    
    if (parsedData.Título) {
      expandedRows.push({
        ...baseRow,
        'Attribute': 'Título',
        'value': parsedData.Título
      });
    }
    
    if (parsedData['Página de Catálogo']) {
      expandedRows.push({
        ...baseRow,
        'Attribute': 'Página de Catálogo',
        'value': parsedData['Página de Catálogo']
      });
    }
    
    if (parsedData['WA Importancia']) {
      expandedRows.push({
        ...baseRow,
        'Attribute': 'WA Importancia',
        'value': parsedData['WA Importancia']
      });
    }
    
    if (parsedData['WA_VIS_Comment']) {
      expandedRows.push({
        ...baseRow,
        'Attribute': 'WA_VIS_Comment',
        'value': parsedData['WA_VIS_Comment']
      });
    }
    
    // Expandir campos dinámicos de imágenes
    ['WA_VIS_Cover', 'WA_VIS_Gallery', 'WA_VIS_Rest'].forEach(imageField => {
      if (parsedData[imageField]) {
        expandedRows.push({
          ...baseRow,
          'Attribute': imageField,
          'value': parsedData[imageField]
        });
      }
    });
    
  } else if (objectType === 'Image') {
    // Para objetos Image, expandir Name y WA_VIS_Comment
    if (parsedData.Name) {
      expandedRows.push({
        ...baseRow,
        'Attribute': 'Name',
        'value': parsedData.Name
      });
    }
    
    if (parsedData.WA_VIS_Comment) {
      expandedRows.push({
        ...baseRow,
        'Attribute': 'WA_VIS_Comment', 
        'value': parsedData.WA_VIS_Comment
      });
    }
  }
  
  // Si no se generaron filas expandidas, agregar al menos la fila base
  if (expandedRows.length === 0) {
    expandedRows.push(baseRow);
  }
  
  return expandedRows;
}

/**
 * Función para probar la transformación con datos de ejemplo
 */
function testDataTransformation() {
  console.log('🧪 Probando transformación de datos...');
  
  // Datos de ejemplo en formato concatenado (como vienen de Pentaho)
  const testConcatenatedData = [
    {
      'Item Groups': '34948',
      'ID': '34948',
      'Object Type': 'Item Group',
      'data_concatenated': 'TTC§Brocas con Hélice Rápida Acero A.V.§19§§§WA_VIS_Cover¬§WA_VIS_Gallery¬01-004-002.jpg§WA_VIS_Rest¬'
    },
    {
      'Item Groups': '34948',
      'ID': '1583',
      'Object Type': 'Item Code',
      'data_concatenated': 'TTC§Broca Recta 1/32" Hélice Rápida TTC§19§A§§WA_VIS_Cover¬brocas_act8.jpg§WA_VIS_Gallery¬01-004-002.jpg, 01-004-002_act1.jpg, brocas_act19.jpg, brocas_act22.jpg§WA_VIS_Rest¬'
    },
    {
      'Item Groups': '14416, 14440, 14449',
      'ID': '39773',
      'Object Type': 'Image',
      'data_concatenated': '53-088-600.jpg§Bodegón | aGREGAR BODEGON DONDE VENGAN TODOS LOS TAMAÑOS COMO EN EL BLOQUE DE CATALOGO'
    }
  ];
  
  console.log('📥 Datos concatenados de entrada:', testConcatenatedData);
  
  const expandedData = transformConcatenatedDataToExpanded(testConcatenatedData);
  
  console.log('📤 Datos expandidos de salida:', expandedData);
  
  // Mostrar resumen por tipo
  const summary = {
    'Item Group': expandedData.filter(r => r['Object Type'] === 'Item Group').length,
    'Item Code': expandedData.filter(r => r['Object Type'] === 'Item Code').length,
    'Image': expandedData.filter(r => r['Object Type'] === 'Image').length
  };
  
  console.log('📊 Resumen de transformación:', summary);
  
  return expandedData;
}

// Exportar funciones para uso en el sistema principal
if (typeof window !== 'undefined') {
  // En el navegador
  window.transformConcatenatedDataToExpanded = transformConcatenatedDataToExpanded;
  window.expandSingleConcatenatedRow = expandSingleConcatenatedRow;
  window.testDataTransformation = testDataTransformation;
}

if (typeof module !== 'undefined' && module.exports) {
  // En Node.js
  module.exports = {
    transformConcatenatedDataToExpanded,
    expandSingleConcatenatedRow,
    testDataTransformation
  };
}