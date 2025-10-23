// SISTEMA DE CONCATENACIÓN HÍBRIDA PARA OPTIMIZACIÓN DE DATOS

// Configuración de separadores - Unicode especiales (seguros y visibles)
const FIELD_SEPARATOR = '§';      // Separar campos principales
const KEY_VALUE_SEPARATOR = '¬';  // Separar clave¬valor en dinámicos

// Campos fijos en posiciones específicas (SIEMPRE en este orden)
// Estos son campos que siempre identificas fácilmente por contexto
const FIXED_FIELDS = [
  'Marca',              // Posición 0 - Siempre única e identificable
  'Título',             // Posición 1 - Siempre único e identificable
  'Página de Catálogo', // Posición 2 - Número, fácil de identificar
  'WA Importancia',     // Posición 3 - Letra simple (A, B, C)
  'CMS'                 // Posición 4 - Código único
];

// Los campos de imágenes van como dinámicos con nombres porque:
// - WA_VIS_Cover, WA_VIS_Gallery, WA_VIS_Rest son muy similares
// - Sus valores (URLs de imágenes) son parecidos
// - Necesitas saber cuál es cuál

/**
 * Función helper para mostrar datos concatenados de forma legible
 * (Los caracteres ASCII 30/31 no son visibles)
 */
function displayConcatenatedData(concatenated) {
  return concatenated
    .replace(new RegExp(String.fromCharCode(30), 'g'), FIELD_SEPARATOR_DISPLAY)
    .replace(new RegExp(String.fromCharCode(31), 'g'), KEY_VALUE_SEPARATOR_DISPLAY);
}

/**
 * Crear datos concatenados desde objeto
 * @param {Object} itemData - Datos del item
 * @returns {String} - Datos concatenados
 */
function createConcatenatedData(itemData) {
  // 1. Campos fijos - SIEMPRE en las mismas posiciones
  const fixedParts = FIXED_FIELDS.map(field => {
    const value = itemData[field];
    return value ? String(value).trim() : ''; // Vacío si no existe
  });
  
  // 2. Campos dinámicos - Solo los que tienen valor y no están en fijos
  const dynamicParts = [];
  Object.keys(itemData).forEach(key => {
    // Solo si no es campo fijo Y tiene valor
    if (!FIXED_FIELDS.includes(key) && itemData[key] && String(itemData[key]).trim()) {
      const cleanValue = String(itemData[key]).trim();
      dynamicParts.push(`${key}${KEY_VALUE_SEPARATOR}${cleanValue}`);
    }
  });
  
  // 3. Combinar: [fijos] + [dinámicos]
  const allParts = [...fixedParts, ...dynamicParts];
  return allParts.join(FIELD_SEPARATOR);
}

/**
 * Parsear datos concatenados a objeto
 * @param {String} concatenated - Datos concatenados
 * @returns {Object} - Objeto con datos parseados
 */
function parseConcatenatedData(concatenated) {
  if (!concatenated || typeof concatenated !== 'string') {
    return {};
  }
  
  const parts = concatenated.split(FIELD_SEPARATOR);
  const item = {};
  
  // 1. Parsear campos fijos (posiciones 0-4)
  FIXED_FIELDS.forEach((fieldName, index) => {
    if (parts[index] && parts[index].trim()) {
      item[fieldName] = parts[index].trim();
    }
  });
  
  // 2. Parsear campos dinámicos (posición 5+)
  for (let i = FIXED_FIELDS.length; i < parts.length; i++) {
    const part = parts[i];
    if (part && part.includes(KEY_VALUE_SEPARATOR)) {
      const separatorIndex = part.indexOf(KEY_VALUE_SEPARATOR);
      const key = part.substring(0, separatorIndex).trim();
      const value = part.substring(separatorIndex + 1).trim();
      
      if (key && value) {
        item[key] = value;
      }
    }
  }
  
  return item;
}

/**
 * Función para probar el sistema
 */
function testConcatenationSystem() {
  console.log('🧪 Probando sistema de concatenación...');
  
  // Datos de prueba realistas con nueva estructura
  const testData = {
    'Marca': 'AKUMA',
    'Título': 'Inserto Romboidal CCMT2(1.5)1-MP1',
    'Página de Catálogo': '239',
    'WA Importancia': 'A',
    'CMS': '01.02.03',
    'WA_VIS_Cover': 'tornos_web_1.jpg',        // Ahora dinámico
    'WA_VIS_Gallery': '22-800-067.jpg, tornos_web_2.jpg', // Ahora dinámico
    'WA_VIS_Rest': 'chucks_puntos_act1.jpg',   // Ahora dinámico
    'Comentarios': 'Producto especial'         // Dinámico
  };
  
  // Concatenar
  const concatenated = createConcatenatedData(testData);
  console.log('📦 Datos concatenados:', concatenated);
  console.log('📏 Tamaño:', concatenated.length, 'caracteres');
  
  // Desglose por partes:
  const parts = concatenated.split(FIELD_SEPARATOR);
  console.log('🔍 Desglose:');
  console.log('  Posición 0 (Marca):', parts[0]);
  console.log('  Posición 1 (Título):', parts[1]);
  console.log('  Posición 2 (Página de Catálogo):', parts[2]);
  console.log('  Posición 3 (WA Importancia):', parts[3]);
  console.log('  Posición 4 (CMS):', parts[4] || '(vacío)');
  console.log('  Dinámicos (con nombres):', parts.slice(5));
  
  // Parsear de vuelta
  const parsed = parseConcatenatedData(concatenated);
  console.log('🔄 Datos parseados:', parsed);
  
  // Verificar integridad
  const originalKeys = Object.keys(testData).filter(k => testData[k]);
  const parsedKeys = Object.keys(parsed);
  const isIntact = originalKeys.every(key => parsed[key] === testData[key]);
  
  console.log('✅ Integridad:', isIntact ? 'PERFECTA' : 'FALLÓ');
  
  return { original: testData, concatenated, parsed, isIntact };
}

// Función para convertir array de objetos a formato concatenado
function convertArrayToConcatenated(dataArray) {
  return dataArray.map(item => ({
    'Item Groups': item['Item Groups'],
    'ID': item['ID'],
    'data': createConcatenatedData(item)
  }));
}

// Función para convertir formato concatenado de vuelta a array normal
function convertConcatenatedToArray(concatenatedArray) {
  return concatenatedArray.map(row => {
    const parsedData = parseConcatenatedData(row.data);
    return {
      'Item Groups': row['Item Groups'],
      'ID': row['ID'],
      ...parsedData
    };
  });
}

// Exportar funciones
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createConcatenatedData,
    parseConcatenatedData,
    convertArrayToConcatenated,
    convertConcatenatedToArray,
    testConcatenationSystem,
    FIELD_SEPARATOR,
    KEY_VALUE_SEPARATOR,
    FIXED_FIELDS
  };
}

// ========================================
// PARSER EXTENDIDO PARA MULTIPLE OBJECT TYPES
// ========================================

/**
 * Parser universal que maneja Item Group, Item Code e Image
 * @param {Object} dataRow - Fila con {Item_Groups, ID, Object_Type, data_concatenated}
 * @returns {Object} - Objeto parseado según el tipo
 */
function parseUniversalConcatenatedData(dataRow) {
  const objectType = dataRow['Object Type'] || dataRow.Object_Type;
  const concatenated = dataRow.data_concatenated;
  
  if (!concatenated || typeof concatenated !== 'string') {
    return { ...dataRow, parsedData: {} };
  }
  
  let parsedData = {};
  
  switch (objectType) {
    case 'Item Group':
    case 'Item Code':
      parsedData = parseItemCodeData(concatenated);
      break;
      
    case 'Image':
      parsedData = parseImageData(concatenated);
      break;
      
    default:
      console.warn(`⚠️ Tipo de objeto desconocido: ${objectType}`);
      parsedData = {};
  }
  
  return {
    'Item Groups': dataRow['Item Groups'] || dataRow.Item_Groups,
    'ID': dataRow.ID,
    'Object Type': objectType,
    ...parsedData
  };
}

/**
 * Parser para Item Group/Item Code (lógica actual)
 * @param {String} concatenated - Datos concatenados
 * @returns {Object} - Objeto parseado
 */
function parseItemCodeData(concatenated) {
  const parts = concatenated.split(FIELD_SEPARATOR);
  const item = {};
  
  // 1. Campos fijos (posiciones 0-4)
  const fixedFieldNames = ['Marca', 'Título', 'Página de Catálogo', 'WA Importancia', 'WA_VIS_Comment'];
  
  fixedFieldNames.forEach((fieldName, index) => {
    if (parts[index] !== undefined) {
      const value = parts[index].trim();
      if (value) {
        item[fieldName] = value;
      }
    }
  });
  
  // 2. Campos dinámicos (posición 5+)
  for (let i = fixedFieldNames.length; i < parts.length; i++) {
    const part = parts[i];
    if (part && part.includes(KEY_VALUE_SEPARATOR)) {
      const separatorIndex = part.indexOf(KEY_VALUE_SEPARATOR);
      const key = part.substring(0, separatorIndex).trim();
      const value = part.substring(separatorIndex + 1).trim();
      
      if (key) {
        item[key] = value; // Permitir valores vacíos para imágenes
      }
    }
  }
  
  return item;
}

/**
 * Parser específico para objetos Image
 * @param {String} concatenated - Datos concatenados (Name§WA_VIS_Comment)
 * @returns {Object} - Objeto parseado
 */
function parseImageData(concatenated) {
  const parts = concatenated.split(FIELD_SEPARATOR);
  
  return {
    'Name': parts[0] ? parts[0].trim() : '',
    'WA_VIS_Comment': parts[1] ? parts[1].trim() : ''
  };
}

/**
 * Función de prueba para todos los tipos de objetos
 */
function testUniversalParser() {
  console.log('🧪 Probando parser universal...');
  
  // Datos de prueba basados en tus ejemplos reales
  const testData = [
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
    },
    {
      'Item Groups': '7584, 7586, 7591, 7593, 7599, 7601, 7604, 7610, 7633, 34145',
      'ID': '38305',
      'Object Type': 'Image',
      'data_concatenated': '10-315-016.jpg§Agregar IMG adicional | se dejan imagenes adicionales en carpeta'
    }
  ];
  
  testData.forEach((row, index) => {
    console.log(`\n--- Test ${index + 1}: ${row['Object Type']} ---`);
    console.log('Original:', row);
    
    const parsed = parseUniversalConcatenatedData(row);
    console.log('Parseado:', parsed);
    
    // Validar según tipo
    if (row['Object Type'] === 'Item Group' || row['Object Type'] === 'Item Code') {
      console.log('✅ Campos encontrados:', Object.keys(parsed).filter(k => !['Item Groups', 'ID', 'Object Type'].includes(k)));
    } else if (row['Object Type'] === 'Image') {
      console.log('✅ Name:', parsed.Name);
      console.log('✅ WA_VIS_Comment:', parsed.WA_VIS_Comment);
    }
  });
  
  console.log('\n🎉 Prueba del parser universal completada');
}