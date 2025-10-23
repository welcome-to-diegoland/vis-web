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