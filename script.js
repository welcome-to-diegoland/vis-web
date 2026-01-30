// ========== LOGIN SYSTEM ==========
// Variables de estado del sistema de login
let dataLoaded = false;
let userAuthenticated = false;
let currentUser = null;

// Lista de usuarios hardcoded con grupos
const VALID_USERS = {
  'sandra': { password: '1234', group: 'Analista' },
  'victor': { password: '1234', group: 'Analista' },
  'ximena': { password: '1234', group: 'Analista' },
  'carlos': { password: '1234', group: 'Analista' },
  'kalem': { password: '1234', group: 'Analista' },
  'diego': { password: 'dddd', group: 'Admin' },
  'rafael': { password: '1234', group: 'Admin' },
  'daniela': { password: '1234', group: 'Admin' },
  'esteban': { password: '1234', group: 'Admin' },
  'arturo': { password: '1234', group: 'Analista' },
  'veronica': { password: '4321', group: 'Diseño' },
  'rossana': { password: '4321', group: 'Diseño' },
  'carla': { password: '4321', group: 'Diseño' },
  'grecia': { password: '4321', group: 'Diseño' },
  'thanya': { password: '4321', group: 'Diseño' },
  'gabriela': { password: '4321', group: 'Diseño' },
  'karen': { password: '4321', group: 'Diseño' },
  'cinthya': { password: '4321', group: 'Diseño' }
};

// ========== END LOGIN SYSTEM ==========

// ========== KEYBOARD SHORTCUTS ==========
// 🎯 SISTEMA HÍBRIDO: Shortcuts originales + alternativas más confiables
// 
// 📋 COMENTARIOS:
// • Alt + Cmd/Ctrl + Click: Abrir modal de comentarios (original)
// • Alt + Double-click: Abrir comentarios (✨ alternativa confiable)
//
// 📋 ASIGNAR AL ITEM GROUP:
// • Alt + Cmd/Ctrl + Shift + Click: Asignar imagen principal (original)
// • Ctrl/Cmd + Shift + Click: Asignar al Item Group (✨ alternativa confiable)
//
// 📋 OTRAS ACCIONES:
// • Alt + Click: Eliminar/quitar imagen
// • Shift + Click: Seleccionar imagen de trabajo
// • Cmd/Ctrl + Click: Asignar imagen de trabajo
// • ESC: Cerrar modales abiertos
//
console.log('📋 Keyboard Shortcuts disponibles (Sistema Híbrido):');
console.log('💬 COMENTARIOS:');
console.log('  • Alt + Cmd/Ctrl + Click: Comentarios (original)');
console.log('  • Alt + Double-click: Comentarios (alternativa confiable)');
console.log('🎯 ASIGNAR ITEM GROUP:');
console.log('  • Alt + Cmd/Ctrl + Shift + Click: Item Group (original)');
console.log('  • Ctrl/Cmd + Shift + Click: Item Group (alternativa confiable)');
console.log('⚡ OTRAS ACCIONES:');
console.log('  • Alt + Click: Eliminar imagen');
console.log('  • Shift + Click: Seleccionar imagen');
console.log('  • Cmd/Ctrl + Click: Asignar imagen de trabajo');
console.log('  • ESC: Cerrar modales');
// ========== END KEYBOARD SHORTCUTS ==========

// Elementos del DOM (sección limpia)
const verticalDivider = document.getElementById('verticalDivider');
const leftSection = document.getElementById('leftSection');
const rightSection = document.getElementById('rightSection');
const container = document.querySelector('.main-container');

// Variables de estado básicas
let isVerticalDragging = false;
let startX, startLeftWidth;
let originalExcelSheets = {}; // Para guardar las hojas del Excel
let currentWorkingData = []; // Para guardar los datos que se están trabajando
let currentLoadedItemGroupData = []; // Para guardar datos del Item Group cargado específicamente (sin sobrescribir currentWorkingData)
let allLibraryData = []; // Para guardar TODOS los datos de la library (no se sobrescribe)
let originalTreeData = []; // Para preservar la estructura original del árbol para navegación
let currentColumnsOrder = []; // Para mantener el orden original de las columnas
// Los comentarios de imágenes ahora se obtienen directamente desde objetos tipo 'Image' en currentWorkingData
let currentAssetGroups = []; // Para guardar los datos de galerías
let currentAssetComments = []; // Para guardar comentarios de assets específicos

// Variables para manejo de comentarios recientes

// ========== COMMENTED ITEMS DATA SOURCE ==========
// Nueva fuente de datos centralizada para items con comentarios
let commentedItemsData = []; // Fuente única para todos los items con comentarios reales
let lastCommentTimestamp = null; // Timestamp del último comentario agregado
let recentCommentsFlag = false; // Flag para indicar si hay comentarios recientes

// ========== PRE-PROCESSED DATA CACHE ==========
// Variables para datos pre-procesados (optimización de performance)
let preProcessedInventoryData = null; // Datos transformados listos para tabla de inventario
let preProcessedInventoryHTML = null; // HTML de tabla pre-generado
let preProcessedDataTimestamp = null; // Timestamp de cuando se procesaron los datos
let isPreProcessingComplete = false; // Flag para saber si el pre-procesamiento está completo

// Variable global para mantener el zoom persistente
let globalZoomScale = 1; // Zoom persistente entre cambios de Item Group

// Variables globales para el sistema de selección y asignación de imágenes
let savedItemGroups = new Set(); // Set para trackear Item Groups guardados
let isCleanViewActive = false; // Estado del toggle de vista limpia

// Variable para guardar el estado original del Item Group para poder deshacerlo
let originalItemGroupState = null; // Estado original para función de deshacer

// Sistema de gestión de estado para scroll y filtros
let inventoryViewState = {
  scrollPosition: 0,
  scrollPositionX: 0,
  activeFilters: {},
  lastFilteredData: null
};

// ===== NUEVO SISTEMA UNIFICADO DE ESTADO =====
// Fuente única de verdad para todos los datos
let masterCommentData = null; // Todos los datos con comentarios/asignaciones más recientes
let masterStatsData = null;   // Datos agregados para tablas de resumen

// Estado unificado para todas las tablas de información
let unifiedViewState = {
  tables: {
    comments: { 
      filters: {}, 
      scroll: { top: 0, left: 0 },
      activeElements: [] // Elementos con clase 'active'
    },
    analysts: { 
      filters: {}, 
      scroll: { top: 0, left: 0 },
      activeElements: []
    }, 
    designers: { 
      filters: {}, 
      scroll: { top: 0, left: 0 },
      activeElements: []
    }
  },
  lastDataUpdate: null,
  pendingChanges: [],
  preserveState: false // Flag para saber si debemos preservar estado al regenerar
};

// Configuración para Google Apps Script
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxxIA_xud4YQwe8kq2z0HIiBLPDVxNzjEYAnXKGkiwuQX5YUgkHAA198lW22-spDtVi/exec';

// Configuración para Google Sheets - Apps Script Proxy (sin problemas CORS)
const GOOGLE_SHEETS_CONFIG = {
  // URL del Apps Script proxy que maneja CORS - DOCUMENTO 1 (existente)
  PROXY_URL: 'https://script.google.com/macros/s/AKfycbyxT3rhTcHPPipuyTZ149Dt3wggz0NuD1iQnz8ChZpTrM3dPI57F0mhEyMwdZUWmY0H/exec',
  
  // URL del Apps Script proxy para DOCUMENTO 2 (nuevo) - Base de datos
  DATA_PROXY_URL: 'https://script.google.com/macros/s/AKfycbzzML3WRHcxtS1LILmuCWBNIU3PDSH0m6861HhGH7X5JOZRs9EjT8WtYqUVPFLvhJluZg/exec',
  
  // FASE 1: Carga inicial ligera - Árbol de categorías (DOCUMENTO 1)
  CATEGORY_SHEET: {
    SPREADSHEET_ID: '1TU51Xxx50DX5dc_aM9X2xguGBYV_Lsaswztv7WOmoyw',
    SHEET_NAME: 'category',
    COLUMNS: ['NamePath', 'Name', 'IdPath', 'Id', 'ObjectTypeName', 'Item Group', 'CMS', 'Vis_color', 'filtro_color','filtro_comment']
  },
  
  // FASE 2: Carga bajo demanda - Datos detallados en formato base de datos (DOCUMENTO 2)
  DATA_SHEET: {
    SPREADSHEET_ID: '1uD6eUpDiDheO8aplzwzOz-d8fr4D8eoc8tcqJj04p4o',
    SHEET_NAME: 'data',
    COLUMNS: ['Item Groups', 'ID', 'Object Type', 'Attribute', 'value']
  },
  
  // asset_groups se mantiene del archivo original (DOCUMENTO 1)
  ASSET_GROUPS_SHEET: {
    SPREADSHEET_ID: '1TU51Xxx50DX5dc_aM9X2xguGBYV_Lsaswztv7WOmoyw',
    SHEET_NAME: 'asset_groups'
  }
};

// Sistema de cola para auto-guardado (evitar rate limiting)
let autoSaveQueue = [];
let isProcessingAutoSave = false;
const AUTO_SAVE_DELAY = 5000; // 5 segundos entre envíos para evitar 429
const MAX_BATCH_SIZE = 2; // Máximo 2 requests en batch

// Sistema de debouncing para auto-guardado
let autoSaveTimeouts = new Map(); // Map para trackear timeouts por ID
const DEBOUNCE_DELAY = 3000; // 3 segundos de debounce

// Sistema de caché inteligente para item groups
let itemGroupCache = new Map();
const CACHE_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutos
const MAX_CACHE_SIZE = 50; // Máximo 50 item groups en caché

// Sistema de debouncing para navegación a item groups
let navigationInProgress = new Set();
let navigationTimeouts = new Map();

// Sistema de caché para comentarios de imágenes (OPTIMIZACIÓN)
let imageCommentsCache = new Map();
const IMAGE_CACHE_SIZE = 200; // Máximo 200 imágenes en caché

// Función para manejar caché de item groups
function getCachedItemGroup(itemGroupId) {
  const cached = itemGroupCache.get(itemGroupId);
  if (!cached) return null;
  
  // Verificar si ha expirado
  if (Date.now() - cached.timestamp > CACHE_EXPIRY_TIME) {
    itemGroupCache.delete(itemGroupId);
    return null;
  }
  
  return cached.data;
}

function setCachedItemGroup(itemGroupId, data) {
  // Limpiar caché si está muy lleno
  if (itemGroupCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = itemGroupCache.keys().next().value;
    itemGroupCache.delete(oldestKey);
  }
  
  itemGroupCache.set(itemGroupId, {
    data: data,
    timestamp: Date.now()
  });
}

// Lista de atributos WA válidos
const WA_ATTRIBUTES = [
  'WA_VIS_Comment', 'WA_Cover_Image_01', 'WA_Cover_Image_02', 'WA_Cover_Image_03', 'WA_Cover_Image_04', 'WA_Cover_Image_05',
  'WA_Gallery_01', 'WA_Gallery_02', 'WA_Gallery_03', 'WA_Gallery_04', 'WA_Gallery_05', 'WA_Gallery_06', 'WA_Gallery_07', 'WA_Gallery_08', 'WA_Gallery_09', 'WA_Gallery_10',
  'WA_Gallery_11', 'WA_Gallery_12', 'WA_Gallery_13', 'WA_Gallery_14', 'WA_Gallery_15', 'WA_Gallery_16', 'WA_Gallery_17', 'WA_Gallery_18', 'WA_Gallery_19', 'WA_Gallery_20',
  'WA_Gallery_21', 'WA_Gallery_22', 'WA_Gallery_23', 'WA_Gallery_24', 'WA_Gallery_25',
  'WA_Rest_01', 'WA_Rest_02', 'WA_Rest_03', 'WA_Rest_04', 'WA_Rest_05', 'WA_Rest_06', 'WA_Rest_07', 'WA_Rest_08', 'WA_Rest_09', 'WA_Rest_10',
  'WA_Rest_11', 'WA_Rest_12', 'WA_Rest_13', 'WA_Rest_14', 'WA_Rest_15', 'WA_Rest_16', 'WA_Rest_17', 'WA_Rest_18', 'WA_Rest_19', 'WA_Rest_20',
  'WA_Rest_21', 'WA_Rest_22', 'WA_Rest_23', 'WA_Rest_24', 'WA_Rest_25'
];

// Event listener global para cerrar modales con ESC
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    console.log('ESC presionado globalmente, intentando cerrar modales...');
    const modalClosed = closeAllModals();
    if (modalClosed) {
      console.log('Modal cerrado exitosamente');
      event.preventDefault();
      event.stopPropagation();
    } else {
      console.log('No se encontraron modales abiertos para cerrar');
    }
  }
});

// Función utilitaria para detectar la tecla modificadora principal (Cmd en Mac, Ctrl en PC)
function isMainModifierKey(event) {
  return event.metaKey || event.ctrlKey;
}

// Función para truncar texto a aproximadamente 4 líneas (para celdas de tabla)
function truncateTextForTable(text, maxChars = 100) {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  
  // Truncar en la palabra más cercana al límite
  const truncated = text.substring(0, maxChars);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  const finalText = lastSpaceIndex > maxChars * 0.8 ? truncated.substring(0, lastSpaceIndex) : truncated;
  
  return finalText + '...';
}

// Función para procesar HTML y truncar comentarios largos
function truncateCommentsInHTML(html) {
  // Usar regex para encontrar y reemplazar comentarios largos
  return html.replace(
    /data-comment-type="(analista-comment-clean|diseñador-comment-clean)"[^>]*>([^<]+)</g,
    function(match, commentType, content) {
      const truncatedContent = truncateTextForTable(content);
      return match.replace(content, truncatedContent);
    }
  );
}

// Sistema de cola para auto-guardado (evitar rate limiting)
async function processAutoSaveQueue() {
  if (isProcessingAutoSave || autoSaveQueue.length === 0) {
    return;
  }
  
  isProcessingAutoSave = true;
  
  // Procesar en batches más pequeños
  while (autoSaveQueue.length > 0) {
    const batchSize = Math.min(MAX_BATCH_SIZE, autoSaveQueue.length);
    const batch = [];
    
    for (let i = 0; i < batchSize; i++) {
      batch.push(autoSaveQueue.shift());
    }
    
    // Procesar batch secuencialmente con manejo de errores individual
    for (let j = 0; j < batch.length; j++) {
      try {
        await sendAutoSaveRequest(batch[j]);
      } catch (error) {
        // El error ya fue manejado por sendAutoSaveRequest con reintentos
        // Simplemente continuar con el siguiente elemento
      }
      
      // Delay entre requests del mismo batch
      if (j < batch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos entre requests
      }
    }
    
    // Delay más largo entre batches para evitar rate limiting
    if (autoSaveQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, AUTO_SAVE_DELAY));
    }
  }
  
  isProcessingAutoSave = false;
}

function addToAutoSaveQueue(record, user, date) {
  const recordId = record.id || record.itemId || 'unknown';
  
  // OPTIMIZACIÓN: Limpiar caché de comentarios si es un comentario de imagen
  if (record.attribute === 'WA_VIS_Comment') {
    clearImageCommentsCache();
  }
  
  // Limpiar timeout anterior si existe (debouncing)
  if (autoSaveTimeouts.has(recordId)) {
    clearTimeout(autoSaveTimeouts.get(recordId));
  }
  
  // Crear nuevo timeout con debounce
  const timeoutId = setTimeout(() => {
    const saveRequest = {
      record: record,
      user: user,
      date: date,
      type: 'comment_autosave'
    };
    
    autoSaveQueue.push(saveRequest);
    autoSaveTimeouts.delete(recordId);
    
    // Iniciar procesamiento si no está activo
    if (!isProcessingAutoSave) {
      processAutoSaveQueue();
    }
  }, DEBOUNCE_DELAY);
  
  autoSaveTimeouts.set(recordId, timeoutId);
}

async function sendAutoSaveRequest(saveRequest, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_BASE = 2000; // 2 segundos base, se incrementa exponencialmente
  
  const payload = {
    records: [saveRequest.record],
    user: "data-update", // FORZAR a data-update
    date: saveRequest.date,
    type: saveRequest.type
  };
  
  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Si llegamos aquí, el request fue exitoso
    showAutoSaveNotification('Comentario guardado');
    
    // Notificación especial si fue exitoso después de fallos
    if (retryCount > 0) {
      showAutoSaveNotification(`Conectividad restaurada!`, 'success');
    }
    
    return response;
    
  } catch (error) {
    // Si no hemos alcanzado el máximo de reintentos, intentar de nuevo
    if (retryCount < MAX_RETRIES) {
      const retryDelay = RETRY_DELAY_BASE * Math.pow(2, retryCount); // Backoff exponencial
      
      // Mostrar notificación de reintento
      showAutoSaveNotification(`Reintentando guardar... (${retryCount + 1}/${MAX_RETRIES})`, 'warning');
      
      // Esperar antes del reintento
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      // Reintentar recursivamente
      return sendAutoSaveRequest(saveRequest, retryCount + 1);
    } else {
      // Máximo de reintentos alcanzado
      showAutoSaveNotification('Error persistente al guardar. Revisa tu conexión.', 'error');
      throw error;
    }
  }
}

// ===== FUNCIÓN UNIFICADA DE GUARDADO - Usa la URL que funciona =====
async function saveToVisSandra(records, operationType = 'manual') {
  try {
    // Obtener usuario actual para tracking, pero SIEMPRE usar "Sandra" para el Apps Script
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.error('❌ No hay usuario seleccionado');
      if (operationType === 'manual') {
        alert('Error: No hay usuario seleccionado');
      }
      return false;
    }
    
    // FORZAR a usar "data-update" para que SIEMPRE vaya a data-update
    const forcedUser = "data-update";
    
    // Obtener información del usuario formateada
    const currentUserInfo = getCurrentUserInfo();
    const formattedUserName = currentUserInfo?.name || currentUser;
    
    // Agregar el usuario real a cada registro para tracking
    const enrichedRecords = records.map(record => ({
      ...record,
      realUser: formattedUserName, // Usuario real formateado para tracking
      timestamp: record.timestamp || record.date || getLocalDateTime()
    }));
    
    // Usar el formato que funciona: { user: "Sandra", records: records }
    const payload = {
      user: forcedUser, // SIEMPRE "data-update" para que vaya a data-update
      records: enrichedRecords,
      type: operationType // 'manual', 'comment', 'assignment'
    };
    
    // Usar la URL que funciona (GOOGLE_APPS_SCRIPT_URL) sin parámetros
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    return true;
    
  } catch (error) {
    console.error(`❌ UNIFIED SAVE ERROR (${operationType}):`, error);
    
    if (operationType === 'manual') {
      alert(`❌ Error al guardar en vis-sandra: ${error.message}`);
    }
    
    return false;
  }
}

// Función para envío en batch de asignaciones de diseñadores
async function sendAssignmentsBatch(assignmentRecords, user, date) {
  if (assignmentRecords.length === 0) return;
  
  const payload = {
    records: assignmentRecords,
    user: user,
    date: date,
    type: 'comment_autosave_batch'
  };
  
  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    showAutoSaveNotification(`${assignmentRecords.length} comentarios de asignación guardados`);
    return true;
    
  } catch (error) {
    console.error('❌ Error en batch de asignaciones:', error);
    showAutoSaveNotification('Error al guardar comentarios de asignación', 'error');
    throw error;
  }
}

// Función para preparar registro de asignación sin enviar (para batch)
function prepareAssignmentRecord(row, currentUser, currentDate) {
  // Buscar el comentario existente COMPLETO según el commentType
  let existingComments = '';
  
  if (row.commentType === 'item') {
    // Buscar en allLibraryData para Item Codes e Item Groups
    let libraryItem = allLibraryData.find(item => 
      (item['Object Type'] === row.objectType) && 
      (item.ID == row.id || item.Id == row.id || item.id == row.id)
    );
    
    // Si aún no encuentra, buscar por nombre
    if (!libraryItem && row.name) {
      libraryItem = allLibraryData.find(item => 
        (item['Object Type'] === row.objectType) &&
        ((item.Name === row.name) || 
        (item.Title === row.name) ||
        (item.name === row.name))
      );
    }
    
    if (libraryItem) {
      existingComments = libraryItem['WA_VIS_Comment'] || '';
    }
  } else if (row.commentType === 'image') {
    // Para imágenes, buscar en currentAssetComments
    const imageContext = row.imageName || (row.name + '.jpg');
    const asset = currentAssetComments.find(asset => asset.Name === imageContext);
    existingComments = asset && asset.WA_VIS_Comment ? asset.WA_VIS_Comment : '';
  }
  
  // Función helper para obtener el último tipo de comentario
  function getLastCommentType(commentsString) {
    if (!commentsString || !commentsString.trim()) {
      return 'General'; // Default si no hay comentarios
    }
    
    // Separar comentarios individuales por ¶
    const individualComments = commentsString.split('¶');
    if (individualComments.length === 0) {
      return 'General';
    }
    
    // Obtener el último comentario
    const lastComment = individualComments[individualComments.length - 1];
    if (!lastComment) {
      return 'General';
    }
    
    // Separar campos por ¦ (usuario¦fecha¦tipo¦texto¦status)
    const fields = lastComment.split('¦');
    if (fields.length >= 3) {
      const tipoComentario = fields[2]?.trim();
      if (tipoComentario && tipoComentario !== '') {
        return tipoComentario;
      }
    }
    
    return 'General'; // Default si no se puede extraer
  }
  
  // Obtener el último tipo de comentario usado
  const lastCommentType = getLastCommentType(existingComments);
  
  // Obtener el nombre formateado del diseñador
  const formattedDesignerName = getFormattedUserName(row.diseñador);
  
  // Crear el nuevo comentario de asignación usando el formato original
  const assignmentComment = {
    usuario: formattedDesignerName,
    fechaHora: getLocalDateTime(),
    tipoComentario: lastCommentType, // Usar el último tipo en lugar de 'General'
    textoComentario: `Se asignó comentario a ${formattedDesignerName}`, // Texto con nombre formateado
    status: 'Diseño'
  };
  
  const newCommentString = `${assignmentComment.usuario}¦${assignmentComment.fechaHora}¦${assignmentComment.tipoComentario}¦${assignmentComment.textoComentario}¦${assignmentComment.status}`;
  
  // Combinar comentarios existentes con el nuevo
  const updatedComments = existingComments ? existingComments + '¶' + newCommentString : newCommentString;
  
  if (row.commentType === 'item') {
    // Para Item Codes e Item Groups, crear registro para batch
    return {
      id: parseInt(row.id),
      objectType: row.objectType,
      attribute: 'WA_VIS_Comment',
      value: updatedComments,
      date: currentDate,
      user: currentUser
    };
  }
  
  return null; // Para imágenes u otros tipos que no se manejan en batch
}

// Función para marcar automáticamente un Item Group como modificado
function markItemGroupAsModified(itemGroupId = null, itemGroupName = null) {
  const groupId = itemGroupId || (currentItemGroup ? currentItemGroup['Id'] : null);
  const groupName = itemGroupName || (currentItemGroup ? currentItemGroup['Name'] : null);
  
  if (groupId) {
    savedItemGroups.add(groupId);
    console.log(`Item Group modificado: "${groupName}"`);
    
    // Guardar en localStorage inmediatamente
    const dataToSave = {
      savedItemGroups: Array.from(savedItemGroups),
      currentItemGroupId: groupId,
      currentItemGroupName: groupName,
      timestamp: new Date().toISOString()
    };
    
    try {
      localStorage.setItem('vis-web-saved-groups', JSON.stringify(dataToSave));
    } catch (error) {
      // Silencioso
    }
  }
}

// ===== FUNCIÓN PARA GENERAR FECHA/HORA LOCAL =====
function getLocalDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// ===== SISTEMA DE GESTIÓN DE USUARIOS =====
const USERS = {
  usuario: {
    name: 'Usuario',
    group: 'General',
    displayName: 'Usuario'
  },
  sandra: {
    name: 'Sandra',
    group: 'Analistas',
    displayName: 'Sandra (Analistas)'
  },
  victor: {
    name: 'Victor',
    group: 'Analistas',
    displayName: 'Victor (Analistas)'
  },
  ximena: {
    name: 'Ximena',
    group: 'Analistas',
    displayName: 'Ximena (Analistas)'
  },
  carlos: {
    name: 'Carlos',
    group: 'Analistas',
    displayName: 'Carlos (Analistas)'
  },
  kalem: {
    name: 'Kalem',
    group: 'Analistas',
    displayName: 'Kalem (Analistas)'
  },
  diego: {
    name: 'Diego',
    group: 'Admin',
    displayName: 'Diego (Admin)'
  },
  veronica: {
    name: 'Veronica', // Sin acento para comentarios
    group: 'Diseño',
    displayName: 'Verónica (Diseño)' // Con acento para mostrar en UI
  },
  rossana: {
    name: 'Rossana',
    group: 'Diseño',
    displayName: 'Rossana (Diseño)'
  },
  carla: {
    name: 'Carla',
    group: 'Diseño',
    displayName: 'Carla (Diseño)'
  },
  karen: {
    name: 'Karen',
    group: 'Diseño',
    displayName: 'Karen (Diseño)'
  },
  gabriela: {
    name: 'Gabriela',
    group: 'Diseño',
    displayName: 'Gabriela (Diseño)'
  },
  thanya: {
    name: 'Thanya',
    group: 'Diseño',
    displayName: 'Thanya (Diseño)'
  },
  grecia: {
    name: 'Grecia',
    group: 'Diseño',
    displayName: 'Grecia (Diseño)'
  },
  cinthya: {
    name: 'Cinthya',
    group: 'Diseño',
    displayName: 'Cinthya (Diseño)'
  },
  rafael: {
    name: 'Rafael',
    group: 'Admin',
    displayName: 'Rafael (Admin)'
  },
  daniela: {
    name: 'Daniela',
    group: 'Admin',
    displayName: 'Daniela (Admin)'
  },
  esteban: {
    name: 'Esteban',
    group: 'Admin',
    displayName: 'Esteban (Admin)'
  },
  arturo: {
    name: 'Arturo',
    group: 'Analistas',
    displayName: 'Arturo (Analistas)'
  }
};

// Función para obtener el usuario actual
function getCurrentUser() {
  // Usar el usuario del sistema de login
  if (currentUser && currentUser.username) {
    return currentUser.username;
  }
  return 'usuario'; // Usuario por defecto
}

// Función para obtener información completa del usuario actual
function getCurrentUserInfo() {
  // Usar el usuario del sistema de login
  if (currentUser && currentUser.username) {
    const userInfo = USERS[currentUser.username];
    if (userInfo) {
      console.log(`👤 Usuario encontrado: ${currentUser.username} → ${userInfo.name}`);
      return userInfo;
    } else {
      console.warn(`⚠️ Usuario no encontrado en USERS: ${currentUser.username}`);
    }
  } else {
    console.warn('⚠️ No hay currentUser o username');
  }
  console.log('🔄 Usando usuario por defecto: Usuario');
  return USERS.usuario;
}

// Función para verificar si el usuario actual es diseñador
function isCurrentUserDesigner() {
  const userInfo = getCurrentUserInfo();
  return userInfo && userInfo.group === 'Diseño';
}

// Función para actualizar la visibilidad del botón de guardar según el rol del usuario
function updateSaveButtonVisibility() {
  const saveBtn = document.getElementById('saveChangesButton');
  if (saveBtn) {
    if (isCurrentUserDesigner()) {
      // Ocultar botón para diseñadores
      saveBtn.style.display = 'none';
      console.log('🎨 Botón de guardar ocultado para diseñador');
    } else {
      // Mostrar botón para otros roles
      saveBtn.style.display = 'inline-flex';
      console.log('💾 Botón de guardar visible para analista/admin');
    }
  }
}

// ===== FUNCIÓN PARA OBTENER NOMBRE FORMATEADO DE CUALQUIER USUARIO =====
function getFormattedUserName(username) {
  if (!username) return 'Usuario';
  
  const userInfo = USERS[username.toLowerCase()];
  return userInfo?.name || username;
}

// ===== FUNCIÓN PARA ENCONTRAR ITEM CODE QUE CONTIENE UNA IMAGEN =====
function findItemCodeContainingImage(imageName) {
  if (!imageName || !currentWorkingData) return null;
  
  console.log(`🔍 Buscando Item Code que contiene la imagen: "${imageName}"`);
  
  // Usar TODOS los atributos WA posibles para buscar la imagen
  const allImageColumns = [
    'Foto 1', 'Foto 2', 'Foto 3', 'Foto 4', 'Foto 5',
    ...WA_ATTRIBUTES.filter(attr => attr.includes('Image') || attr.includes('Gallery') || attr.includes('Rest') || attr.includes('Cover'))
  ];
  
  console.log(`🔍 Buscando en ${allImageColumns.length} columnas de imagen posibles`);
  
  // DEBUG: Buscar Item Codes que tengan un nombre similar al de la imagen
  const imageBaseName = imageName.replace(/\.(jpg|jpeg|png|gif|webp)$/i, ''); // Remover extensión
  console.log(`🔍 DEBUG: Nombre base de imagen (sin extensión): "${imageBaseName}"`);
  
  const potentialItemCodes = currentWorkingData.filter(item => 
    item['Object Type'] === 'Item Code' && 
    (item.Name === imageBaseName || item.Name === imageName)
  );
  
  console.log(`🔍 DEBUG: Item Codes con nombre similar encontrados: ${potentialItemCodes.length}`);
  potentialItemCodes.forEach(item => {
    console.log(`   - ${item.Name} (ID: ${item.ID || item.Id})`);
    // Mostrar algunas columnas WA para debug
    const imageValues = allImageColumns.filter(col => item[col] && item[col].trim() !== '').slice(0, 5);
    console.log(`     Imágenes en columnas WA: ${imageValues.map(col => `${col}="${item[col]}"`).join(', ')}`);
  });
  
  // Buscar en Item Codes
  const itemCodeWithImage = currentWorkingData.find(item => {
    if (item['Object Type'] !== 'Item Code') return false;
    
    return allImageColumns.some(col => {
      const value = item[col];
      return value === imageName || value === imageBaseName || 
             (value && value.includes(imageBaseName)) || 
             (value && value.includes(imageName));
    });
  });
  
  if (itemCodeWithImage) {
    console.log(`✅ Imagen encontrada en Item Code: ${itemCodeWithImage.Name || itemCodeWithImage.ID} (ID: ${itemCodeWithImage.ID || itemCodeWithImage.Id})`);
    return itemCodeWithImage;
  }
  
  console.log(`❌ No se encontró Item Code que contenga la imagen: ${imageName}`);
  return null;
}

// ===== FUNCIÓN PARA GENERAR IDs CONSISTENTES PARA IMÁGENES =====
function generateConsistentImageId(imageName) {
  if (!imageName || typeof imageName !== 'string') {
    return Date.now(); // Fallback para casos raros
  }
  
  // Crear un hash simple pero consistente basado en el nombre de la imagen
  let hash = 0;
  for (let i = 0; i < imageName.length; i++) {
    const char = imageName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a 32-bit integer
  }
  
  // Hacer el hash positivo y agregarlo a un número base para que sea más legible
  // Usar un prefijo específico para identificar que es una imagen
  const baseImageId = 9000000000; // Base para IDs de imágenes
  const positiveHash = Math.abs(hash);
  const finalId = baseImageId + positiveHash;
  
  console.log(`🔢 ID consistente generado para imagen "${imageName}": ${finalId}`);
  return finalId;
}

// ===== SISTEMA GENERAL DE GESTIÓN DE MODALES =====
// Función general para cerrar todos los modales abiertos
function closeAllModals() {
  const modals = [
    { id: 'commentModal', closeFunction: closeCommentModal },
    { id: 'imagePreviewModal', closeFunction: closeImagePreviewModal },
    { id: 'assignDesignerModal', closeFunction: closeAssignDesignerModal },
    { id: 'inventoryFiltersModal', closeFunction: closeInventoryFiltersModal }
  ];

  let modalClosed = false;
  
  modals.forEach(modal => {
    const element = document.getElementById(modal.id);
    if (element) {
      const isVisible = element.classList.contains('show') || 
                       element.style.display === 'flex' || 
                       element.style.display === 'block' ||
                       (window.getComputedStyle(element).display !== 'none' && 
                        window.getComputedStyle(element).visibility !== 'hidden');
      
      console.log(`Modal ${modal.id}: exists=${!!element}, isVisible=${isVisible}, classList=${Array.from(element.classList)}, display=${element.style.display}`);
      
      if (isVisible) {
        console.log(`Cerrando modal: ${modal.id}`);
        modal.closeFunction();
        modalClosed = true;
      }
    }
  });

  return modalClosed;
}

// Función para generar el contexto completo para comentarios de Item Code
function generateItemCodeContext(itemCodeName) {
  if (!currentItemGroup || !itemCodeName) {
    return itemCodeName;
  }

  // Buscar el item code en los datos
  const itemCodeData = currentWorkingData.find(item => 
    item['Object Type'] === 'Item Code' && item.Name === itemCodeName
  );

  if (!itemCodeData) {
    return itemCodeName;
  }

  // Incluir el ID del Item Group, nombre, Item Code y Marca
  const itemGroupId = currentItemGroup['Id'] || currentItemGroup['ID'] || currentItemGroup['Item Group ID'] || '';
  const itemGroupName = currentItemGroup['Name'] || 'Item Group';
  const brandName = itemCodeData['Marca'] || itemCodeData['Brand'] || 'Marca';

  return `${itemGroupName} (${itemGroupId}) | ${itemCodeName} | ${brandName}`;
}
function generateImageContext(imageName) {
  if (!currentItemGroup || !currentItemCodes) {
    return imageName;
  }

  // Buscar el item code que contiene esta imagen
  const itemCodeWithImage = currentItemCodes.find(itemCode => {
    const images = currentImageColumns.map(col => itemCode[col]).filter(img => img);
    return images.includes(imageName);
  });

  if (!itemCodeWithImage) {
    return imageName;
  }

  // Incluir el ID del Item Group, nombre, Item Code y Marca
  const itemGroupId = currentItemGroup['Id'] || currentItemGroup['ID'] || currentItemGroup['Item Group ID'] || '';
  const itemGroupName = currentItemGroup['Name'] || 'Item Group';
  const itemCodeName = itemCodeWithImage['Name'] || itemCodeWithImage['Item Code'] || 'Item Code';
  const brandName = itemCodeWithImage['Marca'] || itemCodeWithImage['Brand'] || 'Marca';

  return `${itemGroupName} (${itemGroupId}) | ${itemCodeName} | ${brandName} | ${imageName}`;
}

// Variable global para prevenir navegaciones duplicadas
let isNavigating = false;

// Función para navegar a un Item Group específico desde la tabla de inventario
function navigateToItemGroup(itemGroupId) {
  // Prevenir navegaciones duplicadas
  if (isNavigating) {
    console.log(`🚀 ⚠️ Navegación a ${itemGroupId} ya en progreso - saltando duplicada`);
    return;
  }
  
  isNavigating = true;
  console.log(`🚀 NAVEGACIÓN A ITEM GROUP: ${itemGroupId}`);
  
  try {
    if (!itemGroupId || !allLibraryData) {
      console.error('❌ ID de Item Group no válido o datos no cargados');
      return;
    }
  
  // PASO 1: Verificar disponibilidad de datasets
  const datasets = {
    originalTreeData: originalTreeData?.length || 0,
    allLibraryData: allLibraryData?.length || 0,
    currentWorkingData: currentWorkingData?.length || 0
  };
  
  // PASO 2: Buscar Item Group
  
  // PRIMERO: Buscar en originalTreeData (datos de category con NamePath)
  let itemGroup = null;
  let foundIn = null;
  
  if (originalTreeData && originalTreeData.length > 0) {
    itemGroup = originalTreeData.find(item => {
      return item['Object Type'] === 'Item Group' && (item.Id === itemGroupId || String(item.Id) === String(itemGroupId));
    });
    if (itemGroup) {
      foundIn = 'originalTreeData';
    }
  }
  
  // FALLBACK: Buscar en allLibraryData
  if (!itemGroup && allLibraryData && allLibraryData.length > 0) {
    itemGroup = allLibraryData.find(item => {
      return item['Object Type'] === 'Item Group' && (item.Id === itemGroupId || String(item.Id) === String(itemGroupId));
    });
    if (itemGroup) {
      foundIn = 'allLibraryData';
    }
  }
  
  // FALLBACK FINAL: Buscar en currentWorkingData
  if (!itemGroup && window.allItemGroupsData && window.allItemGroupsData.length > 0) {
    itemGroup = currentWorkingData.find(item => {
      return item['Object Type'] === 'Item Group' && (item.Id === itemGroupId || String(item.Id) === String(itemGroupId));
    });
    if (itemGroup) {
      foundIn = 'currentWorkingData';
    }
  }
  
  // PASO 3: Verificar resultado de búsqueda
  if (!itemGroup) {
    console.error(`❌ ITEM GROUP NO ENCONTRADO: ID ${itemGroupId}`);
    console.log(`🔍 DEBUG - Datasets disponibles:`, datasets);
    console.log(`🔍 DEBUG - ID buscado:`, typeof itemGroupId, itemGroupId);
    
    // Intentar búsqueda más amplia en caso de que sea un Item Code/Image ID
    let relatedItemGroup = null;
    
    // Buscar en allLibraryData cualquier elemento con este ID
    if (allLibraryData && allLibraryData.length > 0) {
      const elementWithId = allLibraryData.find(item => 
        item.ID === itemGroupId || String(item.ID) === String(itemGroupId)
      );
      
      if (elementWithId) {
        console.log(`🔍 DEBUG - Elemento encontrado:`, elementWithId['Object Type'], elementWithId.Name || elementWithId['Item Code']);
        
        // Si es un Item Code o Image, buscar su Item Group
        if (elementWithId['Object Type'] === 'Item Code' || elementWithId['Object Type'] === 'Image') {
          const itemGroupsValue = elementWithId['Item Groups'] || elementWithId['itemGroups'];
          if (itemGroupsValue) {
            const itemGroupId = String(itemGroupsValue).split(',')[0].trim();
            console.log(`🔍 DEBUG - Buscando Item Group relacionado:`, itemGroupId);
            
            // Buscar el Item Group real
            relatedItemGroup = allLibraryData.find(item => 
              item['Object Type'] === 'Item Group' && 
              (item.ID === itemGroupId || String(item.ID) === String(itemGroupId))
            );
          }
        }
      }
    }
    
    if (relatedItemGroup) {
      console.log(`✅ DEBUG - Item Group relacionado encontrado:`, relatedItemGroup.Name);
      itemGroup = relatedItemGroup;
      foundIn = 'allLibraryData (búsqueda relacionada)';
    } else {
      alert('Item Group no encontrado');
      return;
    }
  }
  
  // PASO 4: Verificar NamePath o construirlo
  let navigationPath = itemGroup.NamePath;
  
  if (!navigationPath || navigationPath.trim() === '') {
    // Intentar usar IdPath como alternativa
    if (itemGroup.IdPath && itemGroup.IdPath.trim() !== '') {
      navigationPath = itemGroup.IdPath;
    } else {
      // Como último recurso, usar solo el nombre del Item Group
      navigationPath = itemGroup.Name;
    }
  }
  
  if (!navigationPath || navigationPath.trim() === '') {
    console.error(`❌ NO SE PUEDE CONSTRUIR RUTA DE NAVEGACIÓN`);
    alert('Error: No se puede determinar la ruta de navegación para este Item Group');
    return;
  }
  
  // PASO 5: CRÍTICO - Guardar estado ANTES de modificar el DOM
  console.log('💾 Guardando estado completo antes de navegar al visualizador...');
  saveUnifiedViewState();
  
  // Compatibilidad: También guardar en sistema legacy
  saveInventoryViewState();
  
  // Marcar que debemos preservar estado al regresar
  unifiedViewState.preserveState = true;

  // PASO 6: Preparar navegación con indicador
  console.log(`🔄 Preparando navegación al Item Group: "${itemGroup.Name}" (ID: ${itemGroupId})`);
  console.log(`📍 Ruta de navegación: "${navigationPath}"`);
  console.log(`📂 Encontrado en: ${foundIn}`);
  
  // Mostrar indicador de navegación
  const box4Content = document.getElementById('box4-content');
  if (box4Content) {
    box4Content.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 200px; font-size: 16px; color: #666;">
        <div>
          <div style="margin-bottom: 10px;">🔄 Navegando a Item Group...</div>
          <div style="font-size: 14px;">"${itemGroup.Name}"</div>
        </div>
      </div>
    `;
  }

  // Desactivar vista limpia si está activa (OPTIMIZACIÓN: solo cambiar vista sin re-renderizar árbol)
  if (isCleanViewActive) {
    console.log(`🔄 Vista limpia activa - cambiando a vista normal antes de navegar...`);
    // Cambio optimizado: solo cambiar visibilidad, no re-renderizar
    isCleanViewActive = false;
    const toggleButton = document.getElementById('cleanViewToggle');
    if (toggleButton) {
      toggleButton.innerHTML = '<i class="fa-solid fa-table-list" style="margin-right: 6px;"></i>Información';
      toggleButton.className = 'btn btn-secondary btn-compact'; // MORADO para "Información"
      console.log(`🔄 Botón cambiado a "Información" para vista del visualizador`);
    }

    // Limpiar box4 y restaurar elementos del visualizador
    const box4Content = document.getElementById('box4-content');
    if (box4Content) {
      box4Content.innerHTML = '';
    }
    
    // LIMPIAR BOX3 que contiene las estadísticas de la vista de datos
    const box3Content = document.getElementById('box3-content');
    if (box3Content) {
      box3Content.innerHTML = '';
      console.log(`🧹 Box3 limpiado para navegación al visualizador`);
      
      // Restaurar el sistema de galerías en Box3
      initializeGallerySystem();
      console.log(`🖼️ Sistema de galerías restaurado en Box3`);
    }
    
    // Mostrar elementos del visualizador
    const elementsToShow = ['box1', 'box2', 'box3', 'box4'];
    elementsToShow.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = 'block';
      }
    });
    
    // CRÍTICO: Solo re-renderizar el árbol si no está disponible
    console.log(`🌳 Verificando disponibilidad del árbol...`);
    const treeContainer = document.getElementById('tree');
    const existingLabels = treeContainer?.querySelectorAll('.category-tree-label[data-path]');
    
    if (existingLabels && existingLabels.length > 0) {
      console.log(`✅ Árbol ya disponible con ${existingLabels.length} elementos - saltando re-renderizado`);
    } else {
      console.log(`🌳 Re-renderizando árbol para navegación...`);
      if (treeContainer && originalTreeData && originalTreeData.length > 0) {
        renderAssetLibraryTree(originalTreeData, treeContainer);
        console.log(`✅ Árbol re-renderizado con ${originalTreeData.length} elementos`);
      } else {
        console.error(`❌ No se puede re-renderizar el árbol: treeContainer=${!!treeContainer}, originalTreeData=${originalTreeData?.length || 0}`);
      }
    }
  }
  
  // PASO 6: Expandir árbol y seleccionar
  console.log(`🌳 Expandiendo árbol para path: "${navigationPath}"`);
  expandTreeToPath(navigationPath, true);
    
    // 4. Seleccionar el Item Group en el árbol después de expandir - OPTIMIZADO: Sin timeout
    console.log(`🎯 Buscando elemento en el árbol para seleccionar y navegar...`);
    
    // Función para buscar y seleccionar el elemento
    function searchAndSelectElement() {
      const treeContainer = document.getElementById('tree');
      if (treeContainer) {
        
        // Verificar que el árbol tenga elementos
        const allLabels = treeContainer.querySelectorAll('.category-tree-label[data-path]');
        console.log(`📊 Total de elementos en el árbol: ${allLabels.length}`);
        
        if (allLabels.length === 0) {
          console.error(`❌ El árbol está vacío, no se puede navegar`);
          alert('Error: El árbol no está disponible para navegación. Intenta refrescar la página.');
          return;
        }
        
        // Quitar selección previa
        const previousSelected = treeContainer.querySelectorAll('.category-tree-label.selected');
        previousSelected.forEach(el => {
          el.classList.remove('selected');
        });
        
        // Seleccionar el nuevo Item Group - usar un método más robusto para evitar problemas con comillas
        let targetElement = null;
        
        for (const label of allLabels) {
          if (label.getAttribute('data-path') === navigationPath) {
            targetElement = label;
            break;
          }
        }
        if (targetElement) {
          targetElement.classList.add('selected');
          console.log(`✅ Elemento seleccionado en árbol: "${targetElement.textContent.trim()}"`);
          
          // 5. Cargar el Item Group en el Box 4
          console.log(`🔄 Cargando visualizador para path: "${navigationPath}"`);
          loadImageGridInBox4(navigationPath); // Usar el path original completo
          
          // 6. Hacer scroll al Item Group seleccionado
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          console.log(`✅ Navegación completada exitosamente`);
        } else {
          
          // Búsqueda alternativa por el text content (Name) del Item Group
          console.log(`🔍 Búsqueda alternativa por nombre: "${itemGroup.Name}"`);
          for (const label of allLabels) {
            if (label.textContent.trim() === itemGroup.Name) {
              targetElement = label;
              console.log(`🎯 ¡Element encontrado por NOMBRE!`);
              targetElement.classList.add('selected');
              console.log(`🔄 Cargando visualizador para path: "${label.getAttribute('data-path')}"`);
              loadImageGridInBox4(label.getAttribute('data-path')); // Usar el path del elemento encontrado
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              console.log(`✅ Navegación por nombre completada exitosamente`);
              break;
            }
          }
          
          if (!targetElement) {
            console.error(`❌ No se pudo encontrar el elemento en el árbol para navegar`);
            console.log(`🔍 Paths disponibles en el árbol:`, Array.from(allLabels).slice(0, 5).map(l => l.getAttribute('data-path')));
          }
        }
      }
    }
    
    // Intentar inmediatamente, si falla, pequeño retraso para permitir que el DOM se actualice
    const treeContainer = document.getElementById('tree');
    const allLabels = treeContainer?.querySelectorAll('.category-tree-label[data-path]');
    
    if (allLabels && allLabels.length > 0) {
      // El árbol ya está listo, ejecutar inmediatamente
      searchAndSelectElement();
      // Resetear flag después de ejecutar
      setTimeout(() => {
        isNavigating = false;
      }, 100);
    } else {
      // Esperar solo el mínimo necesario para que el DOM se actualice
      console.log(`⏳ Esperando brevemente para que el árbol se actualice...`);
      setTimeout(() => {
        searchAndSelectElement();
        // Resetear flag después de completar navegación
        isNavigating = false;
      }, 500); // Solo 500ms en lugar de 3 segundos
    }
  } catch (error) {
    console.error('❌ Error en navegateToItemGroup:', error);
    isNavigating = false;
  }
}

// Función auxiliar para determinar qué mostrar en la columna imagen
function getImageColumnValue(rowData) {
  // Si ya tiene imagen, usarla
  if (rowData.imagen && String(rowData.imagen).trim() !== '' && rowData.imagen !== '-') {
    return String(rowData.imagen);
  }
  
  // Si no tiene imagen, revisar el Object Type
  if (rowData.objectType === 'Item Group') {
    return String(rowData.id || rowData.itemId || '');
  } else if (rowData.objectType === 'Item Code') {
    return String(rowData.name || rowData.itemName || '');
  }
  
  // Si no coincide con ninguno, mantener el valor original
  return String(rowData.imagen || '');
}

// Función auxiliar para determinar qué mostrar en Object Type
function getObjectTypeValue(rowData) {
  // Solo mostrar "Image" si el valor de imagen contiene .jpg
  const imageValue = getImageColumnValue(rowData);
  if (imageValue && String(imageValue).toLowerCase().includes('.jpg')) {
    return 'Image';
  }
  
  // Si no, mantener el Object Type original
  return String(rowData.objectType || '');
}

// Función para determinar el status automático basado en el grupo del usuario
function getAutomaticStatus() {
  const userInfo = getCurrentUserInfo();
  if (userInfo.group === 'Analistas') {
    return 'Diseño';
  } else if (userInfo.group === 'Diseño') {
    return 'Revision';
  }
  return 'Diseño'; // Default
}

// Función para determinar el status actual general de un contexto
function getCurrentStatus(commentText) {
  const parsedComments = parseCommentsFromExcel(commentText);
  if (parsedComments.length === 0) {
    return ''; // Sin status si no hay comentarios
  }
  
  // Obtener el último status (del último comentario)
  const lastComment = parsedComments[parsedComments.length - 1];
  const rawStatus = lastComment.status || '';
  
  // DEBUG: Log solo para casos específicos (comentado para reducir logs)
  // if (parsedComments.length > 1) {
  //   console.log(`🔍 DEBUG Status - Total comentarios: ${parsedComments.length}`);
  //   console.log(`🔍 DEBUG Status - Último comentario:`, lastComment);
  //   console.log(`🔍 DEBUG Status - Raw status: "${rawStatus}"`);
  // }
  
  // Normalizar el status para asegurar consistencia
  const normalized = normalizeStatus(rawStatus);
  
  // if (parsedComments.length > 1) {
  //   console.log(`🔍 DEBUG Status - Normalizado: "${normalized}"`);
  // }
  
  return normalized;
}

// Función para normalizar status y asegurar que coincidan con los CSS
function normalizeStatus(status) {
  if (!status || typeof status !== 'string') return '';
  
  const cleaned = status.trim();
  const lower = cleaned.toLowerCase();
  
  // Mapear variaciones comunes a los valores correctos
  const statusMap = {
    'diseño': 'Diseño',
    'diseno': 'Diseño',
    'design': 'Diseño',
    'revision': 'Revision',
    'revisión': 'Revision',
    'review': 'Revision',
    'completado': 'Completado',
    'completo': 'Completado',
    'finished': 'Completado',
    'done': 'Completado',
    'cancelado': 'Cancelado',
    'cancelled': 'Cancelado',
    'canceled': 'Cancelado',
    'analista': 'Analista',
    'analyst': 'Analista'
  };
  
  // Si existe en el mapeo, usar el valor normalizado
  if (statusMap[lower]) {
    return statusMap[lower];
  }
  
  // Si no está en el mapeo, capitalizar la primera letra
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// Función para inicializar el selector de usuario
function initializeUserSelector() {
  const userSelect = document.getElementById('userSelect');
  if (userSelect) {
    // Establecer Usuario como valor por defecto
    userSelect.value = 'usuario';
    
    // Agregar event listener para cambios
    userSelect.addEventListener('change', function() {
      const userInfo = getCurrentUserInfo();
      console.log(`Usuario cambiado a: ${userInfo.displayName}`);
    });
  }
}
let workingImage = null; // {imageName: string, itemCode: string, section: string, originalPosition: {row, col}}
let imageGridData = {}; // Cache de datos del grid actual para operaciones rápidas

// Variable global para el Item Group actual
let currentItemGroup = null; // Para mantener referencia al Item Group cargado

// Event Listeners (sección limpia)
document.addEventListener('DOMContentLoaded', function() {
  // SISTEMA DE LOGIN: Inicializar primero
  initializeLoginSystem();
  
  // Los diagnósticos y inicializaciones se ejecutarán solo después del login exitoso
});

// ========== FUNCIONES DEL SISTEMA DE LOGIN ==========

function initializeLoginSystem() {
  console.log('🔐 Inicializando sistema de login...');
  
  // Limpiar localStorage automáticamente al cargar la página (pero preservar estado unificado)
  console.clear();
  
  // Restaurar estado unificado desde localStorage si existe
  try {
    const savedUnifiedState = localStorage.getItem('unifiedViewState');
    if (savedUnifiedState) {
      const parsed = JSON.parse(savedUnifiedState);
      unifiedViewState = { ...unifiedViewState, ...parsed };
    }
  } catch (error) {
    console.error('❌ Error restaurando estado unificado:', error);
  }
  
  // Limpiar otros datos de localStorage (no críticos)
  const keysToKeep = ['unifiedViewState', 'lastActiveFilters'];
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (!keysToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  });
  
  // Iniciar carga de datos en background inmediatamente
  startDataLoading();
  
  // Setup login form
  setupLoginForm();
}

function setupLoginForm() {
  // 🚀 MODO DESARROLLO - AUTO LOGIN (comentar/descomentar para activar)
  const DEV_MODE = false; // Cambiar a false para restaurar login normal
  
  if (DEV_MODE) {
    console.log('🚀 MODO DESARROLLO ACTIVADO - Auto login como Sandra');
    // Auto login inmediato
    currentUser = { name: 'Sandra', group: 'Analista' };
    userAuthenticated = true;
    hideLoginOverlay();
    checkAppAccess();
    return; // Salir sin configurar el formulario
  }
  
  const loginBtn = document.getElementById('loginBtn');
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  
  // Focus automático en el input de usuario al cargar la página
  if (usernameInput) {
    usernameInput.focus();
  }
  
  // Event listeners para el formulario
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }
  
  // Login al presionar Enter
  if (usernameInput && passwordInput) {
    [usernameInput, passwordInput].forEach(input => {
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          handleLogin();
        }
      });
    });
  }
}

// Variables para control de reintentos
let dataLoadingAttempts = 0;
const MAX_LOADING_ATTEMPTS = 3;
let isCurrentlyLoading = false;

async function startDataLoading() {
  // Prevenir múltiples cargas simultáneas
  if (isCurrentlyLoading) {
    console.log('⚠️ Carga ya en progreso, saltando intento duplicado');
    return;
  }
  
  dataLoadingAttempts++;
  isCurrentlyLoading = true;
  
  console.log(`📥 Iniciando carga de datos en background... (Intento ${dataLoadingAttempts}/${MAX_LOADING_ATTEMPTS})`);
  
  try {
    // Cargar Google Sheets (ahora incluye optimización de caché en paralelo)
    await loadFromGoogleSheets();
    
    dataLoaded = true;
    dataLoadingAttempts = 0; // Reset contador en caso de éxito
    console.log('✅ Datos críticos cargados - app lista');
    
    // Nota: El caché puede seguir cargándose en background

    // Verificar si puede acceder a la app
    checkAppAccess();
    
  } catch (error) {
    console.error(`❌ Error cargando datos (Intento ${dataLoadingAttempts}/${MAX_LOADING_ATTEMPTS}):`, error);
    
    // Verificar si es un error de red/conectividad
    const isNetworkError = error.message.includes('Failed to fetch') || 
                          error.message.includes('NetworkError') ||
                          error.message.includes('ERR_NETWORK');
    
    if (isNetworkError) {
      console.warn('🌐 Error de conectividad detectado');
    }
    
    // Solo reintentar si no hemos excedido el límite
    if (dataLoadingAttempts < MAX_LOADING_ATTEMPTS) {
      const retryDelay = dataLoadingAttempts * 2000; // Delay incremental: 2s, 4s, 6s
      console.log(`🔄 Reintentando en ${retryDelay/1000} segundos...`);
      
      setTimeout(() => {
        isCurrentlyLoading = false;
        startDataLoading();
      }, retryDelay);
    } else {
      // Máximo de reintentos alcanzado
      console.error('❌ Máximo de reintentos alcanzado. Continuando con datos parciales...');
      handleDataLoadingFailure();
    }
  }
  
  isCurrentlyLoading = false;
}

function handleDataLoadingFailure() {
  console.log('🚨 Manejando fallo de carga de datos...');
  
  // Verificar qué datos sí se cargaron
  const hasCategory = originalTreeData && originalTreeData.length > 0;
  const hasAssetGroups = currentAssetGroups && currentAssetGroups.length > 0;
  const hasCache = itemGroupDataCache && itemGroupDataCache.size > 0;
  
  console.log('📊 Estado de datos disponibles:', {
    category: hasCategory ? `${originalTreeData.length} elementos` : 'No disponible',
    assetGroups: hasAssetGroups ? `${currentAssetGroups.length} elementos` : 'No disponible',
    cache: hasCache ? `${itemGroupDataCache.size} Item Groups` : 'No disponible'
  });
  
  if (hasCategory) {
    console.log('✅ Datos de categorías disponibles - continuando con funcionalidad limitada');
    
    // Mostrar advertencia sobre rendimiento si no hay caché
    if (!hasCache) {
      console.warn('⚠️ Cache no disponible - la aplicación funcionará más lenta');
      showPerformanceWarning();
    }
    
    dataLoaded = true;
    checkAppAccess();
  } else {
    console.error('❌ Datos críticos no disponibles');
    // Mostrar mensaje de error al usuario
    showConnectionErrorMessage();
  }
}

function showPerformanceWarning() {
  // Verificar si estamos en la página de login o en la app principal
  const isLoginPage = document.getElementById('loginContainer') && 
                     !document.getElementById('inventoryContainer');
  
  if (isLoginPage) {
    // En página de login: mostrar banner menos intrusivo
    showLoginPageWarning();
  } else {
    // En app principal: mostrar toast tradicional
    showAppWarning();
  }
}

function showLoginPageWarning() {
  // Remover warning anterior si existe
  const existing = document.getElementById('login-performance-warning');
  if (existing) existing.remove();
  
  const warningDiv = document.createElement('div');
  warningDiv.id = 'login-performance-warning';
  warningDiv.style.cssText = `
    margin: 15px 0;
    background: linear-gradient(135deg, #FF9800, #F57C00);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
    border-left: 4px solid #F57C00;
    animation: slideIn 0.3s ease-out;
  `;
  warningDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <i class="fa-solid fa-exclamation-triangle" style="font-size: 18px; color: #FFF3E0;"></i>
      <div style="flex: 1;">
        <div style="font-weight: bold; margin-bottom: 2px;">Sistema funcionando en modo básico</div>
        <div style="font-size: 12px; opacity: 0.9;">
          No se pudo cargar el caché de optimización. La aplicación funcionará más lenta de lo normal.
        </div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: rgba(255,255,255,0.2); 
        border: none; 
        color: white; 
        width: 24px;
        height: 24px;
        border-radius: 12px;
        font-size: 14px; 
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      ">×</button>
    </div>
  `;
  
  // Insertar en el loginContainer
  const loginContainer = document.getElementById('loginContainer');
  if (loginContainer) {
    // Buscar un buen lugar para insertar (después del título pero antes del login)
    const loginForm = loginContainer.querySelector('.login-card') || 
                     loginContainer.querySelector('form') ||
                     loginContainer.querySelector('input');
    
    if (loginForm && loginForm.parentNode) {
      loginForm.parentNode.insertBefore(warningDiv, loginForm);
    } else {
      loginContainer.appendChild(warningDiv);
    }
  } else {
    // Fallback: agregar al body
    document.body.appendChild(warningDiv);
  }
  
  // Auto-remover después de 15 segundos
  setTimeout(() => {
    if (document.getElementById('login-performance-warning')) {
      document.getElementById('login-performance-warning').remove();
    }
  }, 15000);
}

function showAppWarning() {
  // Remover warning anterior si existe
  const existing = document.getElementById('app-performance-warning');
  if (existing) existing.remove();
  
  const warningDiv = document.createElement('div');
  warningDiv.id = 'app-performance-warning';
  warningDiv.style.cssText = `
    position: fixed;
    top: 60px;
    right: 20px;
    background: #FF9800;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 9999;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  warningDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <i class="fa-solid fa-exclamation-triangle"></i>
      <div>
        <strong>Caché no disponible</strong><br>
        <small>La aplicación funcionará más lenta</small>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: none; 
        border: none; 
        color: white; 
        font-size: 16px; 
        cursor: pointer;
        margin-left: 8px;
      ">×</button>
    </div>
  `;
  
  document.body.appendChild(warningDiv);
  
  // Auto-remover después de 10 segundos
  setTimeout(() => {
    if (document.getElementById('app-performance-warning')) {
      document.getElementById('app-performance-warning').remove();
    }
  }, 10000);
}

function showConnectionErrorMessage() {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div style="
        display: flex; 
        align-items: center; 
        justify-content: center; 
        height: 100vh; 
        font-family: Arial, sans-serif;
        background: linear-gradient(135deg, #162546 0%, #1D1B28 100%);
        color: white;
      ">
        <div style="text-align: center; max-width: 500px; padding: 20px;">
          <h2 style="color: #e91e63; margin-bottom: 20px;">
            🌐 Error de Conectividad
          </h2>
          <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.5;">
            No se pudo establecer conexión con los servicios de datos. 
            Esto puede deberse a problemas temporales de red o configuración.
          </p>
          <button onclick="retryDataLoading()" style="
            background: #4347FF; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 8px; 
            font-size: 16px; 
            cursor: pointer;
            margin-right: 10px;
          ">
            🔄 Reintentar
          </button>
          <button onclick="location.reload()" style="
            background: #666; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 8px; 
            font-size: 16px; 
            cursor: pointer;
          ">
            🔃 Recargar Página
          </button>
        </div>
      </div>
    `;
  }
}

function retryDataLoading() {
  dataLoadingAttempts = 0; // Reset contador
  isCurrentlyLoading = false;
  
  // Restaurar interfaz de login
  location.reload();
}

function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  const loginBtn = document.getElementById('loginBtn');
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  
  // Limpiar errores previos
  errorDiv.style.display = 'none';
  
  // Validar campos
  if (!username || !password) {
    showLoginError('Por favor completa todos los campos');
    return;
  }
  
  // Validar credenciales
  if (VALID_USERS[username] && VALID_USERS[username].password === password) {
    // Login exitoso - quitar focus de los inputs
    if (usernameInput) usernameInput.blur();
    if (passwordInput) passwordInput.blur();
    
    userAuthenticated = true;
    currentUser = {
      username: username,
      group: VALID_USERS[username].group
    };
    
    // Si los datos no están listos, reemplazar botón con texto de carga
    if (!dataLoaded) {
      loginBtn.style.display = 'none';
      showLoadingText();
    }
    
    // Verificar si puede acceder a la app
    checkAppAccess();
    
  } else {
    showLoginError('Usuario o contraseña incorrectos');
  }
}

function checkAppAccess() {
  if (dataLoaded && userAuthenticated) {
    hideLoginOverlay();
    initializeMainApplication();
  }
  // Si no están ambos listos, no mostrar nada al usuario
}

function hideLoginOverlay() {
  const overlay = document.getElementById('loginOverlay');
  const mainApp = document.getElementById('mainApp');
  
  // Limpiar cualquier animación de loading que esté corriendo
  const loadingText = document.getElementById('loadingTextReplace');
  if (loadingText && loadingText.animationInterval) {
    clearInterval(loadingText.animationInterval);
  }
  
  if (overlay) {
    overlay.style.display = 'none';
  }
  if (mainApp) {
    mainApp.style.display = 'block';
  }
}

function showLoginError(message) {
  const errorDiv = document.getElementById('loginError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

function showLoadingText() {
  const loginInputs = document.querySelector('.login-inputs');
  
  // Crear elemento de texto de carga con el mismo estilo que el botón
  const loadingText = document.createElement('div');
  loadingText.id = 'loadingTextReplace';
  loadingText.style.cssText = `
    background: #9ca3af;
    color: white;
    border: none;
    padding: 16px 24px;
    border-radius: 12px;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: lowercase;
    margin-bottom: -14px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Crear el texto base que no se mueve
  const baseText = document.createElement('span');
  baseText.textContent = 'cargando';
  
  // Crear un contenedor fijo para los puntos
  const dotsContainer = document.createElement('span');
  dotsContainer.style.cssText = `
    display: inline-block;
    width: 24px;
    text-align: left;
  `;
  dotsContainer.textContent = ''; // Empezar sin puntos (0)
  
  // Agregar ambos elementos al contenedor
  loadingText.appendChild(baseText);
  loadingText.appendChild(dotsContainer);
  
  // Agregar el texto donde estaba el botón
  if (loginInputs) {
    loginInputs.appendChild(loadingText);
  }
  
  // Iniciar la animación de puntos (0, 1, 2, 3, 0, 1, 2, 3...)
  let dotCount = 0;
  const loadingInterval = setInterval(() => {
    const dots = '.'.repeat(dotCount);
    dotsContainer.textContent = dots;
    dotCount = (dotCount + 1) % 4; // Cicla entre 0, 1, 2, 3
  }, 500); // Cambia cada 500ms
  
  // Guardar el interval para poder limpiarlo después
  loadingText.animationInterval = loadingInterval;
}

function updateLoadingStatus(message, showSpinner = true) {
  // Esta función ahora no hace nada visible para el usuario
  // Solo para logs internos
}

function initializeMainApplication() {
  // Actualizar información del usuario en el header
  updateUserInfoInHeader();
  
  // DIAGNÓSTICO INICIAL: Verificar configuración y elementos DOM
  runInitialDiagnostics();
  
  // Inicializar sistema de caché de Item Groups
  loadCacheFromLocalStorage();
  
  setupDragAndDrop();
  
  // Inicializar Box 3 con el sistema de galerías
  initializeGallerySystem();
  
  // Inicializar controles del árbol (Box 1)
  const treeDiv = document.getElementById('tree');
  if (treeDiv) {
    initializeTreeControls(treeDiv);
  }
  
  // IMPORTANTE: Renderizar el árbol automáticamente si ya hay datos
  if (currentWorkingData && currentWorkingData.length > 0) {
    renderAssetLibraryTree(currentWorkingData, document.getElementById('tree'));
  }
  
  // Event listener para botón de limpiar Item Groups guardados
  const clearSavedBtn = document.getElementById('clearSavedBtn');
  if (clearSavedBtn) {
    clearSavedBtn.addEventListener('click', clearSavedItemGroups);
  }
}

function updateUserInfoInHeader() {
  const userNameElement = document.getElementById('currentUserName');
  const userGroupElement = document.getElementById('currentUserGroup');
  
  if (currentUser && userNameElement && userGroupElement) {
    // Usar el nombre formateado en lugar del username en minúsculas
    const userInfo = getCurrentUserInfo();
    const formattedName = userInfo?.name || currentUser.username;
    
    userNameElement.textContent = formattedName;
    userGroupElement.textContent = `(${currentUser.group})`;
    console.log(`👤 Usuario actualizado en header: ${formattedName} (${currentUser.group})`);
    
    // Actualizar visibilidad del botón de guardar según el rol
    updateSaveButtonVisibility();
  }
}

// ========== END FUNCIONES DEL SISTEMA DE LOGIN ==========

// Función de diagnóstico inicial
function runInitialDiagnostics() {
  // Verificación básica silenciosa - solo errores críticos
  const criticalElements = ['box3-content', 'tree'];
  const missingElements = criticalElements.filter(id => !document.getElementById(id));
  
  if (missingElements.length > 0) {
    console.error('❌ Elementos DOM críticos no encontrados:', missingElements);
  }
}

// Función para configurar drag and drop del divisor vertical
function setupDragAndDrop() {
  // Vertical divider drag
  verticalDivider.addEventListener('mousedown', initVerticalDrag);
  
  // Horizontal divider drag (entre box1 y box3)
  const horizontalDivider = document.getElementById('horizontalDivider');
  if (horizontalDivider) {
    horizontalDivider.addEventListener('mousedown', (e) => {
      initHorizontalDrag(e, 'box1', 'box3');
    });
  }
}

function initVerticalDrag(e) {
  isVerticalDragging = true;
  startX = e.clientX;
  startLeftWidth = leftSection.getBoundingClientRect().width;
  
  document.addEventListener('mousemove', doVerticalDrag);
  document.addEventListener('mouseup', stopVerticalDrag);
  
  e.preventDefault();
}

function doVerticalDrag(e) {
  if (!isVerticalDragging) return;
  
  const dx = e.clientX - startX;
  const newLeftWidth = startLeftWidth + dx;
  const containerWidth = container.getBoundingClientRect().width;
  const minWidth = 200;
  const maxWidth = containerWidth - minWidth;
  
  if (newLeftWidth >= minWidth && newLeftWidth <= maxWidth) {
    const leftPercent = (newLeftWidth / containerWidth) * 100;
    const rightPercent = 100 - leftPercent;
    
    leftSection.style.width = leftPercent + '%';
    rightSection.style.width = rightPercent + '%';
  }
}

function stopVerticalDrag() {
  isVerticalDragging = false;
  document.removeEventListener('mousemove', doVerticalDrag);
  document.removeEventListener('mouseup', stopVerticalDrag);
}

function initHorizontalDrag(e, topBoxId, bottomBoxId) {
  const topBox = document.getElementById(topBoxId);
  const bottomBox = document.getElementById(bottomBoxId);
  
  if (!topBox || !bottomBox) return;
  
  const startY = e.clientY;
  const containerHeight = leftSection.getBoundingClientRect().height;
  const startTopHeight = topBox.getBoundingClientRect().height;
  
  function doHorizontalDrag(e) {
    const dy = e.clientY - startY;
    const newTopHeight = startTopHeight + dy;
    const minHeight = 100;
    const maxHeight = containerHeight - minHeight;
    
    if (newTopHeight >= minHeight && newTopHeight <= maxHeight) {
      const topPercent = (newTopHeight / containerHeight) * 100;
      const bottomPercent = 100 - topPercent;
      
      topBox.style.height = topPercent + '%';
      bottomBox.style.height = bottomPercent + '%';
    }
  }
  
  function stopHorizontalDrag() {
    document.removeEventListener('mousemove', doHorizontalDrag);
    document.removeEventListener('mouseup', stopHorizontalDrag);
  }
  
  document.addEventListener('mousemove', doHorizontalDrag);
  document.addEventListener('mouseup', stopHorizontalDrag);
  
  e.preventDefault();
}

// Función para cargar datos desde Google Sheets (FASE 1: Carga inicial ligera)
async function loadFromGoogleSheets() {
  const loadButton = document.getElementById('loadExcelBtn');
  let originalText = '';
  let categoryLoaded = false;
  
  try {
    // Mostrar estado de carga solo si el botón existe (compatibilidad)
    if (loadButton) {
      originalText = loadButton.innerHTML;
      loadButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cargando...';
      loadButton.disabled = true;
    }
    
    console.log('📥 Cargando datos desde Google Sheets...');
    
    // Detectar si estamos en un entorno local (file://)
    const isLocalFile = window.location.protocol === 'file:';
    
    if (isLocalFile) {
      console.log('⚠️ Entorno local detectado (file://). Usando Apps Script proxy...');
      
      // En entorno local, continuar con Apps Script normalmente
      // El Apps Script maneja CORS correctamente
    }

    // CARGAS EN PARALELO: Iniciar todas las cargas al mismo tiempo
    console.log('🚀 Iniciando cargas paralelas: category, asset_groups y caché...');
    
    // Crear las promesas para las 3 cargas simultáneas
    const categoryPromise = loadGoogleSheetAsCSV(
      GOOGLE_SHEETS_CONFIG.CATEGORY_SHEET.CSV_URL,
      'category'
    ).then(categoryData => {
      if (!categoryData || categoryData.length === 0) {
        throw new Error('No se pudieron cargar datos de la pestaña category');
      }
      console.log('✅ category cargado en paralelo');
      return categoryData;
    });

    const assetGroupsPromise = loadGoogleSheetAsCSV(null, 'asset_groups')
      .then(assetGroupsData => {
        console.log('✅ asset_groups cargado en paralelo');
        return assetGroupsData || [];
      })
      .catch(error => {
        console.warn('⚠️ asset_groups falló (no crítico):', error.message);
        return []; // Devolver array vacío en caso de error
      });

    const cachePromise = optimizeCache()
      .then(() => {
        console.log('✅ Caché optimizado en paralelo');
        return true;
      })
      .catch(error => {
        console.warn('⚠️ Optimización de caché falló (no crítico):', error.message);
        return false;
      });

    // ESPERAR POR TODAS LAS CARGAS ANTES DE CONTINUAR
    console.log('⏳ Esperando que TODAS las cargas terminen...');
    
    try {
      const [categoryData, assetGroupsData, cacheResult] = await Promise.all([
        categoryPromise,
        assetGroupsPromise, 
        cachePromise
      ]);
      
      console.log('🎉 TODAS las cargas paralelas completadas');
      
      // Procesar category (crítico)
      processCategoryData(categoryData);
      categoryLoaded = true;
      console.log('✅ category procesado');
      
      // Procesar asset_groups
      if (assetGroupsData && assetGroupsData.length > 0) {
        currentAssetGroups = assetGroupsData;
        console.log('✅ asset_groups procesado:', assetGroupsData.length, 'elementos');
        
        // Poblar dropdown
        setTimeout(() => {
          populateGalleryDropdown(currentAssetGroups);
        }, 100);
      } else {
        console.warn('⚠️ asset_groups está vacío');
        currentAssetGroups = [];
      }
      
      console.log('✅ TODO completado - incluyendo pre-procesamiento');
      
    } catch (error) {
      console.error('❌ Error en cargas paralelas:', error);
      throw error;
    }


    assetGroupsPromise.then(assetGroupsData => {
      if (assetGroupsData && assetGroupsData.length > 0) {
        currentAssetGroups = assetGroupsData;
        console.log('� asset_groups procesado:', assetGroupsData.length, 'elementos');
        
        // Poblar dropdown cuando esté listo
        setTimeout(() => {
          populateGalleryDropdown(currentAssetGroups);
        }, 100);
      } else {
        currentAssetGroups = [];
      }
    });

    // El caché continuará cargándose en background
    
    console.log('✅ Carga inicial completada - UI disponible');
    
  } catch (error) {
    console.error('❌ Error crítico cargando desde Google Sheets:', error);
    throw error; // Re-lanzar solo errores críticos
    
  } finally {
    // Restaurar botón solo si existe (compatibilidad)
    if (loadButton && originalText) {
      loadButton.innerHTML = originalText;
      loadButton.disabled = false;
    }
  }
}

// Función auxiliar para cargar datos desde Apps Script proxy (resuelve problemas CORS)
async function loadGoogleSheetAsCSV(csvUrl, sheetName) {
  // Construir URL del proxy
  const proxyUrl = `${GOOGLE_SHEETS_CONFIG.PROXY_URL}?sheet=${sheetName}&format=csv&timestamp=${Date.now()}`;
  
  try {
    const response = await fetch(proxyUrl, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Accept': 'text/csv,text/plain,application/json,*/*'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseText = await response.text();
    
    if (!responseText || responseText.trim().length === 0) {
      throw new Error(`Respuesta vacía del Apps Script para ${sheetName}`);
    }
    
    // Verificar si es un JSON de error
    if (responseText.trim().startsWith('{')) {
      try {
        const jsonResponse = JSON.parse(responseText);
        if (!jsonResponse.success) {
          throw new Error(`Apps Script error: ${jsonResponse.error}`);
        }
        // Si es un JSON exitoso con datos, convertir a CSV
        if (jsonResponse.data) {
          const headers = Object.keys(jsonResponse.data[0] || {});
          const csvLines = [
            headers.join(','),
            ...jsonResponse.data.map(row => headers.map(h => row[h] || '').join(','))
          ];
          return parseCSVToObjects(csvLines.join('\n'), sheetName);
        }
      } catch (parseError) {
        // Si no es JSON válido, continuar tratando como CSV
      }
    }
    
    // Verificar si es HTML (error de Google)
    if (responseText.trim().toLowerCase().startsWith('<!doctype html') || 
        responseText.trim().toLowerCase().startsWith('<html')) {
      throw new Error('Apps Script devolvió HTML - posible error de configuración');
    }
    
    console.log(`✅ ${sheetName} cargado exitosamente desde Apps Script`);
    console.log(`📏 Tamaño de datos: ${responseText.length} caracteres`);
    
    // Convertir CSV a array de objetos
    return parseCSVToObjects(responseText, sheetName);
    
  } catch (error) {
    console.error(`❌ Error cargando ${sheetName} desde Apps Script:`, error);
    
    // Proporcionar información de debug útil
    throw new Error(`❌ Error cargando ${sheetName} desde Apps Script: ${error.message}

🔧 INFORMACIÓN DE DEBUG:
   • Pestaña solicitada: ${sheetName}
   • Apps Script URL: ${GOOGLE_SHEETS_CONFIG.PROXY_URL}
   • Error específico: ${error.message}

✅ VERIFICACIONES:
   • ¿El Apps Script está implementado como "Aplicación web"?
   • ¿El acceso está configurado como "Cualquier persona"?
   • ¿La pestaña "${sheetName}" existe en el Google Sheet?
   
 SOLUCIÓN:
   1. Ve a: https://script.google.com/home/projects
   2. Abre tu proyecto del proxy
   3. Verifica que esté implementado correctamente
   4. Ejecuta la función "test" para verificar que funciona`);
  }
}

// ========================================
// ADAPTADOR PARA DATOS CONCATENADOS
// ========================================

/**
 * Detecta si los datos están concatenados y los transforma al formato expandido
 * @param {Array} data - Datos originales
 * @returns {Array} - Datos en formato expandido (compatible con sistema actual)
 */
function transformDataIfConcatenated(data) {
  if (!data || data.length === 0) {
    return data;
  }
  
  // Detectar si hay columna 'data_concatenated'
  const firstRow = data[0];
  const hasConcatenatedColumn = firstRow.hasOwnProperty('data_concatenated');
  
  if (!hasConcatenatedColumn) {
    return data;
  }
  
  try {
    // Usar el adaptador que creamos
    const expandedData = transformConcatenatedDataToExpanded(data);
    console.log(`✅ Transformación exitosa: ${data.length} → ${expandedData.length} filas`);
    
    // Guardar todos los datos expandidos globalmente para búsqueda de comentarios
    window.allItemGroupsData = expandedData;
    
    // DEBUG: Buscar objetos con comentarios para verificar
    const itemsWithComments = expandedData.filter(item => 
      item['WA_VIS_Comment'] && item['WA_VIS_Comment'].trim()
    );
    
    return expandedData;
    
  } catch (error) {
    console.error('❌ Error transformando datos concatenados:', error);
    return data;
  }
}

// Función auxiliar para expandir una sola fila concatenada
function transformConcatenatedDataToExpanded(concatenatedData) {
  const expandedData = [];
  let processedCount = 0;
  
  concatenatedData.forEach(row => {
    try {
      const expandedRows = expandSingleConcatenatedRow(row);
      expandedData.push(...expandedRows);
      processedCount++;
    } catch (error) {
      // Solo mostrar errores reales, no warnings de imagen
      if (!error.message.includes('imagen') && !error.message.includes('.jpg')) {
        console.error('❌ Error procesando fila:', row, error);
      }
    }
  });
  
  return expandedData;
}

// Función para expandir una sola fila concatenada a múltiples filas
function expandSingleConcatenatedRow(concatenatedRow) {
  const itemGroups = concatenatedRow['Item Groups'];
  const id = concatenatedRow['ID'] || concatenatedRow['Id'];
  const objectType = concatenatedRow['Object Type'];
  const dataConcatenated = concatenatedRow['data_concatenated'];
  
  // Validar que tenemos datos mínimos necesarios
  if (!id || !objectType) {
    return [];
  }
  
  // Si no hay datos concatenados válidos, devolver fila básica
  if (!dataConcatenated || typeof dataConcatenated !== 'string' || dataConcatenated.trim() === '') {
    return [{
      'Item Groups': itemGroups,
      'ID': id,
      'Object Type': objectType,
      'Id': id,
      'IdPath': id,
      'NamePath': '',
      'Name': objectType || id,
      'data_concatenated': dataConcatenated  // PRESERVAR EL CAMPO data_concatenated (aunque esté vacío)
    }];
  }
  
  // Filtrar tipos de objeto que son claramente archivos de imagen
  const isImageFileName = objectType.includes('.jpg') || objectType.includes('.png') || 
                         objectType.includes('.gif') || objectType.includes('.jpeg') ||
                         objectType.includes('_wg') || objectType.includes('_act') ||
                         objectType.includes('_cov') || objectType.includes('_det') ||
                         objectType.includes('charolas_galeria') || objectType.includes('_ill');
  
  if (isImageFileName) {
    // Para archivos de imagen, crear una entrada simplificada sin procesar
    return [{
      'Item Groups': itemGroups,
      'ID': id,
      'Object Type': 'Image',
      'Id': id,
      'IdPath': id,
      'NamePath': '',
      'Name': objectType,
      'Attribute': 'Image',
      'value': objectType,
      'data_concatenated': dataConcatenated  // PRESERVAR EL CAMPO data_concatenated
    }];
  }
  
  // Procesar normalmente solo para tipos de objeto válidos
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
    'Name': parsedData.Name || parsedData.Título || id,
    // Agregar campos parseados directamente
    'CMS': parsedData.CMS || '',
    'Marca': parsedData.Marca || '',
    'Título': parsedData.Título || '',
    'Página de Catálogo': parsedData['Página de Catálogo'] || '',
    'WA Importancia': parsedData['WA Importancia'] || '',
    'WA_VIS_Comment': parsedData['WA_VIS_Comment'] || '',
    'data_concatenated': dataConcatenated  // PRESERVAR EL CAMPO data_concatenated
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
    
    if (parsedData['CMS']) {
      expandedRows.push({
        ...baseRow,
        'Attribute': 'CMS',
        'value': parsedData['CMS']
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

// Función auxiliar: Parser universal para datos concatenados
function parseUniversalConcatenatedData(dataRow) {
  const objectType = dataRow['Object Type'] || dataRow.Object_Type;
  const concatenated = dataRow.data_concatenated;
  const itemGroupId = dataRow['Item Groups'];
  const itemId = dataRow.ID;
  
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
      // console.log('🖼️ DEBUG: Parseando Image con data_concatenated:', concatenated);
      parsedData = parseImageData(concatenated);
      // console.log('🖼️ DEBUG: Resultado parseImageData:', parsedData);
      break;
      
    default:
      // DETECCIÓN COMPLETA: Identificar archivos de imagen y datos concatenados
      const isImageFile = objectType.includes('.jpg') || objectType.includes('.png') || 
                         objectType.includes('.gif') || objectType.includes('.jpeg') ||
                         objectType.includes('_wg') || objectType.includes('_act') ||
                         objectType.includes('_cov') || objectType.includes('_det') ||
                         objectType.includes('charolas_galeria') || objectType.includes('_ill') ||
                         objectType.includes('78-') || objectType.includes('85-') ||
                         objectType.includes('26-') || objectType.includes('-') ||
                         objectType.includes('galeria') || objectType.includes('web') ||
                         objectType.includes('§') || objectType.includes('¬') ||
                         /\d+-\d+-\d+/.test(objectType) || // Patrón de código de producto
                         objectType.toLowerCase().includes('agregar') ||
                         objectType.toLowerCase().includes('foto') ||
                         objectType.toLowerCase().includes('imagen') ||
                         objectType.toLowerCase().includes('ill') ||
                         /charolas_galeria_(web|ill)\d+\.jpg/.test(objectType); // Patrón específico charolas
      
      // NO mostrar NINGUNA advertencia para archivos de imagen o datos concatenados
      if (!isImageFile && !objectType.includes('WA_VIS') && objectType.length > 3) {
        console.warn(`⚠️ Tipo de objeto desconocido: ${objectType}`);
      }
      
      // Intentar parsear como Item Code por defecto si contiene separadores
      if (concatenated.includes('§') || concatenated.includes('¬')) {
        parsedData = parseItemCodeData(concatenated);
      } else {
        parsedData = { Name: objectType || concatenated };
      }
  }
  
  return {
    'Item Groups': dataRow['Item Groups'] || dataRow.Item_Groups,
    'ID': dataRow.ID,
    'Object Type': objectType,
    ...parsedData
  };
}

// Parser para Item Group/Item Code
function parseItemCodeData(concatenated) {
  const FIELD_SEPARATOR = '§';
  const KEY_VALUE_SEPARATOR = '¬';
  
  // ATRIBUTOS FIJOS para Item Code/Item Group (SIEMPRE en este orden)
  const FIXED_ATTRIBUTES = [
    'Name',
    'Marca', 
    'Título',
    'CMS',
    'Página de Catálogo',
    'WA Importancia',
    'WA_VIS_Comment',
    'WA_VIS_Cover',
    'WA_VIS_Gallery',
    'WA_VIS_Rest'
  ];
  
  const parts = concatenated.split(FIELD_SEPARATOR);
  const item = {};
  
  // Procesar cada parte como atributo¬valor
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part && part.includes(KEY_VALUE_SEPARATOR)) {
      const separatorIndex = part.indexOf(KEY_VALUE_SEPARATOR);
      const key = part.substring(0, separatorIndex).trim();
      const value = part.substring(separatorIndex + 1).trim();
      
      if (key) {
        item[key] = value; // Permitir valores vacíos
      }
    }
  }
  
  return item;
}

// Parser específico para objetos Image
function parseImageData(concatenated) {
  const FIELD_SEPARATOR = '§';
  const KEY_VALUE_SEPARATOR = '¬';
  
  // ATRIBUTOS FIJOS para Image (AHORA IGUALES A Item Code/Item Group excepto las imágenes)
  const FIXED_ATTRIBUTES = [
    'Name',
    'Marca', 
    'Título',
    'CMS',
    'Página de Catálogo',
    'WA Importancia',
    'WA_VIS_Comment'
    // NOTE: Image NO tiene WA_VIS_Cover, WA_VIS_Gallery, WA_VIS_Rest porque ES la imagen
  ];
  
  const parts = concatenated.split(FIELD_SEPARATOR);
  const item = {};
  
  // Procesar cada parte como atributo¬valor
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part && part.includes(KEY_VALUE_SEPARATOR)) {
      const separatorIndex = part.indexOf(KEY_VALUE_SEPARATOR);
      const key = part.substring(0, separatorIndex).trim();
      let value = part.substring(separatorIndex + 1).trim();
      
      // FIX: Si el valor empieza con el mismo nombre del atributo seguido de ¬, extraer el valor real
      if (value.startsWith(key + KEY_VALUE_SEPARATOR)) {
        value = value.substring(key.length + 1).trim();
      }
      
      if (key) {
        // Solo asignar si el valor no está vacío o si es un campo importante
        item[key] = value;
      }
    }
  }
  
  return item;
}

// ========================================
// FIN ADAPTADOR PARA DATOS CONCATENADOS
// ========================================

// Función auxiliar para parsear CSV a objetos
function parseCSVToObjects(csvText, sheetName) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error(`El archivo ${sheetName} no tiene datos suficientes (necesita al menos 2 líneas)`);
  }
  
  const headers = parseCSVLine(lines[0]);
  const data = [];
    
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length > 0 && values.some(v => v.trim())) { // Solo agregar filas no vacías
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }
  
  return data;
}

// Función auxiliar para parsear una línea CSV considerando comillas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, '')); // Remover comillas del principio y final
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim().replace(/^"|"$/g, '')); // Procesar el último campo
  return result;
}

// Función para procesar los datos de category y generar el árbol
function processCategoryData(categoryData) {
  try {
    // Filtrar solo las columnas necesarias del archivo category
    const expectedColumns = GOOGLE_SHEETS_CONFIG.CATEGORY_SHEET.COLUMNS;
    
    const filteredData = categoryData.map(row => {
      const filtered = {};
      expectedColumns.forEach(col => {
        // Mapear ObjectTypeName a Object Type para compatibilidad
        if (col === 'ObjectTypeName') {
          filtered['Object Type'] = row[col] || '';
        } else {
          filtered[col] = row[col] || '';
        }
      });
      return filtered;
    });
    
    // Guardar datos globalmente
    currentWorkingData = [...filteredData];
    allLibraryData = [...filteredData];
    originalTreeData = [...filteredData]; // Preservar datos con NamePath para navegación
    currentColumnsOrder = [...expectedColumns];
    
    // NUEVO: Inicializar commentedItemsData después de cargar allLibraryData
    console.log('🔄 Inicializando commentedItemsData después de cargar datos...');
    initializeCommentedItemsData();
    
    console.log(`✅ DATOS DE CATEGORY PROCESADOS:`);
    console.log(`   - currentWorkingData: ${currentWorkingData.length}`);
    console.log(`   - allLibraryData: ${allLibraryData.length}`);
    console.log(`   - originalTreeData: ${originalTreeData.length}`);
    console.log(`   - commentedItemsData: ${commentedItemsData.length}`);
    
    // Debug: verificar Item Groups con NamePath
    const itemGroupsWithNamePath = originalTreeData.filter(item => 
      item['Object Type'] === 'Item Group' && item.NamePath && item.NamePath.trim() !== ''
    ).length;
    const itemGroupsTotal = originalTreeData.filter(item => 
      item['Object Type'] === 'Item Group'
    ).length;
    console.log(`📊 Item Groups en originalTreeData: ${itemGroupsTotal} total, ${itemGroupsWithNamePath} con NamePath válido`);
    
    // Limpiar arrays de comentarios ya que no los tenemos en esta fase
    // Los comentarios de imágenes se cargan automáticamente desde objetos tipo 'Image'
    
    // Renderizar el árbol
    const treeContainer = document.getElementById('tree');
    if (treeContainer && filteredData.length > 0) {
      console.log('🔄 Iniciando renderizado del árbol...');
      try {
        renderAssetLibraryTree(filteredData, treeContainer);
        console.log('✅ Árbol renderizado exitosamente');
      } catch (treeError) {
        console.error('❌ Error renderizando árbol:', treeError);
      }
    }
    
    // Reinicializar Box 3 y limpiar Box 4
    try {
      reinitializeBoxContents();
      console.log('✅ Boxes reinicializados');
    } catch (reinitError) {
      console.error('❌ Error reinicializando boxes:', reinitError);
    }
    
  } catch (error) {
    console.error("❌ Error procesando datos de category:", error);
    throw new Error(`Error procesando datos: ${error.message}`);
  }
}

// ===== FASE 2: CARGA BAJO DEMANDA =====

// Función para cargar datos de un Item Group específico (MÉTODO OPTIMIZADO + FALLBACK)
async function loadItemGroupFromDatabase(itemGroupId) {
  try {
    // PRIORIDAD 1: Buscar en window.allItemGroupsData (datos del botón Optimizar)
    if (window.allItemGroupsData && window.allItemGroupsData.length > 0) {
      const itemGroupData = window.allItemGroupsData.filter(item => {
        const itemGroups = String(item['Item Groups'] || '');
        const itemGroupIds = itemGroups.split(',').map(id => id.trim()).filter(id => id);
        return itemGroupIds.includes(itemGroupId);
      });
      
      if (itemGroupData && itemGroupData.length > 0) {
        return itemGroupData;
      }
    }
    
    // PRIORIDAD 2: Buscar en caché local (itemGroupDataCache)
    if (allItemGroupsLoaded && itemGroupDataCache.has(itemGroupId)) {
      const cachedData = itemGroupDataCache.get(itemGroupId);
      return cachedData;
    }
    
    // PRIORIDAD 3: Solo si no hay datos en caché, hacer fetch a Google
    
    // MÉTODO DIRECTO: Intentar primero el filtrado en Apps Script (más rápido)
    const directUrl = `${GOOGLE_SHEETS_CONFIG.DATA_PROXY_URL}?action=getItemGroupData&itemGroupId=${itemGroupId}&timestamp=${Date.now()}`;
    
    try {
      const directResponse = await fetch(directUrl, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Accept': 'text/csv,text/plain,application/json,*/*'
        },
        timeout: 10000  // Timeout más corto para método directo
      });
      
      if (directResponse.ok) {
        const directData = await directResponse.text();
        const parsedDirectData = parseCSVToObjects(directData, 'data');
        return parsedDirectData;
      }
    } catch (directError) {
      console.warn(`⚠️ Método directo falló: ${directError.message}`);
    }
    
    // FALLBACK: Si el método directo falla, usar el método completo
    const dataSheetUrl = `${GOOGLE_SHEETS_CONFIG.DATA_PROXY_URL}?sheet=data&format=csv&timestamp=${Date.now()}`;
    
    const response = await fetch(dataSheetUrl, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Accept': 'text/csv,text/plain,application/json,*/*'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseText = await response.text();
    
    if (!responseText || responseText.trim().length === 0) {
      throw new Error(`Respuesta vacía del Apps Script`);
    }
    
    // Convertir CSV a array de objetos
    const allData = parseCSVToObjects(responseText, 'data');
    
    // 🔄 NUEVO: Detectar si los datos están concatenados y transformarlos
    const processedData = transformDataIfConcatenated(allData);
    
    if (!processedData || processedData.length === 0) {
      throw new Error('No se pudieron cargar datos de la pestaña data');
    }
    
    // Filtrar solo los datos de este Item Group en el frontend
    const itemGroupData = processedData.filter(row => {
      const rowItemGroupId = String(row['Item Groups'] || '').trim();
      
      // Manejar valores concatenados (ej: "34948,35001,35022")
      if (rowItemGroupId.includes(',')) {
        const itemGroupIds = rowItemGroupId.split(',').map(id => id.trim());
        return itemGroupIds.includes(String(itemGroupId));
      } else {
        return rowItemGroupId === String(itemGroupId);
      }
    });
    
    if (itemGroupData.length === 0) {
      console.warn(`⚠️ No se encontraron datos para Item Group: ${itemGroupId}`);
      return [];
    }
    
    return itemGroupData;
    
  } catch (error) {
    console.error(`❌ Error cargando Item Group ${itemGroupId}:`, error);
    throw new Error(`❌ Error cargando Item Group ${itemGroupId}: ${error.message}`);
  }
}

// Función para cargar detalles de un Item Group específico (FASE 2: Carga bajo demanda)
async function loadItemGroupDetails(itemGroupId) {
  if (!itemGroupId) {
    throw new Error('ID de Item Group requerido');
  }
  
  try {
    // Llamar al NUEVO Apps Script que filtra por Item Group ID
    const itemGroupData = await loadItemGroupFromDatabase(itemGroupId);
    
    if (!itemGroupData || itemGroupData.length === 0) {
      console.warn(`⚠️ No se encontraron datos para Item Group: ${itemGroupId}`);
      return null;
    }
    
    // Los datos vienen en formato Attribute-Value, necesitan transformación específica
    // Transformar los datos de formato Attribute-Value al formato esperado por el grid
    const transformedData = transformAttributeValueData(itemGroupData);
    
    return transformedData;
    
  } catch (error) {
    console.error(`❌ Error cargando detalles de Item Group ${itemGroupId}:`, error);
    throw error;
  }
}

// Función para transformar datos de estructura concatenada al formato esperado por el grid
function transformKeyValueData(keyValueData) {
  console.log(`🔍 ═══════ INICIANDO TRANSFORMACIÓN DE DATOS CONCATENADOS ═══════`);
  console.log(`📊 Datos de entrada: ${keyValueData.length} filas`);
  
  const transformedItems = {};
  
  // Procesar cada fila que viene con data_concatenated
  keyValueData.forEach((row, index) => {
    const id = row['ID'];
    const objectType = row['Object Type'];
    const dataConcatenated = row['data_concatenated'];
        
    if (!transformedItems[id]) {
      console.log(`     🆕 Creando nuevo item para ID: ${id}`);
      transformedItems[id] = {
        'Item Groups': row['Item Groups'],
        'ID': id,
        Id: id,
        'Object Type': objectType,
        // Campos básicos que siempre necesitamos
        Name: '',
        NamePath: '',
        IdPath: '',
        CMS: '',
        Marca: '',
        'Página de Catálogo': '',
        Título: '',
        'WA Importancia': '',
        'WA_VIS_Comment': '',
        Vis_color: '',
        filtro_color: '',
        // Campos de imágenes que se llenarán dinámicamente
        'WA_Cover_Image_01': '', 'WA_Cover_Image_02': '', 'WA_Cover_Image_03': '', 'WA_Cover_Image_04': '', 'WA_Cover_Image_05': ''
      };
      
      // Agregar campos WA_Gallery dinámicamente
      for (let i = 1; i <= 25; i++) {
        transformedItems[id][`WA_Gallery_${String(i).padStart(2, '0')}`] = '';
      }
      
      // Agregar campos WA_Rest dinámicamente
      for (let i = 1; i <= 25; i++) {
        transformedItems[id][`WA_Rest_${String(i).padStart(2, '0')}`] = '';
      }
    } else {
      // Si ya existe, preservar el Object Type de Item Group si este es Item Group
      if (objectType === 'Item Group') {
        console.log(`     🔄 Actualizando item existente ID ${id} - preservando Object Type: Item Group`);
        transformedItems[id]['Object Type'] = 'Item Group';
      }
    }
    
    // PARSEAR LOS DATOS CONCATENADOS usando parseUniversalConcatenatedData
    if (dataConcatenated && dataConcatenated.trim() !== '') {
      console.log(`     🔍 Parseando datos concatenados para ID ${id}...`);
      const parsedData = parseUniversalConcatenatedData(row);
      
      // Mapear los campos parseados al item transformado
      Object.keys(parsedData).forEach(key => {
        if (key !== 'Item Groups' && key !== 'ID' && key !== 'Object Type') {
          // Preservar comentarios de Item Group - no sobrescribir si ya existe y es vacío el nuevo
          if (key === 'WA_VIS_Comment') {
            if (objectType === 'Item Group' || !transformedItems[id][key] || !transformedItems[id][key].trim()) {
              transformedItems[id][key] = parsedData[key];
              console.log(`     ✅ Mapeando WA_VIS_Comment para ID ${id} (${objectType}): "${parsedData[key]}"`);
            } else {
              console.log(`     🔄 Preservando WA_VIS_Comment existente para ID ${id}: "${transformedItems[id][key]}"`);
            }
          } else {
            transformedItems[id][key] = parsedData[key];
            
            // Logs específicos para campos importantes
            if (key === 'CMS') {
              console.log(`     ✅ Mapeando CMS para ID ${id}: "${parsedData[key]}"`);
            } else if (key === 'Marca') {
              console.log(`     ✅ Mapeando Marca para ID ${id}: "${parsedData[key]}"`);
            } else if (key === 'Título') {
              console.log(`     ✅ Mapeando Título para ID ${id}: "${parsedData[key]}"`);
            }
          }
        }
      });

      // 🖼️ DIVIDIR IMÁGENES CONCATENADAS EN COLUMNAS INDIVIDUALES
      // Procesar WA_VIS_Cover -> WA_Cover_Image_01, WA_Cover_Image_02, etc.
      if (parsedData['WA_VIS_Cover'] && parsedData['WA_VIS_Cover'].trim()) {
        const coverImages = parsedData['WA_VIS_Cover'].split(',').map(img => img.trim()).filter(img => img);
        console.log(`     🖼️ Dividiendo WA_VIS_Cover para ID ${id}: ${coverImages.length} imágenes`);
        coverImages.forEach((image, index) => {
          if (index < 5) { // Máximo 5 imágenes cover
            const fieldName = `WA_Cover_Image_${String(index + 1).padStart(2, '0')}`;
            transformedItems[id][fieldName] = image;
            console.log(`     ✅ ${fieldName}: "${image}"`);
          }
        });
      }

      // Procesar WA_VIS_Gallery -> WA_Gallery_01, WA_Gallery_02, etc.
      if (parsedData['WA_VIS_Gallery'] && parsedData['WA_VIS_Gallery'].trim()) {
        const galleryImages = parsedData['WA_VIS_Gallery'].split(',').map(img => img.trim()).filter(img => img);
        console.log(`     🖼️ Dividiendo WA_VIS_Gallery para ID ${id} (${objectType}): ${galleryImages.length} imágenes`);
        
        // SOLO actualizar galería si es Item Group O si no hay galería existente
        const shouldUpdateGallery = objectType === 'Item Group' || !transformedItems[id]['WA_Gallery_01'] || !transformedItems[id]['WA_Gallery_01'].trim();
        
        if (shouldUpdateGallery) {
          console.log(`     ✅ Actualizando galería para ${objectType} ID ${id}`);
          galleryImages.forEach((image, index) => {
            if (index < 25) { // Máximo 25 imágenes gallery
              const fieldName = `WA_Gallery_${String(index + 1).padStart(2, '0')}`;
              transformedItems[id][fieldName] = image;
              if (index < 4) { // Solo mostrar las primeras 4 en logs
                console.log(`     ✅ ${fieldName}: "${image}"`);
              } else if (index === 4) {
                console.log(`     ✅ ... y ${galleryImages.length - 4} imágenes más`);
              }
            }
          });
        } else {
          console.log(`     🔄 Preservando galería existente del Item Group para ID ${id} (actual: "${transformedItems[id]['WA_Gallery_01']}")`);
        }
      }

      // Procesar WA_VIS_Rest -> WA_Rest_01, WA_Rest_02, etc.
      if (parsedData['WA_VIS_Rest'] && parsedData['WA_VIS_Rest'].trim()) {
        const restImages = parsedData['WA_VIS_Rest'].split(',').map(img => img.trim()).filter(img => img);
        console.log(`     🖼️ Dividiendo WA_VIS_Rest para ID ${id}: ${restImages.length} imágenes`);
        restImages.forEach((image, index) => {
          if (index < 25) { // Máximo 25 imágenes rest
            const fieldName = `WA_Rest_${String(index + 1).padStart(2, '0')}`;
            transformedItems[id][fieldName] = image;
            if (index < 4) { // Solo mostrar las primeras 4 en logs
              console.log(`     ✅ ${fieldName}: "${image}"`);
            } else if (index === 4) {
              console.log(`     ✅ ... y ${restImages.length - 4} imágenes más`);
            }
          }
        });
      }
    } else {
      console.log(`     ⚠️ No hay datos concatenados para ID ${id}`);
    }
  });
  
  // Buscar información adicional en los datos básicos del árbol para completar Name, NamePath, etc.
  Object.keys(transformedItems).forEach(id => {
    const basicData = allLibraryData.find(item => 
      String(item.Id) === String(id)
    );
    
    if (basicData) {
      transformedItems[id].Name = basicData.Name || transformedItems[id].Name || '';
      transformedItems[id].NamePath = basicData.NamePath || '';
      transformedItems[id].IdPath = basicData.IdPath || '';
      transformedItems[id].Vis_color = basicData.Vis_color || '';
      transformedItems[id].filtro_color = basicData.filtro_color || '';
    }
  });
  
  return transformedItems;
}

// Función para transformar datos de formato Attribute-Value al formato esperado por el grid
function transformAttributeValueData(attributeValueData) {
  const transformedItems = {};
  
  // Procesar cada fila que viene con Attribute y value
  attributeValueData.forEach((row, index) => {
    const id = row['ID'];
    const objectType = row['Object Type'];
    const attribute = row['Attribute'];
    const value = row['value'];
    
    if (!transformedItems[id]) {
      // Buscar el CMS en los datos del caché original (antes de transformAttributeValueData)
      let cmsFromCache = '';
      if (window.itemGroupDataCache) {
        window.itemGroupDataCache.forEach((itemGroupData) => {
          const foundItem = itemGroupData.find(item => item.Id === id || item.ID === id);
          if (foundItem && foundItem.CMS) {
            cmsFromCache = foundItem.CMS;
          }
        });
      }
      
      transformedItems[id] = {
        'Item Groups': row['Item Groups'],
        'ID': id,
        Id: id,
        'Object Type': objectType,
        // Campos básicos que siempre necesitamos
        Name: '',
        NamePath: '',
        IdPath: '',
        CMS: cmsFromCache || '',
        Marca: '',
        'Página de Catálogo': '',
        Título: '',
        'WA Importancia': '',
        'WA_VIS_Comment': '',
        Vis_color: '',
        filtro_color: '',
        // Campos de galería
        'WA_Cover_Image_01': '', 'WA_Cover_Image_02': '', 'WA_Cover_Image_03': '', 'WA_Cover_Image_04': '', 'WA_Cover_Image_05': '',
        'WA_Gallery_01': '', 'WA_Gallery_02': '', 'WA_Gallery_03': '', 'WA_Gallery_04': '', 'WA_Gallery_05': '',
        'WA_Gallery_06': '', 'WA_Gallery_07': '', 'WA_Gallery_08': '', 'WA_Gallery_09': '', 'WA_Gallery_10': '',
        'WA_Gallery_11': '', 'WA_Gallery_12': '', 'WA_Gallery_13': '', 'WA_Gallery_14': '', 'WA_Gallery_15': '',
        'WA_Gallery_16': '', 'WA_Gallery_17': '', 'WA_Gallery_18': '', 'WA_Gallery_19': '', 'WA_Gallery_20': '',
        'WA_Gallery_21': '', 'WA_Gallery_22': '', 'WA_Gallery_23': '', 'WA_Gallery_24': '', 'WA_Gallery_25': '',
        'WA_Rest_01': '', 'WA_Rest_02': '', 'WA_Rest_03': '', 'WA_Rest_04': '', 'WA_Rest_05': '',
        'WA_Rest_06': '', 'WA_Rest_07': '', 'WA_Rest_08': '', 'WA_Rest_09': '', 'WA_Rest_10': '',
        'WA_Rest_11': '', 'WA_Rest_12': '', 'WA_Rest_13': '', 'WA_Rest_14': '', 'WA_Rest_15': '',
        'WA_Rest_16': '', 'WA_Rest_17': '', 'WA_Rest_18': '', 'WA_Rest_19': '', 'WA_Rest_20': '',
        'WA_Rest_21': '', 'WA_Rest_22': '', 'WA_Rest_23': '', 'WA_Rest_24': '', 'WA_Rest_25': '',
        'WA_VIS_Cover': '',
        'WA_VIS_Gallery': '',
        'WA_VIS_Rest': ''
      };
    } else {
      // Preservar Object Type del Item Group sobre Item Code cuando comparten ID
      if (transformedItems[id]['Object Type'] === 'Item Group' && objectType === 'Item Code') {
        // Preservar Item Group Object Type
      } else {
        transformedItems[id]['Object Type'] = objectType;
      }
    }
    
    // Asignar el valor al atributo correspondiente
    if (attribute && value) {
      transformedItems[id][attribute] = value;
      
      // Procesar WA_VIS_Cover -> WA_Cover_Image_01, WA_Cover_Image_02, etc.
      if (attribute === 'WA_VIS_Cover' && value.trim()) {
        const coverImages = value.split(',').map(img => img.trim()).filter(img => img);
        
        // SOLO actualizar cover si es Item Group O si no hay cover existente
        const shouldUpdateCover = objectType === 'Item Group' || !transformedItems[id]['WA_Cover_Image_01'] || !transformedItems[id]['WA_Cover_Image_01'].trim();
        
        if (shouldUpdateCover) {
          coverImages.forEach((image, index) => {
            if (index < 5) { // Máximo 5 imágenes cover
              const fieldName = `WA_Cover_Image_${String(index + 1).padStart(2, '0')}`;
              transformedItems[id][fieldName] = image;
            }
          });
        }
      }
      
      // Procesar WA_VIS_Gallery -> WA_Gallery_01, WA_Gallery_02, etc.
      if (attribute === 'WA_VIS_Gallery' && value.trim()) {
        const galleryImages = value.split(',').map(img => img.trim()).filter(img => img);
        
        // SOLO actualizar galería si es Item Group O si no hay galería existente
        const shouldUpdateGallery = objectType === 'Item Group' || !transformedItems[id]['WA_Gallery_01'] || !transformedItems[id]['WA_Gallery_01'].trim();
        
        if (shouldUpdateGallery) {
          galleryImages.forEach((image, index) => {
            if (index < 25) { // Máximo 25 imágenes gallery
              const fieldName = `WA_Gallery_${String(index + 1).padStart(2, '0')}`;
              transformedItems[id][fieldName] = image;
            }
          });
        }
      }
      
      // Procesar WA_VIS_Rest -> WA_Rest_01, WA_Rest_02, etc.
      if (attribute === 'WA_VIS_Rest' && value.trim()) {
        const restImages = value.split(',').map(img => img.trim()).filter(img => img);
        
        // SOLO actualizar rest si es Item Group O si no hay rest existente
        const shouldUpdateRest = objectType === 'Item Group' || !transformedItems[id]['WA_Rest_01'] || !transformedItems[id]['WA_Rest_01'].trim();
        
        if (shouldUpdateRest) {
          restImages.forEach((image, index) => {
            if (index < 25) { // Máximo 25 imágenes rest
              const fieldName = `WA_Rest_${String(index + 1).padStart(2, '0')}`;
              transformedItems[id][fieldName] = image;
              if (index < 3) { // Solo mostrar las primeras 3 en logs
              }
            }
          });
        } else {
        }
      }
    }
  });
  
  // Buscar información adicional en los datos básicos del árbol para completar Name, NamePath, etc.
  Object.keys(transformedItems).forEach(id => {
    const basicData = allLibraryData.find(item => 
      String(item.Id) === String(id)
    );
    
    if (basicData) {
      transformedItems[id].Name = basicData.Name || transformedItems[id].Name || '';
      transformedItems[id].NamePath = basicData.NamePath || '';
      transformedItems[id].IdPath = basicData.IdPath || '';
      transformedItems[id].Vis_color = basicData.Vis_color || '';
      transformedItems[id].filtro_color = basicData.filtro_color || '';
    }
    
    // FALLBACK: Si Name sigue vacío, usar el ID como nombre
    if (!transformedItems[id].Name || transformedItems[id].Name.trim() === '') {
      // Para Item Codes, usar el ID que generalmente es el código del producto
      if (transformedItems[id]['Object Type'] === 'Item Code') {
        transformedItems[id].Name = transformedItems[id].Id || transformedItems[id].ID || 'Item Code';
      } else if (transformedItems[id]['Object Type'] === 'Item Group') {
        transformedItems[id].Name = `Item Group ${transformedItems[id].Id || transformedItems[id].ID}`;
      }
    }
  });
  
  // Convertir objeto a array
  const resultArray = Object.values(transformedItems);
  
  
  return resultArray;
}

// Función auxiliar para procesar workbook desde Google Sheets
function processWorkbook(workbook) {
  try {
    // Guarda todas las hojas originales
    originalExcelSheets = {};
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      originalExcelSheets[sheetName] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    });
    
    console.log('📊 Hojas encontradas:', Object.keys(originalExcelSheets));
    console.log('🗂️ originalExcelSheets guardado:', originalExcelSheets);
    
    // Columnas esperadas para procesamiento
    const expectedColumns = [
      'ID_Imagen', 'ID_Asset', 'Asset_Num', 'Asset_Name_ES', 'Asset_Name_EN', 'Description_ES', 'Description_EN',
      'Asset_Group', 'Supplier', 'Manufacturer', 'Model', 'Serial_Number', 'Location', 'Responsible',
      'Installation_Date', 'Warranty_Date', 'Service_Schedule', 'Last_Service', 'Service_Notes',
      'Condition', 'Criticality', 'Cost_Center', 'Purchase_Cost', 'Current_Value', 'Depreciation_Rate',
      'Status', 'Comments', 'Tech_Specs', 'Documentation', 'QR_Code', 'Barcode', 'RFID_Tag',
      'GPS_Coordinates', 'Floor_Plan_Location', 'Category', 'Subcategory', 'Brand', 'Color',
      'Dimensions', 'Weight', 'Material', 'Capacity', 'Power_Rating', 'Voltage', 'Frequency',
      'Operating_Temperature', 'Operating_Humidity', 'Certification', 'Safety_Class',
      ...Array.from({length: 22}, (_, i) => `WA_Gallery_${String(i+1).padStart(2,'0')}`),
      ...Array.from({length: 25}, (_, i) => `WA_Rest_${String(i+1).padStart(2,'0')}`)
    ];
    
    // Los comentarios de imágenes ahora se obtienen directamente desde los datos procesados
    // (objetos con Object Type = 'Image' que vienen desde Google Sheets pestaña 'data')
    
    // Procesar hoja asset_groups para galerías
    if (originalExcelSheets['asset_groups']) {
      const assetGroupsSheet = workbook.Sheets["asset_groups"];
      if (assetGroupsSheet) {
        currentAssetGroups = XLSX.utils.sheet_to_json(assetGroupsSheet, { defval: "" });
        console.log(`✅ asset_groups cargado: ${currentAssetGroups.length} registros`);
      }
    }
    
    // Filtrar SOLO los campos necesarios para el trabajo
    const columnsToRead = [
      "NamePath", "Name", "IdPath", "Id", "Object Type", "CMS", "Marca", "Página de Catálogo", "Título", "WA Importancia", "WA_VIS_Comment", "WA_VIS_Approved", "Vis_color", "filtro_color",
      "WA_Cover_Image_01", "WA_Cover_Image_02", "WA_Cover_Image_03", "WA_Cover_Image_04", "WA_Cover_Image_05",
      ...Array.from({length: 22}, (_, i) => `WA_Gallery_${String(i+1).padStart(2,'0')}`),
      ...Array.from({length: 25}, (_, i) => `WA_Rest_${String(i+1).padStart(2,'0')}`)
    ];
    
    const assetRows = allLibraryData.map(row => {
      const filtered = {};
      columnsToRead.forEach(col => {
        filtered[col] = row[col] ?? "";
      });
      return filtered;
    });
    
    // Guardar datos globalmente
    currentWorkingData = [...assetRows];
    currentColumnsOrder = [...columnsToRead];
    
    // Renderizar el árbol usando las columnas filtradas
    const treeContainer = document.getElementById('tree');
    if (treeContainer && allLibraryData && allLibraryData.length > 0) {
      console.log('🔄 Iniciando renderizado del árbol...');
      try {
        renderAssetLibraryTree(assetRows, treeContainer);
        console.log('✅ Árbol renderizado exitosamente');
      } catch (treeError) {
        console.error('❌ Error renderizando árbol:', treeError);
        // Continuar sin fallar todo el proceso
      }
    }
    
    // Reinicializar Box 3 con el sistema de galerías y limpiar Box 4
    console.log('🔄 Iniciando reinitializeBoxContents...');
    try {
      reinitializeBoxContents();
      console.log('✅ reinitializeBoxContents completado');
    } catch (reinitError) {
      console.error('❌ Error en reinitializeBoxContents:', reinitError);
      // Continuar sin fallar todo el proceso
    }
    
    console.log('✅ Procesamiento completo exitoso');
    
  } catch (error) {
    console.error("❌ Error procesando workbook:", error);
    throw new Error(`Error procesando archivo: ${error.message}`);
  }
}

// Función para reinicializar el contenido de los boxes después de cargar Excel
function reinitializeBoxContents() {
  // Reinicializar Box 3 con el sistema de galerías
  initializeGallerySystem();
  
  // Si hay datos de galerías, poblar el dropdown
  console.log('🔄 reinitializeBoxContents - verificando currentAssetGroups...');
  console.log('📊 currentAssetGroups disponible:', !!currentAssetGroups);
  console.log('📊 currentAssetGroups.length:', currentAssetGroups ? currentAssetGroups.length : 'undefined');
  
  if (currentAssetGroups && currentAssetGroups.length > 0) {
    console.log('✅ Llamando populateGalleryDropdown con timeout...');
    setTimeout(() => {
      populateGalleryDropdown(currentAssetGroups);
    }, 100);
  } else {
  }
  
  // Limpiar Box 4
  const box4Content = document.getElementById('box4-content');
  if (box4Content) {
    box4Content.innerHTML = '';
  }
}

// FUNCIÓN PARA CONFIGURAR EVENT LISTENERS DEL ÁRBOL
function setupTreeEventListeners(treeDiv, treeList) {
  
  // Event listener del botón cargar (si existe)
  const cargarBtn = document.getElementById('btn-cargar-categoria');
  if (cargarBtn) {
    // Remover listener previo si existe
    cargarBtn.removeEventListener('click', cargarBtn._clickHandler);
    
    cargarBtn._clickHandler = function() {
      const selected = treeList.querySelector('.category-tree-label.selected');
      if (!selected) {
        alert('Por favor, selecciona un Item Group del árbol.');
        return;
      }
      const infoPath = selected.getAttribute('data-path');
      loadImageGridInBox4(infoPath);
    };
    
    cargarBtn.addEventListener('click', cargarBtn._clickHandler);
  }

  // Select para vista de aprobación (3 estados)
  const approvalSelect = document.getElementById('approvalViewSelect');
  if (approvalSelect) {
    // Remover listener previo si existe
    approvalSelect.removeEventListener('change', approvalSelect._changeHandler);
    
    approvalSelect._changeHandler = function() {
      const selectedView = this.value;
      
      // Obtener contenedores para aplicar cambios
      const box4 = document.getElementById('box4');
      
      // Remover todas las clases previas del árbol y del grid
      treeDiv.classList.remove('approval-view-active', 'approval-filtered-active', 'comments-filtered-active');
      if (box4) box4.classList.remove('approval-view-active', 'approval-filtered-active', 'comments-filtered-active');
      
      removeApprovalColors(treeList);
      removeApprovalColorsFromGrid();
      showAllElements(treeList);
      
      switch (selectedView) {
        case 'normal':
          // Vista normal: sin colores, todo visible
          break;
          
        case 'approval-full':
          // Vista aprobación completa: colores, todo visible
          treeDiv.classList.add('approval-view-active');
          if (box4) box4.classList.add('approval-view-active');
          applyApprovalColors(treeList);
          applyApprovalColorsToGrid();
          break;
          
        case 'approval-filtered':
          // Vista aprobación filtrada: colores + filtro
          treeDiv.classList.add('approval-view-active', 'approval-filtered-active');
          if (box4) box4.classList.add('approval-view-active', 'approval-filtered-active');
          applyFilterAndColors(treeList);
          applyApprovalColorsToGrid();
          break;
          
        case 'comments-filtered':
          // Vista comentarios filtrada: solo filtro por filtro_comment
          treeDiv.classList.add('comments-filtered-active');
          if (box4) box4.classList.add('comments-filtered-active');
          applyCommentsFilter(treeList);
          break;
      }
    };
    
    approvalSelect.addEventListener('change', approvalSelect._changeHandler);
  }

  // Event listeners para búsqueda de catálogo
  const catalogSearchInput = document.getElementById('catalogSearchInput');
  const catalogSearchButton = document.getElementById('catalogSearchButton');
  
  if (catalogSearchInput && catalogSearchButton) {
    let currentCatalogSearchResults = [];
    let currentCatalogSearchIndex = 0;
    let lastSearchTerm = ''; // Track the last search term to differentiate new searches from cycling

    function performCatalogSearch() {
      const searchTerm = catalogSearchInput.value.trim();
      
      if (!searchTerm) {
        return;
      }

      if (!currentWorkingData || currentWorkingData.length === 0) {
        return;
      }

      // Check if this is the same search term (cycling through results) or a new search
      const isNewSearch = searchTerm !== lastSearchTerm;

      if (isNewSearch) {
        // New search - perform the search
        
        // Buscar en la columna Name de VIS_AG_Library_Structure
        const searchResults = currentWorkingData.filter(item => {
          const itemName = item.Name || '';
          return itemName.toLowerCase().includes(searchTerm.toLowerCase());
        });

        if (searchResults.length === 0) {
          alert('No se encontraron resultados para: ' + searchTerm);
          return;
        }

        // Save new search results and reset index
        currentCatalogSearchResults = searchResults;
        currentCatalogSearchIndex = 0;
        lastSearchTerm = searchTerm;
        
        // Go to first result
        navigateToSearchResult();
      } else {
        // Same search term - cycle to next result
        
        if (currentCatalogSearchResults.length === 0) {
          return;
        }
        
        // Navigate to next result (index was already incremented in previous navigateToSearchResult call)
        navigateToSearchResult();
      }
    }

    function navigateToSearchResult() {
      if (currentCatalogSearchResults.length === 0) return;

      const result = currentCatalogSearchResults[currentCatalogSearchIndex];

      // Encontrar el Item Group que contiene este item
      let itemGroupPath = result.NamePath;
      
      // Si el resultado es un Item Code, necesitamos encontrar su Item Group padre
      if (result['Object Type'] === 'Item Code') {
        itemGroupPath = result.NamePath.split('/').slice(0, -1).join('/');
      }

      // Expandir el árbol hasta el Item Group (y también expandir el Item Group para mostrar sus Item Codes)
      expandTreeToPath(itemGroupPath, true);
      
      // Seleccionar el Item Group (no cargarlo, solo seleccionarlo)
      selectItemGroupInTree(itemGroupPath);

      // Avanzar al siguiente resultado para la próxima búsqueda
      currentCatalogSearchIndex = (currentCatalogSearchIndex + 1) % currentCatalogSearchResults.length;
    }

    // Remover listeners previos si existen
    catalogSearchButton.removeEventListener('click', catalogSearchButton._clickHandler);
    catalogSearchInput.removeEventListener('keypress', catalogSearchInput._keypressHandler);
    
    // Event listeners
    catalogSearchButton._clickHandler = performCatalogSearch;
    catalogSearchButton.addEventListener('click', catalogSearchButton._clickHandler);
    
    catalogSearchInput._keypressHandler = function(e) {
      if (e.key === 'Enter') {
        performCatalogSearch();
      }
    };
    catalogSearchInput.addEventListener('keypress', catalogSearchInput._keypressHandler);
  }
}

// FUNCIÓN PARA INICIALIZAR LOS CONTROLES DEL ÁRBOL (sin datos)
function initializeTreeControls(treeDiv) {
  
  // Limpiar contenido previo
  treeDiv.innerHTML = '';

  // Barra de controles superior
  const controlsHeader = document.createElement('div');
  controlsHeader.className = 'category-tree-header';
  treeDiv.appendChild(controlsHeader);

  // Contenedor de controles reordenado: Búsqueda arriba, Aprobación + Cargar abajo
  const approvalToggleContainer = document.createElement('div');
  approvalToggleContainer.className = 'approval-toggle-container';
  approvalToggleContainer.innerHTML = `
    <div class="search-row">
      <input type="text" class="search-input" id="catalogSearchInput" placeholder="Buscar catálogo...">
      <button class="search-button" id="catalogSearchButton">Buscar</button>
    </div>
    <div class="approval-row">
      <select class="form-select approval-select" id="approvalViewSelect">
        <option value="normal">Normal</option>
        <option value="approval-full">Aprobación Completa</option>
        <option value="approval-filtered">Aprobación Filtrada</option>
        <option value="comments-filtered">Imágenes Comentarios</option>
      </select>
      <button class="btn btn-secondary" id="btn-cargar-categoria" disabled>Cargar</button>
    </div>
  `;
  controlsHeader.appendChild(approvalToggleContainer);

  // Contenedor para el árbol (hace scroll, no el header)
  const treeList = document.createElement('div');
  treeList.className = 'category-tree-list';
  treeDiv.appendChild(treeList);

  // Mensaje inicial
  treeList.innerHTML = `
    <div class="tree-placeholder" style="padding: 40px 20px; text-align: center; color: #6b7280; font-style: italic;">
      Carga datos desde Google Sheets para ver el árbol de categorías
    </div>
  `;

  // Configurar event listeners básicos
  setupTreeEventListeners(treeDiv, treeList);
}

// FUNCIÓN PARA RENDERIZAR EL ÁRBOL MODERNO EN EL DIV #tree
function renderAssetLibraryTree(assetRows, treeDiv) {
  
  // --- Construye el árbol jerárquico ---
  const root = {};

  assetRows.forEach(row => {
    const pathParts = row.NamePath.split('/');
    let currentNode = root;
    let currentPath = '';
    for (let i = 0; i < pathParts.length; i++) {
      currentPath = currentPath ? currentPath + '/' + pathParts[i] : pathParts[i];
      if (!currentNode[pathParts[i]]) {
        currentNode[pathParts[i]] = {
          __children: {},
          __info: {}
        };
      }
      // Solo guarda info en el último nodo
      if (i === pathParts.length - 1) {
        currentNode[pathParts[i]].__info = { ...row, path: currentPath };
      }
      currentNode = currentNode[pathParts[i]].__children;
    }
  });

  // --- Buscar el contenedor del árbol existente ---
  let treeList = treeDiv.querySelector('.category-tree-list');
  if (!treeList) {
    // Si no existe, inicializar los controles primero
    initializeTreeControls(treeDiv);
    treeList = treeDiv.querySelector('.category-tree-list');
  }

  // Limpiar solo el contenido del árbol, mantener los controles
  treeList.innerHTML = '';

  // --- Función recursiva para crear HTML del árbol ---
  function createTreeHTML(nodeObj) {
    const ul = document.createElement('ul');
    ul.className = 'category-tree-ul';

    Object.keys(nodeObj).forEach(key => {
      if (key === '__children' || key === '__info') return;
      const node = nodeObj[key];
      const info = node.__info || {};
      const li = document.createElement('li');
      li.className = 'category-tree-li';

      // CMS span
      const cmsSpan = document.createElement('span');
      cmsSpan.className = 'category-cms-label';
      cmsSpan.textContent = info.CMS ? `[${info.CMS}] ` : '';

      // Label principal
      const label = document.createElement('span');
      label.className = 'category-tree-label';
      label.setAttribute('data-path', info.path || key);
      label.textContent = info.Name || key;

      // Crear contenedor para el contenido del li (flex horizontal)
      const contentDiv = document.createElement('div');
      contentDiv.className = 'category-tree-li-content';
      // OPTIMIZACIÓN: Agregar data-path al contenedor para selector más eficiente
      contentDiv.setAttribute('data-path', info.path || key);

      // Estructura visual en el contenedor
      contentDiv.appendChild(cmsSpan);
      contentDiv.appendChild(label);
      
      li.appendChild(contentDiv);

      // Triángulo colapsable si hay hijos
      const childrenKeys = Object.keys(node.__children).filter(k => k !== '__children' && k !== '__info');
      if (childrenKeys.length > 0) {
        const expandBtn = document.createElement('span');
        expandBtn.textContent = '⏵';
        expandBtn.className = 'category-tree-expand-btn';
        expandBtn.setAttribute('aria-expanded', 'false');
        contentDiv.insertBefore(expandBtn, cmsSpan);

        const childrenUl = createTreeHTML(node.__children);
        childrenUl.style.display = 'none';
        
        // Función para expandir/colapsar
        function toggleExpansion() {
          const expanded = expandBtn.getAttribute('aria-expanded') === 'true';
          
          // Auto-colapsar hermanos del mismo nivel si se está expandiendo
          if (!expanded) {
            const parentUl = li.parentElement;
            if (parentUl) {
              // Colapsar todos los hermanos expandidos
              parentUl.querySelectorAll(':scope > li .category-tree-li-content .category-tree-expand-btn[aria-expanded="true"]').forEach(siblingBtn => {
                if (siblingBtn !== expandBtn) {
                  siblingBtn.setAttribute('aria-expanded', 'false');
                  siblingBtn.textContent = '⏵';
                  const siblingLi = siblingBtn.closest('.category-tree-li');
                  const siblingUl = siblingLi.querySelector('.category-tree-ul');
                  if (siblingUl) siblingUl.style.display = 'none';
                }
              });
            }
          }
          
          // Toggle actual
          expandBtn.setAttribute('aria-expanded', !expanded);
          childrenUl.style.display = expanded ? 'none' : 'block';
          expandBtn.textContent = expanded ? '⏵' : '⏷';
        }
        
        // Event listeners
        expandBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          toggleExpansion();
        });
        
        // Guardar la función para usar después
        li.toggleExpansion = toggleExpansion;
        
        li.appendChild(childrenUl);
      } else {
        // Sin hijos: espacio invisible para alinear
        const emptySpan = document.createElement('span');
        emptySpan.className = 'category-tree-expand-btn empty';
        emptySpan.textContent = '⏷';
        emptySpan.style.visibility = 'hidden';
        contentDiv.insertBefore(emptySpan, cmsSpan);
      }

      // Configurar click en el contenido del renglón para TODOS los elementos
      contentDiv.style.cursor = 'pointer';
      contentDiv.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Expandir/colapsar si tiene la función
        if (li.toggleExpansion) {
          li.toggleExpansion();
        }
        
        // Seleccionar si es Item Group
        if (info['Object Type'] === 'Item Group') {
          // Quitar selección previa (solo el sistema original)
          treeList.querySelectorAll('.category-tree-label.selected').forEach(el => el.classList.remove('selected'));
          
          // Marcar como seleccionado (solo el sistema original)
          label.classList.add('selected');
          
          // Habilitar botón de carga
          const cargarBtn = document.getElementById('btn-cargar-categoria');
          if (cargarBtn) {
            cargarBtn.disabled = false;
          }
        }
      });

      // Marcar como seleccionable si es Item Group
      if (info['Object Type'] === 'Item Group') {
        label.classList.add('selectable');
      }
      ul.appendChild(li);
    });
    return ul;
  }

  // Renderiza el árbol
  const treeHtml = createTreeHTML(root);
  treeList.appendChild(treeHtml);

  // Solo configurar event listeners si no están ya configurados
  if (!treeDiv.hasAttribute('data-listeners-setup')) {
    setupTreeEventListeners(treeDiv, treeList);
    treeDiv.setAttribute('data-listeners-setup', 'true');
  }
}

// Función para expandir el árbol hasta un path específico
function expandTreeToPath(targetPath, expandTarget = false) {
  
  const pathParts = targetPath.split('/');
  let currentPath = '';
  
  // Expandir cada nivel del path
  pathParts.forEach((part, index) => {
    if (index === 0) {
      currentPath = part;
    } else {
      currentPath += '/' + part;
    }
    
    // Buscar el elemento usando un método más robusto
    let element = null;
    const allElements = document.querySelectorAll('.category-tree-li-content[data-path]');
    for (const el of allElements) {
      if (el.getAttribute('data-path') === currentPath) {
        element = el;
        break;
      }
    }
    if (element) {
      const toggle = element.querySelector('.category-tree-expand-btn');
      if (toggle && toggle.getAttribute('aria-expanded') === 'false') {
        toggle.click(); // Expandir si está colapsado
      }
    }
  });
  
  // Si expandTarget es true, también expandir el elemento target para mostrar sus hijos
  if (expandTarget) {
    setTimeout(() => {
      let targetElement = null;
      const allTargetElements = document.querySelectorAll('.category-tree-li-content[data-path]');
      for (const el of allTargetElements) {
        if (el.getAttribute('data-path') === targetPath) {
          targetElement = el;
          break;
        }
      }
      
      if (targetElement) {
        const toggle = targetElement.querySelector('.category-tree-expand-btn');
        if (toggle && toggle.getAttribute('aria-expanded') === 'false') {
          toggle.click();
        }
      }
    }, 200);
  }
}

// Función para seleccionar un Item Group en el árbol sin cargarlo
function selectItemGroupInTree(itemGroupPath) {
  
  // Quitar selección previa (usando el sistema original)
  const previousSelected = document.querySelector('.category-tree-label.selected');
  if (previousSelected) {
    previousSelected.classList.remove('selected');
  }
  
  // Esperar un poco para que el árbol se haya expandido completamente
  setTimeout(() => {
    // Encontrar el elemento correcto usando el path
    const targetElement = document.querySelector(`.category-tree-li-content[data-path="${itemGroupPath}"]`);
    if (targetElement) {
      // Buscar el label dentro del elemento
      const targetLabel = targetElement.querySelector('.category-tree-label');
      if (targetLabel) {
        // Usar el sistema de selección original
        targetLabel.classList.add('selected');
        
        // Habilitar botón de carga
        const cargarBtn = document.getElementById('btn-cargar-categoria');
        if (cargarBtn) {
          cargarBtn.disabled = false;
        }
        
        // Hacer scroll para que sea visible
        setTimeout(() => {
          targetElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }, 100);
      } else {
        // Debug limitado  
      }
    } else {
      // Debug limitado
    }
  }, 500); // Delay más largo para asegurar que el árbol esté expandido
}

// Función para cargar la retícula de imágenes en box4 (OPTIMIZADA)
async function loadImageGridInBox4(itemGroupPath) {
  // OPTIMIZACIÓN: Evitar cargas simultáneas del mismo item group
  if (navigationInProgress.has(itemGroupPath)) {
    return; // Ya se está cargando este item group
  }
  
  // Cancelar navegación anterior si existe
  if (navigationTimeouts.has(itemGroupPath)) {
    clearTimeout(navigationTimeouts.get(itemGroupPath));
    navigationTimeouts.delete(itemGroupPath);
  }
  
  // Marcar como en progreso
  navigationInProgress.add(itemGroupPath);
  
  try {
    // INMEDIATAMENTE: Limpiar Box 4 para mostrar estado de carga
    const box4Content = document.getElementById('box4-content');
    if (box4Content) {
      box4Content.innerHTML = '<div class="loading-state">Cargando Item Group...</div>';
    }
    
    // Resetear event listeners para evitar duplicados
    resetItemGroupEventListeners();
    
    // NO limpiar el path - usar exactamente como viene de Google con @fs:
    const originalPath = itemGroupPath;
    
    // OPTIMIZACIÓN: Búsqueda más eficiente con early return
    const itemGroupName = itemGroupPath.split('/').pop();
    
    // ESTRATEGIA MÚLTIPLE PARA ENCONTRAR EL ITEM GROUP (OPTIMIZADA)
    let itemGroup = null;
    let itemGroupId = null;
    
    // 1. Buscar en currentWorkingData por NamePath exacto (más eficiente primero)
    itemGroup = currentWorkingData.find(item => 
      item['Object Type'] === 'Item Group' && item.NamePath === itemGroupPath
    );
    
    if (itemGroup) {
      itemGroupId = itemGroup.Id;
    } else {
      // 2. Buscar por Name en currentWorkingData
      itemGroup = currentWorkingData.find(item => 
        item['Object Type'] === 'Item Group' && item.Name === itemGroupName
      );
      
      if (itemGroup) {
        itemGroupId = itemGroup.Id;
      } else {
        // 3. Buscar en originalTreeData solo si es necesario
        itemGroup = originalTreeData.find(item => 
          item['Object Type'] === 'Item Group' && 
          (item.NamePath === itemGroupPath || item.Name === itemGroupName)
        );
        
        if (itemGroup) {
          itemGroupId = itemGroup.Id;
        }
      }
    }

    if (!itemGroup || !itemGroupId) {
      addContentToBox4(`
        <div class="p-3">
          <p>Item Group no encontrado: "${itemGroupPath}"</p>
          <p>Por favor, asegúrate de que el Item Group existe y está cargado en el sistema.</p>
          <button class="btn btn-primary" onclick="location.reload()">Recargar página</button>
        </div>
      `);
      return;
    }

    // IMPORTANTE: Guardar el Item Group actual globalmente para otras funciones
    currentItemGroup = itemGroup;
    
    // Mostrar estado de carga
    addContentToBox4(`
      <div class="loading-container" style="display: flex; justify-content: center; align-items: center; height: 200px; flex-direction: column;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: #007bff; margin-bottom: 1rem;"></i>
        <p>Cargando datos detallados del Item Group...</p>
      </div>
    `);

    // OPTIMIZACIÓN: Verificar caché primero
    let detailedData = getCachedItemGroup(itemGroupId);
    
    if (!detailedData) {
      // FASE 2: Cargar datos detallados bajo demanda si no están en caché
      detailedData = await loadItemGroupDetails(itemGroupId);
      
      if (detailedData && Object.keys(detailedData).length > 0) {
        // Guardar en caché para futuras cargas
        setCachedItemGroup(itemGroupId, detailedData);
      }
    }
    
    if (!detailedData || Object.keys(detailedData).length === 0) {
      addContentToBox4('<div class="p-3"><p>No se encontraron datos detallados para este Item Group.</p></div>');
      return;
    }
    
    // OPTIMIZACIÓN: Procesar datos más eficientemente
    const allItems = Object.values(detailedData);
    const itemCodes = allItems.filter(item => item['Object Type'] === 'Item Code');
    
    currentLoadedItemGroupData = allItems;
    
    // OPTIMIZACIÓN: Solo agregar elementos nuevos a allLibraryData
    const existingIds = new Set(allLibraryData.map(item => item.Id));
    const newItems = allItems.filter(item => !existingIds.has(item.Id));
    allLibraryData.push(...newItems);

    if (itemCodes.length === 0) {
      addContentToBox4('<div class="p-3"><p>No se encontraron Item Codes para este grupo.</p></div>');
      return;
    }

    // Buscar datos del Item Group en los detalles
    const itemGroupDetails = allItems.find(item => item['Object Type'] === 'Item Group');
    if (itemGroupDetails) {
      currentItemGroup = { ...itemGroupDetails, ...itemGroup };
      
      // Preservar campos críticos del original
      ['CMS', 'Marca', 'Página de Catálogo'].forEach(field => {
        if (!currentItemGroup[field] && itemGroup[field]) {
          currentItemGroup[field] = itemGroup[field];
        }
      });
    }

    // OPTIMIZACIÓN: Columnas pre-calculadas
    const imageColumns = [
      'WA_Cover_Image_01', 'WA_Cover_Image_02', 'WA_Cover_Image_03', 'WA_Cover_Image_04', 'WA_Cover_Image_05',
      ...Array.from({length: 25}, (_, i) => `WA_Gallery_${String(i+1).padStart(2,'0')}`),
      ...Array.from({length: 25}, (_, i) => `WA_Rest_${String(i+1).padStart(2,'0')}`)
    ];

    // Guardar datos actuales para regeneración
    currentItemCodes = [...itemCodes];
    currentImageColumns = [...imageColumns];

    // 🔄 GUARDAR ESTADO ORIGINAL para función de deshacer (solo si cambió)
    if (!originalItemGroupState || originalItemGroupState.itemGroupPath !== itemGroupPath) {
      originalItemGroupState = {
        itemGroupPath: itemGroupPath,
        currentItemCodes: JSON.parse(JSON.stringify(itemCodes)),
        currentImageColumns: JSON.parse(JSON.stringify(imageColumns)),
        currentItemGroup: JSON.parse(JSON.stringify(currentItemGroup)),
        currentWorkingData: JSON.parse(JSON.stringify(currentWorkingData)),
        timestamp: new Date().toISOString()
      };
    }

    // Crear la retícula
    const gridHtml = createImageGrid(itemCodes, imageColumns, currentItemGroup);
    
    // Crear la estructura con barra de controles separada
    const fullHtml = `
      <div class="image-management-container">
        <div class="controls-bar">
          <div class="controls-left">
            <button class="undo-button" id="undoChangesButton" title="Deshacer todos los cambios y volver al estado original">
              <i class="fa-solid fa-reply"></i>
            </button>
            <button class="cleanup-button" id="cleanupGalButton" title="Limpiar GAL: Elimina imágenes que no pertenecen a su Item Code">
              <i class="fa-solid fa-eraser"></i>
            </button>
          </div>
          <div class="controls-center">
            ${isCurrentUserDesigner() ? '' : `
            <button class="save-button" id="saveChangesButton" title="Guardar todos los cambios realizados">
              <i class="fa-solid fa-floppy-disk"></i> Guardar
            </button>
            `}
          </div>
          <div class="controls-right">
            <div class="zoom-controls">
              <button class="zoom-button" id="zoomOut" title="Reducir tamaño"><i class="fa-solid fa-magnifying-glass"></i>−</button>
              <span class="zoom-info" id="zoomInfo">100%</span>
              <button class="zoom-button" id="zoomIn" title="Aumentar tamaño"><i class="fa-solid fa-magnifying-glass"></i>+</button>
            </div>
            <button class="helpbtn" id="helpButton" title="Ayuda de atajos">
              ?
            </button>
          </div>
        </div>
        ${gridHtml}
      </div>
    `;
    
    addContentToBox4(fullHtml);
    
    // Actualizar visibilidad del botón de guardar según el rol del usuario
    updateSaveButtonVisibility();
    
    // OPTIMIZACIÓN: Configuración CSS inmediata
    const container = document.querySelector('.main-container');
    if (container) {
      const imageSize = Math.round(80 * globalZoomScale);
      container.style.setProperty('--image-size', imageSize + 'px');
      
      let fontScale;
      if (globalZoomScale <= 0.5) fontScale = '7px';
      else if (globalZoomScale <= 0.75) fontScale = '8px';
      else if (globalZoomScale <= 1) fontScale = '8px';
      else if (globalZoomScale <= 1.5) fontScale = '9px';
      else if (globalZoomScale <= 2) fontScale = '10px';
      else if (globalZoomScale <= 2.5) fontScale = '11px';
      else fontScale = '12px';
      
      container.style.setProperty('--font-scale', fontScale);
    }
    
    // OPTIMIZACIÓN: Configuración reducida en un solo timeout más corto
    setTimeout(() => {
      setupZoomControls();
      setupScrollSynchronization();
      setupImageSystemEventListeners();
      setupItemGroupDeleteButton();
      setupItemGroupImageClick();
      setupBrandFilter();
      updateMultipleImagesIndicators();
      
      // Aplicar colores de aprobación si están activos
      const treeDiv = document.getElementById('tree');
      if (treeDiv && treeDiv.classList.contains('approval-view-active')) {
        applyApprovalColorsToGrid();
      }
    }, 100); // Reducido de 300ms a 100ms
  } finally {
    // Remover de navegación en progreso
    navigationInProgress.delete(itemGroupPath);
  }
}

// Función para normalizar valores de vis_color del Excel
function normalizeVisColor(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  // Convertir a string y limpiar
  const stringValue = String(value).trim();
  
  // Si es 1, 1.0, o variaciones
  if (stringValue === '1' || stringValue === '1.0' || stringValue === '1.00') {
    return '1';
  }
  
  // Si es 0, 0.0, o variaciones
  if (stringValue === '0' || stringValue === '0.0' || stringValue === '0.00') {
    return '0';
  }
  
  // Para cualquier otro valor, devolver vacío
  return '';
}

// Función para crear la retícula HTML unificada
function createImageGrid(itemCodes, imageColumns, itemGroup = null) {
  // Agrupar columnas por tipo para manejo con scroll
  const columnGroups = {
    cover: imageColumns.filter(col => col.includes('Cover')),
    gallery: imageColumns.filter(col => col.includes('Gallery')),
    rest: imageColumns.filter(col => col.includes('Rest'))
  };

  // Crear una estructura de datos unificada donde cada fila tiene TODOS sus datos
  const unifiedRows = itemCodes.map(itemCode => ({
    itemCode: itemCode,
    coverImages: columnGroups.cover.map(col => itemCode[col] || ''),
    galleryImages: columnGroups.gallery.map(col => itemCode[col] || ''),
    restImages: columnGroups.rest.map(col => itemCode[col] || '')
  }));

  let html = `
    <div class="image-grid-container" id="imageGridContainer">
      <div class="image-grid-header">
        <div class="header-main-info">
          <div class="item-group-info">
            <div class="item-group-image">
              ${itemGroup && itemGroup['WA_Gallery_01'] ? 
                `<img src="https://www.travers.com.mx/media/catalog/product/agility/img/${itemGroup['WA_Gallery_01']}" 
                     alt="Gallery 1" class="group-thumbnail"
                     onerror="this.style.display='none';">
                 <div class="item-group-delete-btn" title="Quitar imagen del Item Group"><i class="fa-solid fa-trash"></i></div>` : 
                '<div class="no-image"><img src="assets/no-img-purple.svg" alt="No image" style="width: 100%; height: 100%; object-fit: contain;"></div>'
              }
              ${itemGroup && itemGroup['WA_VIS_Comment'] && itemGroup['WA_VIS_Comment'].trim() ? 
                `<div class="comment-indicator group-comment" data-comment="${itemGroup['WA_VIS_Comment']}" data-status="${getCurrentStatus(itemGroup['WA_VIS_Comment'])}"><i class="fa-solid fa-comment"></i></div>` : 
                ''
              }
            </div>
            <div class="item-group-details">
              <div class="group-title">
                ${itemGroup ? (itemGroup['Título'] || itemGroup['Title'] || 'Sin título') : 'Información no disponible'}
              </div>
              <div class="group-meta">
                <span class="group-brand">${itemGroup ? (itemGroup['Marca'] || 'Sin marca') : ''}</span>
                <span class="group-page">${itemGroup ? (itemGroup['Página de Catálogo'] || itemGroup['Catalog Page'] || '-') : ''}</span>
                <span class="group-cms">${itemGroup ? (itemGroup['CMS'] || 'Sin CMS') : ''}</span>
                <span class="group-items">${itemCodes.length} items</span>
                <span class="group-id">
                  ${itemGroup ? (
                    itemGroup['Id'] || itemGroup['ID'] ? 
                      `<a href="https://www.travers.com.mx/${itemGroup['Id'] || itemGroup['ID']}" target="_blank" class="group-id-link" title="Ver en Travers.com.mx">${itemGroup['Id'] || itemGroup['ID']}</a>` 
                      : 'Sin ID'
                  ) : ''}
                </span>
              </div>
            </div>
          </div>
          <div class="brand-filter-container">
            <label for="brandFilter" class="brand-filter-label">Filtrar por marca:</label>
            <select id="brandFilter" class="brand-filter-dropdown">
              ${generateBrandFilterOptions(itemCodes)}
            </select>
          </div>
          <div class="selected-image-placeholder">
            <div class="selected-image-container">
              <div class="no-image-selected"><img src="assets/no-img-orange.svg" alt="No image selected" style="width: 100%; height: 100%; object-fit: contain;"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Layout unificado de 4 secciones con scroll master -->
      <div class="unified-grid-layout" id="unifiedGridLayout">
        
        <!-- Contenedor principal con scroll master único -->
        <div class="master-scroll-container" id="masterScrollContainer">
          <div class="unified-table-body" id="unifiedTableBody">
            ${generateUnifiedTableWithHeaders(unifiedRows, columnGroups)}
          </div>
        </div>
      </div>
    </div>`;

  return html;
}

// Función auxiliar para generar la tabla unificada con headers por sección
function generateUnifiedTableWithHeaders(unifiedRows, columnGroups) {
  // SOLUCIÓN HÍBRIDA: Item Code fijo, otros headers sticky pero con scroll horizontal
  return `
    <div class="sections-container">
      
      <!-- Sección 1: Item Code (header fijo directo - NO scroll horizontal) -->
      <div class="section-wrapper item-code-wrapper">
        <div class="section-header item-code-header">Item Code</div>
        <div class="section-scroll-container">
          <div class="section-table">
            ${unifiedRows.map((row, rowIndex) => `
              <div class="table-row" data-row-index="${rowIndex}">
                <div class="table-cell item-code-cell" data-item-code="${row.itemCode.Name || row.itemCode['Item Code'] || row.itemCode.Id || row.itemCode.ID || 'Sin nombre'}" data-name-path="${row.itemCode.NamePath}">
                  ${row.itemCode['WA_VIS_Comment'] && row.itemCode['WA_VIS_Comment'].trim() ? 
                    `<div class="comment-indicator" data-comment="${row.itemCode['WA_VIS_Comment']}" data-status="${getCurrentStatus(row.itemCode['WA_VIS_Comment'])}"><i class="fa-solid fa-comment"></i></div>` : 
                    ''
                  }
                  <div class="item-code-main">${row.itemCode.Name || row.itemCode['Item Code'] || row.itemCode.Id || row.itemCode.ID || 'Sin nombre'}</div>
                  <div class="item-code-meta">
                    <span class="item-importance" data-value="${row.itemCode['WA Importancia'] || row.itemCode['Importancia'] || row.itemCode['Importance'] || ''}">${row.itemCode['WA Importancia'] || row.itemCode['Importancia'] || row.itemCode['Importance'] || ''}</span>
                    <span class="item-brand">${row.itemCode['Marca'] || row.itemCode['Brand'] || ''}</span>
                  </div>
                  <div class="item-title">${row.itemCode['Título'] || row.itemCode['Title'] || ''}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      
      <!-- Sección 2: COV (headers hermanos directos - CON scroll horizontal sincronizado) -->
      ${columnGroups.cover.length > 0 ? `
      <div class="section-wrapper cov-wrapper">
        <!-- Headers COV como hermanos directos (sticky + scroll horizontal) -->
        <div class="section-headers scrollable-headers" data-section="cov">
          ${columnGroups.cover.map((col, index) => {
            const covNumber = (index + 1).toString().padStart(2, '0');
            return `<div class="header-section cover-header">COV ${covNumber}</div>`;
          }).join('')}
        </div>
        <!-- Contenido COV con scroll sincronizado -->
        <div class="section-scroll-container horizontal-scrollable" data-section="cov">
          <div class="section-table">
            ${generateSectionTable(unifiedRows, 'coverImages', columnGroups.cover.length, 'cov')}
          </div>
        </div>
      </div>
      ` : ''}
      
      <!-- Sección 3: GAL (headers hermanos directos - CON scroll horizontal sincronizado) -->
      <div class="section-wrapper gallery-wrapper">
        <!-- Headers Gallery como hermanos directos (sticky + scroll horizontal) -->
        <div class="section-headers scrollable-headers" data-section="gallery">
          ${columnGroups.gallery.map((col, index) => {
            const galNumber = (index + 1).toString().padStart(2, '0');
            return `<div class="header-section gallery-header">GAL ${galNumber}</div>`;
          }).join('')}
        </div>
        <!-- Contenido Gallery con scroll sincronizado -->
        <div class="section-scroll-container horizontal-scrollable" data-section="gallery">
          <div class="section-table">
            ${generateSectionTable(unifiedRows, 'galleryImages', columnGroups.gallery.length, 'gallery')}
          </div>
        </div>
      </div>
      
      <!-- Sección 4: REST (headers hermanos directos - CON scroll horizontal sincronizado) -->
      ${columnGroups.rest.length > 0 ? `
      <div class="section-wrapper rest-wrapper">
        <!-- Headers REST como hermanos directos (sticky + scroll horizontal) -->
        <div class="section-headers scrollable-headers" data-section="rest">
          ${columnGroups.rest.map((col, index) => {
            const restNumber = (index + 1).toString().padStart(2, '0');
            return `<div class="header-section rest-header">RST ${restNumber}</div>`;
          }).join('')}
        </div>
        <!-- Contenido REST con scroll sincronizado -->
        <div class="section-scroll-container horizontal-scrollable" data-section="rest">
          <div class="section-table">
            ${generateSectionTable(unifiedRows, 'restImages', columnGroups.rest.length, 'rest')}
          </div>
        </div>
      </div>
      ` : ''}
      
    </div>
  `;
}

// Función auxiliar para generar las filas de la tabla unificada (legacy - mantenida para compatibilidad)
function generateUnifiedTableRows(unifiedRows, columnGroups) {
  // Redirigir a la nueva función
  return generateUnifiedTableWithHeaders(unifiedRows, columnGroups);
}

// Función auxiliar para generar tabla de una sección específica
function generateSectionTable(unifiedRows, imageProperty, columnCount, sectionName) {
  // Crear tabla real: una fila por Item Code, columnas fijas para todas las imágenes
  return unifiedRows.map((row, rowIndex) => {
    const images = row[imageProperty];
    
    // Crear TODAS las columnas para esta fila, en orden fijo
    const cells = [];
    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
      const imageName = images[colIndex] || '';
      cells.push(`
        <div class="table-cell image-cell" 
             data-row-index="${rowIndex}" 
             data-col-index="${colIndex}" 
             data-section="${sectionName}"
             data-item-code="${row.itemCode.Name}">
          ${imageName ? generateImageCell(imageName, row.itemCode.Name, sectionName, colIndex, images) : generateEmptyImageCell()}
        </div>
      `);
    }
    
    return `
      <div class="table-row" data-row-index="${rowIndex}">
        ${cells.join('')}
      </div>
    `;
  }).join('');
}

// Función auxiliar para generar celda de imagen
function generateImageCell(imageName, itemCode, sectionName = '', colIndex = 0, allImagesInRow = []) {
  const hasComments = hasImageComments(imageName);
  const hasStarComment = hasImageStarComment(imageName);
  
  // Obtener el status actual de la imagen si tiene comentarios
  let statusAttribute = '';
  if (hasComments) {
    const imageComments = getImageComments(imageName);
    const currentStatus = getCurrentStatus(imageComments);
    statusAttribute = currentStatus ? ` data-status="${currentStatus}"` : '';
  }
  
  // Verificar si necesitamos mostrar el indicador de múltiples imágenes
  let multipleImagesIndicator = '';
  if (colIndex === 0 && (sectionName === 'cov' || sectionName === 'rest')) {
    // Contar cuántas imágenes no vacías hay en esta fila para esta sección
    const nonEmptyImages = allImagesInRow.filter(img => img && img.trim() && img !== '');
    if (nonEmptyImages.length > 1) {
      multipleImagesIndicator = `
        <div class="multiple-images-indicator" title="${nonEmptyImages.length} imágenes en ${sectionName.toUpperCase()}">
          <span class="indicator-text">+${nonEmptyImages.length - 1}</span>
        </div>
      `;
    }
  }
  
  return `
    <div class="image-thumbnail-container">
      <img src="https://www.travers.com.mx/media/catalog/product/agility/img/${imageName}" 
           alt="${imageName}" class="image-thumbnail" 
           data-filename="${imageName}"
           onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ci8+CjxwYXRoIGQ9Ik0xMiAxNkwyOCAyNE0yOCAxNkwxMiAyNCIgc3Ryb2tlPSIjOUM5Qzk5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K'; this.title='Imagen no encontrada: ${imageName}';">
      <div class="image-controls">
        <button class="btn-remove" title="Quitar imagen"><i class="fa-solid fa-trash"></i></button>
      </div>
      ${hasComments ? `<div class="comment-bubble image-comment" data-image="${imageName}"${statusAttribute} onclick="handleImageCommentClick(event, '${imageName}')" title="Ver comentarios"><i class="fa-solid fa-comment"></i></div>` : ''}
      ${hasStarComment ? `<div class="star-comment-indicator" title="Imagen nueva"><span class="new-indicator-text">N</span></div>` : ''}
      ${multipleImagesIndicator}
      <div class="image-name">${imageName}</div>
    </div>
  `;
}

// Función auxiliar para generar celda vacía
function generateEmptyImageCell() {
  return `
    <div class="empty-image-cell">
      <div class="drop-zone" title="">
        <span class="add-icon"></span>
      </div>
    </div>
  `;
}

// Función optimizada para actualizar los indicadores de múltiples imágenes
function updateMultipleImagesIndicators() {
  // Buscar todas las filas en las secciones COV y REST
  const covRows = document.querySelectorAll('.cov-wrapper .table-row');
  const restRows = document.querySelectorAll('.rest-wrapper .table-row');
  
  // Actualizar indicadores en COV
  covRows.forEach((row, rowIndex) => {
    updateRowMultipleIndicator(row, rowIndex, 'cov');
  });
  
  // Actualizar indicadores en REST
  restRows.forEach((row, rowIndex) => {
    updateRowMultipleIndicator(row, rowIndex, 'rest');
  });
}

// Función para generar las opciones del filtro de marcas
function generateBrandFilterOptions(itemCodes) {
  // Extraer todas las marcas únicas de los Item Codes
  const brands = new Set();
  
  itemCodes.forEach(item => {
    const brand = item['Marca'] || item['Brand'] || '';
    if (brand && brand.trim()) {
      brands.add(brand.trim());
    }
  });
  
  // Convertir a array y ordenar alfabéticamente
  const sortedBrands = Array.from(brands).sort();
  
  // Generar opciones HTML
  let options = '<option value="">Todas las marcas</option>';
  sortedBrands.forEach(brand => {
    options += `<option value="${brand}">${brand}</option>`;
  });
  
  return options;
}

// Función auxiliar para actualizar el indicador de una fila específica
function updateRowMultipleIndicator(row, rowIndex, sectionName) {
  const cells = row.querySelectorAll('.image-cell');
  const firstCell = cells[0]; // Solo la primera celda puede tener el indicador
  
  if (!firstCell) return;
  
  // Contar cuántas celdas tienen imágenes (no vacías)
  let imageCount = 0;
  cells.forEach(cell => {
    const img = cell.querySelector('.image-thumbnail');
    if (img && img.src && !img.src.includes('placeholder') && !img.src.includes('blank')) {
      imageCount++;
    }
  });
  
  // Buscar si ya existe un indicador
  let existingIndicator = firstCell.querySelector('.multiple-images-indicator');
  
  // Lógica diferente para REST vs COV
  let shouldShowIndicator = false;
  let indicatorText = '';
  let threshold = 1; // Por defecto para COV (mostrar cuando hay más de 1)
  
  if (sectionName === 'rest') {
    // Para REST: mostrar solo cuando hay más de 3 (las visibles en viewport)
    threshold = 3;
    if (imageCount > 3) {
      shouldShowIndicator = true;
      indicatorText = `${imageCount - 3}`; // Solo el número de adicionales
    }
  } else {
    // Para COV: mostrar cuando hay más de 1, sin signo +
    threshold = 1;
    if (imageCount > 1) {
      shouldShowIndicator = true;
      indicatorText = `${imageCount - 1}`; // Solo el número, sin signo +
    }
  }
  
  if (shouldShowIndicator) {
    // Mostrar o actualizar indicador
    if (existingIndicator) {
      // Actualizar contador
      const textElement = existingIndicator.querySelector('.indicator-text');
      if (textElement) {
        textElement.textContent = indicatorText;
      }
      existingIndicator.title = `${imageCount} imágenes en ${sectionName.toUpperCase()}`;
    } else {
      // Crear nuevo indicador
      const container = firstCell.querySelector('.image-thumbnail-container');
      if (container) {
        const indicator = document.createElement('div');
        indicator.className = 'multiple-images-indicator';
        indicator.title = `${imageCount} imágenes en ${sectionName.toUpperCase()}`;
        indicator.innerHTML = `<span class="indicator-text">${indicatorText}</span>`;
        container.appendChild(indicator);
      }
    }
  } else {
    // Quitar indicador si no cumple el threshold
    if (existingIndicator) {
      existingIndicator.remove();
    }
  }
}

// Función auxiliar para generar headers individuales por columna
function generateIndividualHeaders(columnGroups) {
  let headers = '';
  
  // Headers para COV
  if (columnGroups.cover.length > 0) {
    columnGroups.cover.forEach((col, index) => {
      const covNumber = (index + 1).toString().padStart(2, '0');
      headers += `<div class="header-section cover-header">COV ${covNumber}</div>`;
    });
  }
  
  // Headers para Gallery
  columnGroups.gallery.forEach((col, index) => {
    const galNumber = (index + 1).toString().padStart(2, '0');
    headers += `<div class="header-section gallery-header">GAL ${galNumber}</div>`;
  });
  
  // Headers para REST
  if (columnGroups.rest.length > 0) {
    columnGroups.rest.forEach((col, index) => {
      const restNumber = (index + 1).toString().padStart(2, '0');
      headers += `<div class="header-section rest-header">RST ${restNumber}</div>`;
    });
  }
  
  return headers;
}

// Variables para mantener datos de la grilla actual (para regeneración)
let currentItemCodes = [];
let currentImageColumns = [];

// Función para regenerar la grilla de imágenes
function regenerateImageGrid() {
  if (!currentItemCodes.length || !currentImageColumns.length) {
    console.log('No hay datos para regenerar la grilla');
    return;
  }
  
  const box4Content = document.getElementById('box4-content');
  if (!box4Content) {
    console.error('box4-content not found');
    return;
  }
  
  // Regenerar la grilla con los datos actuales
  const gridHtml = createImageGrid(currentItemCodes, currentImageColumns, currentItemGroup);
  
  // Crear la estructura completa con barra de controles
  const fullHtml = `
    <div class="image-management-container">
      <div class="controls-bar">
        <div class="controls-left">
          <button class="undo-button" id="undoChangesButton" title="Deshacer todos los cambios y volver al estado original">
            <i class="fa-solid fa-reply"></i>
          </button>
          <button class="cleanup-button" id="cleanupGalButton" title="Limpiar GAL: Elimina imágenes que no pertenecen a su Item Code">
            <i class="fa-solid fa-eraser"></i>
          </button>
        </div>
        <div class="controls-center">
          ${isCurrentUserDesigner() ? '' : `
          <button class="save-button" id="saveChangesButton" title="Guardar todos los cambios realizados">
            <i class="fa-solid fa-floppy-disk"></i> Guardar
          </button>
          `}
        </div>
        <div class="controls-right">
          <div class="zoom-controls">
            <button class="zoom-button" id="zoomOut" title="Reducir tamaño"><i class="fa-solid fa-magnifying-glass"></i>−</button>
            <span class="zoom-info" id="zoomInfo">100%</span>
            <button class="zoom-button" id="zoomIn" title="Aumentar tamaño"><i class="fa-solid fa-magnifying-glass"></i>+</button>
          </div>
          <button class="btn btn-secondary btn-sm" id="helpButton" title="Ayuda de atajos">
            <i class="fa-solid fa-question"></i>
          </button>
        </div>
      </div>
      ${gridHtml}
    </div>
  `;
  
  box4Content.innerHTML = fullHtml;
  
  // Actualizar visibilidad del botón de guardar según el rol del usuario
  updateSaveButtonVisibility();
  
  // Configurar event listener para el botón de basura del Item Group
  setupItemGroupDeleteButton();
  setupItemGroupImageClick(); // Configurar click en imagen del Item Group
  
  // Debug: verificar si el botón se creó
  const checkDeleteBtn = document.querySelector('.item-group-delete-btn');
  console.log('🔍 Botón de basura después de regenerar grid:', checkDeleteBtn ? 'SÍ existe' : 'NO existe');
  
  // Reconfigurar controles de zoom y sincronización
  setTimeout(() => {
    setupZoomControls();
    setupScrollSynchronization();
    setupImageSystemEventListeners();
    setupBrandFilter();
    
    // Actualizar indicadores de múltiples imágenes después de regenerar
    updateMultipleImagesIndicators();
    
    // ✨ APLICAR COLORES DE APROBACIÓN AL GRID SI ESTÁN ACTIVOS
    const treeDiv = document.getElementById('tree');
    if (treeDiv && treeDiv.classList.contains('approval-view-active')) {
      applyApprovalColorsToGrid();
    }
  }, 100);
  
  // Intentar de nuevo la sincronización después de un delay más largo
  setTimeout(() => {
    setupScrollSynchronization();
  }, 1500);

  // Grid regenerated
}

// Función para configurar los controles de zoom
function setupZoomControls() {
  if (zoomControlsConfigured) return; // Evitar configuración duplicada
  
  const container = document.getElementById('imageGridContainer');
  const zoomInBtn = document.getElementById('zoomIn');
  const zoomOutBtn = document.getElementById('zoomOut');
  const zoomInfo = document.getElementById('zoomInfo');
  
  if (!container || !zoomInBtn || !zoomOutBtn || !zoomInfo) {
    return; // Salir silenciosamente si no hay elementos
  }
  
  // Usar la variable global persistente en lugar de local
  let currentScale = globalZoomScale; // Mantener zoom anterior
  const minScale = 0.5;
  const maxScale = 3;
  const scaleStep = 0.25;
  
  function updateScale() {
    const imageSize = Math.round(80 * currentScale);
    container.style.setProperty('--image-size', imageSize + 'px');
    zoomInfo.textContent = Math.round(currentScale * 100) + '%';
    
    // Calcular scale de hover para mantener proporción
    const hoverScale = 1.1;
    container.style.setProperty('--hover-scale', hoverScale);
    
    // Calcular tamaño de fuente según rangos de zoom optimizado
    let fontScale;
    if (currentScale <= 0.5) fontScale = '7px';
    else if (currentScale <= 0.75) fontScale = '8px';
    else if (currentScale <= 1) fontScale = '8px';
    else if (currentScale <= 1.5) fontScale = '9px';
    else if (currentScale <= 2) fontScale = '10px';
    else if (currentScale <= 2.5) fontScale = '11px';
    else fontScale = '12px';
    
    container.style.setProperty('--font-scale', fontScale);
    
    // Actualizar zoom global para mantener persistencia
    globalZoomScale = currentScale;
  }
  
  zoomInBtn.addEventListener('click', () => {
    if (currentScale < maxScale) {
      container.classList.add('zoom-active');
      currentScale = Math.min(maxScale, currentScale + scaleStep);
      globalZoomScale = currentScale;
      updateScale();
      
      setTimeout(() => {
        container.classList.remove('zoom-active');
      }, 300);
    }
  });

  zoomOutBtn.addEventListener('click', () => {
    if (currentScale > minScale) {
      container.classList.add('zoom-active');
      currentScale = Math.max(minScale, currentScale - scaleStep);
      globalZoomScale = currentScale;
      updateScale();
      
      setTimeout(() => {
        container.classList.remove('zoom-active');
      }, 300);
    }
  });
  
  // Inicializar
  updateScale();
  
  // Event listener para el botón de ayuda
  const helpButton = document.getElementById('helpButton');
  if (helpButton) {
    helpButton.addEventListener('click', () => {
      showHelpModal();
    });
  }
  
  // Event listener para el botón de limpieza
  const cleanupBtn = document.getElementById('cleanupGalButton');
  if (cleanupBtn) {
    cleanupBtn.addEventListener('click', () => {
      handleGalCleanup();
    });
  }

  // Event listener para el botón de deshacer cambios
  const undoBtn = document.getElementById('undoChangesButton');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      undoAllChanges();
    });
  }
  
  // Event listener para el botón de guardar cambios
  const saveBtn = document.getElementById('saveChangesButton');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveToGoogleSheets();
    });
  }
  
  zoomControlsConfigured = true;
}

// ===== SISTEMA DE SELECCIÓN Y ASIGNACIÓN DE IMÁGENES =====

// Función para actualizar la imagen de trabajo en el placeholder
function updateWorkingImagePlaceholder() {
  const placeholder = document.querySelector('.selected-image-container');
  if (!placeholder) return;

  if (workingImage) {
    placeholder.innerHTML = `
      <img src="https://www.travers.com.mx/media/catalog/product/agility/img/${workingImage.imageName}" 
           alt="${workingImage.imageName}" 
           class="working-image-preview"
           onerror="this.style.display='none';">
      <div class="working-image-info">
        <div class="working-image-name">${workingImage.imageName}</div>
        <div class="working-image-meta">${workingImage.itemCode} - ${workingImage.section.toUpperCase()}</div>
      </div>
    `;
  } else {
    placeholder.innerHTML = '<div class="no-image-selected"><img src="assets/no-img-orange.svg" alt="No image selected" style="width: 100%; height: 100%; object-fit: contain;"></div>';
  }
}

// Función para extraer el Item Code del nombre de imagen
function extractItemCodeFromImageName(imageName) {
  
  if (!imageName) {
    return null;
  }
  
  // Método 1: Buscar patrón con guión bajo (ej: 71-352-401_wg1.jpg)
  const matchWithUnderscore = imageName.match(/^([^_]+)_/);
  if (matchWithUnderscore) {
    const result = matchWithUnderscore[1];
    return result;
  }
  
  // Método 2: Si no hay guión bajo, tomar los primeros 10 caracteres (ej: 71-352-401.jpg)
  const withoutExtension = imageName.replace(/\.[^.]+$/, ''); // Quitar extensión
  if (withoutExtension.length >= 10) {
    const result = withoutExtension.substring(0, 10);
    return result;
  }
  
  return null;
}

// Función para configurar event listeners del sistema de imágenes
function setupImageSystemEventListeners() {
  const container = document.getElementById('imageGridContainer');
  if (!container) return;

  // Event listener para Alt + Cmd/Ctrl + Click para abrir comentarios (compatible Mac y PC)
  document.addEventListener('click', function(event) {
    // Verificar si se presionaron Alt + Command/Ctrl pero NO Shift
    if (isMainModifierKey(event) && event.altKey && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      
      console.log('🎯 Alt+Cmd/Ctrl+Click detectado (compatible Mac/PC)');
      
      // Determinar qué tipo de elemento se clickeó
      const imageCell = event.target.closest('.image-cell');
      const itemCodeCell = event.target.closest('.item-code-cell');
      const itemGroupImage = event.target.closest('.item-group-image');
      const itemGroupContainer = event.target.closest('.item-group-container');
      const itemGroupHeader = event.target.closest('.item-group-header');
      const imageThumbnail = event.target.closest('.image-thumbnail');
      const emptyImageCell = event.target.closest('.empty-image-cell');
      
      console.log('🔍 Elementos detectados:', {
        imageCell: !!imageCell,
        itemCodeCell: !!itemCodeCell, 
        itemGroupImage: !!itemGroupImage,
        itemGroupContainer: !!itemGroupContainer,
        itemGroupHeader: !!itemGroupHeader,
        imageThumbnail: !!imageThumbnail,
        emptyImageCell: !!emptyImageCell
      });
      
      // PRIORIZAR Item Group antes que image cells
      if (itemGroupImage || itemGroupContainer || itemGroupHeader) {
        // Click en imagen/espacio del item group
        console.log('💬 Abriendo comentario de Item Group');
        if (currentItemGroup) {
          const commentText = currentItemGroup['WA_VIS_Comment'] || '';
          const itemGroupId = currentItemGroup['ID'] || currentItemGroup['Item Group ID'] || currentItemGroup['Id'] || '';
          const itemGroupName = currentItemGroup['Name'] || 'Item Group';
          const contextInfo = `${itemGroupName} </br> (${itemGroupId})`;
          openCommentModal('Comentarios de Item Group', contextInfo, commentText, 'group', null);
        } else {
          console.log('❌ No hay currentItemGroup disponible');
        }
      } else if (imageThumbnail && imageCell) {
        // Click en imagen del grid
        console.log('💬 Abriendo comentario de imagen del grid');
        // Priorizar data-filename, luego alt como fallback
        const imageName = imageThumbnail.getAttribute('data-filename') || imageThumbnail.alt;
        const commentText = getImageComments(imageName);
        openCommentModal('Comentarios de Imagen', imageName, commentText || '', 'image', imageName);
      } else if ((emptyImageCell || imageCell) && !imageThumbnail) {
        // Click en espacio vacío en celda de imagen - buscar item code desde la celda
        console.log('💬 Abriendo comentario de item code desde celda vacía');
        const cell = imageCell || emptyImageCell.closest('.image-cell');
        if (cell) {
          const itemCode = cell.getAttribute('data-item-code');
          if (itemCode) {
            const itemCodeData = currentWorkingData.find(item => 
              item['Object Type'] === 'Item Code' && item.Name === itemCode
            );
            const commentText = itemCodeData ? (itemCodeData['WA_VIS_Comment'] || '') : '';
            const fullContext = generateItemCodeContext(itemCode);
            openCommentModal('Comentarios de Item Code', fullContext, commentText, 'item', null);
          }
        }
      } else if (itemCodeCell) {
        // Click en celda de item code
        console.log('💬 Abriendo comentario de item code');
        const itemCode = itemCodeCell.getAttribute('data-item-code');
        const itemCodeData = currentWorkingData.find(item => 
          item['Object Type'] === 'Item Code' && item.Name === itemCode
        );
        const commentText = itemCodeData ? (itemCodeData['WA_VIS_Comment'] || '') : '';
        const fullContext = generateItemCodeContext(itemCode);
        openCommentModal('Comentarios de Item Code', fullContext, commentText, 'item', null);
      } else {
        console.log('❌ No se detectó ningún elemento válido para comentario');
        console.log('Target:', event.target);
        console.log('Target classes:', event.target.className);
      }
      
      return false;
    }
  });

  // ✨ NUEVO: Right-click contextual para comentarios
  document.addEventListener('contextmenu', function(event) {
    // Determinar qué tipo de elemento se clickeó
    const imageCell = event.target.closest('.image-cell');
    const itemCodeCell = event.target.closest('.item-code-cell');
    const itemGroupImage = event.target.closest('.item-group-image');
    const itemGroupContainer = event.target.closest('.item-group-container');
    const itemGroupHeader = event.target.closest('.item-group-header');
    const imageThumbnail = event.target.closest('.image-thumbnail');
    const emptyImageCell = event.target.closest('.empty-image-cell');
    
    // Solo mostrar menú contextual en elementos válidos
    if (imageCell || itemCodeCell || itemGroupImage || itemGroupContainer || itemGroupHeader || imageThumbnail || emptyImageCell) {
      event.preventDefault();
      event.stopPropagation();
      
      console.log('🎯 Right-click detectado - Mostrando menú contextual');
      showContextMenu(event, {
        imageCell,
        itemCodeCell,
        itemGroupImage,
        itemGroupContainer,
        itemGroupHeader,
        imageThumbnail,
        emptyImageCell
      });
    }
  });

  container.addEventListener('click', function(event) {
    const imageCell = event.target.closest('.image-cell');
    const imageThumbnail = event.target.closest('.image-thumbnail');
    const removeButton = event.target.closest('.btn-remove');
    const commentIndicator = event.target.closest('.comment-indicator');
    
    // Click en burbuja de comentario: Abrir ventana modal con comentario
    if (commentIndicator) {
      handleCommentClick(event, commentIndicator);
      return;
    }
    
    // Click en botón de basura: Eliminar todas las imágenes con mismo nombre
    if (removeButton) {
      handleBulkImageRemoval(event, imageCell);
      return;
    }
    
    // Ctrl+Shift+Click: Asignar como imagen principal del Item Group
    if (isMainModifierKey(event) && event.shiftKey && !event.altKey) {
      console.log('🎯 Ctrl/Cmd+Shift+Click detectado - Asignar al Item Group');
      handleItemGroupImageAssignment(event, imageCell, imageThumbnail, 'Ctrl+Shift+Click');
    }
    
    // Alt+Click: Eliminar/quitar imagen de la celda
    else if (event.altKey && !isMainModifierKey(event) && !event.shiftKey) {
      handleImageRemoval(event, imageCell, imageThumbnail);
    }
    
    // Shift+Click: Seleccionar imagen de trabajo
    else if (event.shiftKey && !isMainModifierKey(event) && !event.altKey) {
      handleImageSelection(event, imageCell, imageThumbnail);
    }
    
    // Cmd+Click (Mac) / Ctrl+Click (Windows): Asignar imagen de trabajo
    else if (isMainModifierKey(event) && !event.shiftKey && !event.altKey) {
      handleImageAssignment(event, imageCell);
    }
    
    // Click simple: Mostrar imagen en modal
    else if (!isMainModifierKey(event) && !event.shiftKey && !event.altKey && imageThumbnail) {
      handleImagePreview(event, imageThumbnail);
    }
  });

  // Event listener para headers clickeables (asignación masiva por columna)
  // ÚNICO listener para evitar duplicados
  container.addEventListener('click', function(event) {
    // Detectar header section con múltiples métodos de fallback
    let headerSection = event.target.closest('.header-section');
    
    // Fallback 1: Si el target es directamente un header-section
    if (!headerSection && event.target.classList && event.target.classList.contains('header-section')) {
      headerSection = event.target;
    }
    
    // Fallback 2: Buscar en elementos padre manualmente
    if (!headerSection) {
      let element = event.target;
      for (let i = 0; i < 3 && element; i++) {
        if (element.classList && element.classList.contains('header-section')) {
          headerSection = element;
          break;
        }
        element = element.parentElement;
      }
    }
    
    // Solo ejecutar SI se encontró un header y NO se ha procesado ya
    if (headerSection && !event.headerProcessed) {
      // Marcar evento como procesado para evitar duplicados
      event.headerProcessed = true;
      
      console.log('🎯 Header section detectado:', headerSection.textContent.trim());
      handleColumnBulkAssignment(event, headerSection);
    }
  });
}

// Función para manejar clicks en indicadores de comentarios
function handleCommentClick(event, commentIndicator) {
  event.preventDefault();
  event.stopPropagation();
  
  const commentText = commentIndicator.getAttribute('data-comment');
  const isGroupComment = commentIndicator.classList.contains('group-comment');
  
  // Determinar el título y contexto
  let modalTitle = '';
  let contextInfo = '';
  
  if (isGroupComment) {
    modalTitle = 'Comentarios de Item Group';
    const itemGroupId = currentItemGroup['Id'] || currentItemGroup['ID'] || '';
    const itemGroupName = currentItemGroup['Name'] || 'Item Group';
    contextInfo = `${itemGroupName} (${itemGroupId})`;
  } else {
    modalTitle = 'Comentarios de Item Code';
    const itemCodeCell = commentIndicator.closest('.item-code-cell');
    const itemCode = itemCodeCell ? itemCodeCell.getAttribute('data-item-code') : 'Item Code';
    contextInfo = generateItemCodeContext(itemCode);
  }
  
  // Crear y mostrar la ventana modal
  openCommentModal(modalTitle, contextInfo, commentText);
}

// Función para manejar click en comentarios de imágenes
function handleImageCommentClick(event, imageName) {
  event.preventDefault();
  event.stopPropagation();
  
  const commentText = getImageComments(imageName);
  if (!commentText) {
    console.log('No hay comentarios para esta imagen');
    return;
  }
  
  const modalTitle = 'Comentarios de Imagen';
  const contextInfo = imageName;
  
  // Crear y mostrar la ventana modal
  openCommentModal(modalTitle, contextInfo, commentText, 'image', imageName);
}

// Función para parsear comentarios del formato Excel
function parseCommentsFromExcel(commentString) {
  if (!commentString || !commentString.trim()) {
    return [];
  }
  
  // Separar por ¶ para obtener comentarios individuales
  const individualComments = commentString.split('¶');
  const parsedComments = [];
  
  individualComments.forEach(comment => {
    if (!comment.trim()) return;
    
    // Separar por ¦ para obtener los campos
    const fields = comment.split('¦');
    
    if (fields.length >= 5) {
      // Formato completo con todos los campos
      parsedComments.push({
        usuario: fields[0]?.trim() || 'Usuario',
        fechaHora: fields[1]?.trim() || '-',
        tipoComentario: fields[2]?.trim() || '',
        textoComentario: fields[3]?.trim() || '',
        status: fields[4]?.trim() || ''
      });
    } else {
      // Comentario que no sigue el formato estándar
      // Lo ponemos como un comentario simple con valores por defecto
      parsedComments.push({
        usuario: 'Usuario',
        fechaHora: '-',
        tipoComentario: '',
        textoComentario: comment.trim(),
        status: ''
      });
    }
  });
  
  // Ordenar por fecha (más antiguo primero, para que el último elemento sea el más reciente)
  parsedComments.sort((a, b) => {
    if (a.fechaHora === '-' && b.fechaHora === '-') return 0;
    if (a.fechaHora === '-') return -1;
    if (b.fechaHora === '-') return 1;
    
    const dateA = new Date(a.fechaHora);
    const dateB = new Date(b.fechaHora);
    return dateA - dateB; // Cambié a dateA - dateB para ordenar del más antiguo al más reciente
  });
  
  return parsedComments;
}

// Función auxiliar para obtener el analista más reciente de los comentarios parseados
function getLatestAnalyst(parsedComments) {
  if (!parsedComments || parsedComments.length === 0) return null;
  
  // Los comentarios ya están ordenados por fecha (más reciente al final)
  // Buscar el último usuario que sea del grupo 'Analista' (NO del grupo 'Diseño')
  for (let i = parsedComments.length - 1; i >= 0; i--) {
    const comment = parsedComments[i];
    if (comment && comment.usuario) {
      const userName = comment.usuario.toLowerCase().trim();
      // Verificar si el usuario es del grupo Analista (NO Diseño)
      const userConfig = VALID_USERS[userName];
      if (userConfig && userConfig.group !== 'Diseño') {
        return userName; // Retornar el key normalizado en minúsculas
      }
    }
  }
  return null;
}

// Función auxiliar para obtener el diseñador más reciente de los comentarios parseados
function getLatestDesigner(parsedComments) {
  if (!parsedComments || parsedComments.length === 0) return null;
  
  // Los comentarios ya están ordenados por fecha (más reciente al final)
  // Buscar el último usuario que sea del grupo 'Diseño'
  for (let i = parsedComments.length - 1; i >= 0; i--) {
    const comment = parsedComments[i];
    if (comment && comment.usuario) {
      const userName = comment.usuario.toLowerCase().trim();
      // Verificar si el usuario es del grupo Diseño
      const userConfig = VALID_USERS[userName];
      if (userConfig && userConfig.group === 'Diseño') {
        return userName; // Retornar el key normalizado en minúsculas
      }
    }
  }
  return null;
}

// Función auxiliar para obtener el último comentario del analista
function getLatestAnalystComment(parsedComments) {
  if (!parsedComments || parsedComments.length === 0) return '-';
  
  // Buscar el último comentario de un usuario del grupo Analista (NO Diseño)
  for (let i = parsedComments.length - 1; i >= 0; i--) {
    const comment = parsedComments[i];
    if (comment && comment.usuario) {
      const userName = comment.usuario.toLowerCase().trim();
      const userConfig = VALID_USERS[userName];
      if (userConfig && userConfig.group !== 'Diseño') {
        return comment.textoComentario || '-';
      }
    }
  }
  return '-';
}

// Función auxiliar para obtener el último comentario del diseñador
function getLatestDesignerComment(parsedComments) {
  if (!parsedComments || parsedComments.length === 0) return '-';
  
  // Buscar el último comentario de un usuario del grupo Diseño
  for (let i = parsedComments.length - 1; i >= 0; i--) {
    const comment = parsedComments[i];
    if (comment && comment.usuario) {
      const userName = comment.usuario.toLowerCase().trim();
      const userConfig = VALID_USERS[userName];
      if (userConfig && userConfig.group === 'Diseño') {
        return comment.textoComentario || '-';
      }
    }
  }
  return '-';
}

// Función para extraer comentarios de imágenes desde datos procesados (Object Type = Image)
function extractImageCommentsFromProcessedData() {
  if (!currentWorkingData || !Array.isArray(currentWorkingData)) {
    return;
  }

  // Filtrar objetos de tipo Image con comentarios desde currentWorkingData
  const imageComments = currentWorkingData
    .filter(item => {
      // Debe ser tipo Image
      if (item['Object Type'] !== 'Image') return false;
      
      // Debe tener comentario válido
      const comment = item['WA_VIS_Comment'];
      if (!comment || typeof comment !== 'string') return false;
      
      // El comentario debe tener contenido real (no solo espacios o el nombre del campo)
      const trimmedComment = comment.trim();
      if (!trimmedComment || trimmedComment === 'WA_VIS_Comment' || trimmedComment.length < 3) return false;
      
      return true;
    })
    .map(item => ({
      Name: item.Name,
      WA_VIS_Comment: item['WA_VIS_Comment'],
      ID: item.ID || item.Id
    }));

  return imageComments;
}

// Función helper para encontrar un objeto Image en los datos procesados
function findImageAssetByName(imageName) {
  if (!imageName) return null;
  
  console.log(`🔍 Buscando asset de imagen: "${imageName}"`);
  
  // PASO 1: Buscar primero en currentWorkingData
  let asset = currentWorkingData ? currentWorkingData.find(item => 
    item['Object Type'] === 'Image' && item.Name === imageName
  ) : null;
  
  if (asset) {
    console.log(`✅ Imagen encontrada en currentWorkingData con ID: ${asset.ID || asset.Id}`);
    return asset;
  }
  
  // PASO 2: Buscar en allLibraryData
  if (!asset && allLibraryData) {
    asset = allLibraryData.find(item => 
      item['Object Type'] === 'Image' && item.Name === imageName
    );
    if (asset) {
      console.log(`✅ Imagen encontrada en allLibraryData con ID: ${asset.ID || asset.Id}`);
      return asset;
    }
  }
  
  // PASO 3: Buscar en datos globales del caché si existe
  if (!asset && window.allItemGroupsData) {
    asset = window.allItemGroupsData.find(item => 
      item['Object Type'] === 'Image' && item.Name === imageName
    );
    if (asset) {
      console.log(`✅ Imagen encontrada en allItemGroupsData con ID: ${asset.ID || asset.Id}`);
      return asset;
    }
  }
  
  // PASO 4: Buscar en currentAssetComments como último recurso
  if (!asset && currentAssetComments) {
    asset = currentAssetComments.find(asset => asset.Name === imageName);
    if (asset) {
      console.log(`✅ Imagen encontrada en currentAssetComments con ID: ${asset.ID || asset.Id}`);
      return asset;
    }
  }
  
  console.log(`❌ Imagen "${imageName}" NO encontrada en ninguna fuente de datos`);
  return null;
}

// Función helper para encontrar un objeto Image por ID en los datos procesados
function findImageAssetById(imageId) {
  if (!currentWorkingData || !imageId) return null;
  
  return currentWorkingData.find(item => 
    item['Object Type'] === 'Image' && (item.ID == imageId || item.Id == imageId)
  );
}

// Función para verificar si una imagen tiene comentarios de Item Group (SOLO para grid del Item Group)

// ========== COMMENTED ITEMS DATA MANAGEMENT ==========

// Función para inicializar commentedItemsData desde allLibraryData
function initializeCommentedItemsData() {
  console.log('🔄 Inicializando commentedItemsData...');
  commentedItemsData = [];
  
  if (!allLibraryData || allLibraryData.length === 0) {
    console.log('❌ allLibraryData no disponible para inicialización');
    return;
  }
  
  // Recorrer TODA la data y filtrar solo items con comentarios reales
  allLibraryData.forEach(item => {
    if (item['WA_VIS_Comment'] && item['WA_VIS_Comment'].trim() !== '') {
      const parsedItem = parseCommentedItem(item);
      if (parsedItem) {
        commentedItemsData.push(parsedItem);
      }
    }
  });
  
  console.log(`✅ commentedItemsData inicializada con ${commentedItemsData.length} items con comentarios`);
  
  // Debug: mostrar primeros elementos
  if (commentedItemsData.length > 0) {
    console.log('📋 Primeros elementos en commentedItemsData:', commentedItemsData.slice(0, 3));
  }
}

// Función para parsear un item individual y crear el objeto commentedItemsData
function parseCommentedItem(item) {
  if (!item || !item['WA_VIS_Comment'] || item['WA_VIS_Comment'].trim() === '') {
    return null;
  }
  
  // Parsear comentarios para obtener datos derivados
  const parsedComments = parseCommentsFromExcel(item['WA_VIS_Comment']);
  
  // Determinar el tipo de comentario (direct-comment o image-comment)
  const objectType = item['Object Type'];
  const type = objectType === 'Image' ? 'image-comment' : 'direct-comment';
  
  // Extraer datos de analistas y diseñadores
  const analista = getLatestAnalyst(parsedComments);
  const diseñador = getLatestDesigner(parsedComments);
  const ultimoTipo = getLastCommentType(item['WA_VIS_Comment']);
  const ultimoStatus = getCurrentStatus(item['WA_VIS_Comment']);
  
  // Fechas de analistas y diseñadores
  const primeraFechaAnalista = getFirstAnalystDate(parsedComments);
  const ultimaFechaAnalista = getLatestAnalystDate(parsedComments);
  const ultimaFechaDisenador = getLatestDesignerDate(parsedComments);
  
  // Comentarios más recientes
  const ultimoComentarioAnalista = getLatestAnalystComment(parsedComments);
  const ultimoComentarioDisenador = getLatestDesignerComment(parsedComments);
  
  // Encontrar itemGroupId para navegación
  let itemGroupId = null;
  if (type === 'image-comment') {
    // Para imágenes, buscar el Item Group padre
    const parentItemGroup = findParentItemGroup(item);
    itemGroupId = parentItemGroup ? (parentItemGroup.ID || parentItemGroup.Id) : null;
  } else {
    // Para direct-comment, el item mismo podría ser un Item Group
    itemGroupId = objectType === 'Item Group' ? (item.ID || item.Id) : null;
  }
  
  // Crear objeto commentedItemsData
  const commentedItem = {
    // Identificación
    type: type,
    rowNumber: item.rowNumber || null,
    ID: item.ID || item.Id || null,
    
    // Datos básicos del objeto
    Name: item.Name || '',
    'Object Type': objectType || '',
    objectType: objectType || '', // Agregada para compatibilidad con estadísticas
    cms: item.cms || '',
    marca: item.marca || '',
    titulo: item.titulo || item.Name || '',
    importancia: item.importancia || '',
    
    // Comentarios raw y parseados
    'WA_VIS_Comment': item['WA_VIS_Comment'],
    parsedComments: parsedComments,
    
    // Datos derivados de comentarios
    analista: analista,
    diseñador: diseñador,
    ultimoTipo: ultimoTipo,
    ultimoStatus: ultimoStatus,
    
    // Fechas
    primeraFechaAnalista: primeraFechaAnalista,
    ultimaFechaAnalista: ultimaFechaAnalista,
    ultimaFechaDisenador: ultimaFechaDisenador,
    
    // Comentarios recientes
    ultimoComentarioAnalista: ultimoComentarioAnalista,
    ultimoComentarioDisenador: ultimoComentarioDisenador,
    
    // Navegación (para imágenes)
    itemGroupId: itemGroupId,
    imageName: type === 'image-comment' ? item.Name : null,
    
    // Datos adicionales que podrían ser útiles
    originalItem: item // Referencia al objeto original para datos no parseados
  };
  
  return commentedItem;
}

// Función para agregar o actualizar un item en commentedItemsData
function addOrUpdateCommentedItem(newItem) {
  if (!newItem) return;
  
  const existingIndex = commentedItemsData.findIndex(item => {
    // Para direct-comment: comparar por ID
    if (item.type === 'direct-comment' && newItem.type === 'direct-comment') {
      return item.ID === newItem.ID;
    }
    // Para image-comment: comparar por imageName + itemGroupId
    if (item.type === 'image-comment' && newItem.type === 'image-comment') {
      return item.imageName === newItem.imageName && item.itemGroupId === newItem.itemGroupId;
    }
    return false;
  });
  
  if (existingIndex >= 0) {
    // Actualizar existente
    console.log(`🔄 Actualizando item existente en commentedItemsData:`, newItem.Name || newItem.imageName);
    commentedItemsData[existingIndex] = newItem;
  } else {
    // Agregar nuevo
    console.log(`➕ Agregando nuevo item a commentedItemsData:`, newItem.Name || newItem.imageName);
    commentedItemsData.push(newItem);
  }
}

// Función para actualizar commentedItemsData después de agregar/editar un comentario
function updateCommentedItemsDataAfterComment(updatedItem) {
  if (!updatedItem) return;
  
  // Si el item ya no tiene comentarios, eliminarlo de commentedItemsData
  if (!updatedItem['WA_VIS_Comment'] || updatedItem['WA_VIS_Comment'].trim() === '') {
    removeFromCommentedItemsData(updatedItem);
    return;
  }
  
  // Parsear y agregar/actualizar
  const parsedItem = parseCommentedItem(updatedItem);
  if (parsedItem) {
    addOrUpdateCommentedItem(parsedItem);
  }
}

// Función para eliminar un item de commentedItemsData
function removeFromCommentedItemsData(itemToRemove) {
  const initialLength = commentedItemsData.length;
  
  commentedItemsData = commentedItemsData.filter(item => {
    // Para direct-comment: comparar por ID
    if (item.type === 'direct-comment') {
      return item.ID !== (itemToRemove.ID || itemToRemove.Id);
    }
    // Para image-comment: comparar por imageName
    if (item.type === 'image-comment') {
      return item.imageName !== itemToRemove.Name;
    }
    return true;
  });
  
  const removedCount = initialLength - commentedItemsData.length;
  if (removedCount > 0) {
    console.log(`🗑️ Eliminados ${removedCount} items de commentedItemsData`);
  }
}

// Función helper para encontrar el Item Group padre de una imagen
function findParentItemGroup(imageItem) {
  if (!imageItem || !allLibraryData) return null;
  
  // Buscar el Item Group que contiene esta imagen
  // Esto requiere lógica específica según cómo están estructurados los datos
  // Por ahora, implementación básica
  return null; // TODO: Implementar lógica específica si es necesaria
}

// Funciones helper para extraer fechas específicas de comentarios parseados
function getFirstAnalystDate(parsedComments) {
  if (!parsedComments || parsedComments.length === 0) return null;
  
  // Buscar el primer comentario de un analista
  for (let i = 0; i < parsedComments.length; i++) {
    const comment = parsedComments[i];
    const usuario = comment.usuario;
    if (VALID_USERS[usuario] && VALID_USERS[usuario].group === 'Analista') {
      return comment.fechaHora !== '-' ? comment.fechaHora : null;
    }
  }
  return null;
}

function getLatestAnalystDate(parsedComments) {
  if (!parsedComments || parsedComments.length === 0) return null;
  
  // Buscar el último comentario de un analista (recorrer desde el final)
  for (let i = parsedComments.length - 1; i >= 0; i--) {
    const comment = parsedComments[i];
    const usuario = comment.usuario;
    if (VALID_USERS[usuario] && VALID_USERS[usuario].group === 'Analista') {
      return comment.fechaHora !== '-' ? comment.fechaHora : null;
    }
  }
  return null;
}

function getLatestDesignerDate(parsedComments) {
  if (!parsedComments || parsedComments.length === 0) return null;
  
  // Buscar el último comentario de un diseñador (recorrer desde el final)
  for (let i = parsedComments.length - 1; i >= 0; i--) {
    const comment = parsedComments[i];
    const usuario = comment.usuario;
    if (VALID_USERS[usuario] && VALID_USERS[usuario].group === 'Diseño') {
      return comment.fechaHora !== '-' ? comment.fechaHora : null;
    }
  }
  return null;
}

// Función global para obtener el último tipo de comentario de los comentarios existentes
function getLastCommentType(commentsString) {
  if (!commentsString || !commentsString.trim()) {
    return 'General'; // Default si no hay comentarios
  }
  
  // Separar comentarios individuales por ¶
  const individualComments = commentsString.split('¶');
  if (individualComments.length === 0) {
    return 'General';
  }
  
  // Obtener el último comentario
  const lastComment = individualComments[individualComments.length - 1];
  if (!lastComment) {
    return 'General';
  }
  
  // Separar campos por ¦ (usuario¦fecha¦tipo¦texto¦status)
  const fields = lastComment.split('¦');
  if (fields.length >= 3) {
    const tipoComentario = fields[2]?.trim();
    if (tipoComentario && tipoComentario !== '') {
      return tipoComentario;
    }
  }
  
  return 'General'; // Default si no se puede extraer
}

function hasItemGroupImageComments(imageName) {
  if (!imageName || !currentItemGroup) return false;
  
  // SOLO buscar comentario del Item Group actual
  if (currentItemGroup['WA_VIS_Comment'] && currentItemGroup['WA_VIS_Comment'].trim()) {
    return true;
  }
  
  return false;
}

// Función para obtener los comentarios de Item Group para una imagen (SOLO para grid del Item Group)
function getItemGroupImageComments(imageName) {
  if (!imageName || !currentItemGroup) return '';
  
  // SOLO retornar comentario del Item Group actual
  if (currentItemGroup['WA_VIS_Comment'] && currentItemGroup['WA_VIS_Comment'].trim()) {
    return currentItemGroup['WA_VIS_Comment'];
  }
  
  return '';
}

// Función para verificar si una imagen tiene comentarios (VERSIÓN CORREGIDA - solo busca objetos tipo "Image" por nombre exacto)
function hasImageComments(imageName) {
  if (!imageName) return false;
  
  // Buscar SOLO objetos tipo "Image" con nombre exacto en TODOS los datos
  if (window.allItemGroupsData && window.allItemGroupsData.length > 0) {
    const imageObject = window.allItemGroupsData.find(item => {
      // SOLO buscar objetos tipo "Image" con nombre exacto
      return item['Object Type'] === 'Image' && 
             item.Name === imageName &&
             item['WA_VIS_Comment'] && 
             item['WA_VIS_Comment'].trim();
    });
    
    if (imageObject) {
      return true;
    }
  }
  
  // PASO 2: Buscar en currentWorkingData como respaldo (datos locales más completos)
  if (window.allItemGroupsData && window.allItemGroupsData.length > 0) {
    const localImageObject = currentWorkingData.find(item => {
      return item['Object Type'] === 'Image' && 
             item.Name === imageName &&
             item['WA_VIS_Comment'] && 
             item['WA_VIS_Comment'].trim();
    });
    
    if (localImageObject) {
      return true;
    }
  }
  
  return false;
}

// Función para verificar si una imagen tiene new_img = 1
function hasImageStarComment(imageName) {
  if (!imageName) return false;
  
  // Buscar en window.allItemGroupsData (datos globales del caché)
  if (window.allItemGroupsData && window.allItemGroupsData.length > 0) {
    const imageObject = window.allItemGroupsData.find(item => {
      return item['Object Type'] === 'Image' && item.Name === imageName;
    });
    
    if (imageObject && imageObject['data_concatenated']) {
      // Parsear el data_concatenated para buscar new_img¬1
      const dataConcatenated = imageObject['data_concatenated'];
      
      // Los atributos están separados por § y cada par atributo-valor por ¬
      const attributes = dataConcatenated.split('§');
      
      for (const attribute of attributes) {
        const [key, value] = attribute.split('¬');
        if (key === 'new_img' && value === '1') {
          return true;
        }
      }
    }
  }
  
  return false;
}

// Función para obtener los comentarios de una imagen (VERSIÓN CORREGIDA - búsqueda global con respaldo)
function getImageComments(imageName) {
  if (!imageName) return '';
  
  // OPTIMIZACIÓN: Verificar caché primero
  if (imageCommentsCache.has(imageName)) {
    return imageCommentsCache.get(imageName);
  }
  
  let comments = '';
  
  // PASO 1: Buscar en currentWorkingData primero (donde se agregan los comentarios nuevos)
  if (currentWorkingData && currentWorkingData.length > 0) {
    const imageObject = currentWorkingData.find(item => {
      return item['Object Type'] === 'Image' && item.Name === imageName;
    });
    
    if (imageObject && imageObject['WA_VIS_Comment']) {
      comments = imageObject['WA_VIS_Comment'];
    }
  }
  
  // PASO 2: Si no se encontró, buscar en allLibraryData
  if (!comments && allLibraryData && allLibraryData.length > 0) {
    const imageObject = allLibraryData.find(item => {
      return item['Object Type'] === 'Image' && item.Name === imageName;
    });
    
    if (imageObject && imageObject['WA_VIS_Comment']) {
      comments = imageObject['WA_VIS_Comment'];
    }
  }
  
  // PASO 3: Si no se encontró, buscar en datos globales como último respaldo
  if (!comments && window.allItemGroupsData && window.allItemGroupsData.length > 0) {
    const imageObject = window.allItemGroupsData.find(item => {
      return item['Object Type'] === 'Image' && item.Name === imageName;
    });
    
    if (imageObject && imageObject['WA_VIS_Comment']) {
      comments = imageObject['WA_VIS_Comment'];
    }
  }
  
  // OPTIMIZACIÓN: Guardar en caché (incluso si está vacío para evitar búsquedas futuras)
  if (imageCommentsCache.size >= IMAGE_CACHE_SIZE) {
    const firstKey = imageCommentsCache.keys().next().value;
    imageCommentsCache.delete(firstKey);
  }
  imageCommentsCache.set(imageName, comments);
  
  return comments;
}

// Función para formatear fecha para mostrar
function formatDisplayDate(dateString) {
  // Si es un guión o vacío, no mostrar nada
  if (!dateString || dateString.trim() === '-' || dateString.trim() === '') {
    return '';
  }
  
  try {
    const date = new Date(dateString);
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const now = new Date();
    
    // Obtener las fechas sin tiempo para comparar solo días
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calcular diferencia en días
    const diffTime = dateOnly - nowOnly;  // Cambiado: fecha del comentario - fecha actual
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Formatear tiempo en AM/PM
    const timeOptions = { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    };
    const timeString = date.toLocaleTimeString('es-ES', timeOptions);
    
    if (diffDays === 0) {
      // Es hoy
      return 'Hoy ' + timeString;
    } else if (diffDays === -1) {
      // Es ayer
      return 'Ayer ' + timeString;
    } else if (diffDays === 1) {
      // Es mañana
      return 'Mañana ' + timeString;
    } else if (diffDays < -1 && diffDays >= -7) {
      // Hace varios días (pasado)
      return 'Hace ' + Math.abs(diffDays) + ' días - ' + timeString;
    } else if (diffDays > 1 && diffDays <= 7) {
      // En varios días (futuro)
      return 'En ' + diffDays + ' días - ' + timeString;
    } else {
      // Más de una semana (pasado o futuro)
      return date.toLocaleDateString('es-ES') + ' ' + timeString;
    }
  } catch (error) {
    return '';
  }
}

// Función para obtener el color del tipo de comentario
function getCommentTypeColor(tipo) {
  const colors = {
    'Revisión': '#e74c3c',
    'Aprobado': '#27ae60',
    'Pendiente': '#f39c12',
    'Rechazado': '#e74c3c',
    'Información': '#3498db',
    'Pregunta': '#9b59b6',
    'General': '#95a5a6'
  };
  return colors[tipo] || '#95a5a6';
}

// Función para obtener el color del status
function getStatusColor(status) {
  const colors = {
    'Diseño': '#A92DE7',     // Morado - nuevo color
    'Revision': '#00C1FF',   // Azul - nuevo color
    'Completado': '#74BE12', // Verde - nuevo color
    'Cancelado': '#AFAFAF',  // Gris - nuevo color
    'Analista': '#00C1FF',   // Azul - igual que Revision
    'Sin status': '#AFAFAF'  // Gris - igual que Cancelado
  };
  return colors[status] || '#AFAFAF';
}

// Función para crear y mostrar la ventana modal de comentarios
function openCommentModal(title, context, commentText, type = 'item', imageName = null) {
  // IMPORTANTE: Guardar estado actual antes de abrir modal
  saveInventoryViewState();
  
  // Verificar si ya existe una modal y cerrarla
  const existingModal = document.getElementById('commentModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Generar el contexto completo para imágenes
  let fullContext = context;
  if (type === 'image' && imageName) {
    fullContext = generateImageContext(imageName);
  }
  
  // Obtener el status actual
  const currentStatus = getCurrentStatus(commentText);
  const userInfo = getCurrentUserInfo();
  
  // Parsear los comentarios del formato Excel
  const parsedComments = parseCommentsFromExcel(commentText);
  
  // Crear la ventana modal
  const modal = document.createElement('div');
  modal.id = 'commentModal';
  modal.className = 'comment-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <div class="modal-title-container">
          <h3 class="modal-title">${title}</h3>
          <div class="modal-context">${fullContext}</div>
        </div>
        <div class="status-container">
          ${currentStatus ? `<div class="status-badge" data-status="${currentStatus}">${currentStatus}</div>` : ''}
          ${userInfo.group === 'Analistas' && parsedComments.length > 0 ? `
            <select class="status-control" id="statusControl">
              <option value="">Cambiar status...</option>
              <option value="Completado">Completado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          ` : ''}
        </div>
        <button class="modal-close-btn" title="Cerrar">×</button>
      </div>
      <div class="modal-body">
        <div class="comments-section">
          <div class="comments-container">
            ${parsedComments.length > 0 ? generateCommentsHTML(parsedComments) : '<div class="no-comments">No hay comentarios existentes</div>'}
          </div>
        </div>
        <div class="comments-divider"></div>
        <div class="new-comment-section">
          <h4 class="section-title">Agregar Nuevo Comentario</h4>
          <div class="new-comment-form">
            <div class="form-row">
              <div class="form-group">
                <select class="form-select comment-type-select" id="commentTypeSelect">
                  <option value="">Tipo...</option>
                  <option value="Agregar Imagen Adicional">Agregar Imagen Adicional</option>
                  <option value="Bodegón">Bodegón</option>
                  <option value="Diagrama">Diagrama</option>
                  <option value="Duplicar con Otro Número">Duplicar con Otro Número</option>
                  <option value="Editar Color de Producto">Editar Color de Producto</option>
                  <option value="Editar Imagen">Editar Imagen</option>
                  <option value="Imagen en Blanco / Revisar Corte">Imagen en Blanco / Revisar Corte</option>
                  <option value="Montar Producto en Aplicación">Montar Producto en Aplicación</option>
                  <option value="Retícula">Retícula</option>
                  <option value="Retícula Marca">Retícula Marca</option>
                  <option value="Voltear Imagen">Voltear Imagen</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <div class="textarea-actions-row">
                <textarea class="form-textarea comment-text-input" id="commentTextInput" placeholder="Escribir comentario..."></textarea>
                <div class="form-actions-vertical">
                  <button class="btn btn-comment-submit btn-textarea-height" id="addCommentBtn"><i class="fa-solid fa-paper-plane" style="font-size: 18px;"></i></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Agregar al DOM
  document.body.appendChild(modal);
  
  // Configurar funcionalidad de la modal
  setupModalFunctionality(modal);
  
  // Configurar funcionalidad del formulario
  setupNewCommentForm(modal, context, type, imageName, commentText);
  
  // Configurar el control de status
  setupStatusControl(modal, context, type, imageName, commentText);
  
  // Mostrar modal con animación
  setTimeout(() => {
    modal.classList.add('show');
    
    // Enfocar automáticamente el campo de texto para comentarios
    const commentTextInput = modal.querySelector('#commentTextInput');
    if (commentTextInput) {
      commentTextInput.focus();
    }
  }, 10);
}

// Función para configurar el formulario de nuevo comentario
function setupNewCommentForm(modal, context, type = 'item', imageName = null, commentText = '') {
  const addCommentBtn = modal.querySelector('#addCommentBtn');
  const commentTypeSelect = modal.querySelector('#commentTypeSelect');
  const commentTextInput = modal.querySelector('#commentTextInput');
  
  // Verificar si existen comentarios previos
  const parsedComments = parseCommentsFromExcel(commentText);
  const hasExistingComments = parsedComments.length > 0;
  
  // Si hay comentarios existentes, preseleccionar tipo del último comentario
  if (hasExistingComments) {
    const lastComment = parsedComments[parsedComments.length - 1];
    
    // Preseleccionar tipo del último comentario
    if (lastComment.tipoComentario) {
      commentTypeSelect.value = lastComment.tipoComentario;
    }
  }
  
  // Función para limpiar el formulario (mantener tipo seleccionado)
  function clearForm() {
    // No resetear commentTypeSelect.value para mantener el tipo seleccionado
    commentTextInput.value = '';
  }
  
  // Función para validar el formulario
  function validateForm() {
    const commentType = commentTypeSelect.value.trim();
    const commentText = commentTextInput.value.trim();
    
    return commentType && commentText;
  }
  
  // Event listener para Cmd+Enter / Ctrl+Enter en el textarea
  commentTextInput.addEventListener('keydown', function(e) {
    // Detectar Cmd+Enter (Mac) o Ctrl+Enter (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault(); // Prevenir el salto de línea
      
      // Simular click en el botón de enviar
      if (validateForm()) {
        addCommentBtn.click();
      } else {
        alert('Por favor, selecciona un tipo de comentario y escribe un mensaje.');
      }
    }
  });
  
  // Event listener para el botón de agregar comentario
  addCommentBtn.addEventListener('click', function() {
    if (!validateForm()) {
      alert('Por favor, selecciona un tipo de comentario y escribe un mensaje.');
      return;
    }
    
    // Obtener valores del formulario
    const selectedType = commentTypeSelect.value.trim();
    const commentText = commentTextInput.value.trim();
    
    // Determinar el status automáticamente basado en el grupo del usuario
    const automaticStatus = getAutomaticStatus();
    
    console.log('Valores finales:', {
      tipoComentario: selectedType,
      status: automaticStatus
    });
    
    // Crear el nuevo comentario
    const userInfo = getCurrentUserInfo();
    const newComment = {
      usuario: userInfo.name, // Usar el nombre del usuario seleccionado
      fechaHora: getLocalDateTime(),
      tipoComentario: selectedType,
      textoComentario: commentText,
      status: automaticStatus
    };
    
    console.log('🔍 DEBUG - Nuevo comentario creado:', newComment);
    console.log('📝 DEBUG - Texto del comentario capturado:', `"${commentText}"`);
    console.log('📝 DEBUG - textoComentario en objeto:', `"${newComment.textoComentario}"`);
    
    // Extraer el contexto correcto según el tipo de comentario
    let contextForData = context;
    
    if (type === 'item') {
      // Para Item Codes, extraer el nombre del item code del contexto completo
      // El formato es: "Item Group (ID) | Item Code | Marca"
      const parts = context.split(' | ');
      contextForData = parts.length >= 2 ? parts[1] : context;
    }
    
    // Agregar el comentario a los datos
    addNewCommentToData(contextForData, newComment, type, imageName);
    
    // Actualizar la vista de comentarios
    updateCommentsDisplay(modal);
    
    // Actualizar el status badge en el header
    updateStatusBadge(modal, automaticStatus);
    
    // Limpiar formulario
    clearForm();
    
    // Actualizar burbujas de comentarios en la UI
    setTimeout(() => {
      // Actualizar burbujas inline para evitar problemas de orden
      if (type === 'item') {
        // Actualizar burbuja del Item Code
        const itemCodeCells = document.querySelectorAll('.item-code-cell');
        itemCodeCells.forEach(cell => {
          const itemCode = cell.getAttribute('data-item-code');
          if (itemCode === contextForData) {
            const item = currentWorkingData.find(item => 
              item['Item Code'] === itemCode || item['Name'] === itemCode
            );
            const currentStatus = getCurrentStatus(item?.['WA_VIS_Comment'] || '');
            
            let bubble = cell.querySelector('.comment-indicator');
            if (bubble) {
              bubble.setAttribute('data-status', currentStatus);
              bubble.setAttribute('data-comment', item?.['WA_VIS_Comment'] || '');
            } else {
              const newBubble = document.createElement('div');
              newBubble.className = 'comment-indicator';
              newBubble.setAttribute('data-status', currentStatus);
              newBubble.innerHTML = '<i class="fa-solid fa-comment"></i>';
              newBubble.setAttribute('data-comment', item?.['WA_VIS_Comment'] || '');
              newBubble.addEventListener('click', function(event) {
                handleCommentClick(event, this);
              });
              cell.appendChild(newBubble);
            }
          }
        });
      } else if (type === 'group') {
        // Actualizar burbuja del Item Group
        if (currentItemGroup) {
          const currentStatus = getCurrentStatus(currentItemGroup['WA_VIS_Comment'] || '');
          const groupBubble = document.querySelector('.comment-indicator.group-comment');
          if (groupBubble) {
            groupBubble.setAttribute('data-status', currentStatus);
            groupBubble.setAttribute('data-comment', currentItemGroup['WA_VIS_Comment'] || '');
          } else {
            const itemGroupImage = document.querySelector('.item-group-image');
            if (itemGroupImage) {
              const newBubble = document.createElement('div');
              newBubble.className = 'comment-indicator group-comment';
              newBubble.setAttribute('data-comment', currentItemGroup['WA_VIS_Comment'] || '');
              newBubble.setAttribute('data-status', currentStatus);
              newBubble.innerHTML = '<i class="fa-solid fa-comment"></i>';
              newBubble.addEventListener('click', function(event) {
                handleCommentClick(event, this);
              });
              itemGroupImage.appendChild(newBubble);
            }
          }
        }
      }
    }, 100);
    
    // ACTUALIZAR TABLAS DESPUÉS DE AGREGAR COMENTARIO
    updateTablesAfterComment();
    
    // AUTO-GUARDAR COMENTARIO INMEDIATAMENTE
    autoSaveComment(newComment, type, imageName, context);
    
    // Cerrar modal automáticamente después de agregar el comentario exitosamente
    setTimeout(() => {
      closeCommentModal();
    }, 500); // Pequeño delay para que el usuario vea el éxito
  });
}

// Función para configurar el control de status en el header
function setupStatusControl(modal, context, type = 'item', imageName = null, commentText = '') {
  const statusControl = modal.querySelector('#statusControl');
  
  if (!statusControl) return; // Solo para analistas
  
  statusControl.addEventListener('change', function() {
    const selectedStatus = this.value;
    
    if (!selectedStatus) return;
    
    // Obtener el tipo del último comentario para mantenerlo
    const parsedComments = parseCommentsFromExcel(commentText);
    let lastCommentType = '';
    
    if (parsedComments.length > 0) {
      const lastComment = parsedComments[parsedComments.length - 1];
      lastCommentType = lastComment.tipoComentario || '';
    }
    
    // Crear un comentario automático de cambio de status manteniendo el tipo anterior
    const userInfo = getCurrentUserInfo();
    const newComment = {
      usuario: userInfo.name,
      fechaHora: getLocalDateTime(),
      tipoComentario: lastCommentType, // Mantener el tipo anterior
      textoComentario: `Status actualizado a ${selectedStatus}`,
      status: selectedStatus
    };
    
    // Extraer el contexto correcto según el tipo de comentario
    let contextForData = context;
    
    if (type === 'item') {
      // Para Item Codes, extraer el nombre del item code del contexto completo
      // El formato es: "Item Group (ID) | Item Code | Marca"
      const parts = context.split(' | ');
      contextForData = parts.length >= 2 ? parts[1] : context;
    }
    
    // Agregar el comentario a los datos
    addNewCommentToData(contextForData, newComment, type, imageName);
    
    // AUTO-GUARDAR COMENTARIO DE CAMBIO DE STATUS INMEDIATAMENTE
    autoSaveComment(newComment, type, imageName, context);
    
    // Actualizar la vista de comentarios
    updateCommentsDisplay(modal);
    
    // Actualizar el status badge en el header
    updateStatusBadge(modal, selectedStatus);
    
    // Actualizar tablas principales después del cambio de status
    updateTablesAfterComment();
    
    // Resetear el dropdown
    this.value = '';
    
    // Actualizar burbujas de comentarios en la UI
    setTimeout(() => {
      // Actualizar burbujas inline para evitar problemas de orden
      if (type === 'item') {
        const itemCodeCells = document.querySelectorAll('.item-code-cell');
        itemCodeCells.forEach(cell => {
          const itemCode = cell.getAttribute('data-item-code');
          if (itemCode === contextForData) {
            const item = currentWorkingData.find(item => 
              item['Item Code'] === itemCode || item['Name'] === itemCode
            );
            const currentStatus = getCurrentStatus(item?.['WA_VIS_Comment'] || '');
            
            let bubble = cell.querySelector('.comment-indicator');
            if (bubble) {
              bubble.setAttribute('data-status', currentStatus);
              bubble.setAttribute('data-comment', item?.['WA_VIS_Comment'] || '');
            }
          }
        });
      }
    }, 100);
    
    // Cerrar modal automáticamente después de cambiar el status exitosamente
    setTimeout(() => {
      closeCommentModal();
    }, 500); // Pequeño delay para que el usuario vea el éxito
  });
}

// Función para actualizar el status badge en el header
function updateStatusBadge(modal, newStatus) {
  const statusContainer = modal.querySelector('.status-container');
  let statusBadge = modal.querySelector('.status-badge');
  
  if (newStatus) {
    if (statusBadge) {
      // Actualizar badge existente
      statusBadge.textContent = newStatus;
      statusBadge.setAttribute('data-status', newStatus);
    } else {
      // Crear nuevo badge si no existía
      statusBadge = document.createElement('div');
      statusBadge.className = 'status-badge';
      statusBadge.setAttribute('data-status', newStatus);
      statusBadge.textContent = newStatus;
      
      // Insertar antes del dropdown si existe
      const statusControl = modal.querySelector('#statusControl');
      if (statusControl) {
        statusContainer.insertBefore(statusBadge, statusControl);
      } else {
        statusContainer.appendChild(statusBadge);
      }
    }
  } else {
    // Remover badge si no hay status
    if (statusBadge) {
      statusBadge.remove();
    }
  }
}

// Función para agregar un nuevo comentario a los datos
function addNewCommentToData(context, newComment, type = 'item', imageName = null) {
  console.log('🔥 === INICIO addNewCommentToData ===');
  console.log('📝 Contexto:', context);
  console.log('💬 Nuevo comentario:', newComment);
  console.log('🏷️ Tipo:', type);
  console.log('🖼️ Imagen:', imageName);
  
  // Marcar que acabamos de agregar un comentario para forzar actualización de tabla
  window.justAddedComment = true;
  
  // Crear el string del nuevo comentario en formato Excel
  const newCommentString = `${newComment.usuario}¦${newComment.fechaHora}¦${newComment.tipoComentario}¦${newComment.textoComentario}¦${newComment.status}`;
  console.log('📋 String de comentario formateado:', newCommentString);
  console.log('📝 DEBUG - textoComentario en string:', `"${newComment.textoComentario}"`);
  console.log('📝 DEBUG - newComment completo:', JSON.stringify(newComment, null, 2));
  
  if (type === 'image' && imageName) {
    // Es un comentario de imagen - buscar en datos procesados (Object Type = 'Image')
    console.log(`🔍 Buscando imagen "${imageName}" en datos existentes...`);
    
    // DEBUG: Verificar si hay objetos tipo Image en los datos
    const imageObjects = currentWorkingData ? currentWorkingData.filter(item => item['Object Type'] === 'Image') : [];
    console.log(`📊 Total de objetos tipo "Image" en currentWorkingData: ${imageObjects.length}`);
    if (imageObjects.length > 0) {
      console.log(`📋 Primeros 3 objetos Image:`, imageObjects.slice(0, 3).map(img => ({
        Name: img.Name,
        ID: img.ID || img.Id,
        ObjectType: img['Object Type']
      })));
    }
    
    let assetData = findImageAssetByName(imageName);
    
    if (assetData) {
      // Ya existe el asset Image, agregar al comentario existente
      const existingComments = assetData['WA_VIS_Comment'] || '';
      const newCompleteComments = existingComments ? existingComments + '¶' + newCommentString : newCommentString;
      assetData['WA_VIS_Comment'] = newCompleteComments;
      
      // Actualizar también en todas las fuentes
      const inCurrentWorking = currentWorkingData.find(item => 
        item['Object Type'] === 'Image' && item.Name === imageName
      );
      if (inCurrentWorking) {
        inCurrentWorking['WA_VIS_Comment'] = newCompleteComments;
      }
      
      const inAllLibrary = allLibraryData.find(item => 
        item['Object Type'] === 'Image' && item.Name === imageName
      );
      if (inAllLibrary) {
        inAllLibrary['WA_VIS_Comment'] = newCompleteComments;
      }
      
      const inAssetComments = currentAssetComments.find(asset => asset.Name === imageName);
      if (inAssetComments) {
        inAssetComments['WA_VIS_Comment'] = newCompleteComments;
      }
      
    } else {
      // No existe como objeto Image independiente en la base de datos
      console.log(`⚠️ La imagen "${imageName}" no existe como registro tipo "Image" en la base de datos`);
      
      // ESTRATEGIA ALTERNATIVA: Buscar el Item Code que contiene esta imagen
      const itemCodeWithImage = findItemCodeContainingImage(imageName);
      
      if (itemCodeWithImage) {
        console.log(`💡 SOLUCIÓN: Usar ID del Item Code que contiene la imagen`);
        console.log(`🔗 Item Code encontrado: ${itemCodeWithImage.Name} (ID: ${itemCodeWithImage.ID || itemCodeWithImage.Id})`);
        
        // Crear el asset temporal usando el ID del Item Code + sufijo para identificar la imagen específica
        const baseId = itemCodeWithImage.ID || itemCodeWithImage.Id;
        const imageSpecificId = `${baseId}_img_${imageName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        const newImageAsset = {
          Name: imageName,
          'Object Type': 'Image',
          'WA_VIS_Comment': newCommentString,
          ID: imageSpecificId,
          Id: imageSpecificId,
          _parentItemCode: baseId,
          _isFromItemCode: true
        };
        
        assetData = newImageAsset;
        
      } else {
        console.log(`🔧 FALLBACK: Crear registro temporal con ID consistente`);
        
        // Crear nuevo registro de tipo Image con ID consistente SOLO como último recurso
        const consistentId = generateConsistentImageId(imageName);
        const newImageAsset = {
          Name: imageName,
          'Object Type': 'Image',
          'WA_VIS_Comment': newCommentString,
          ID: consistentId,
          Id: consistentId,
          _isTemporary: true // Marcar como temporal
        };
        
        assetData = newImageAsset;
      }
      
      // Agregar a todas las fuentes de datos
      currentWorkingData.push(assetData);
      if (allLibraryData) {
        allLibraryData.push(assetData);
      }
      if (currentAssetComments) {
        currentAssetComments.push(assetData);
      }
    }
    
    console.log('Comentario puesto:', newComment, 'para:', imageName);
    console.log('✅ Comentario agregado a objeto Image en currentWorkingData');
    console.log('Asset agregado/actualizado:', assetData);
    
    // Marcar Item Group como modificado automáticamente
    markItemGroupAsModified();
    
    // Actualizar burbujas visualmente para imágenes
    // Determinar el contexto correcto basado en el estado actual
    let contextForBubbles = null;
    
    if (currentItemGroup) {
      // Si tenemos un grupo actual, verificar si la imagen pertenece a un item específico
      if (currentItemCodes && currentItemCodes.length > 0) {
        // Buscar el item code que contiene esta imagen
        const itemCodeWithImage = currentItemCodes.find(itemCode => {
          const imageColumns = ['Foto 1', 'Foto 2', 'Foto 3', 'Foto 4', 'Foto 5'];
          return imageColumns.some(col => itemCode[col] === imageName);
        });
        
        if (itemCodeWithImage) {
          // La imagen pertenece a un item específico
          contextForBubbles = itemCodeWithImage['Item Code'] || itemCodeWithImage['Name'];
          console.log('🎯 Contexto para burbuja: Item Code -', contextForBubbles);
          setTimeout(() => {
            // Actualizar burbuja de imagen inline
            const imageComments = getImageComments(imageName);
            const currentStatus = getCurrentStatus(imageComments);
            const imageThumbnails = document.querySelectorAll('.image-thumbnail');
            imageThumbnails.forEach(img => {
              if (img.alt === imageName) {
                const container = img.closest('.image-thumbnail-container');
                if (container) {
                  let bubble = container.querySelector('.comment-bubble.image-comment');
                  if (bubble) {
                    bubble.setAttribute('data-status', currentStatus);
                  } else {
                    const newBubble = document.createElement('div');
                    newBubble.className = 'comment-bubble image-comment';
                    newBubble.setAttribute('data-image', imageName);
                    newBubble.setAttribute('data-status', currentStatus);
                    newBubble.setAttribute('onclick', `handleImageCommentClick(event, '${imageName}')`);
                    newBubble.setAttribute('title', 'Ver comentarios');
                    newBubble.innerHTML = '<i class="fa-solid fa-comment"></i>';
                    container.appendChild(newBubble);
                  }
                }
              }
            });
          }, 100);
        } else {
          // La imagen pertenece al grupo
          contextForBubbles = currentItemGroup['Name'] || currentItemGroup['Id'];
          console.log('🎯 Contexto para burbuja: Item Group -', contextForBubbles);
          setTimeout(() => {
            // Actualizar burbuja de imagen inline
            const imageComments = getImageComments(imageName);
            const currentStatus = getCurrentStatus(imageComments);
            const imageThumbnails = document.querySelectorAll('.image-thumbnail');
            imageThumbnails.forEach(img => {
              if (img.alt === imageName) {
                const container = img.closest('.image-thumbnail-container');
                if (container) {
                  let bubble = container.querySelector('.comment-bubble.image-comment');
                  if (bubble) {
                    bubble.setAttribute('data-status', currentStatus);
                  } else {
                    const newBubble = document.createElement('div');
                    newBubble.className = 'comment-bubble image-comment';
                    newBubble.setAttribute('data-image', imageName);
                    newBubble.setAttribute('data-status', currentStatus);
                    newBubble.setAttribute('onclick', `handleImageCommentClick(event, '${imageName}')`);
                    newBubble.setAttribute('title', 'Ver comentarios');
                    newBubble.innerHTML = '<i class="fa-solid fa-comment"></i>';
                    container.appendChild(newBubble);
                  }
                }
              }
            });
          }, 100);
        }
      } else {
        // Solo tenemos grupo, no items específicos
        contextForBubbles = currentItemGroup['Name'] || currentItemGroup['Id'];
        console.log('🎯 Contexto para burbuja: Item Group -', contextForBubbles);
        setTimeout(() => {
          // Actualizar burbuja de imagen inline
          const imageComments = getImageComments(imageName);
          const currentStatus = getCurrentStatus(imageComments);
          const imageThumbnails = document.querySelectorAll('.image-thumbnail');
          imageThumbnails.forEach(img => {
            if (img.alt === imageName) {
              const container = img.closest('.image-thumbnail-container');
              if (container) {
                let bubble = container.querySelector('.comment-bubble.image-comment');
                if (bubble) {
                  bubble.setAttribute('data-status', currentStatus);
                } else {
                  const newBubble = document.createElement('div');
                  newBubble.className = 'comment-bubble image-comment';
                  newBubble.setAttribute('data-image', imageName);
                  newBubble.setAttribute('data-status', currentStatus);
                  newBubble.setAttribute('onclick', `handleImageCommentClick(event, '${imageName}')`);
                  newBubble.setAttribute('title', 'Ver comentarios');
                  newBubble.innerHTML = '<i class="fa-solid fa-comment"></i>';
                  container.appendChild(newBubble);
                }
              }
            }
          });
        }, 100);
      }
    } else {
      console.log('⚠️ No hay contexto actual disponible para actualizar burbujas');
    }
    
    // Trackear el último item comentado para debugging
    if (assetData && (assetData.ID || assetData.Id)) {
      window.lastCommentedItemId = assetData.ID || assetData.Id;
      window.lastCommentedData = newComment;
      window.lastCommentedType = 'image';
      console.log('🎯 Trackear último item imagen comentado ID:', window.lastCommentedItemId);
      console.log('🎯 Trackear datos del comentario imagen:', window.lastCommentedData);
    }
    
    return;
  }
  
  // Encontrar el elemento correspondiente en los datos
  // Esto depende del contexto (Item Code o Item Group)
  const modal = document.getElementById('commentModal');
  const isGroupComment = modal.querySelector('.modal-title').textContent.includes('Item Group');
  
  if (isGroupComment) {
    // Es un comentario de Item Group
    let targetItemGroup = currentItemGroup;
    
    // Si currentItemGroup es null, intentar encontrarlo por contexto
    if (!targetItemGroup) {
      console.log('📍 currentItemGroup es null, buscando por contexto:', context);
      
      // Extraer el ID del contexto (formato: "Nombre (ID)")
      const idMatch = context.match(/\((\d+)\)$/);
      if (idMatch) {
        const itemGroupId = idMatch[1];
        console.log('🔍 Buscando Item Group con ID:', itemGroupId);
        
        // Buscar en allLibraryData o currentWorkingData
        targetItemGroup = (allLibraryData || currentWorkingData).find(item => 
          item['Object Type'] === 'Item Group' && 
          (item.Id === itemGroupId || String(item.Id) === itemGroupId)
        );
        
        if (targetItemGroup) {
          console.log('✅ Item Group encontrado por ID:', targetItemGroup.Name);
        }
      }
      
      // Si aún no se encuentra, buscar por nombre
      if (!targetItemGroup) {
        const itemName = context.split(' (')[0]; // Remover el (ID) del final
        console.log('🔍 Buscando Item Group por nombre:', itemName);
        
        targetItemGroup = (allLibraryData || currentWorkingData).find(item => 
          item['Object Type'] === 'Item Group' && 
          item.Name === itemName
        );
        
        if (targetItemGroup) {
          console.log('✅ Item Group encontrado por nombre:', targetItemGroup.Name);
        }
      }
    }
    
    if (targetItemGroup) {
      // Mostrar el estado ANTES del cambio
      const existingComments = targetItemGroup['WA_VIS_Comment'] || '';
      console.log('📋 ANTES - Comentarios existentes:', existingComments);
      
      // Parsear comentarios ANTES para comparar
      const commentsBefore = parseCommentForDebugging(existingComments);
      console.log('🔍 ANTES - Datos parseados:', commentsBefore);
      
      // Actualizar el Item Group encontrado
      targetItemGroup['WA_VIS_Comment'] = existingComments ? existingComments + '¶' + newCommentString : newCommentString;
      
      // Parsear comentarios DESPUÉS para comparar
      const commentsAfter = parseCommentForDebugging(targetItemGroup['WA_VIS_Comment']);
      console.log('🔍 DESPUÉS - Datos parseados:', commentsAfter);
      
      // Mostrar qué cambió específicamente
      console.log('🎯 === ANÁLISIS DE CAMBIOS ===');
      console.log('   Analista antes:', commentsBefore.analista, '→ después:', commentsAfter.analista);
      console.log('   Fecha analista antes:', commentsBefore.primeraFechaAnalista, '→ después:', commentsAfter.primeraFechaAnalista);
      console.log('   Comentario analista antes:', commentsBefore.ultimoComentarioAnalista, '→ después:', commentsAfter.ultimoComentarioAnalista);
      console.log('   Diseñador antes:', commentsBefore.diseñador, '→ después:', commentsAfter.diseñador);
      console.log('   Fecha diseñador antes:', commentsBefore.ultimaFechaDisenador, '→ después:', commentsAfter.ultimaFechaDisenador);
      console.log('   Comentario diseñador antes:', commentsBefore.ultimoComentarioDisenador, '→ después:', commentsAfter.ultimoComentarioDisenador);
      console.log('   Status antes:', commentsBefore.ultimoStatus, '→ después:', commentsAfter.ultimoStatus);
      console.log('   Tipo antes:', commentsBefore.ultimoTipo, '→ después:', commentsAfter.ultimoTipo);
      
      console.log('💾 Comentario guardado en Item Group:', targetItemGroup.Name);
      console.log('💾 Comentario completo guardado:', targetItemGroup['WA_VIS_Comment']);
      
      // Actualizar también en currentWorkingData si es diferente
      const itemGroupIndex = currentWorkingData.findIndex(item => 
        item['Object Type'] === 'Item Group' && 
        (item.Id === targetItemGroup.Id || item.NamePath === targetItemGroup.NamePath)
      );
      
      if (itemGroupIndex !== -1) {
        currentWorkingData[itemGroupIndex]['WA_VIS_Comment'] = targetItemGroup['WA_VIS_Comment'];
        console.log('💾 También actualizado en currentWorkingData');
      }
      
      // Actualizar también en allLibraryData si existe
      if (allLibraryData && allLibraryData.length > 0) {
        const allDataIndex = allLibraryData.findIndex(item => 
          item['Object Type'] === 'Item Group' && 
          (item.Id === targetItemGroup.Id || item.NamePath === targetItemGroup.NamePath)
        );
        
        if (allDataIndex !== -1) {
          allLibraryData[allDataIndex]['WA_VIS_Comment'] = targetItemGroup['WA_VIS_Comment'];
          console.log('💾 También actualizado en allLibraryData');
        }
      }
      
      // Si currentItemGroup era null, actualizarlo para futuras referencias
      if (!currentItemGroup) {
        currentItemGroup = targetItemGroup;
        console.log('🔄 currentItemGroup actualizado');
      }
      
      // Trackear el último item comentado para debugging
      window.lastCommentedItemId = targetItemGroup.Id || targetItemGroup.ID;
      window.lastCommentedData = newComment;
      window.lastCommentedType = 'group';
      console.log('🎯 Trackear último item grupo comentado ID:', window.lastCommentedItemId);
      console.log('🎯 Trackear datos del comentario grupo:', window.lastCommentedData);
      
    } else {
      console.error('❌ No se pudo encontrar el Item Group para guardar el comentario:', context);
      return;
    }
  } else {
    // Es un comentario de Item Code
    console.log('🏷️ Procesando comentario de Item Code');
    
    // Buscar el Item Code por ID primero, luego por nombre
    let itemCodeData = null;
    
    // Extraer el ID del contexto (formato: "Nombre (ID)")
    const idMatch = context.match(/\((\d+)\)$/);
    if (idMatch) {
      const itemCodeId = idMatch[1];
      console.log('🔍 Buscando Item Code con ID:', itemCodeId);
      
      // Buscar primero en currentWorkingData
      itemCodeData = currentWorkingData.find(item => 
        item['Object Type'] === 'Item Code' && 
        (item.Id === itemCodeId || String(item.Id) === itemCodeId)
      );
      
      if (itemCodeData) {
        itemCodeData._source = 'currentWorkingData';
      }
      
      // Si no se encuentra en currentWorkingData, buscar en allLibraryData
      if (!itemCodeData && allLibraryData && allLibraryData.length > 0) {
        console.log('🔍 No encontrado en currentWorkingData, buscando en allLibraryData por ID...');
        itemCodeData = allLibraryData.find(item => 
          item['Object Type'] === 'Item Code' && 
          (item.Id === itemCodeId || String(item.Id) === itemCodeId)
        );
        
        if (itemCodeData) {
          itemCodeData._source = 'allLibraryData';
          console.log('✅ Item Code encontrado en allLibraryData por ID:', itemCodeData.Name);
          // Asegurar que también existe en currentWorkingData para futuras referencias
          const existsInCurrentWorking = currentWorkingData.find(item => 
            item['Object Type'] === 'Item Code' && 
            (item.Id === itemCodeData.Id || item.Name === itemCodeData.Name)
          );
          
          if (!existsInCurrentWorking) {
            console.log('🔄 Agregando Item Code a currentWorkingData para consistencia');
            currentWorkingData.push({...itemCodeData});
          }
        }
      }
      
      if (itemCodeData) {
        console.log('✅ Item Code encontrado por ID:', itemCodeData.Name);
      }
    }
    
    // Si no se encuentra por ID, buscar por nombre
    if (!itemCodeData) {
      const itemName = context.split(' (')[0]; // Remover el (ID) del final
      console.log('🔍 Buscando Item Code por nombre:', itemName);
      
      // Buscar primero en currentWorkingData
      itemCodeData = currentWorkingData.find(item => 
        item['Object Type'] === 'Item Code' && 
        (item.Name === itemName || item['Item Code'] === itemName)
      );
      
      if (itemCodeData) {
        itemCodeData._source = 'currentWorkingData';
      }
      
      // Si no se encuentra en currentWorkingData, buscar en allLibraryData
      if (!itemCodeData && allLibraryData && allLibraryData.length > 0) {
        console.log('🔍 No encontrado en currentWorkingData, buscando en allLibraryData...');
        itemCodeData = allLibraryData.find(item => 
          item['Object Type'] === 'Item Code' && 
          (item.Name === itemName || item['Item Code'] === itemName)
        );
        
        if (itemCodeData) {
          itemCodeData._source = 'allLibraryData';
          console.log('✅ Item Code encontrado en allLibraryData:', itemCodeData.Name);
          // Asegurar que también existe en currentWorkingData para futuras referencias
          const existsInCurrentWorking = currentWorkingData.find(item => 
            item['Object Type'] === 'Item Code' && 
            (item.Id === itemCodeData.Id || item.Name === itemCodeData.Name)
          );
          
          if (!existsInCurrentWorking) {
            console.log('🔄 Agregando Item Code a currentWorkingData para consistencia');
            currentWorkingData.push({...itemCodeData});
          }
        }
      }
      
      if (itemCodeData) {
        console.log('✅ Item Code encontrado por nombre:', itemCodeData.Name);
      }
    }
    
    if (itemCodeData) {
      // Verificar en ambas fuentes de datos para comparar
      const inCurrentWorking = currentWorkingData.find(item => 
        item['Object Type'] === 'Item Code' && 
        (item.Id === itemCodeData.Id || item.Name === itemCodeData.Name)
      );
      
      const inAllLibrary = allLibraryData ? allLibraryData.find(item => 
        item['Object Type'] === 'Item Code' && 
        (item.Id === itemCodeData.Id || item.Name === itemCodeData.Name)
      ) : null;
      
      console.log('🔍 En currentWorkingData:', !!inCurrentWorking, 'Comentarios:', inCurrentWorking ? (inCurrentWorking['WA_VIS_Comment'] || 'VACÍO') : 'N/A');
      console.log('🔍 En allLibraryData:', !!inAllLibrary, 'Comentarios:', inAllLibrary ? (inAllLibrary['WA_VIS_Comment'] || 'VACÍO') : 'N/A');
      
      // Usar la fuente que tenga comentarios, o la original si ambas están iguales
      let sourceWithComments = itemCodeData;
      if (inAllLibrary && inAllLibrary['WA_VIS_Comment'] && !itemCodeData['WA_VIS_Comment']) {
        console.log('🔄 Usando comentarios de allLibraryData porque itemCodeData está vacío');
        sourceWithComments = inAllLibrary;
      } else if (inCurrentWorking && inCurrentWorking['WA_VIS_Comment'] && !itemCodeData['WA_VIS_Comment']) {
        console.log('🔄 Usando comentarios de currentWorkingData porque itemCodeData está vacío');
        sourceWithComments = inCurrentWorking;
      }
      
      // Mostrar el estado ANTES del cambio
      const existingComments = sourceWithComments['WA_VIS_Comment'] || '';
      console.log('📋 ANTES - Comentarios existentes (Item Code):', existingComments);
      
      // Parsear comentarios ANTES para comparar
      const commentsBefore = parseCommentForDebugging(existingComments);
      console.log('🔍 ANTES - Datos parseados (Item Code):', commentsBefore);
      
      // Crear el nuevo comentario completo
      const newCompleteComments = existingComments ? existingComments + '¶' + newCommentString : newCommentString;
      
      // Actualizar en TODAS las fuentes de datos
      itemCodeData['WA_VIS_Comment'] = newCompleteComments;
      
      if (inCurrentWorking) {
        inCurrentWorking['WA_VIS_Comment'] = newCompleteComments;
        console.log('✅ Actualizado en currentWorkingData');
      }
      
      if (inAllLibrary) {
        inAllLibrary['WA_VIS_Comment'] = newCompleteComments;
        console.log('✅ Actualizado en allLibraryData');
      }
      
      // Parsear comentarios DESPUÉS para comparar
      const commentsAfter = parseCommentForDebugging(newCompleteComments);
      console.log('🔍 DESPUÉS - Datos parseados (Item Code):', commentsAfter);
      
      // Mostrar qué cambió específicamente
      console.log('🎯 === ANÁLISIS DE CAMBIOS (Item Code) ===');
      console.log('   Analista antes:', commentsBefore.analista, '→ después:', commentsAfter.analista);
      console.log('   Fecha analista antes:', commentsBefore.primeraFechaAnalista, '→ después:', commentsAfter.primeraFechaAnalista);
      console.log('   Comentario analista antes:', commentsBefore.ultimoComentarioAnalista, '→ después:', commentsAfter.ultimoComentarioAnalista);
      console.log('   Diseñador antes:', commentsBefore.diseñador, '→ después:', commentsAfter.diseñador);
      console.log('   Fecha diseñador antes:', commentsBefore.ultimaFechaDisenador, '→ después:', commentsAfter.ultimaFechaDisenador);
      console.log('   Comentario diseñador antes:', commentsBefore.ultimoComentarioDisenador, '→ después:', commentsAfter.ultimoComentarioDisenador);
      console.log('   Status antes:', commentsBefore.ultimoStatus, '→ después:', commentsAfter.ultimoStatus);
      console.log('   Tipo antes:', commentsBefore.ultimoTipo, '→ después:', commentsAfter.ultimoTipo);
      
      console.log('💾 Comentario guardado en Item Code:', itemCodeData.Name);
      console.log('💾 Comentario completo guardado:', newCompleteComments);
      
      // Trackear el último item comentado para debugging
      window.lastCommentedItemId = itemCodeData.Id || itemCodeData.ID;
      window.lastCommentedData = newComment; // Guardar los datos del comentario
      window.lastCommentedType = 'item';
      console.log('🎯 Trackear último item comentado ID:', window.lastCommentedItemId);
      console.log('🎯 Trackear datos del comentario:', window.lastCommentedData);
      
    } else {
      console.error('❌ No se pudo encontrar el Item Code para guardar el comentario:', context);
      return;
    }
  }
  
  console.log('Comentario agregado:', newComment);
  
  // MARCAR comentarios recientes para preservar en filtros/cambios de vista
  lastCommentTimestamp = new Date();
  recentCommentsFlag = true;
  console.log('🏃‍♂️ MARCADO: Comentarios recientes detectados para preservación');
  
  // Marcar Item Group como modificado automáticamente
  markItemGroupAsModified();
  
  // NUEVO: Actualizar caché con los nuevos comentarios
  updateCacheWithNewComment(newComment, type, context, imageName);
  
  // Actualizar burbujas visualmente después de agregar comentario
  if (isGroupComment) {
    if (typeof updateCommentBubbles === 'function') {
      updateCommentBubbles('group', context, imageName);
    } else {
      console.log('🔍 updateCommentBubbles no está disponible - actualizando grupo:', context);
    }
  } else {
    if (typeof updateCommentBubbles === 'function') {
      updateCommentBubbles('item', context, imageName);
    } else {
      console.log('🔍 updateCommentBubbles no está disponible - actualizando item:', context);
    }
  }
}

// NUEVO: Función para actualizar el caché con nuevos comentarios
function updateCacheWithNewComment(newComment, type, context, imageName) {
  console.log('🔄 === INICIO updateCacheWithNewComment ===');
  console.log('📝 Actualizando caché para:', { type, context, imageName });
  
  if (!itemGroupDataCache || itemGroupDataCache.size === 0) {
    console.log('⚠️ No hay caché disponible para actualizar');
    return;
  }
  
  // Determinar el Item Group ID según el tipo
  let itemGroupId = null;
  
  if (type === 'image' && imageName) {
    // Para imágenes, buscar en allLibraryData el Item Group
    const imageData = allLibraryData.find(item => 
      item['Object Type'] === 'Image' && item.Name === imageName
    );
    if (imageData) {
      itemGroupId = imageData['Item Groups'];
    }
  } else if (type === 'item') {
    // Para items, extraer el ID del contexto
    const match = context.match(/\((\d+)\)/);
    if (match) {
      const itemId = match[1];
      const itemData = allLibraryData.find(item => 
        item['Object Type'] === 'Item Code' && (item.Id === itemId || item.ID === itemId)
      );
      if (itemData) {
        itemGroupId = itemData['Item Groups'];
      }
    }
  }
  
  if (!itemGroupId) {
    console.log('⚠️ No se pudo determinar el Item Group ID para actualizar caché');
    return;
  }
  
  console.log('🎯 Actualizando caché para Item Group:', itemGroupId);
  
  // Obtener los datos actualizados del Item Group desde allLibraryData
  const updatedItems = allLibraryData.filter(item => item['Item Groups'] === itemGroupId);
  
  if (updatedItems.length > 0) {
    // Actualizar el caché con los datos actualizados
    itemGroupDataCache.set(itemGroupId, updatedItems);
    console.log('✅ Caché actualizado para Item Group:', itemGroupId, '- Items:', updatedItems.length);
  } else {
    console.log('⚠️ No se encontraron items actualizados para Item Group:', itemGroupId);
  }
  
  // Actualizar los datos maestros después de modificar el caché
  console.log('🔄 Actualizando datos maestros después del nuevo comentario...');
  updateMasterDataFromAllSources();
  console.log('✅ Datos maestros actualizados después del nuevo comentario');
  
  console.log('✅ === FIN updateCacheWithNewComment ===');
}

// Función para parsear comentarios estructurados (específica para debugging)
function parseCommentForDebugging(commentText) {
  // Inicializar estructura de respuesta
  const result = {
    analista: '',
    primeraFechaAnalista: '',
    ultimoComentarioAnalista: '',
    diseñador: '',
    ultimaFechaDisenador: '',
    ultimoComentarioDisenador: '',
    ultimoTipo: '',
    ultimoStatus: ''
  };

  if (!commentText || commentText.trim() === '') {
    return result;
  }

  try {
    // Dividir por ¶ para separar todas las entradas
    const sections = commentText.split('¶');
    
    let allEntries = [];
    
    // Procesar cada sección
    sections.forEach(section => {
      if (section.trim()) {
        // Dividir por ¦ para obtener los campos
        const fields = section.split('¦');
        if (fields.length >= 5) {
          const entry = {
            usuario: fields[0].trim(),
            fecha: fields[1].trim(),
            tipo: fields[2].trim(),
            comentario: fields[3].trim(),
            status: fields[4].trim(),
            fechaDate: new Date(fields[1].trim())
          };
          allEntries.push(entry);
        }
      }
    });

    if (allEntries.length === 0) {
      return result;
    }

    // Separar analistas y diseñadores basado en los usuarios conocidos
    // Lista de analistas conocidos (puedes expandir esta lista)
    const analistasConocidos = ['Victor', 'Carlos', 'Kalem', 'Diego', 'Sandra', 'Ximena'];
    // Lista de diseñadores conocidos (puedes expandir esta lista)  
    const diseñadoresConocidos = ['Veronica', 'Verónica', 'Cinthya', 'Thanya', 'Grecia', 'Rossana', 'Carla', 'Gabriela', 'Karen'];
    
    let analistas = [];
    let diseñadores = [];
    
    // Clasificar entradas por tipo de usuario
    allEntries.forEach(entry => {
      if (analistasConocidos.includes(entry.usuario)) {
        analistas.push(entry);
      } else if (diseñadoresConocidos.includes(entry.usuario)) {
        diseñadores.push(entry);
      } else {
        // Si no se reconoce, asumir que es analista por defecto
        analistas.push(entry);
      }
    });

    // Ordenar por fecha
    analistas.sort((a, b) => a.fechaDate - b.fechaDate);
    diseñadores.sort((a, b) => a.fechaDate - b.fechaDate);

    // Procesar analistas
    if (analistas.length > 0) {
      const primerAnalista = analistas[0];
      const ultimoAnalista = analistas[analistas.length - 1];
      
      result.analista = primerAnalista.usuario;
      result.primeraFechaAnalista = primerAnalista.fecha;
      result.ultimoComentarioAnalista = ultimoAnalista.comentario;
    }

    // Procesar diseñadores
    if (diseñadores.length > 0) {
      const ultimoDisenador = diseñadores[diseñadores.length - 1];
      
      result.diseñador = ultimoDisenador.usuario;
      result.ultimaFechaDisenador = ultimoDisenador.fecha;
      result.ultimoComentarioDisenador = ultimoDisenador.comentario;
    }

    // Encontrar la entrada más reciente para tipo y status
    if (allEntries.length > 0) {
      // Ordenar todas las entradas por fecha
      allEntries.sort((a, b) => b.fechaDate - a.fechaDate);
      
      result.ultimoTipo = allEntries[0].tipo;
      result.ultimoStatus = allEntries[0].status;
    }

  } catch (error) {
    console.warn('Error parseando comentario para debug:', commentText, error);
  }

  return result;
}

// Función para actualizar las tablas después de agregar un comentario
function updateTablesAfterComment() {
  console.log('🔄 === INICIO updateTablesAfterComment (Nueva versión con commentedItemsData) ===');
  
  // DETECTAR SI EL USUARIO ESTÁ EN EL VISUALIZADOR DE GRUPOS
  const box4Content = document.getElementById('box4-content');
  const isInVisualizerGrid = box4Content && box4Content.querySelector('.image-grid-container');
  const hasActiveItemGroup = currentItemGroup !== null;
  
  if (isInVisualizerGrid && hasActiveItemGroup) {
    console.log('🎯 DETECTADO: Usuario está en visualizador de grupos - NO cambiar vista automáticamente');
    console.log('📝 Actualizando solo los datos internos sin cambiar la vista...');
    
    // Solo actualizar los datos internos sin cambiar la interfaz visual
    initializeCommentedItemsData();
    console.log(`✅ commentedItemsData actualizada con ${commentedItemsData.length} items con comentarios`);
    
    // NUEVO: Guardar estado unificado después de agregar comentario
    console.log('💾 Guardando estado unificado después de agregar comentario en visualizador...');
    saveUnifiedViewState();
    
    // Actualizar solo las estadísticas en segundo plano
    setTimeout(() => {
      regenerateStatsTablesFromCommentedData();
    }, 100);
    
    console.log('✅ === FIN updateTablesAfterComment (Modo visualizador - sin cambio de vista) ===');
    return; // Salir temprano para mantener la vista del visualizador
  }
  
  // CONTINUAR CON FLUJO NORMAL SOLO SI NO ESTÁ EN VISUALIZADOR
  console.log('📊 Usuario en vista de datos - procediendo con actualización completa...');
  
  // BANDERA: Evitar doble actualización de tablas
  window.isUpdatingCommentTables = true;
  console.log('🔒 BANDERA: isUpdatingCommentTables = true - deshabilitando restauración de filtros');
  
  // PASO 1: PRESERVAR FILTROS ACTIVOS
  console.log('🔒 Preservando filtros activos antes de actualizar...');
  saveInventoryViewState();
  
  // PASO 2: ACTUALIZAR commentedItemsData con último item comentado
  console.log(' Actualizando commentedItemsData con último item comentado...');
  
  // En lugar de actualizar incrementalmente, re-inicializar completamente
  // Esto garantiza que todos los items con comentarios estén incluidos
  console.log('🔄 Re-inicializando commentedItemsData completamente para garantizar consistencia...');
  
  // FORZAR: Asegurar que allLibraryData esté actualizado antes de re-inicializar
  if (window.lastCommentedItemId) {
    console.log(`🔥 FORZANDO: Verificando item recién comentado: ${window.lastCommentedItemId}`);
    const recentItem = allLibraryData.find(item => 
      (item.ID || item.Id || item.id) == window.lastCommentedItemId
    );
    if (recentItem && recentItem['WA_VIS_Comment']) {
      console.log('✅ FORZANDO: Item recién comentado encontrado en allLibraryData con comentarios');
    } else {
      console.log('❌ FORZANDO: Item recién comentado NO encontrado o sin comentarios en allLibraryData');
    }
  }
  
  initializeCommentedItemsData();
  console.log(`✅ commentedItemsData re-inicializada con ${commentedItemsData.length} items con comentarios`);
  
  // PASO 3: REGENERAR TABLAS DESDE commentedItemsData
  console.log('📊 Regenerando tablas desde commentedItemsData...');
  
  // 3.1 Actualizar tabla de inventario - buscar box4Content directamente
  if (box4Content) {
    console.log('📋 Regenerando tabla de inventario desde commentedItemsData...');
    regenerateInventoryTableFromCommentedData();
  } else {
    console.log('❌ No se encontró box4-content en updateTablesAfterComment');
  }
  
  // 3.2 Actualizar tablas de resumen/estadísticas
  setTimeout(() => {
    console.log(' Regenerando tablas de resumen desde commentedItemsData...');
    regenerateStatsTablesFromCommentedData();
  }, 100);
  
  // PASO 4: RESTAURAR FILTROS
  setTimeout(() => {
    console.log('🔄 Restaurando filtros después de regenerar tablas...');
    restoreInventoryViewState();
    
    // NUEVO: Guardar estado unificado después de todas las actualizaciones
    console.log('💾 Guardando estado unificado después de actualizar tablas...');
    saveUnifiedViewState();
    
    // Limpiar bandera
    window.isUpdatingCommentTables = false;
    console.log('🔓 BANDERA: isUpdatingCommentTables = false');
  }, 500);
  
  console.log('✅ === FIN updateTablesAfterComment (Nueva versión) ===');
}

// ========== FUNCIONES AUXILIARES PARA commentedItemsData ==========

// Función para regenerar tabla de inventario desde commentedItemsData
function regenerateInventoryTableFromCommentedData() {
  console.log('📋 Regenerando tabla de inventario desde commentedItemsData...');
  
  // Verificar si hay filtros activos
  const hasFilters = inventoryViewState && (
    (inventoryViewState.activeFilters && Object.keys(inventoryViewState.activeFilters).length > 0) ||
    (inventoryViewState.dropdownFilters && Object.keys(inventoryViewState.dropdownFilters).length > 0)
  );
  
  let dataToUse = commentedItemsData;
  
  // Aplicar filtros si los hay
  if (hasFilters) {
    console.log('🔍 Aplicando filtros a commentedItemsData...');
    dataToUse = applyFiltersToCommentedData(commentedItemsData, inventoryViewState);
  }
  
  // Buscar el contenedor principal (box4Content) en lugar de solo la tabla
  const box4Content = document.getElementById('box4-content');
  if (box4Content) {
    if (dataToUse.length > 0) {
      // Convertir commentedItemsData al formato esperado y generar HTML COMPLETO
      const convertedData = dataToUse.map(item => item.originalItem);
      const newTableHTML = generateImageInventoryTable(convertedData, true);
      
      // Reemplazar TODO el contenido de box4 para evitar duplicaciones
      box4Content.innerHTML = newTableHTML;
      
      console.log(`✅ Tabla regenerada completamente con ${dataToUse.length} items`);
    } else {
      // Mostrar mensaje de "no hay datos" pero mantener estructura básica
      box4Content.innerHTML = `
        <div class="inventory-controls">
          <div class="inventory-header">
            <h3>Comentarios del Visualizador</h3>
            <div class="button-group">
              <button id="assignDesignerBtn" class="inventory-btn inventory-btn-primary">
                <i class="fas fa-user-plus"></i> Asignar
              </button>
              <button id="openInventoryFilters" class="inventory-btn inventory-btn-secondary">
                <i class="fas fa-filter"></i> Filtros
              </button>
              <button class="inventory-btn inventory-btn-secondary" onclick="clearInventoryFilter()">
                <i class="fas fa-times"></i> Limpiar Filtros
              </button>
            </div>
            <div class="inventory-stats">Comentarios visibles: <strong>0</strong></div>
          </div>
        </div>
        <div class="inventory-table-wrapper">
          <div class="no-data-message">No hay elementos con comentarios que coincidan con los filtros.</div>
        </div>
      `;
      console.log('📋 No hay datos para mostrar con los filtros actuales');
    }
    
    // Reconfigurar event listeners después de regenerar
    setTimeout(() => {
      setupInventoryClickListeners();
      setupAssignButtonListener();
    }, 100);
  } else {
    console.log('❌ No se encontró box4-content para regenerar tabla');
  }
}

// Función para regenerar tablas de resumen desde commentedItemsData
function regenerateStatsTablesFromCommentedData() {
  console.log('📊 Regenerando tablas de resumen desde commentedItemsData...');
  
  // Regenerar tabla de analistas
  const analystTable = document.querySelector('.analyst-stats-table');
  if (analystTable) {
    console.log('👨‍💼 Regenerando tabla de analistas...');
    const analystTableHTML = generateAnalystStatsTableFromCommentedData();
    analystTable.innerHTML = analystTableHTML;
  }
  
  // Regenerar tabla de diseñadores
  const designerTable = document.querySelector('.designer-stats-table');
  if (designerTable) {
    console.log('🎨 Regenerando tabla de diseñadores...');
    const designerTableHTML = generateDesignerStatsTableFromCommentedData();
    designerTable.innerHTML = designerTableHTML;
  }
  
  console.log('✅ Tablas de resumen regeneradas desde commentedItemsData');
}

// Función para aplicar filtros a commentedItemsData
function applyFiltersToCommentedData(data, viewState) {
  if (!data || data.length === 0) return [];
  
  let filteredData = [...data];
  
  // Aplicar filtros de activeFilters (filtros de tabla)
  if (viewState.activeFilters) {
    const filters = viewState.activeFilters;
    
    if (filters.analista) {
      // console.log(`🔍 ANTES filtro analista: ${data.length} items totales`);
      // console.log(`🔍 Filtrando por analista: ${filters.analista}`);
      // console.log(`🔍 Muestra de analistas en datos:`, [...new Set(data.slice(0, 5).map(item => item.analista))]);
      filteredData = filteredData.filter(item => item.analista === filters.analista);
      // console.log(`🔍 DESPUÉS filtro analista aplicado: ${filters.analista} (${filteredData.length} items)`);
    }
    
    if (filters.diseñador) {
      filteredData = filteredData.filter(item => item.diseñador === filters.diseñador);
      // console.log(`🔍 Filtro diseñador aplicado: ${filters.diseñador} (${filteredData.length} items)`);
    }
    
    if (filters.analistaStatus) {
      filteredData = filteredData.filter(item => {
        if (filters.analistaStatus === 'activos') {
          // "Activos" = elementos con status de Revision o Diseño
          if (!item.ultimoStatus) return false;
          const status = item.ultimoStatus.toLowerCase();
          return (status.includes('revision') || status.includes('revisión') || status.includes('review')) ||
                 (status.includes('diseño') || status.includes('diseno') || status.includes('design'));
        } else if (filters.analistaStatus === 'diseño') {
          // "Diseño" = elementos con status que contenga diseño
          if (!item.ultimoStatus) return false;
          const status = item.ultimoStatus.toLowerCase();
          return status.includes('diseño') || status.includes('diseno') || status.includes('design');
        } else if (filters.analistaStatus === 'revisión') {
          // "Revisión" = elementos con status que contenga revisión
          if (!item.ultimoStatus) return false;
          const status = item.ultimoStatus.toLowerCase();
          return status.includes('revision') || status.includes('revisión') || status.includes('review');
        } else if (filters.analistaStatus === 'completado') {
          // "Completado" = elementos con status que contenga completado
          if (!item.ultimoStatus) return false;
          const status = item.ultimoStatus.toLowerCase();
          return status.includes('completado') || status.includes('completed') || status.includes('complete');
        } else if (filters.analistaStatus === 'cancelado') {
          // "Cancelado" = elementos con status que contenga cancelado
          if (!item.ultimoStatus) return false;
          const status = item.ultimoStatus.toLowerCase();
          return status.includes('cancelado') || status.includes('cancelled') || status.includes('cancel');
        } else {
          // Filtros específicos de status (comparación exacta)
          return item.ultimoStatus === filters.analistaStatus;
        }
      });
      // console.log(`🔍 Filtro status analista aplicado: ${filters.analistaStatus} (${filteredData.length} items)`);
    }
    
    if (filters.diseñadorStatus) {
      filteredData = filteredData.filter(item => {
        if (filters.diseñadorStatus === 'activos') {
          // "Activos" = elementos con status de Revision o Diseño
          if (!item.ultimoStatus) return false;
          const status = item.ultimoStatus.toLowerCase();
          return (status.includes('revision') || status.includes('revisión') || status.includes('review')) ||
                 (status.includes('diseño') || status.includes('diseno') || status.includes('design'));
        } else if (filters.diseñadorStatus === 'diseño') {
          // "Diseño" = elementos con status que contenga diseño
          if (!item.ultimoStatus) return false;
          const status = item.ultimoStatus.toLowerCase();
          return status.includes('diseño') || status.includes('diseno') || status.includes('design');
        } else if (filters.diseñadorStatus === 'revisión') {
          // "Revisión" = elementos con status que contenga revisión
          if (!item.ultimoStatus) return false;
          const status = item.ultimoStatus.toLowerCase();
          return status.includes('revision') || status.includes('revisión') || status.includes('review');
        } else if (filters.diseñadorStatus === 'completado') {
          // "Completado" = elementos con status que contenga completado
          if (!item.ultimoStatus) return false;
          const status = item.ultimoStatus.toLowerCase();
          return status.includes('completado') || status.includes('completed') || status.includes('complete');
        } else if (filters.diseñadorStatus === 'cancelado') {
          // "Cancelado" = elementos con status que contenga cancelado
          if (!item.ultimoStatus) return false;
          const status = item.ultimoStatus.toLowerCase();
          return status.includes('cancelado') || status.includes('cancelled') || status.includes('cancel');
        } else {
          // Filtros específicos de status (comparación exacta)
          return item.ultimoStatus === filters.diseñadorStatus;
        }
      });
      // console.log(`🔍 Filtro status diseñador aplicado: ${filters.diseñadorStatus} (${filteredData.length} items)`);
    }
  }
  
  // Aplicar filtros dropdown si los hay
  if (viewState.dropdownFilters) {
    const dropdownFilters = viewState.dropdownFilters;
    
    if (dropdownFilters.analista) {
      filteredData = filteredData.filter(item => item.analista === dropdownFilters.analista);
      // console.log(`🔍 Dropdown filtro analista aplicado: ${dropdownFilters.analista} (${filteredData.length} items)`);
    }
    
    if (dropdownFilters.disenador) {
      filteredData = filteredData.filter(item => item.diseñador === dropdownFilters.disenador);
      // console.log(`🔍 Dropdown filtro diseñador aplicado: ${dropdownFilters.disenador} (${filteredData.length} items)`);
    }
    
    if (dropdownFilters.status) {
      filteredData = filteredData.filter(item => item.ultimoStatus === dropdownFilters.status);
      // console.log(`🔍 Dropdown filtro status aplicado: ${dropdownFilters.status} (${filteredData.length} items)`);
    }
    
    if (dropdownFilters.tipo) {
      filteredData = filteredData.filter(item => item.ultimoTipo === dropdownFilters.tipo);
      // console.log(`🔍 Dropdown filtro tipo aplicado: ${dropdownFilters.tipo} (${filteredData.length} items)`);
    }
  }
  
  return filteredData;
}

// Función para generar tabla de analistas desde commentedItemsData
function generateAnalystStatsTableFromCommentedData() {
  // Usar commentedItemsData como fuente
  const data = commentedItemsData.map(item => item.originalItem);
  
  // Usar función existente pero con nueva fuente
  return generateAnalystStatsTable(data);
}

// Función para generar tabla de diseñadores desde commentedItemsData
function generateDesignerStatsTableFromCommentedData() {
  // Usar commentedItemsData como fuente
  const data = commentedItemsData.map(item => item.originalItem);
  
  // Usar función existente pero con nueva fuente
  return generateDesignerStatsTable(data);
}

// Función para generar tabla de inventario usando commentedItemsData directamente
function generateImageInventoryTableFromCommentedData() {
  console.log('📋 Generando tabla de inventario desde commentedItemsData...');
  
  if (!commentedItemsData || commentedItemsData.length === 0) {
    return '<div class="empty-box-message">No hay elementos con comentarios para mostrar</div>';
  }
  
  // Convertir commentedItemsData al formato esperado por generateImageInventoryTable
  const dataForTable = commentedItemsData.map(item => item.originalItem);
  
  // Usar la función existente con showAllData=true ya que commentedItemsData ya está filtrado
  return generateImageInventoryTable(dataForTable, true);
}

// Función para actualizar directamente las celdas de Analista y Diseñador en el DOM
function updateAnalystDesignerCellsDirectly() {
  // Si hay un item específico comentado, actualizar solo esas celdas
  if (window.lastCommentedItemId) {
    updateSpecificAnalystDesignerCells(window.lastCommentedItemId);
    return;
  }
  
  // Solo como fallback, hacer la actualización completa pero limitada
  updateAllAnalystDesignerCellsWithLimit();
}

// Nueva función optimizada para actualizar solo las celdas del item específico
function updateSpecificAnalystDesignerCells(itemId) {
  // Verificar disponibilidad de datos
  let dataSource = allLibraryData || currentWorkingData;
  if (!dataSource || !Array.isArray(dataSource) || dataSource.length === 0) {
    return;
  }
  
  // Buscar datos del item específico
  const matchingData = dataSource.find(row => String(row.ID) === String(itemId));
  if (!matchingData || !matchingData['WA_VIS_Comment']) {
    return;
  }
  
  // Parsear comentarios para obtener analista y diseñador actuales
  const parsedComments = parseCommentsFromExcel(matchingData['WA_VIS_Comment']);
  const latestAnalyst = getLatestAnalyst(parsedComments);
  const latestDesigner = getLatestDesigner(parsedComments);
  
  // Actualizar solo las celdas de este item específico
  const analystCells = document.querySelectorAll(`[data-comment-type="analista-clean"][data-item-id="${itemId}"]`);
  const designerCells = document.querySelectorAll(`[data-comment-type="diseñador-clean"][data-item-id="${itemId}"]`);
  
  analystCells.forEach(cell => {
    if (latestAnalyst && cell.textContent.trim() !== latestAnalyst) {
      cell.textContent = latestAnalyst;
    }
  });
  
  designerCells.forEach(cell => {
    if (latestDesigner && cell.textContent.trim() !== latestDesigner) {
      cell.textContent = latestDesigner;
    }
  });
}

// Función auxiliar con límite para evitar bloqueo del UI
function updateAllAnalystDesignerCellsWithLimit() {
  // Verificar disponibilidad de datos
  let dataSource = null;
  if (allLibraryData && Array.isArray(allLibraryData) && allLibraryData.length > 0) {
    dataSource = allLibraryData;
  } else if (currentWorkingData && Array.isArray(currentWorkingData) && currentWorkingData.length > 0) {
    dataSource = currentWorkingData;
  } else {
    return;
  }
  
  // Buscar todas las celdas de analista y diseñador en el DOM
  const analystCells = document.querySelectorAll('[data-comment-type="analista-clean"]');
  const designerCells = document.querySelectorAll('[data-comment-type="diseñador-clean"]');
  
  const maxCellsToProcess = 200; // Limitar procesamiento para evitar bloqueo
  let updatedCount = 0;
  
  // Actualizar celdas de analista (limitado)
  for (let i = 0; i < Math.min(analystCells.length, maxCellsToProcess); i++) {
    const cell = analystCells[i];
    const itemId = cell.getAttribute('data-item-id');
    
    if (itemId) {
      const matchingData = dataSource.find(row => String(row.ID) === String(itemId));
      
      if (matchingData && matchingData['WA_VIS_Comment']) {
        const parsedComments = parseCommentsFromExcel(matchingData['WA_VIS_Comment']);
        const latestAnalyst = getLatestAnalyst(parsedComments);
        const currentValue = cell.textContent.trim();
        
        if (latestAnalyst && currentValue !== latestAnalyst) {
          cell.textContent = latestAnalyst;
          updatedCount++;
        }
      }
    }
  }
  
  // Actualizar celdas de diseñador (limitado)
  for (let i = 0; i < Math.min(designerCells.length, maxCellsToProcess); i++) {
    const cell = designerCells[i];
    const itemId = cell.getAttribute('data-item-id');
    
    if (itemId) {
      const matchingData = dataSource.find(row => String(row.ID) === String(itemId));
      
      if (matchingData && matchingData['WA_VIS_Comment']) {
        const parsedComments = parseCommentsFromExcel(matchingData['WA_VIS_Comment']);
        const latestDesigner = getLatestDesigner(parsedComments);
        const currentValue = cell.textContent.trim();
        
        if (latestDesigner && currentValue !== latestDesigner) {
          cell.textContent = latestDesigner;
          updatedCount++;
        }
      }
    }
  }
}

// Función específica para actualizar tabla filtrada después de comentario
function updateFilteredInventoryTableAfterComment() {
  // En lugar de regenerar toda la tabla, solo actualizar las celdas de comentarios
  // que han cambiado, manteniendo filtros y scroll intactos
  
  // Si hay un item específico que se comentó, actualizarlo directamente
  if (window.lastCommentedItemId) {
    updateSpecificItemInTable(window.lastCommentedItemId);
  }
  
  // Actualizar solo las celdas de comentarios visibles en la tabla actual
  updateCommentCellsDirectly();
  
  // Actualizar celdas de analista/diseñador  
  updateAnalystDesignerCellsDirectly();
  
  // Limpiar la bandera de tracking al final
  if (window.lastCommentedItemId) {
    delete window.lastCommentedItemId;
    delete window.lastCommentedData;
    delete window.lastCommentedType;
  }
}

// Función específica para tablas filtradas después de comentario
function regenerateFilteredTableAfterComment() {
  // Guardar el estado actual de scroll
  const inventoryWrapper = document.querySelector('.inventory-table-wrapper');
  let scrollTop = 0;
  let scrollLeft = 0;
  
  if (inventoryWrapper) {
    scrollTop = inventoryWrapper.scrollTop;
    scrollLeft = inventoryWrapper.scrollLeft;
  }
  
  // CRÍTICO: Regenerar originalInventoryData desde allLibraryData actualizado
  // antes de aplicar filtros para incluir el comentario recién agregado
  if (allLibraryData && Array.isArray(allLibraryData) && allLibraryData.length > 0) {
    // Regenerar la tabla completa desde los datos actualizados
    const box4Content = document.getElementById('box4-content');
    if (box4Content) {
      // Usar la función existente para regenerar la tabla desde allLibraryData actualizado
      box4Content.innerHTML = generateImageInventoryTableFromCache();
      
      // Reconfigurar event listeners después de regenerar
      setTimeout(() => {
        setupInventoryClickListeners();
      }, 100);
    }
  }
  
  // Obtener los filtros activos actuales  
  const currentFilters = {
    dropdown: inventoryViewState?.dropdownFilters || {},
    table: inventoryViewState?.activeFilters || {}
  };
  
  // Reaplicar filtros usando las funciones existentes
  const hasDropdownFilters = Object.keys(currentFilters.dropdown).some(key => currentFilters.dropdown[key]);
  const hasTableFilters = Object.keys(currentFilters.table).some(key => currentFilters.table[key]);
  
  if (hasDropdownFilters) {
    // Reaplicar filtros dropdown usando la función existente
    setTimeout(() => {
      applyInventoryFilters();
    }, 200);
  } else if (hasTableFilters) {
    // Reaplicar filtros de tabla específicos después de regenerar
    setTimeout(() => {
      console.log('🔄 Reaplicando filtros de tabla:', currentFilters.table);
      console.log('📊 originalInventoryData length:', originalInventoryData.length);
      
      if (originalInventoryData.length > 0) {
        console.log('🔍 Muestra de originalInventoryData[0]:', {
          analista: originalInventoryData[0].analista,
          diseñador: originalInventoryData[0].diseñador,
          status: originalInventoryData[0].status,
          name: originalInventoryData[0].name,
          keys: Object.keys(originalInventoryData[0])
        });
      }
      
      if (currentFilters.table.analista) {
        // Filtrar por analista usando la lógica existente
        const analistaValue = currentFilters.table.analista;
        const analistaStatus = currentFilters.table.analistaStatus;
        
        console.log('🔍 Buscando analista:', analistaValue, 'status:', analistaStatus);
        
        let debugCount = 0;
        let filteredData = originalInventoryData.filter(row => {
          // Normalizar ambos nombres para comparación insensible a mayúsculas
          const rowAnalista = row.analista ? row.analista.toLowerCase().trim() : '';
          const filterAnalista = analistaValue.toLowerCase().trim();
          const hasAnalista = rowAnalista === filterAnalista;
          
          if (!hasAnalista && row.analista && debugCount < 5) {
            // Log para debug de casos que no coinciden (solo los primeros 5)
            console.log('❌ No coincide:', `"${row.analista}"`, 'vs', `"${analistaValue}"`);
            debugCount++;
          }
          return hasAnalista;
        });
        
        // console.log('🔍 Después de filtrar por analista:', filteredData.length);
        
        // Si también hay filtro de status, aplicarlo
        if (analistaStatus) {
          // console.log('🔄 Aplicando también filtro de status:', analistaStatus);
          const beforeStatusFilter = filteredData.length;
          filteredData = filteredData.filter(row => {
            if (analistaStatus === 'activos') {
              return row.status && row.status !== '';
            } else if (analistaStatus === 'vacios') {
              return !row.status || row.status === '';
            }
            return true;
          });
          // console.log('🔍 Después de filtrar por status:', filteredData.length, '(antes:', beforeStatusFilter, ')');
        }
        
        // console.log('✅ Datos filtrados para analista:', filteredData.length);
        updateInventoryTableDirectly(filteredData);
        
        // Restaurar clases visuales
        setTimeout(() => {
          restoreVisualFilterSelections();
        }, 100);
        
      } else if (currentFilters.table.diseñador) {
        // Filtrar por diseñador usando la lógica existente
        const disenadorValue = currentFilters.table.diseñador;
        const disenadorStatus = currentFilters.table.diseñadorStatus;
        
        let filteredData = originalInventoryData.filter(row => {
          return row.diseñador && row.diseñador.toLowerCase() === disenadorValue.toLowerCase();
        });
        
        // Si también hay filtro de status, aplicarlo
        if (disenadorStatus) {
          console.log('🔄 Aplicando también filtro de status diseñador:', disenadorStatus);
          filteredData = filteredData.filter(row => {
            if (disenadorStatus === 'activos') {
              return row.status && row.status !== '';
            } else if (disenadorStatus === 'vacios') {
              return !row.status || row.status === '';
            }
            return true;
          });
        }
        
        // console.log('✅ Datos filtrados para diseñador:', filteredData.length);
        updateInventoryTableDirectly(filteredData);
        
        // Restaurar clases visuales
        setTimeout(() => {
          restoreVisualFilterSelections();
        }, 100);
      }
    }, 200);
  }
  
  // Restaurar posición de scroll
  setTimeout(() => {
    if (inventoryWrapper) {
      inventoryWrapper.scrollTop = scrollTop;
      inventoryWrapper.scrollLeft = scrollLeft;
    }
  }, 300);
  
  // Limpiar la bandera de tracking al final
  if (window.lastCommentedItemId) {
    delete window.lastCommentedItemId;
    delete window.lastCommentedData;
    delete window.lastCommentedType;
  }
}

// Función para actualizar un item específico en la tabla por su ID
function updateSpecificItemInTable(itemId) {
  // Buscar todas las celdas que tengan este itemId (para Item Codes)
  let itemCells = document.querySelectorAll(`[data-item-id="${itemId}"][data-comment-type], [data-item-id="${itemId}"][data-column]`);
  
  // También buscar por data-image-name para Images
  if (window.lastCommentedType === 'image') {
    // Para imágenes, buscar en la columna ID de la tabla
    const table = document.querySelector('#box4-content table');
    if (table) {
      const headerRow = table.querySelector('thead tr');
      if (headerRow) {
        const headers = Array.from(headerRow.querySelectorAll('th'));
        const idColumnIndex = headers.findIndex(th => th.textContent.trim() === 'ID');
        
        if (idColumnIndex !== -1) {
          // Buscar filas donde la columna ID tenga el itemId
          const bodyRows = table.querySelectorAll('tbody tr');
          bodyRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells[idColumnIndex] && cells[idColumnIndex].textContent.trim() === String(itemId)) {
              // Agregar todas las celdas de esta fila que tengan data-comment-type o data-column
              const commentCells = row.querySelectorAll('[data-comment-type], [data-column]');
              itemCells = [...itemCells, ...commentCells];
            }
          });
        }
      }
    }
  }
  
  // También buscar por data-item-group-id para Groups
  if (window.lastCommentedType === 'group') {
    const groupCells = document.querySelectorAll(`[data-item-group-id="${itemId}"][data-comment-type], [data-item-group-id="${itemId}"][data-column]`);
    itemCells = [...itemCells, ...groupCells];
  }
  
  if (itemCells.length === 0) {
    return;
  }
  
  // Buscar los datos del item en allLibraryData actual (que sabemos que tiene los comentarios actualizados)
  const comentarioActualizado = window.lastCommentedData; // Esta variable debe estar disponible
  
  if (!comentarioActualizado) {
    return;
  }
  
  let updatedCount = 0;
  
  // Actualizar cada celda encontrada según su tipo
  itemCells.forEach(cell => {
    const commentType = cell.getAttribute('data-comment-type') || cell.getAttribute('data-column');
    const currentValue = cell.textContent.trim();
    let newValue = null;
    
    switch (commentType) {
      case 'analista-clean':
        // Para analistas, actualizar solo si el usuario es del grupo Analistas (NO Diseño ni Admin)
        const userConfigAnalista = VALID_USERS[comentarioActualizado.usuario.toLowerCase()];
        if (userConfigAnalista && userConfigAnalista.group === 'Analista') {
          newValue = comentarioActualizado.usuario;
        }
        break;
      case 'analista-comment-clean':
        // Para comentarios de analista, actualizar solo si el usuario es del grupo Analistas (NO Diseño ni Admin)
        const userConfigAnalistaComment = VALID_USERS[comentarioActualizado.usuario.toLowerCase()];
        if (userConfigAnalistaComment && userConfigAnalistaComment.group === 'Analista') {
          newValue = comentarioActualizado.textoComentario;
        }
        break;
      case 'diseñador-clean':
        // Para diseñadores, actualizar solo si el usuario ES del grupo Diseño
        const userConfigDisenador = VALID_USERS[comentarioActualizado.usuario.toLowerCase()];
        if (userConfigDisenador && userConfigDisenador.group === 'Diseño') {
          newValue = comentarioActualizado.usuario;
        }
        break;
      case 'diseñador-comment-clean':
        // Para comentarios de diseñador, actualizar solo si el usuario ES del grupo Diseño
        const userConfigDisenadorComment = VALID_USERS[comentarioActualizado.usuario.toLowerCase()];
        if (userConfigDisenadorComment && userConfigDisenadorComment.group === 'Diseño') {
          newValue = comentarioActualizado.textoComentario;
        }
        break;
      case 'fecha-analista':
        // Para fechas de analista, actualizar solo si el usuario es del grupo Analistas (NO Diseño ni Admin)
        const userConfigFechaAnalista = VALID_USERS[comentarioActualizado.usuario.toLowerCase()];
        if (userConfigFechaAnalista && userConfigFechaAnalista.group === 'Analista') {
          newValue = comentarioActualizado.fechaHora;
        }
        break;
      case 'fecha-diseñador':
        // Para fechas de diseñador, actualizar solo si el usuario ES del grupo Diseño
        const userConfigFechaDisenador = VALID_USERS[comentarioActualizado.usuario.toLowerCase()];
        if (userConfigFechaDisenador && userConfigFechaDisenador.group === 'Diseño') {
          newValue = comentarioActualizado.fechaHora;
        }
        break;
      case 'tipo-clean':
        // Tipo siempre se actualiza con el último comentario
        newValue = comentarioActualizado.tipoComentario;
        break;
      case 'status-clean':
        // Status siempre se actualiza con el último comentario
        newValue = comentarioActualizado.status;
        // Actualizar el status tag en lugar de solo el texto
        if (newValue) {
          const statusTag = cell.querySelector('.status-tag');
          if (statusTag) {
            // Actualizar el status tag existente
            statusTag.textContent = newValue;
            // Actualizar la clase CSS según el nuevo status
            const s = newValue.toLowerCase();
            let newClass = "revision";
            if (s.includes("diseño") || s.includes("diseno")) newClass = "diseno";
            else if (s.includes("cancelado")) newClass = "cancelado";
            else if (s.includes("completado")) newClass = "completado";
            
            statusTag.className = `status-tag ${newClass}`;
          } else {
            // Crear un nuevo status tag si no existe (usando createStatusTag)
            cell.innerHTML = `<span class="status-tag ${
              newValue.toLowerCase().includes("diseño") || newValue.toLowerCase().includes("diseno") ? "diseno" :
              newValue.toLowerCase().includes("cancelado") ? "cancelado" :
              newValue.toLowerCase().includes("completado") ? "completado" : "revision"
            }">${newValue}</span>`;
          }
          updatedCount++;
        }
        newValue = null; // Evitar que se actualice el textContent normal
        break;
    }
    
    if (newValue && currentValue !== newValue) {
      cell.textContent = newValue;
      updatedCount++;
    }
  });
}

// Función para actualizar solo las celdas de comentarios sin regenerar toda la tabla
function updateCommentCellsDirectly() {
  // Si hay un item específico comentado, actualizar solo esa fila
  if (window.lastCommentedItemId) {
    updateSpecificItemRowInTable(window.lastCommentedItemId);
    return;
  }
  
  // Solo como fallback, hacer la actualización completa pero con límite
  updateAllCommentCellsWithLimit();
}

// Nueva función optimizada para actualizar solo la fila específica
function updateSpecificItemRowInTable(itemId) {
  const table = document.querySelector('#box4-content table');
  if (!table) return;
  
  // Buscar la fila específica con este item ID
  const targetRow = table.querySelector(`tr [data-item-id="${itemId}"]`)?.closest('tr');
  if (!targetRow) return;
  
  // Buscar los datos actualizados para este item
  const matchingData = allLibraryData.find(row => String(row.ID) === String(itemId));
  if (!matchingData || !matchingData['WA_VIS_Comment']) return;
  
  // Parsear comentarios
  const parsedComments = parseCommentsFromExcel(matchingData['WA_VIS_Comment']);
  
  // Actualizar solo las celdas de comentarios en esta fila
  const comentarioAnalistaCells = targetRow.querySelectorAll('[data-column="comentario-analista"]');
  const comentarioDisenadorCells = targetRow.querySelectorAll('[data-column="comentario-disenador"]');
  
  comentarioAnalistaCells.forEach(cell => {
    const latestAnalystComment = getLatestAnalystComment(parsedComments);
    cell.textContent = latestAnalystComment;
  });
  
  comentarioDisenadorCells.forEach(cell => {
    const latestDesignerComment = getLatestDesignerComment(parsedComments);
    cell.textContent = latestDesignerComment;
  });
}

// Función auxiliar con límite para evitar bloqueo del UI
function updateAllCommentCellsWithLimit() {
  const table = document.querySelector('#box4-content table');
  if (!table) return;
  
  const bodyRows = table.querySelectorAll('tbody tr');
  let updatedCellsCount = 0;
  const maxRowsToProcess = 500; // Limitar a 500 filas para evitar bloqueo
  
  for (let i = 0; i < Math.min(bodyRows.length, maxRowsToProcess); i++) {
    const row = bodyRows[i];
    const itemIdCell = row.querySelector('[data-item-id]');
    const itemId = itemIdCell ? itemIdCell.getAttribute('data-item-id') : null;
    
    if (itemId && allLibraryData) {
      const matchingData = allLibraryData.find(row => String(row.ID) === String(itemId));
      
      if (matchingData && matchingData['WA_VIS_Comment']) {
        const parsedComments = parseCommentsFromExcel(matchingData['WA_VIS_Comment']);
        
        // Actualizar celdas de comentarios en esta fila
        const comentarioAnalistaCells = row.querySelectorAll('[data-column="comentario-analista"]');
        const comentarioDisenadorCells = row.querySelectorAll('[data-column="comentario-disenador"]');
        
        comentarioAnalistaCells.forEach(cell => {
          const latestAnalystComment = getLatestAnalystComment(parsedComments);
          if (cell.textContent.trim() !== latestAnalystComment) {
            cell.textContent = latestAnalystComment;
            updatedCellsCount++;
          }
        });
        
        comentarioDisenadorCells.forEach(cell => {
          const latestDesignerComment = getLatestDesignerComment(parsedComments);
          if (cell.textContent.trim() !== latestDesignerComment) {
            cell.textContent = latestDesignerComment;
            updatedCellsCount++;
          }
        });
      }
    }
  }
  
  console.log(`📊 Celdas de comentarios actualizadas: ${updatedCellsCount}`);
}

// Función auxiliar para actualizar celdas de comentarios por selectores directos
function updateCommentCellsBySelector() {
  console.log('🔍 Actualizando celdas de comentarios por selectores directos...');
  
  // Verificar disponibilidad de datos (probar múltiples fuentes)
  let dataSource = null;
  if (allLibraryData && Array.isArray(allLibraryData) && allLibraryData.length > 0) {
    dataSource = allLibraryData;
    console.log(`📊 Usando allLibraryData para comentarios: ${dataSource.length} elementos`);
  } else if (currentWorkingData && Array.isArray(currentWorkingData) && currentWorkingData.length > 0) {
    dataSource = currentWorkingData;
    console.log(`📊 Usando currentWorkingData para comentarios: ${dataSource.length} elementos`);
  } else {
    console.log('❌ No hay datos disponibles para actualizar comentarios');
    return;
  }
  
  // Buscar celdas de comentarios de analista
  const analystCommentCells = document.querySelectorAll('[data-comment-type="analista-comment-clean"]');
  const designerCommentCells = document.querySelectorAll('[data-comment-type="diseñador-comment-clean"]');
  
  console.log(`🔍 Celdas encontradas: analista-comment=${analystCommentCells.length}, diseñador-comment=${designerCommentCells.length}`);
  
  let updatedCount = 0;
  
  // Actualizar celdas de comentarios de analista
  analystCommentCells.forEach((cell, index) => {
    const itemId = cell.getAttribute('data-item-id');
    
    if (itemId) {
      const matchingData = dataSource.find(row => String(row.ID) === String(itemId));
      
      if (matchingData && matchingData['WA_VIS_Comment']) {
        const parsedComments = parseCommentsFromExcel(matchingData['WA_VIS_Comment']);
        const latestAnalystComment = getLatestAnalystComment(parsedComments);
        const currentContent = cell.textContent.trim();
        
        if (currentContent !== latestAnalystComment) {
          cell.textContent = latestAnalystComment;
          updatedCount++;
          console.log(`✅ Comentario analista actualizado: ${itemId} → "${latestAnalystComment}"`);
        }
      }
    }
  });
  
  // Actualizar celdas de comentarios de diseñador
  designerCommentCells.forEach(cell => {
    const itemId = cell.getAttribute('data-item-id');
    
    if (itemId) {
      const matchingData = dataSource.find(row => String(row.ID) === String(itemId));
      
      if (matchingData && matchingData['WA_VIS_Comment']) {
        const parsedComments = parseCommentsFromExcel(matchingData['WA_VIS_Comment']);
        const latestDesignerComment = getLatestDesignerComment(parsedComments);
        const currentContent = cell.textContent.trim();
        
        if (currentContent !== latestDesignerComment) {
          cell.textContent = latestDesignerComment;
          updatedCount++;
          console.log(`✅ Comentario diseñador actualizado: ${itemId} → "${latestDesignerComment}"`);
        }
      }
    }
  });
  
  console.log(`📊 Celdas de comentarios actualizadas por selector: ${updatedCount}`);
}

// Función para actualizar las tablas de estadísticas cuando cambian los datos
// Bandera para prevenir regeneración de estadísticas durante filtrado
let isApplyingStatsFilter = false;

// Sistema robusto anti-bucle para updateStatsTablesOnDataChange
let isUpdatingStats = false;
let statsUpdateTimeout = null;
let lastStatsUpdate = 0;
const STATS_UPDATE_COOLDOWN = 1000; // 1 segundo mínimo entre actualizaciones

// Variables para monitoreo de bucles infinitos
let callStack = [];
let maxCallStackSize = 10;
let isInfiniteLoopDetected = false;

function logFunctionCall(functionName) {
  if (isInfiniteLoopDetected) return;
  
  const timestamp = Date.now();
  callStack.push({ name: functionName, time: timestamp });
  
  // Mantener solo las últimas llamadas
  if (callStack.length > maxCallStackSize) {
    callStack.shift();
  }
  
  // Detectar bucle: misma función llamada 3+ veces en 1 segundo
  const recentCalls = callStack.filter(call => 
    call.name === functionName && (timestamp - call.time) < 1000
  );
  
  if (recentCalls.length >= 3) {
    isInfiniteLoopDetected = true;
    console.error('🚨🚨🚨 BUCLE INFINITO DETECTADO 🚨🚨🚨');
    console.error('Función:', functionName);
    console.error('Call stack reciente:', callStack);
    console.error('Todas las llamadas recientes:', recentCalls);
    
    // DETENER INMEDIATAMENTE TODA ACTIVIDAD
    if (statsUpdateTimeout) {
      clearTimeout(statsUpdateTimeout);
      statsUpdateTimeout = null;
    }
    
    // Auto-reset después de 5 segundos
    setTimeout(() => {
      console.log('⏰ Auto-reset de detección de bucle infinito');
      resetInfiniteLoopDetection();
    }, 5000);
    
    return true; // Indica bucle detectado
  }
  
  return false; // Normal
}

function resetInfiniteLoopDetection() {
  console.log('🔄 Reseteando detección de bucle infinito');
  isInfiniteLoopDetected = false;
  callStack = [];
  
  // Limpiar todos los timeouts
  if (statsUpdateTimeout) {
    clearTimeout(statsUpdateTimeout);
    statsUpdateTimeout = null;
  }
  
  // Resetear flags
  window.recentFilterActivity = null;
  isApplyingStatsFilter = false;
  isUpdatingStats = false;
}

// Exponer función para debugging
window.resetInfiniteLoopDetection = resetInfiniteLoopDetection;

function updateStatsTablesOnDataChange() {
  if (logFunctionCall('updateStatsTablesOnDataChange')) return;
  
  const now = Date.now();
  const timeSinceLastUpdate = now - lastStatsUpdate;
  
  console.log('📈 === INICIO updateStatsTablesOnDataChange ===');
  // console.log('🔍 Estado actual - isCleanViewActive:', isCleanViewActive);
  // console.log('🔍 isApplyingStatsFilter:', isApplyingStatsFilter);
  // console.log('🔍 isUpdatingStats:', isUpdatingStats);
  // console.log('🔍 timeSinceLastUpdate:', timeSinceLastUpdate);
  
  // GUARD ROBUSTO: Múltiples verificaciones para prevenir bucles
  if (isUpdatingStats) {
    console.log('🚫 BLOCKED: updateStatsTablesOnDataChange ya está ejecutándose');
    return;
  }
  
  if (timeSinceLastUpdate < STATS_UPDATE_COOLDOWN) {
    console.log(`🚫 BLOCKED: Muy pronto desde la última actualización (${timeSinceLastUpdate}ms < ${STATS_UPDATE_COOLDOWN}ms)`);
    return;
  }
  
  // Solo actualizar si estamos en vista de datos (no en visualizador)
  if (!isCleanViewActive) {
    console.log('🚫 No actualizando stats - estamos en visualizador');
    return;
  }
  
  // GUARD ADICIONAL: No actualizar si estamos aplicando un filtro (previene parpadeo)
  if (isApplyingStatsFilter) {
    console.log('🚫 BLOCKED: No actualizando stats - aplicando filtro activo');
    return;
  }
  
  // GUARD NUCLEAR: Si hay cualquier actividad de filtros reciente, bloquear completamente
  if (window.recentFilterActivity && (Date.now() - window.recentFilterActivity) < 2000) {
    console.log('🚫 NUCLEAR BLOCK: Actividad de filtros reciente detectada');
    return;
  }
  
  // ACTIVAR PROTECCIÓN ANTI-BUCLE
  isUpdatingStats = true;
  lastStatsUpdate = now;
  console.log('🔒 LOCKED: updateStatsTablesOnDataChange iniciada');
  
  try {
    // PASO 1: Determinar fuente de datos para estadísticas
  console.log('🔄 Calculando estadísticas desde commentedItemsData...');
  let statsData = [];
  
  // If there are active filters and we're in clean view, use filtered data for stats
  if (isCleanViewActive && typeof currentDisplayData !== 'undefined' && currentDisplayData && currentDisplayData.length > 0) {
    // Check if there are any active filters that would make currentDisplayData different from full data
    const inventoryState = getInventoryViewState();
    const hasActiveFilters = inventoryState.tableFilters && Object.keys(inventoryState.tableFilters).some(key => inventoryState.tableFilters[key]);
    
    if (hasActiveFilters) {
      console.log('� Usando datos filtrados para estadísticas:', currentDisplayData.length, 'elementos (filtered)');
      statsData = currentDisplayData.map(item => item);
    } else if (commentedItemsData && commentedItemsData.length > 0) {
      // Usar directamente commentedItemsData que ya está procesado
      statsData = commentedItemsData.map(item => item);
      console.log('✅ Datos para estadísticas:', statsData.length, 'elementos (desde commentedItemsData)');
    }
  } else if (commentedItemsData && commentedItemsData.length > 0) {
    // Usar directamente commentedItemsData que ya está procesado
    statsData = commentedItemsData.map(item => item);
    console.log('✅ Datos para estadísticas:', statsData.length, 'elementos (desde commentedItemsData)');
  }
  
  if (statsData.length > 0) {
    console.log('🔍 Breakdown:', {
      itemCodes: statsData.filter(x => x.objectType === 'Item Code').length,
      images: statsData.filter(x => x.objectType === 'Image').length
    });
  } else if (allLibraryData && allLibraryData.length > 0) {
    // Fallback a allLibraryData si commentedItemsData no está disponible
    statsData = allLibraryData
      .filter(row => (row['Object Type'] === 'Item Code' || row['Object Type'] === 'Image') && row['WA_VIS_Comment'])
      .map(row => {
        const parsedComments = parseCommentsFromExcel(row['WA_VIS_Comment']);
        
        return {
          id: row.ID,
          itemCode: row['Item Code'] || row.Name,
          objectType: row['Object Type'],
          analista: getLatestAnalyst(parsedComments),
          primeraFechaAnalista: getLatestAnalyst(parsedComments), // Usar la misma función por ahora
          ultimoComentarioAnalista: getLatestAnalystComment(parsedComments),
          diseñador: getLatestDesigner(parsedComments),
          ultimaFechaDisenador: getLatestDesigner(parsedComments), // Usar la misma función por ahora
          ultimoComentarioDisenador: getLatestDesignerComment(parsedComments),
          ultimoStatus: parsedComments.length > 0 ? parsedComments[parsedComments.length - 1].status : '',
          ultimoTipo: parsedComments.length > 0 ? parsedComments[parsedComments.length - 1].tipoComentario : ''
        };
      });
    
    console.log('✅ Datos temporales para estadísticas:', statsData.length, 'elementos (desde allLibraryData fallback)');
    console.log('🔍 Breakdown:', {
      itemCodes: statsData.filter(x => x.objectType === 'Item Code').length,
      images: statsData.filter(x => x.objectType === 'Image').length
    });
  }
  
  // PASO 2: Regenerar las tablas de estadísticas si existen
  const box1 = document.getElementById('tree');
  const box3 = document.getElementById('box3-content');
  
  // Regenerar tabla de diseñadores en box1 si existe
  if (box1) {
    console.log('📊 Generando tabla de diseñadores...');
    try {
      const newContent = generateDesignerStatsTable(statsData);
      console.log('📊 Nuevo contenido generado length:', newContent.length);
      box1.innerHTML = newContent;
      console.log('✅ Tabla de diseñadores insertada en box1');
    } catch (error) {
      console.log('❌ Error generando tabla de diseñadores:', error);
    }
  }
  
  // Regenerar tabla de analistas en box3 si existe  
  if (box3 && box3.querySelector('.stats-table-container')) {
    console.log(' Regenerando tabla de analistas...');
    box3.innerHTML = generateAnalystStatsTable(statsData);
  }
  
  console.log('✅ Tablas de estadísticas actualizadas');
  
  // === FORZAR GENERACIÓN DE TABLAS SIN CONDICIONES ===
  if (box3) {
    console.log('🔥 FORZANDO generación de tabla de analistas...');
    try {
      const newContent = generateAnalystStatsTable(statsData);
      console.log('📊 Contenido de analistas generado length:', newContent.length);
      box3.innerHTML = newContent;
      console.log('✅ Tabla de analistas FORZADA insertada en box3');
    } catch (error) {
      console.log('❌ Error FORZANDO tabla de analistas:', error);
    }
  }
  
  // === LOGS DE DEPURACIÓN AÑADIDOS ===
  console.log('🔍 Verificando DOM elements después de actualización...');
  console.log('📦 box1 encontrado:', !!document.getElementById('tree'));
  console.log('📦 box3 encontrado:', !!document.getElementById('box3-content'));
  console.log('📊 statsInventoryData length:', window.statsInventoryData ? window.statsInventoryData.length : 'undefined');
  
  const debugBox1 = document.getElementById('tree');
  const debugBox3 = document.getElementById('box3-content');
  
  if (debugBox1) {
    const hasStatsContainer = debugBox1.querySelector('.stats-table-container');
  }
  
  if (debugBox3) {
    const hasStatsContainer = debugBox3.querySelector('.stats-table-container');
  }
  
  // Configurar event listeners para filtros clickeables
  setupStatsTableClickEvents();
  
  } catch (error) {
    console.error('❌ Error en updateStatsTablesOnDataChange:', error);
  } finally {
    // DESACTIVAR PROTECCIÓN ANTI-BUCLE
    setTimeout(() => {
      isUpdatingStats = false;
    }, 100);
  }
}

// Función wrapper con debouncing para llamadas externas
function safeUpdateStatsTablesOnDataChange() {
  if (logFunctionCall('safeUpdateStatsTablesOnDataChange')) return;
    
  // VERIFICAR ACTIVIDAD DE FILTROS ANTES DE CONTINUAR
  if (window.recentFilterActivity && (Date.now() - window.recentFilterActivity) < 3000) {
    return;
  }
  
  // Cancelar cualquier actualización pendiente
  if (statsUpdateTimeout) {
    clearTimeout(statsUpdateTimeout);
  }
  
  // Programar nueva actualización con debouncing
  statsUpdateTimeout = setTimeout(() => {
    console.log('⏰ Ejecutando actualización con debouncing');
    updateStatsTablesOnDataChange();
    statsUpdateTimeout = null;
  }, 300); // 300ms de debouncing
}

function updateCommentBubbles(type, context, imageName = null) {
  console.log('🔄 updateCommentBubbles llamada con:', { type, context, imageName });
  
  if (type === 'image') {
    // Para imágenes, el context es realmente el imageName
    const realImageName = context;
    console.log('📷 Actualizando burbuja para imagen:', realImageName);
    
    // Obtener el status actual de la imagen
    const imageComments = getImageComments(realImageName);
    console.log('💬 Comentarios de la imagen:', imageComments);
    
    const currentStatus = getCurrentStatus(imageComments);
    console.log('📊 Status actual calculado:', currentStatus);
    
    // Buscar la imagen en el grid y actualizar/agregar burbuja
    const imageThumbnails = document.querySelectorAll('.image-thumbnail');
    console.log('🔍 Total de thumbnails encontrados:', imageThumbnails.length);
    
    let imageFound = false;
    imageThumbnails.forEach((img, index) => {
      console.log(`🖼️ Thumbnail ${index}: alt="${img.alt}", src="${img.src}"`);
      if (img.alt === realImageName) {
        imageFound = true;
        console.log('✅ Imagen encontrada en thumbnail:', realImageName);
        
        const container = img.closest('.image-thumbnail-container');
        if (container) {
          console.log('📦 Container encontrado para la imagen');
          
          let bubble = container.querySelector('.comment-bubble.image-comment');
          if (bubble) {
            // Ya tenía burbuja, actualizar color según status
            console.log('🟡 Actualizando burbuja existente con status:', currentStatus);
            bubble.setAttribute('data-status', currentStatus);
          } else {
            // No tenía burbuja, crear nueva
            console.log('🟢 Creando nueva burbuja con status:', currentStatus);
            const newBubble = document.createElement('div');
            newBubble.className = 'comment-bubble image-comment';
            newBubble.setAttribute('data-image', realImageName);
            newBubble.setAttribute('data-status', currentStatus);
            newBubble.setAttribute('onclick', `handleImageCommentClick(event, '${realImageName}')`);
            newBubble.setAttribute('title', 'Ver comentarios');
            newBubble.innerHTML = '<i class="fa-solid fa-comment"></i>';
            container.appendChild(newBubble);
            console.log('✅ Burbuja creada y agregada al container');
          }
        } else {
          console.warn('❌ No se encontró container para la imagen');
        }
      }
    });
    
    if (!imageFound) {
      console.warn('❌ Imagen no encontrada en thumbnails:', realImageName);
    }
  } else {
    // Para Item Codes e Item Groups
    if (type === 'group') {
      // Actualizar burbuja del Item Group
      console.log('Actualizando burbuja de Item Group');
      
      // Verificar que currentItemGroup existe antes de acceder a sus propiedades
      if (!currentItemGroup) {
        console.warn('⚠️ currentItemGroup es null, no se puede actualizar la burbuja');
        return;
      }
      
      const currentStatus = getCurrentStatus(currentItemGroup['WA_VIS_Comment'] || '');
      const groupBubble = document.querySelector('.comment-indicator.group-comment');
      if (groupBubble) {
        console.log('Burbuja de grupo encontrada, actualizando status');
        groupBubble.setAttribute('data-status', currentStatus);
        // Actualizar el atributo data-comment
        groupBubble.setAttribute('data-comment', currentItemGroup['WA_VIS_Comment'] || '');
      } else {
        // Crear nueva burbuja para Item Group si no existía
        console.log('Creando nueva burbuja para Item Group');
        const itemGroupImage = document.querySelector('.item-group-image');
        if (itemGroupImage && currentItemGroup) {
          const newBubble = document.createElement('div');
          newBubble.className = 'comment-indicator group-comment';
          newBubble.setAttribute('data-comment', currentItemGroup['WA_VIS_Comment'] || '');
          newBubble.setAttribute('data-status', currentStatus);
          newBubble.innerHTML = '<i class="fa-solid fa-comment"></i>';
          newBubble.addEventListener('click', function(event) {
            handleCommentClick(event, this);
          });
          itemGroupImage.appendChild(newBubble);
        }
      }
      
    } else if (type === 'item') {
      // Actualizar burbuja del Item Code
      console.log('Actualizando burbuja de Item Code para:', context);
      const itemCodeCells = document.querySelectorAll('.item-code-cell');
      itemCodeCells.forEach(cell => {
        const itemCode = cell.getAttribute('data-item-code');
        if (itemCode === context) {
          // Buscar el item tanto por 'Item Code' como por 'Name'
          const item = currentWorkingData.find(item => 
            item['Item Code'] === itemCode || item['Name'] === itemCode
          );
          const currentStatus = getCurrentStatus(item?.['WA_VIS_Comment'] || '');
          
          let bubble = cell.querySelector('.comment-indicator');
          if (bubble) {
            // Ya tenía burbuja, actualizar status y data-comment
            bubble.setAttribute('data-status', currentStatus);
            bubble.setAttribute('data-comment', item?.['WA_VIS_Comment'] || '');
          } else {
            // No tenía burbuja, crear nueva
            const newBubble = document.createElement('div');
            newBubble.className = 'comment-indicator';
            newBubble.setAttribute('data-status', currentStatus);
            newBubble.innerHTML = '<i class="fa-solid fa-comment"></i>';
            newBubble.setAttribute('data-comment', item?.['WA_VIS_Comment'] || '');
            newBubble.addEventListener('click', function(event) {
              handleCommentClick(event, this);
            });
            cell.appendChild(newBubble);
          }
        }
      });
    }
  }
}

// Función para actualizar la vista de comentarios después de agregar uno nuevo
function updateCommentsDisplay(modal) {
  const commentsContainer = modal.querySelector('.comments-container');
  const modalTitle = modal.querySelector('.modal-title').textContent;
  const modalContext = modal.querySelector('.modal-context').textContent;
  
  let commentText = '';
  
  if (modalTitle.includes('Item Group') && currentItemGroup) {
    commentText = currentItemGroup['WA_VIS_Comment'] || '';
  } else if (modalTitle.includes('Imagen')) {
    // Es un comentario de imagen - extraer el nombre de la imagen del contexto
    // El formato ahora es: "Item Group (ID) | Item Code | Marca | imagen.jpg"
    const parts = modalContext.split(' | ');
    const imageName = parts[parts.length - 1]; // Tomar la última parte
    commentText = getImageComments(imageName);
  } else {
    // Es un comentario de Item Code - extraer el item code del contexto
    // El formato ahora es: "Item Group (ID) | Item Code | Marca"
    const parts = modalContext.split(' | ');
    const itemCodeName = parts.length >= 2 ? parts[1] : modalContext; // Tomar la segunda parte o el contexto completo
    
    const itemCodeData = currentWorkingData.find(item => 
      item['Object Type'] === 'Item Code' && 
      (item.Name === itemCodeName || item['Item Code'] === itemCodeName)
    );
    commentText = itemCodeData ? (itemCodeData['WA_VIS_Comment'] || '') : '';
  }
  
  const parsedComments = parseCommentsFromExcel(commentText);
  commentsContainer.innerHTML = parsedComments.length > 0 ? 
    generateCommentsHTML(parsedComments) : 
    '<div class="no-comments">No hay comentarios existentes</div>';
}

// Función para generar el HTML de los comentarios
function generateCommentsHTML(comments) {
  // Crear una copia del array y revertirla para mostrar los más recientes primero
  const commentsToDisplay = [...comments].reverse();
  
  return commentsToDisplay.map(comment => {
    // Solo mostrar meta si hay tipo de comentario
    const showMeta = comment.tipoComentario;
    
    return `
      <div class="comment-card">
        <div class="comment-header">
          <div class="comment-user">
            <span class="user-name">${comment.usuario}</span>
          </div>
          <div class="comment-date">
            <span class="date-text">${formatDisplayDate(comment.fechaHora)}</span>
          </div>
        </div>
        ${showMeta ? `
          <div class="comment-meta">
            <div class="comment-type" style="border: 1px solid #878787; color: #878787;">
              <span class="type-text">${comment.tipoComentario}</span>
            </div>
          </div>
        ` : ''}
        <div class="comment-body">
          <div class="comment-text">
            <span class="message-text">${comment.textoComentario}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Función global para cerrar el modal de comentarios
function closeCommentModal() {
  const modal = document.getElementById('commentModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  }
}

// Función para configurar la funcionalidad de la modal (mover, redimensionar, cerrar)
function setupModalFunctionality(modal) {
  const modalContent = modal.querySelector('.modal-content');
  const header = modal.querySelector('.modal-header');
  const closeBtn = modal.querySelector('.modal-close-btn');
  const commentsContainer = modal.querySelector('.comments-container');
  const statusControl = modal.querySelector('#statusControl');
  
  // Variables para arrastar
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  
  // Función para cerrar modal
  function closeModal() {
    modal.classList.remove('show');
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  }
  
  // Event listener para cerrar
  closeBtn.addEventListener('click', closeModal);
  
  // Prevenir que el dropdown active el dragging
  if (statusControl) {
    statusControl.addEventListener('mousedown', function(e) {
      e.stopPropagation(); // Evitar que se propague al header
    });
    
    statusControl.addEventListener('click', function(e) {
      e.stopPropagation(); // Evitar que se propague al header
    });
  }
  
  // Cerrar al hacer click fuera de la modal (pero no si está dragging)
  modal.addEventListener('click', function(e) {
    if (e.target === modal && !isDragging) {
      closeModal();
    }
  });
  
  // Funcionalidad de arrastrar (mover ventana)
  header.addEventListener('mousedown', function(e) {
    if (e.target === closeBtn || e.target === statusControl) return;
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = modalContent.offsetLeft;
    startTop = modalContent.offsetTop;
    
    document.addEventListener('mousemove', dragModal);
    document.addEventListener('mouseup', stopDragging);
    e.preventDefault();
    e.stopPropagation(); // Evitar propagación
  });
  
  function dragModal(e) {
    if (!isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    modalContent.style.left = (startLeft + deltaX) + 'px';
    modalContent.style.top = (startTop + deltaY) + 'px';
  }
  
  function stopDragging(e) {
    isDragging = false;
    document.removeEventListener('mousemove', dragModal);
    document.removeEventListener('mouseup', stopDragging);
    
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
}

// Función para manejar la asignación de imagen principal del Item Group
function handleItemGroupImageAssignment(event, imageCell, imageThumbnail, shortcutUsed = 'unknown') {
  event.preventDefault();
  
  // Log para mostrar qué shortcut se usó
  if (shortcutUsed !== 'unknown') {
    console.log(`🎯 Asignación de Item Group activada usando: ${shortcutUsed}`);
  }
  
  if (!imageCell || !imageThumbnail || imageThumbnail.src.includes('data:image/svg+xml')) {
    console.log('No hay imagen válida para asignar al Item Group');
    return;
  }
  
  // Priorizar data-filename, luego alt como fallback
  const imageName = imageThumbnail.getAttribute('data-filename') || imageThumbnail.alt;
  const itemCode = imageCell.getAttribute('data-item-code');
  
  // Encontrar el Item Group actual en los datos
  if (!currentItemGroup) {
    console.error('No hay Item Group cargado');
    return;
  }
  
  // PRESERVAR campos importantes antes de actualizar
  const originalComment = currentItemGroup['WA_VIS_Comment'];
  const originalObjectType = currentItemGroup['Object Type'];
  
  // Actualizar la imagen en los datos del Item Group PRESERVANDO campos
  const previousImage = currentItemGroup['WA_Gallery_01'] || '';
  currentItemGroup['WA_Gallery_01'] = imageName;
  
  // Restaurar campos preservados
  if (originalComment) {
    currentItemGroup['WA_VIS_Comment'] = originalComment;
  }
  if (originalObjectType) {
    currentItemGroup['Object Type'] = originalObjectType;
  }
  
  // Actualizar también en currentWorkingData PRESERVANDO campos
  const itemGroupIndex = currentWorkingData.findIndex(item => 
    item['Object Type'] === 'Item Group' && 
    item.NamePath === currentItemGroup.NamePath
  );
  
  if (itemGroupIndex !== -1) {
    currentWorkingData[itemGroupIndex]['WA_Gallery_01'] = imageName;
    // Preservar comentario también en currentWorkingData
    if (originalComment) {
      currentWorkingData[itemGroupIndex]['WA_VIS_Comment'] = originalComment;
    }
    if (originalObjectType) {
      currentWorkingData[itemGroupIndex]['Object Type'] = originalObjectType;
    }
  }
  
  // Actualizar la imagen en el header del grid
  updateItemGroupHeaderImage(imageName);
  
  console.log(`Imagen principal actualizada: "${previousImage}" → "${imageName}", preservando comentario:`, originalComment);
}

// Función para actualizar la imagen en el header del Item Group
function updateItemGroupHeaderImage(imageName) {
  const groupImageContainer = document.querySelector('.item-group-image');
  if (!groupImageContainer) {
    console.error('No se encontró el contenedor de imagen del Item Group');
    return;
  }
  
  // Detectar si el Item Group tiene comentario
  const hasComment = currentItemGroup && currentItemGroup['WA_VIS_Comment'] && 
                     currentItemGroup['WA_VIS_Comment'].trim() !== '';
  
  // Obtener status del comentario para el bubble
  const commentStatus = hasComment ? getCurrentStatus(currentItemGroup['WA_VIS_Comment']) : '';
  const statusAttribute = commentStatus ? ` data-status="${commentStatus}"` : '';
  
  // Crear nueva imagen o actualizar existente
  if (imageName) {
    groupImageContainer.innerHTML = `
      <img src="https://www.travers.com.mx/media/catalog/product/agility/img/${imageName}" 
           alt="Gallery 1" class="group-thumbnail"
           onerror="this.style.display='none';">
      <div class="item-group-delete-btn" title="Quitar imagen del Item Group"><i class="fa-solid fa-trash"></i></div>
      ${hasComment ? `<div class="comment-indicator group-comment" data-comment="${(currentItemGroup['WA_VIS_Comment'] || '').replace(/"/g, '&quot;')}"${statusAttribute}><i class="fa-solid fa-comment"></i></div>` : ''}
    `;
    
    // Configurar event listener para el botón de basura
    setupItemGroupDeleteButton();
    setupItemGroupImageClick(); // Configurar click en imagen
  } else {
    groupImageContainer.innerHTML = '<div class="no-image"><img src="assets/no-img-purple.svg" alt="No image" style="width: 100%; height: 100%; object-fit: contain;"></div>';
  }
  
  console.log('Header del Item Group actualizado con nueva imagen. Comentario presente:', hasComment, 'Status:', commentStatus);
}

// Función para mostrar imagen en modal de vista previa
function handleImagePreview(event, imageThumbnail) {
  event.preventDefault();
  event.stopPropagation();
  
  if (!imageThumbnail || imageThumbnail.src.includes('data:image/svg+xml')) {
    return; // No mostrar modal para imágenes vacías
  }
  
  // Priorizar data-filename, luego alt como fallback
  const imageName = imageThumbnail.getAttribute('data-filename') || imageThumbnail.alt;
  const imageSrc = imageThumbnail.src;
  
  console.log(`🖼️ Mostrando vista previa de: ${imageName}`);
  
  openImagePreviewModal(imageName, imageSrc);
}

// Función para abrir el modal de vista previa de imagen
function openImagePreviewModal(imageName, imageSrc) {
  // Verificar si ya existe un modal y cerrarlo
  const existingModal = document.getElementById('imagePreviewModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Crear el modal
  const modal = document.createElement('div');
  modal.id = 'imagePreviewModal';
  modal.className = 'image-preview-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Vista Previa</h3>
        <button class="close-modal" onclick="closeImagePreviewModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="image-container">
          <img src="${imageSrc}" alt="${imageName}" class="preview-image" 
               onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodD0iNTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMDAgMjAwTDMwMCAzMDBNMzAwIDIwMEwyMDAgMzAwIiBzdHJva2U9IiM5QzlDOTkiIHN0cm9rZS13aWR0aD0iMTAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8dGV4dCB4PSIyNTAiIHk9IjM1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzlDOUM5OSIgZm9udC1zaXplPSIxNiI+SW1hZ2VuIG5vIGVuY29udHJhZGE8L3RleHQ+Cjwvc3ZnPgo=';">
        </div>
        <div class="image-name">${imageName}</div>
      </div>
    </div>
  `;
  
  // Agregar event listener para cerrar al hacer click en el fondo
  modal.addEventListener('click', function(event) {
    if (event.target === modal) {
      closeImagePreviewModal();
    }
  });
  
  // Agregar al DOM
  document.body.appendChild(modal);
  
  // Mostrar modal con animación
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
  
  // Prevenir scroll del body
  document.body.style.overflow = 'hidden';
}

// Función para cerrar el modal de vista previa
function closeImagePreviewModal() {
  const modal = document.getElementById('imagePreviewModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
      // Restaurar scroll del body
      document.body.style.overflow = '';
    }, 300);
  }
}

// Función para manejar la selección de imagen (Shift+Click)
function handleImageSelection(event, imageCell, imageThumbnail) {
  event.preventDefault();
  
  if (!imageCell) return;
  
  // Si hay imagen en la celda, seleccionarla
  if (imageThumbnail && imageThumbnail.src && !imageThumbnail.src.includes('data:image/svg+xml')) {
    // Priorizar data-filename, luego alt como fallback
    const imageName = imageThumbnail.getAttribute('data-filename') || imageThumbnail.alt;
    const itemCode = imageCell.getAttribute('data-item-code');
    const section = imageCell.getAttribute('data-section');
    const rowIndex = parseInt(imageCell.getAttribute('data-row-index'));
    const colIndex = parseInt(imageCell.getAttribute('data-col-index'));
    
    workingImage = {
      imageName: imageName,
      itemCode: itemCode,
      section: section,
      originalPosition: { row: rowIndex, col: colIndex }
    };
    
    console.log('Imagen seleccionada:', workingImage);
  } else {
    // Si es espacio vacío, limpiar imagen de trabajo
    workingImage = null;
    console.log('Imagen de trabajo limpiada');
  }
  
  updateWorkingImagePlaceholder();
}

// Función optimizada para manejar la asignación de imagen (Cmd+Click en Mac / Ctrl+Click en Windows)
function handleImageAssignment(event, imageCell) {
  event.preventDefault();
  
  if (!imageCell) return;
  
  const targetItemCode = imageCell.getAttribute('data-item-code');
  const targetSection = imageCell.getAttribute('data-section');
  const targetRowIndex = parseInt(imageCell.getAttribute('data-row-index'));
  const targetColIndex = parseInt(imageCell.getAttribute('data-col-index'));
  
  // CASO 1: No hay imagen de trabajo - quitar imagen existente
  if (!workingImage) {
    handleRemoveImage(imageCell, targetItemCode, targetSection, targetRowIndex, targetColIndex);
    return;
  }
  
  // CASO 2: Hay imagen de trabajo - asignar imagen
  handleAssignImage(imageCell, targetItemCode, targetSection, targetRowIndex, targetColIndex);
}

// Función para manejar Alt+Click: Eliminar imagen de la celda
function handleImageRemoval(event, imageCell, imageThumbnail) {
  event.preventDefault();
  
  if (!imageCell) return;
  
  // Verificar si hay imagen en la celda
  if (!imageThumbnail || imageThumbnail.src.includes('data:image/svg+xml')) {
    console.log('💡 Alt+Click: No hay imagen para eliminar en esta celda');
    return;
  }
  
  // Priorizar data-filename, luego alt como fallback
  const imageName = imageThumbnail.getAttribute('data-filename') || imageThumbnail.alt;
  const itemCode = imageCell.getAttribute('data-item-code');
  const section = imageCell.getAttribute('data-section');
  const rowIndex = parseInt(imageCell.getAttribute('data-row-index'));
  const colIndex = parseInt(imageCell.getAttribute('data-col-index'));
  
  console.log(`🗑️ Alt+Click: Eliminando "${imageName}" de ${itemCode} en ${section}`);
  
  // Si es la imagen principal del Item Group, quitarla
  if (currentItemGroup && currentItemGroup['WA_Gallery_01'] === imageName) {
    console.log(`🏢 Quitando imagen principal del Item Group: ${imageName}`);
    
    // Actualizar currentWorkingData del Item Group
    const itemGroupRow = currentWorkingData.find(row => 
      row['Object Type'] === 'Item Group' && row.Id === currentItemGroup.Id
    );
    
    if (itemGroupRow) {
      itemGroupRow['WA_Gallery_01'] = '';
      console.log(`✅ Item Group actualizado: WA_Gallery_01 eliminada`);
    }
    
    // Actualizar la referencia local
    currentItemGroup['WA_Gallery_01'] = '';
    
    // Actualizar visualmente el header del Item Group
    updateItemGroupHeaderImage('');
    console.log(`🎨 Header del Item Group actualizado: imagen eliminada`);
  }
  
  // Aplicar reglas de eliminación según el Item Code
  if (section === 'rest') {
    // Si está en REST, simplemente eliminar (no hay donde mover)
    console.log(`→ Eliminando directamente de REST`);
    removeImageFromGrid(rowIndex, colIndex, section);
  } else {
    // Si está en COV o GALLERY, verificar si es del mismo Item Code
    if (getCurrentItemCodeFromImageName(imageName) === itemCode) {
      console.log(`→ Moviendo a REST (mismo Item Code: ${itemCode})`);
      // Mover a REST (siguiente posición disponible)
      moveImageToRest(imageName, itemCode, rowIndex, colIndex, section);
    } else {
      console.log(`→ Eliminando directamente (diferente Item Code)`);
      removeImageFromGrid(rowIndex, colIndex, section);
    }
  }
  
  // Actualizar sincronización (con debouncing)
  updateCurrentWorkingDataWithGridState(100);
}

// Banderas para evitar configuraciones duplicadas de event listeners
let itemGroupDeleteButtonConfigured = false;
let itemGroupImageClickConfigured = false;
let zoomControlsConfigured = false;
let brandFilterConfigured = false;

// Función para resetear las banderas cuando el DOM cambie
function resetItemGroupEventListeners() {
  itemGroupDeleteButtonConfigured = false;
  itemGroupImageClickConfigured = false;
  zoomControlsConfigured = false;
  brandFilterConfigured = false;
}

// Función para limpiar caché de comentarios de imágenes cuando sea necesario
function clearImageCommentsCache() {
  imageCommentsCache.clear();
}

// Función para configurar el event listener del botón de basura del Item Group
function setupItemGroupDeleteButton() {
  if (itemGroupDeleteButtonConfigured) return; // Evitar duplicados
  
  const deleteBtn = document.querySelector('.item-group-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      handleItemGroupImageRemoval();
    });
    itemGroupDeleteButtonConfigured = true;
  }
}

// Función para configurar el click en la imagen del Item Group
function setupItemGroupImageClick() {
  if (itemGroupImageClickConfigured) return; // Evitar duplicados
  
  const groupImage = document.querySelector('.group-thumbnail');
  if (groupImage) {
    groupImage.addEventListener('click', handleItemGroupImageClick);
    itemGroupImageClickConfigured = true;
  }
}

// Función para manejar el click en la imagen del Item Group
function handleItemGroupImageClick(event) {
  // Solo procesar si no es click en el botón de basura
  if (event.target.closest('.item-group-delete-btn')) {
    return; // Dejar que el botón de basura maneje su propio click
  }
  
  // NO interceptar Alt+Cmd/Ctrl+Click - dejar que lo maneje el event listener de comentarios
  if (isMainModifierKey(event) && event.altKey && !event.shiftKey) {
    console.log('🎯 Alt+Cmd/Ctrl+Click en Item Group - delegando al handler de comentarios');
    return; // No interceptar, dejar que pase al handler de comentarios
  }
  
  event.preventDefault();
  event.stopPropagation();
  
  const imageSrc = event.target.src;
  const imageName = event.target.alt || 'Item Group Image';
  
  // Extraer el nombre real de la imagen desde la URL
  const urlParts = imageSrc.split('/');
  const actualImageName = urlParts[urlParts.length - 1];
  
  console.log(`🖼️ Mostrando vista previa de imagen del Item Group: ${actualImageName}`);
  
  openImagePreviewModal(actualImageName, imageSrc);
}

// Función para quitar la imagen del Item Group
function handleItemGroupImageRemoval() {
  if (!currentItemGroup) {
    console.log('💡 No hay Item Group activo');
    return;
  }
  
  console.log(`️ Quitando imagen del Item Group`);
  
  // Simplemente quitar la imagen del Item Group
  currentItemGroup['WA_Gallery_01'] = '';
  
  // Buscar y actualizar en currentWorkingData también
  const itemGroupIndex = currentWorkingData.findIndex(item => 
    item['Object Type'] === 'Item Group' && item.Id === currentItemGroup.Id
  );
  
  if (itemGroupIndex !== -1) {
    currentWorkingData[itemGroupIndex]['WA_Gallery_01'] = '';
    console.log(`✅ currentWorkingData actualizado`);
  }
  
  // Actualizar visualmente
  updateItemGroupHeaderImage('');
  console.log(`✅ Imagen del Item Group eliminada`);
}

// Función para configurar el filtro de marcas
function setupBrandFilter() {
  if (brandFilterConfigured) return; // Evitar configuración duplicada
  
  const brandFilter = document.getElementById('brandFilter');
  if (!brandFilter) {
    return; // Salir silenciosamente si no hay elemento
  }
  
  brandFilter.addEventListener('change', function() {
    const selectedBrand = this.value;
    filterGridByBrand(selectedBrand);
  });
  
  brandFilterConfigured = true; // Marcar como configurado
}

// Función para filtrar el grid por marca
function filterGridByBrand(selectedBrand) {
  console.log(`🔍 Filtrando grid por marca: "${selectedBrand}"`);
  
  // Buscar SOLO en el grid actual de Box 4
  const currentGrid = document.querySelector('#imageGridContainer');
  if (!currentGrid) {
    console.log('❌ No se encontró el grid actual de Box 4');
    return;
  }
  
  // Intentar con diferentes selectores
  const itemCodeCells = currentGrid.querySelectorAll('.item-code-cell');
  console.log(`📊 Celdas de Item Code encontradas: ${itemCodeCells.length}`);
  
  if (itemCodeCells.length === 0) {
    console.log('❌ No se encontraron celdas de Item Code, saliendo del filtro');
    return;
  }
  
  let filteredCount = 0;
  let hiddenCount = 0;
  
  // Iterar sobre las celdas de Item Code directamente
  itemCodeCells.forEach((itemCodeCell, index) => {
    const itemCode = itemCodeCell.getAttribute('data-item-code');
    const rowIndex = index; // Usar el índice como row index
    
    console.log(`🔍 Procesando celda ${index}, Item Code: ${itemCode}`);
    
    // Buscar la marca directamente en el DOM (desde la celda visual)
    const brandElement = itemCodeCell.querySelector('.item-brand');
    const itemBrandFromDOM = brandElement ? brandElement.textContent.trim() : '';
    
    // También buscar en currentItemCodes (datos del grupo actual)
    const itemData = currentItemCodes ? currentItemCodes.find(item => 
      item.Name === itemCode || item['Item Code'] === itemCode
    ) : null;
    
    const itemBrandFromData = itemData ? (itemData['Marca'] || itemData['Brand'] || '') : '';
    
    // Usar la marca del DOM primero, luego la de los datos
    const itemBrand = itemBrandFromDOM || itemBrandFromData;
    
    console.log(`   Marca del DOM: "${itemBrandFromDOM}"`);
    console.log(`   Marca de los datos: "${itemBrandFromData}"`);
    console.log(`   Marca final: "${itemBrand}"`);
    
    // Decidir si mostrar u ocultar la fila
    if (selectedBrand === '' || itemBrand === selectedBrand) {
      // Mostrar fila (todas las secciones DEL GRID ACTUAL)
      const rowsInAllSections = currentGrid.querySelectorAll(`[data-row-index="${index}"]`);
      rowsInAllSections.forEach(r => {
        r.style.display = '';
      });
      filteredCount++;
      console.log(`   ✅ Mostrando fila ${index} (marca: "${itemBrand}")`);
    } else {
      // Ocultar fila (todas las secciones DEL GRID ACTUAL)
      const rowsInAllSections = currentGrid.querySelectorAll(`[data-row-index="${index}"]`);
      rowsInAllSections.forEach(r => {
        r.style.display = 'none';
      });
      hiddenCount++;
      console.log(`   ❌ Ocultando fila ${index} (marca: "${itemBrand}" ≠ "${selectedBrand}")`);
    }
  });
  
  console.log(`✅ Filtrado completado. Marca seleccionada: "${selectedBrand || 'Todas'}"`);
  console.log(`📊 Filas mostradas: ${filteredCount}, Filas ocultas: ${hiddenCount}`);
}

// Función auxiliar para obtener el Item Code de un nombre de imagen
function getCurrentItemCodeFromImageName(imageName) {
  // Extraer el Item Code del nombre de la imagen (formato: "87-115-608.jpg" o "87-115-608_detalle.jpg")
  const match = imageName.match(/^(\d{2}-\d{3}-\d{3})/);
  return match ? match[1] : null;
}

// Función para quitar una imagen existente
function handleRemoveImage(imageCell, targetItemCode, targetSection, targetRowIndex, targetColIndex) {
  const existingImage = imageCell.querySelector('.image-thumbnail');
  
  if (!existingImage || existingImage.src.includes('data:image/svg+xml')) {
    console.log('No hay imagen para quitar');
    return;
  }
  
  const imageName = existingImage.alt;
  const imageItemCode = extractItemCodeFromImageName(imageName);
  
  // Si es REST, no se quita
  if (targetSection === 'rest') {
    console.log('Las imágenes de REST no se pueden quitar');
    alert('Las imágenes de REST no se pueden quitar');
    return;
  }
  
  // Si pertenece al mismo Item Code, mover a REST
  if (imageItemCode === targetItemCode) {
    console.log('Moviendo imagen a REST del mismo Item Code');
    moveImageToRest(imageName, targetItemCode, targetRowIndex, targetColIndex, targetSection);
    // Marcar Item Group como modificado automáticamente
    markItemGroupAsModified();
    // Actualizar currentWorkingData (con debouncing)
    updateCurrentWorkingDataWithGridState(100);
  } else {
    // Si es de diferente Item Code, solo quitar
    removeImageFromGrid(targetRowIndex, targetColIndex, targetSection);
    // Marcar Item Group como modificado automáticamente
    markItemGroupAsModified();
    // Actualizar currentWorkingData (con debouncing)
    updateCurrentWorkingDataWithGridState(100);
  }
  
  // NOTA: No llamamos a shiftImagesLeft aquí porque removeImageFromGrid y moveImageToRest ya manejan la compactación internamente
}

// Función optimizada para asignar la imagen de trabajo
function handleAssignImage(imageCell, targetItemCode, targetSection, targetRowIndex, targetColIndex) {
  // Verificar si la imagen ya existe en este Item Code (misma fila)
  const existingPosition = findImageInItemCode(workingImage.imageName, targetItemCode);
  
  // Solo quitar de posición original si NO es la misma posición donde se está asignando
  if (existingPosition && 
      !(existingPosition.row === targetRowIndex && 
        existingPosition.col === targetColIndex && 
        existingPosition.section === targetSection)) {
    
    // Quitar de posición original con compactación automática
    const itemCode = imageCell.getAttribute('data-item-code');
    removeImageFromGrid(existingPosition.row, existingPosition.col, existingPosition.section, true);
  } else if (existingPosition && 
             existingPosition.row === targetRowIndex && 
             existingPosition.col === targetColIndex && 
             existingPosition.section === targetSection) {
    
    return; // No hacer nada si es la misma posición
  }
  
  // Insertar imagen en la nueva posición
  insertImageInGrid(workingImage.imageName, targetRowIndex, targetColIndex, targetSection);
  
  // Marcar Item Group como modificado automáticamente
  markItemGroupAsModified();
  
  // Actualizar currentWorkingData con el nuevo estado (con debouncing)
  updateCurrentWorkingDataWithGridState(50);
  
  // Actualizar indicadores de múltiples imágenes
  updateMultipleImagesIndicators();
}

// Variable para debouncing de updateCurrentWorkingDataWithGridState
let updateGridStateTimeout = null;

// Función optimizada para actualizar currentWorkingData con el estado actual de las imágenes
function updateCurrentWorkingDataWithGridState(debounceMs = 100) {
  // Debouncing para evitar múltiples llamadas consecutivas
  if (updateGridStateTimeout) {
    clearTimeout(updateGridStateTimeout);
  }
  
  updateGridStateTimeout = setTimeout(() => {
    updateCurrentWorkingDataWithGridStateImmediate();
  }, debounceMs);
}

// Función inmediata optimizada (sin debouncing)
function updateCurrentWorkingDataWithGridStateImmediate() {
  if (!currentWorkingData || !currentItemGroup) {
    return;
  }
  
  // Encontrar todos los Item Codes del Item Group actual (cached)
  const itemCodesInGroup = currentWorkingData.filter(row => 
    row['Object Type'] === 'Item Code' && 
    row.NamePath && 
    row.NamePath.startsWith(currentItemGroup.NamePath + '/')
  );
  
  // Configuración de secciones (cached)
  const sections = {
    'cov': { prefix: 'WA_Cover_Image_', count: 5 },
    'gallery': { prefix: 'WA_Gallery_', count: 22 },
    'rest': { prefix: 'WA_Rest_', count: 25 }
  };
  
  // Para cada Item Code, leer las imágenes de la grilla y actualizar currentWorkingData
  itemCodesInGroup.forEach(itemCodeRow => {
    const itemCode = itemCodeRow['Item Code'] || itemCodeRow.Name;
    
    // Procesar cada sección
    Object.keys(sections).forEach(section => {
      // Buscar las celdas de imagen para esta sección y este item code
      const imageCells = document.querySelectorAll(`.image-cell[data-item-code="${itemCode}"][data-section="${section}"]`);
      
      if (imageCells.length > 0) {
        imageCells.forEach((cell, index) => {
          const img = cell.querySelector('.image-thumbnail');
          const imageName = img && !img.src.includes('data:image/svg+xml') 
            ? img.alt || '' 
            : '';
          
          // Actualizar en currentWorkingData usando los nombres correctos
          const columnName = `${sections[section].prefix}${String(index + 1).padStart(2, '0')}`;
          
          // Inicializar el campo si no existe
          if (itemCodeRow[columnName] === undefined) {
            itemCodeRow[columnName] = '';
          }
          
          // Actualizar el valor
          itemCodeRow[columnName] = imageName;
        });
      }
    });
  });
}

// Función para manejar eliminación masiva de imágenes (botón basura)
function handleBulkImageRemoval(event, imageCell) {
  event.preventDefault();
  
  if (!imageCell) return;
  
  const imageThumbnail = imageCell.querySelector('.image-thumbnail');
  if (!imageThumbnail || imageThumbnail.src.includes('data:image/svg+xml')) {
    console.log('No hay imagen para quitar masivamente');
    return;
  }
  
  // Priorizar data-filename, luego alt como fallback
  const imageName = imageThumbnail.getAttribute('data-filename') || imageThumbnail.alt;
  const sourceItemCode = imageCell.getAttribute('data-item-code');
  
  // Obtener SOLO los Item Codes que están visibles según filtros
  const visibleItemCodes = getVisibleItemCodes();
  const visibleItemCodeNames = visibleItemCodes.map(item => item.Name || item['Item Code']);
  console.log('Item Codes visibles por filtro:', visibleItemCodeNames.length);
  
  // Buscar TODAS las imágenes con el mismo nombre en TODO el Item Group
  const allImageCells = document.querySelectorAll('.image-cell .image-thumbnail');
  const imagesToRemove = [];
  
  allImageCells.forEach(img => {
    if (img.alt === imageName && !img.src.includes('data:image/svg+xml')) {
      const cell = img.closest('.image-cell');
      const itemCode = cell.getAttribute('data-item-code');
      
      // FILTRAR: Solo procesar si el Item Code está visible
      if (!visibleItemCodeNames.includes(itemCode)) {
        return; // Saltar este Item Code porque está oculto por filtro
      }
      
      const section = cell.getAttribute('data-section');
      const rowIndex = parseInt(cell.getAttribute('data-row-index'));
      const colIndex = parseInt(cell.getAttribute('data-col-index'));
      
      imagesToRemove.push({
        cell: cell,
        itemCode: itemCode,
        section: section,
        rowIndex: rowIndex,
        colIndex: colIndex,
        imageName: imageName
      });
    }
  });
  
  console.log('Imágenes totales encontradas:', allImageCells.length);
  console.log('Imágenes encontradas para eliminar (filtradas):', imagesToRemove.length);
  
  // Procesar cada imagen encontrada
  imagesToRemove.forEach(imageInfo => {
    const imageItemCode = extractItemCodeFromImageName(imageInfo.imageName);
    
    // Si pertenece al mismo Item Code que donde se originó la eliminación, mover a REST
    if (imageItemCode === imageInfo.itemCode) {
      // Solo mover a REST si no está ya en REST
      if (imageInfo.section !== 'rest') {
        moveImageToRest(imageInfo.imageName, imageInfo.itemCode, imageInfo.rowIndex, imageInfo.colIndex, imageInfo.section);
      } else {
        removeImageFromGrid(imageInfo.rowIndex, imageInfo.colIndex, imageInfo.section);
      }
    } else {
      removeImageFromGrid(imageInfo.rowIndex, imageInfo.colIndex, imageInfo.section);
    }
    
    // NOTA: No llamamos a shiftImagesLeft aquí porque removeImageFromGrid y moveImageToRest ya manejan la compactación
  });
  
  // Actualizar currentWorkingData después de operación masiva
  updateCurrentWorkingDataWithGridState();
}

// Función para manejar asignación masiva por columna (click en headers)
function handleColumnBulkAssignment(event, headerSection) {
  // Prevenir eventos duplicados
  event.preventDefault();
  event.stopPropagation();
  
  // Determinar la sección y columna del header clickeado
  const headerText = headerSection.textContent.trim();
  
  // PROTECCIÓN ANTI-DUPLICADOS: Verificar si ya se está procesando esta columna
  if (window.bulkAssignmentInProgress) {
    console.log('⏸️ Asignación masiva ya en progreso, ignorando...');
    return;
  }
  
  // Marcar como en progreso
  window.bulkAssignmentInProgress = true;
  
  // Limpiar flag después de un tiempo razonable
  setTimeout(() => {
    window.bulkAssignmentInProgress = false;
  }, 1000);
  
  console.log('🎯 Iniciando asignación masiva por columna...');
  console.log('🔍 Header:', headerText);
  console.log('🔍 Navegador:', navigator.userAgent);
  console.log('🔍 Evento tipo:', event.type);
  const sectionContainer = headerSection.closest('.section-wrapper');
  
  if (!sectionContainer) {
    console.error('❌ No se encontró section-wrapper para el header:', headerText);
    return;
  }
  
  let section = 'unknown';
  
  // Método más robusto para detectar la sección
  if (sectionContainer.classList.contains('cov-wrapper') || 
      sectionContainer.querySelector('.cov-wrapper') ||
      headerText.toLowerCase().includes('cov')) {
    section = 'cov';
  } else if (sectionContainer.classList.contains('gallery-wrapper') || 
             sectionContainer.querySelector('.gallery-wrapper') ||
             headerText.toLowerCase().includes('gal')) {
    section = 'gallery';
  } else if (sectionContainer.classList.contains('rest-wrapper') || 
             sectionContainer.querySelector('.rest-wrapper') ||
             headerText.toLowerCase().includes('rst') ||
             headerText.toLowerCase().includes('rest')) {
    section = 'rest';
  }
  
  if (section === 'unknown') {
    console.error('❌ No se pudo determinar la sección para el header:', headerText);
    console.log('🔍 Classes del container:', Array.from(sectionContainer.classList));
    return;
  }
  
  // Extraer número de columna del texto del header (ej: "GAL 03" -> 2 (índice 0-based))
  const columnMatch = headerText.match(/\d+/);
  if (!columnMatch) {
    console.error('❌ No se pudo extraer número de columna del header:', headerText);
    return;
  }
  const columnNumber = parseInt(columnMatch[0]) - 1; // Convertir a índice 0-based
  
  console.log('=== ASIGNACIÓN MASIVA POR COLUMNA ===');
  console.log('Header clickeado:', headerText);
  console.log('Sección:', section);
  console.log('Columna (0-based):', columnNumber);
  console.log('Imagen de trabajo:', workingImage);
  
  // Obtener SOLO los Item Codes que están visibles según filtros
  const visibleItemCodes = getVisibleItemCodes();
  const visibleItemCodeNames = visibleItemCodes.map(item => item.Name || item['Item Code']);
  console.log('Item Codes visibles por filtro:', visibleItemCodeNames.length);
  
  // Obtener todas las celdas de esta columna específica
  const allColumnCells = document.querySelectorAll(`[data-section="${section}"][data-col-index="${columnNumber}"].image-cell`);
  
  // Filtrar solo las celdas que pertenecen a Item Codes visibles
  const visibleColumnCells = Array.from(allColumnCells).filter(cell => {
    const itemCode = cell.getAttribute('data-item-code');
    return visibleItemCodeNames.includes(itemCode);
  });
  
  console.log('Celdas totales en la columna:', allColumnCells.length);
  console.log('Celdas visibles en la columna (filtradas):', visibleColumnCells.length);
  
  if (workingImage) {
    // CASO 1: Hay imagen de trabajo - asignar a toda la columna (solo visibles)
    handleBulkAssignToColumn(visibleColumnCells, section, columnNumber);
  } else {
    // CASO 2: No hay imagen de trabajo - eliminar toda la columna (solo visibles)
    handleBulkRemoveFromColumn(visibleColumnCells, section, columnNumber);
  }
  
  // Liberar flag de protección inmediatamente después de completar
  setTimeout(() => {
    window.bulkAssignmentInProgress = false;
  }, 100);
}

// Función para asignar imagen de trabajo a toda una columna
function handleBulkAssignToColumn(columnCells, section, columnNumber) {
  console.log('Asignando imagen de trabajo a toda la columna...');
  
  columnCells.forEach(cell => {
    const itemCode = cell.getAttribute('data-item-code');
    const rowIndex = parseInt(cell.getAttribute('data-row-index'));
    
    // Verificar duplicados en esta fila antes de insertar
    const existingPosition = findImageInItemCode(workingImage.imageName, itemCode);
    if (existingPosition) {
      removeImageFromGrid(existingPosition.row, existingPosition.col, existingPosition.section);
      // NOTA: No llamamos a shiftImagesLeft aquí porque removeImageFromGrid ya maneja la compactación
    }
    
    // Insertar en la posición específica de la columna
    insertImageInGrid(workingImage.imageName, rowIndex, columnNumber, section);
  });
}

// Función para eliminar todas las imágenes de una columna
function handleBulkRemoveFromColumn(columnCells, section, columnNumber) {
  
  columnCells.forEach(cell => {
    const existingImage = cell.querySelector('.image-thumbnail');
    
    if (!existingImage || existingImage.src.includes('data:image/svg+xml')) {
      return; // No hay imagen para quitar
    }
    
    const imageName = existingImage.alt;
    const itemCode = cell.getAttribute('data-item-code');
    const rowIndex = parseInt(cell.getAttribute('data-row-index'));
    const imageItemCode = extractItemCodeFromImageName(imageName);
    
    // Aplicar reglas de REST
    if (section !== 'rest' && imageItemCode === itemCode) {
      moveImageToRest(imageName, itemCode, rowIndex, columnNumber, section);
    } else {
      removeImageFromGrid(rowIndex, columnNumber, section);
    }
    
    // NOTA: No llamamos a shiftImagesLeft aquí porque removeImageFromGrid y moveImageToRest ya manejan la compactación
  });
  
  // Actualizar currentWorkingData después de operación masiva por columna
  updateCurrentWorkingDataWithGridState();
}

// Función para encontrar una imagen en un Item Code específico
function findImageInItemCode(imageName, itemCode) {
  const itemRows = document.querySelectorAll(`[data-item-code="${itemCode}"].image-cell`);
  
  for (let cell of itemRows) {
    const img = cell.querySelector('.image-thumbnail');
    if (img && img.alt === imageName && !img.src.includes('data:image/svg+xml')) {
      return {
        row: parseInt(cell.getAttribute('data-row-index')),
        col: parseInt(cell.getAttribute('data-col-index')),
        section: cell.getAttribute('data-section')
      };
    }
  }
  return null;
}

// Función para mover una imagen a REST
function moveImageToRest(imageName, itemCode, sourceRow, sourceCol, sourceSection) {
  // Buscar el primer espacio vacío en REST para este Item Code
  const restCells = document.querySelectorAll(`[data-item-code="${itemCode}"][data-section="rest"].image-cell`);
  
  let targetCell = null;
  for (let cell of restCells) {
    const img = cell.querySelector('.image-thumbnail');
    if (!img || img.src.includes('data:image/svg+xml')) {
      targetCell = cell;
      break;
    }
  }
  
  if (!targetCell) {
    alert('No hay espacio disponible en REST para esta imagen');
    return false;
  }
  
  // Quitar de posición original
  removeImageFromGrid(sourceRow, sourceCol, sourceSection);
  
  // Agregar en REST
  const targetRow = parseInt(targetCell.getAttribute('data-row-index'));
  const targetCol = parseInt(targetCell.getAttribute('data-col-index'));
  insertImageInGrid(imageName, targetRow, targetCol, 'rest');
  
  return true;
}

// Función para quitar una imagen del grid
// Función auxiliar para obtener el nombre de columna correcto
function getColumnName(section, colIndex) {
  const sections = {
    'cover': { prefix: 'WA_Cover_Image_', count: 5 },
    'gallery': { prefix: 'WA_Gallery_', count: 22 },
    'rest': { prefix: 'WA_Rest_', count: 25 }
  };
  
  if (sections[section]) {
    return `${sections[section].prefix}${String(colIndex + 1).padStart(2, '0')}`;
  }
  return null;
}

// Función auxiliar para actualizar una columna específica en currentWorkingData
function updateCurrentWorkingDataColumn(itemCode, columnName, newValue) {
  if (!currentWorkingData || !itemCode || !columnName) return;
  
  // Buscar el Item Code en currentWorkingData
  const itemCodeIndex = currentWorkingData.findIndex(item => 
    item['Object Type'] === 'Item Code' && 
    (item.Name === itemCode || item['Item Code'] === itemCode)
  );
  
  if (itemCodeIndex !== -1) {
    const oldValue = currentWorkingData[itemCodeIndex][columnName];
    currentWorkingData[itemCodeIndex][columnName] = newValue;
    console.log(`✅ UPDATED currentWorkingData: ${itemCode}.${columnName} "${oldValue}" → "${newValue}"`);
  } else {
    console.log(`❌ No se encontró ${itemCode} en currentWorkingData`);
  }
}

function removeImageFromGrid(rowIndex, colIndex, section, shouldCompact = true) {
  const cell = document.querySelector(`[data-row-index="${rowIndex}"][data-col-index="${colIndex}"][data-section="${section}"].image-cell`);
  if (!cell) return;
  
  // Obtener información para actualizar currentWorkingData
  const itemCode = cell.getAttribute('data-item-code');
  
  // Calcular el nombre de columna correcto
  const columnName = getColumnName(section, colIndex);
  
  // Actualizar currentWorkingData directamente
  if (itemCode && columnName) {
    updateCurrentWorkingDataColumn(itemCode, columnName, '');
    console.log(`🔄 DIRECT UPDATE: ${itemCode}.${columnName} = "" (eliminado)`);
  }
  
  // Reemplazar con celda vacía
  cell.innerHTML = `
    <div class="empty-image-cell">
      <div class="drop-zone" title="">
        <span class="add-icon"></span>
      </div>
    </div>
  `;
  
  // Si se solicita compactación, recorrer las imágenes hacia la izquierda
  if (shouldCompact && itemCode) {
    compactImagesInSection(itemCode, section, colIndex);
  }
  
  // Actualizar indicadores de múltiples imágenes
  updateMultipleImagesIndicators();
}

// Función para compactar imágenes en una sección después de eliminar una
function compactImagesInSection(itemCode, section, removedColIndex) {
  // Obtener el número de columnas para esta sección
  const maxCols = getMaxColumnsForSection(section);
  
  // Encontrar todas las celdas de esta fila en la sección
  const rowCells = [];
  for (let col = 0; col < maxCols; col++) {
    const cell = document.querySelector(`[data-item-code="${itemCode}"][data-col-index="${col}"][data-section="${section}"].image-cell`);
    if (cell) {
      rowCells.push({
        cell: cell,
        colIndex: col,
        hasImage: cell.querySelector('.image-thumbnail') && !cell.querySelector('.image-thumbnail').src.includes('data:image/svg+xml')
      });
    }
  }
  
  // CRÍTICO: Preservar comentarios de todas las imágenes ANTES de limpiar datos
  const imageCommentsBackup = new Map();
  for (let col = removedColIndex; col < rowCells.length; col++) {
    const cellData = rowCells[col];
    if (cellData && cellData.hasImage) {
      const img = cellData.cell.querySelector('.image-thumbnail');
      const imageName = img.getAttribute('data-filename') || '';
      if (imageName) {
        // Obtener comentarios ANTES de que se borren los datos
        const comments = getImageComments(imageName);
        if (comments && comments.trim()) {
          imageCommentsBackup.set(imageName, comments);
          console.log(`💾 BACKUP: Preservando comentarios para ${imageName}:`, comments);
        }
      }
    }
  }
  
  // Crear un array con solo las imágenes que vienen después de la posición eliminada
  const imagesToShift = [];
  for (let i = removedColIndex + 1; i < rowCells.length; i++) {
    const cellData = rowCells[i];
    if (cellData && cellData.hasImage) {
      const img = cellData.cell.querySelector('.image-thumbnail');
      const imageName = img.getAttribute('data-filename') || '';
      imagesToShift.push({
        src: img.src,
        filename: imageName,
        colIndex: cellData.colIndex,
        preservedComments: imageCommentsBackup.get(imageName) || ''
      });
    }
  }
  
  // Limpiar las celdas que vamos a reorganizar (desde removedColIndex hacia adelante)
  for (let col = removedColIndex; col < rowCells.length; col++) {
    const cell = rowCells[col]?.cell;
    if (cell) {
      cell.innerHTML = `
        <div class="empty-image-cell">
          <div class="drop-zone" title="">
            <span class="add-icon"></span>
          </div>
        </div>
      `;
      
      // Limpiar también los datos correspondientes
      const columnName = getColumnName(section, col);
      if (columnName) {
        updateCurrentWorkingDataColumn(itemCode, columnName, '');
      }
    }
  }
  
  // Reorganizar las imágenes, moviéndolas hacia la izquierda
  let newPosition = removedColIndex;
  for (const imageData of imagesToShift) {
    if (newPosition < rowCells.length) {
      const targetCell = rowCells[newPosition]?.cell;
      if (targetCell) {
        // CRÍTICO: Restaurar comentarios ANTES de generar la celda
        if (imageData.preservedComments) {
          console.log(`🔄 RESTORE: Restaurando comentarios para ${imageData.filename} antes de regenerar celda`);
          // Buscar y actualizar el objeto imagen en currentWorkingData
          const imageObj = currentWorkingData.find(item => 
            item['Object Type'] === 'Image' && item.Name === imageData.filename
          );
          if (imageObj) {
            imageObj['WA_VIS_Comment'] = imageData.preservedComments;
          }
          
          // También actualizar en allLibraryData si existe
          const imageObjLib = allLibraryData?.find(item => 
            item['Object Type'] === 'Image' && item.Name === imageData.filename
          );
          if (imageObjLib) {
            imageObjLib['WA_VIS_Comment'] = imageData.preservedComments;
          }
        }
        
        // Usar generateImageCell para preservar comentarios e indicadores
        targetCell.innerHTML = generateImageCell(imageData.filename, itemCode);
        
        // Actualizar currentWorkingData con la nueva posición
        const newColumnName = getColumnName(section, newPosition);
        if (newColumnName) {
          updateCurrentWorkingDataColumn(itemCode, newColumnName, imageData.filename);
          console.log(`🔄 IMAGE SHIFT: ${itemCode}.${newColumnName} = ${imageData.filename} (moved from col ${imageData.colIndex})`);
        }
        
        newPosition++;
      }
    }
  }
  
  console.log(`✅ Compacted ${imagesToShift.length} images in ${section} section for ${itemCode}`);
}

// Función auxiliar para obtener el número máximo de columnas por sección
function getMaxColumnsForSection(section) {
  switch(section) {
    case 'cov': return 12;  // COV_1 a COV_12
    case 'gallery': return 40; // GAL_1 a GAL_40
    case 'rest': return 16; // REST_1 a REST_16
    default: return 0;
  }
}

// Función para insertar una imagen en el grid
function insertImageInGrid(imageName, rowIndex, colIndex, section) {
  const targetCell = document.querySelector(`[data-row-index="${rowIndex}"][data-col-index="${colIndex}"][data-section="${section}"].image-cell`);
  if (!targetCell) return;
  
  const itemCode = targetCell.getAttribute('data-item-code');
  
  // Verificar si necesitamos hacer recorrimiento
  const existingImg = targetCell.querySelector('.image-thumbnail');
  const hasExistingImage = existingImg && !existingImg.src.includes('data:image/svg+xml');
  
  if (hasExistingImage) {
    // Hacer recorrimiento hacia la derecha
    if (!shiftImagesRight(rowIndex, colIndex, section)) {
      alert(`No hay espacio suficiente en la sección ${section.toUpperCase()}. Quita una imagen primero.`);
      return;
    }
  }
  
  // Insertar la nueva imagen
  targetCell.innerHTML = generateImageCell(imageName, itemCode);
  
  // Actualizar currentWorkingData directamente
  const columnName = getColumnName(section, colIndex);
  if (itemCode && columnName) {
    updateCurrentWorkingDataColumn(itemCode, columnName, imageName);
    console.log(`🔄 DIRECT UPDATE: ${itemCode}.${columnName} = "${imageName}" (agregado)`);
  }
  
  // Actualizar indicadores de múltiples imágenes
  updateMultipleImagesIndicators();
}

// Función para recorrer imágenes hacia la derecha
function shiftImagesRight(fromRow, fromCol, section) {
  // Obtener todas las celdas de esta fila y sección
  const rowCells = document.querySelectorAll(`[data-row-index="${fromRow}"][data-section="${section}"].image-cell`);
  const sortedCells = Array.from(rowCells).sort((a, b) => 
    parseInt(a.getAttribute('data-col-index')) - parseInt(b.getAttribute('data-col-index'))
  );
  
  // Encontrar primera celda vacía desde la posición de inserción
  let firstEmptyIndex = -1;
  for (let i = fromCol; i < sortedCells.length; i++) {
    const cell = sortedCells.find(c => parseInt(c.getAttribute('data-col-index')) === i);
    if (cell) {
      const img = cell.querySelector('.image-thumbnail');
      if (!img || img.src.includes('data:image/svg+xml')) {
        firstEmptyIndex = i;
        break;
      }
    }
  }
  
  if (firstEmptyIndex === -1) {
    return false; // No hay espacio
  }
  
  // Recorrer imágenes hacia la derecha
  for (let i = firstEmptyIndex; i > fromCol; i--) {
    const sourceCell = sortedCells.find(c => parseInt(c.getAttribute('data-col-index')) === i - 1);
    const targetCell = sortedCells.find(c => parseInt(c.getAttribute('data-col-index')) === i);
    
    if (sourceCell && targetCell) {
      const sourceImg = sourceCell.querySelector('.image-thumbnail');
      if (sourceImg && !sourceImg.src.includes('data:image/svg+xml')) {
        // Copiar contenido
        targetCell.innerHTML = sourceCell.innerHTML;
        // Limpiar origen
        sourceCell.innerHTML = `
          <div class="empty-image-cell">
            <div class="drop-zone" title="">
              <span class="add-icon"></span>
            </div>
          </div>
        `;
      }
    }
  }
  
  return true;
}

// Función para recorrer imágenes hacia la izquierda (llenar espacios vacíos)
function shiftImagesLeft(fromRow, fromCol, section) {
  // Obtener todas las celdas de esta fila y sección
  const rowCells = document.querySelectorAll(`[data-row-index="${fromRow}"][data-section="${section}"].image-cell`);
  const sortedCells = Array.from(rowCells).sort((a, b) => 
    parseInt(a.getAttribute('data-col-index')) - parseInt(b.getAttribute('data-col-index'))
  );
  
  // Recorrer desde la posición que se quitó hacia la derecha
  for (let i = fromCol; i < sortedCells.length - 1; i++) {
    const currentCell = sortedCells.find(c => parseInt(c.getAttribute('data-col-index')) === i);
    const nextCell = sortedCells.find(c => parseInt(c.getAttribute('data-col-index')) === i + 1);
    
    if (currentCell && nextCell) {
      const nextImg = nextCell.querySelector('.image-thumbnail');
      if (nextImg && !nextImg.src.includes('data:image/svg+xml')) {
        // Mover imagen de la siguiente posición a la actual
        currentCell.innerHTML = nextCell.innerHTML;
        // Limpiar la siguiente posición
        nextCell.innerHTML = `
          <div class="empty-image-cell">
            <div class="drop-zone" title="">
              <span class="add-icon"></span>
            </div>
          </div>
        `;
      } else {
        // Si la siguiente está vacía, parar el recorrimiento
        break;
      }
    }
  }
}

// Función para guardar en localStorage
function saveToLocalStorage() {
  try {
    // Verificar que tengamos un Item Group activo
    if (!currentItemGroup || !currentItemGroup.Id) {
      alert('No hay un Item Group seleccionado para guardar.');
      return;
    }

    // IMPORTANTE: Sincronizar cambios antes de guardar
    updateCurrentWorkingDataWithGridState();
    
    // Marcar el Item Group actual como guardado
    savedItemGroups.add(currentItemGroup.Id);
    
    console.log(`📋 DEBUG: Item Groups guardados actualmente: ${Array.from(savedItemGroups)}`);
    console.log(`📋 DEBUG: Guardando nuevo Item Group: ${currentItemGroup.Id} (${currentItemGroup.Name})`);
    
    // Solo guardar los datos esenciales - solo IDs para evitar exceder el límite
    const dataToSave = {
      savedItemGroups: Array.from(savedItemGroups), // Solo los IDs de Item Groups guardados
      currentItemGroupId: currentItemGroup.Id,
      currentItemGroupName: currentItemGroup.Name,
      timestamp: new Date().toISOString()
    };
    
    // Intentar guardar - si falla, continuar sin localStorage
    try {
      localStorage.setItem('vis-web-saved-itemgroups', JSON.stringify(dataToSave));
      console.log('Se guarda en localStorage:', dataToSave);
    } catch (localStorageError) {
      console.warn('⚠️ No se pudo guardar en localStorage, continuando sin persistencia:', localStorageError.message);
    }
    
    // Mostrar feedback al usuario
    const saveBtn = document.getElementById('saveChangesButton');
    if (saveBtn) {
      const originalText = saveBtn.innerHTML;
      saveBtn.innerHTML = '<i class="fa-solid fa-check" style="font-weight: 2000;"></i> Guardado!';
      saveBtn.classList.remove('btn-success');
      saveBtn.classList.add('btn-outline-success');
      
      setTimeout(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.classList.remove('btn-outline-success');
        saveBtn.classList.add('btn-success');
      }, 2000);
    }
    
    console.log(`Se guarda Item Group: "${currentItemGroup.Name}"`);
  } catch (error) {
    console.error('Error guardando en localStorage:', error);
    
    // Mostrar feedback específico para error de cuota
    const saveBtn = document.getElementById('saveChangesButton');
    if (saveBtn) {
      const originalText = saveBtn.innerHTML;
      
      if (error.message.includes('quota') || error.name === 'QuotaExceededError') {
        saveBtn.innerHTML = '<i class="fa-solid fa-exclamation-triangle"></i> Datos muy grandes';
        saveBtn.classList.remove('btn-success');
        saveBtn.classList.add('btn-warning');
        console.warn('Los datos son muy grandes para localStorage. Se implementará guardado específico según la lógica de trabajo.');
      } else {
        saveBtn.innerHTML = '<i class="fa-solid fa-times"></i> Error al guardar';
        saveBtn.classList.remove('btn-success');
        saveBtn.classList.add('btn-danger');
      }
      
      setTimeout(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.classList.remove('btn-warning', 'btn-danger');
        saveBtn.classList.add('btn-success');
      }, 3000);
    }
  }
}

// Función para cargar desde localStorage
function loadFromLocalStorage() {
  try {
    const savedData = localStorage.getItem('vis-web-saved-itemgroups');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      
      // Restaurar los Item Groups guardados
      if (parsedData.savedItemGroups) {
        savedItemGroups = new Set(parsedData.savedItemGroups);
        console.log('✅ Item Groups guardados cargados desde localStorage:', Array.from(savedItemGroups));
        console.log('📅 Última actualización:', parsedData.timestamp);
        return true;
      }
    }
    console.log('ℹ️ No se encontraron Item Groups guardados en localStorage');
    return false;
  } catch (error) {
    console.error('❌ Error cargando desde localStorage:', error);
    return false;
  }
}

// ===== SISTEMA DE CACHÉ PARA ITEM GROUPS =====
let itemGroupDataCache = new Map(); // Cache en memoria para Item Groups
let allItemGroupsLoaded = false; // Flag para saber si ya cargamos todo

// Función para cargar TODOS los Item Groups una sola vez y cachearlos
let loadingCache = false; // Flag para evitar cargas múltiples
async function loadAllItemGroupsToCache() {
  if (allItemGroupsLoaded) {
    console.log('✅ Todos los Item Groups ya están en caché');
    return;
  }
  
  if (loadingCache) {
    console.log('⏳ Ya se está cargando el caché, esperando...');
    return;
  }
  
  loadingCache = true;
  
  try {
    console.log('🔄 Cargando TODOS los Item Groups en caché (una sola vez)...');
    const cacheStartTime = performance.now();
    
    // Cargar toda la data sheet
    const dataSheetUrl = `${GOOGLE_SHEETS_CONFIG.DATA_PROXY_URL}?sheet=data&format=csv&timestamp=${Date.now()}`;
    
    const response = await fetch(dataSheetUrl, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Accept': 'text/csv,text/plain,application/json,*/*'
      },
      timeout: 60000 // Timeout más largo para carga completa
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseText = await response.text();
    const parsedData = parseCSVToObjects(responseText, 'data');
    
    // 🔄 NUEVO: Detectar si los datos están concatenados y transformarlos
    const processedData = transformDataIfConcatenated(parsedData);
    
    console.log(`📊 Total de filas cargadas para caché: ${parsedData.length} → procesadas: ${processedData.length}`);
    
    // Agrupar por Item Group ID
    const itemGroupMap = new Map();
    
    for (const row of processedData) {
      const itemGroups = String(row['Item Groups'] || '');
      const itemGroupIds = itemGroups.split(',').map(id => id.trim()).filter(id => id);
      
      for (const itemGroupId of itemGroupIds) {
        if (!itemGroupMap.has(itemGroupId)) {
          itemGroupMap.set(itemGroupId, []);
        }
        itemGroupMap.get(itemGroupId).push(row);
      }
    }
    
    // Guardar en caché
    itemGroupDataCache = itemGroupMap;
    allItemGroupsLoaded = true;
    
    const cacheEndTime = performance.now();
    console.log(`✅ Caché completo creado en ${(cacheEndTime - cacheStartTime).toFixed(2)}ms`);
    console.log(`📊 Item Groups únicos en caché: ${itemGroupDataCache.size}`);
    
    // Opcional: Guardar en localStorage para persistencia
  try {
    // Guardar solo un resumen del caché en localStorage en lugar de todos los datos
    const cacheData = {
      timestamp: Date.now(),
      itemGroupIds: Array.from(itemGroupDataCache.keys()), // Solo IDs
      totalSize: itemGroupDataCache.size
    };
    localStorage.setItem('itemGroupDataCacheInfo', JSON.stringify(cacheData));
    console.log(`💾 Información del caché guardada en localStorage (${itemGroupDataCache.size} Item Groups)`);
  } catch (e) {
    console.warn('⚠️ No se pudo guardar información del caché en localStorage');
  }
    
  } catch (error) {
    console.error('❌ Error cargando caché de Item Groups:', error);
    throw error;
  } finally {
    loadingCache = false;
  }
}

// Función para optimizar caché con feedback visual
// Función para cargar datos de caché de forma no crítica
async function loadCacheData() {
  try {
    console.log('📦 Cargando caché de optimización...');
    await optimizeCache();
    
    // Verificar si realmente se cargó algo en el caché
    const hasCache = itemGroupDataCache && itemGroupDataCache.size > 0;
    
    if (hasCache) {
      console.log(`✅ Caché cargado exitosamente: ${itemGroupDataCache.size} Item Groups`);
      return true;
    } else {
      console.warn('⚠️ Caché no se pudo poblar adecuadamente');
      return false;
    }
    
  } catch (error) {
    console.warn('⚠️ Error cargando caché (no crítico):', error.message);
    return false;
  }
}

// Función para pre-procesar datos de inventario (optimización de performance)
async function preProcessInventoryData() {
  console.log('🚀 === INICIO Pre-procesamiento de datos de inventario ===');
  
  if (!itemGroupDataCache || itemGroupDataCache.size === 0) {
    console.log('❌ No hay caché disponible para pre-procesar');
    return false;
  }
  
  const startTime = performance.now();
  
  try {
    // PASO 1: Convertir el caché a un array plano de todos los elementos
    console.log('🔄 PASO 1: Procesando datos del caché...');
    let allCachedData = [];
    let totalItemGroups = 0;
    let totalItems = 0;
    
    itemGroupDataCache.forEach((itemGroupData, itemGroupId) => {
      if (itemGroupData && Array.isArray(itemGroupData)) {
        totalItemGroups++;
        itemGroupData.forEach(item => {
          allCachedData.push(item);
          totalItems++;
        });
      }
    });
    
    console.log(`📊 Datos del caché procesados: ${totalItemGroups} Item Groups, ${totalItems} items totales`);
    
    if (allCachedData.length === 0) {
      console.log('❌ No hay datos válidos en el caché');
      return false;
    }

    // PASO 2: Convertir datos concatenados a formato Attribute-Value
    console.log('🔄 PASO 2: Convirtiendo datos concatenados a formato Attribute-Value...');
    let attributeValueData = [];
    
    allCachedData.forEach(item => {
      const dataConcatenated = item['data_concatenated'];
      const itemGroups = item['Item Groups'];
      const id = item['ID'];
      const objectType = item['Object Type'];
      
      if (dataConcatenated && dataConcatenated.trim() !== '') {
        // Parsear los datos concatenados para extraer atributos individuales
        const parsedData = parseUniversalConcatenatedData(item);
        
        
        // Convertir cada campo parseado a una fila Attribute-Value
        Object.keys(parsedData).forEach(attribute => {
          if (attribute !== 'Item Groups' && attribute !== 'ID' && attribute !== 'Object Type') {
            const value = parsedData[attribute] || '';
            attributeValueData.push({
              'Item Groups': itemGroups,
              'ID': id,
              'Object Type': objectType,
              'Attribute': attribute,
              'value': value
            });
          }
        });
      }
    });
    

    // PASO 3: Transformar los datos de Attribute-Value al formato expandido
    console.log('🔄 PASO 3: Transformando datos de formato Attribute-Value...');
    const transformedData = transformAttributeValueData(attributeValueData);
    
    // Convertir el objeto transformado a array
    const transformedArray = Object.values(transformedData);
    console.log(`📊 Datos transformados: ${transformedArray.length} elementos`);
    
    // Verificar comentarios
    const withComments = transformedArray.filter(item => item['WA_VIS_Comment'] && item['WA_VIS_Comment'].trim() !== '');
    console.log(`📊 Elementos CON comentarios después de transformación: ${withComments.length}/${transformedArray.length}`);
    
    // PASO 4: Pre-generar HTML de la tabla
    console.log('🔄 PASO 4: Pre-generando HTML de tabla de inventario...');
    
    // Temporalmente asignar los datos transformados
    const originalCurrentWorkingData = currentWorkingData;
    const originalAllLibraryData = allLibraryData;
    
    currentWorkingData = transformedArray;
    allLibraryData = transformedArray;
    
    // Inicializar commentedItemsData con los datos transformados
    console.log('🔄 Inicializando commentedItemsData con datos pre-procesados...');
    initializeCommentedItemsData();
    
    // Generar HTML de la tabla
    const inventoryHTML = generateImageInventoryTable(transformedArray);
    
    // Restaurar datos originales
    currentWorkingData = originalCurrentWorkingData;
    allLibraryData = originalAllLibraryData;
    
    // PASO 5: Guardar resultados en variables globales
    preProcessedInventoryData = transformedArray;
    preProcessedInventoryHTML = inventoryHTML;
    preProcessedDataTimestamp = new Date();
    isPreProcessingComplete = true;
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    console.log(`✅ Pre-procesamiento completado en ${processingTime.toFixed(2)}ms`);
    console.log(`📊 HTML generado: ${inventoryHTML.length} caracteres`);
    console.log(`💾 Datos guardados en variables globales - botón información será instantáneo`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error en pre-procesamiento:', error);
    isPreProcessingComplete = false;
    return false;
  }
}

async function optimizeCache() {
  const btn = document.getElementById('loadCacheBtn');
  let originalHTML = '';
  
  try {
    // Cambiar botón a estado de carga solo si existe
    if (btn) {
      originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Optimizando...';
    }
    
    console.log('🚀 Iniciando optimización de cache...');
    
    await loadAllItemGroupsToCache();
    
    console.log('✅ Cache optimizado exitosamente');
    
    // INMEDIATO: Pre-procesar datos para tabla de inventario en paralelo
    console.log('🚀 Iniciando pre-procesamiento de datos de inventario...');
    await preProcessInventoryData();
    console.log('✅ Pre-procesamiento completado - botón información será instantáneo');
    
    // Mostrar éxito solo si el botón existe
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Optimizado!';
      btn.className = 'btn btn-success btn-compact';
      
      // Restaurar después de 3 segundos
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }, 3000);
    }
    
  } catch (error) {
    console.error('❌ Error optimizando caché (no crítico):', error);
    console.log('📝 La aplicación puede continuar sin optimización de caché');
    
    // Mostrar advertencia solo si el botón existe
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-exclamation-triangle"></i> Sin Caché';
      btn.className = 'btn btn-warning btn-compact';
      
      // Restaurar después de 3 segundos
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        btn.className = 'btn btn-success btn-compact';
      }, 3000);
    }
    
    // NO re-lanzar el error - el caché es opcional, no crítico
    console.log('✅ Continuando sin caché optimizado');
  }
}

// Función para obtener un Item Group del caché (súper rápida)
async function getItemGroupFromCache(itemGroupId) {
  // Si no está cargado el caché, cargarlo primero
  if (!allItemGroupsLoaded) {
    await loadAllItemGroupsToCache();
  }
  
  const cachedData = itemGroupDataCache.get(itemGroupId);
  if (!cachedData) {
    console.warn(`⚠️ Item Group ${itemGroupId} no encontrado en caché`);
    return [];
  }
  
  console.log(`✅ Item Group ${itemGroupId} obtenido del caché: ${cachedData.length} filas`);
  return cachedData;
}

// Función para verificar si hay caché en localStorage
function loadCacheFromLocalStorage() {
  try {
    // Intentar cargar información del caché (más ligera)
    const cachedInfo = localStorage.getItem('itemGroupDataCacheInfo');
    if (cachedInfo) {
      const cacheInfo = JSON.parse(cachedInfo);
      
      // Verificar si el caché no es muy viejo (ej: 1 hora)
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - cacheInfo.timestamp < oneHour) {
        console.log(`ℹ️ Información del caché encontrada: ${cacheInfo.totalSize} Item Groups disponibles`);
        console.log(`📅 Caché creado: ${new Date(cacheInfo.timestamp).toLocaleString()}`);
        // El caché real se cargará bajo demanda
        return true;
      } else {
        console.log('⏰ Información del caché está vieja, se recargará');
        localStorage.removeItem('itemGroupDataCacheInfo');
      }
    }
    
    // Fallback: intentar cargar caché completo (legacy)
    const cached = localStorage.getItem('itemGroupDataCache');
    if (cached) {
      try {
        const cacheData = JSON.parse(cached);
        
        // Verificar si el caché no es muy viejo (ej: 1 hora)
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - cacheData.timestamp < oneHour) {
          itemGroupDataCache = new Map(cacheData.data);
          allItemGroupsLoaded = true;
          console.log(`✅ Caché completo cargado desde localStorage: ${itemGroupDataCache.size} Item Groups`);
          return true;
        } else {
          console.log('⏰ Caché completo en localStorage está viejo, se recargará');
          localStorage.removeItem('itemGroupDataCache');
        }
      } catch (parseError) {
        console.warn('⚠️ Error parseando caché legacy, se limpiará');
        localStorage.removeItem('itemGroupDataCache');
      }
    }
  } catch (error) {
    console.warn('⚠️ Error cargando caché desde localStorage:', error);
    localStorage.removeItem('itemGroupDataCache');
    localStorage.removeItem('itemGroupDataCacheInfo');
  }
  
  console.log('ℹ️ No se encontraron Item Groups guardados en localStorage');
  return false;
}

// Función para sincronizar todos los cambios hechos en la interfaz de vuelta a currentWorkingData
function syncChangesToWorkingData() {
  console.log('🔄 Sincronizando cambios a currentWorkingData...');
  
  // 1. Sincronizar imágenes del estado actual de la grilla PRIMERO
  updateCurrentWorkingDataWithGridState();
  
  // 2. Sincronizar comentarios de Item Groups guardados
  savedItemGroups.forEach(itemGroupId => {
    // Encontrar el Item Group en currentWorkingData
    const itemGroupIndex = currentWorkingData.findIndex(item => 
      item['Object Type'] === 'Item Group' && 
      item.Id === itemGroupId
    );
    
    if (itemGroupIndex !== -1) {
      // Si es el Item Group actual, usar sus datos actualizados
      if (currentItemGroup && currentItemGroup.Id === itemGroupId) {
        if (currentItemGroup['WA_VIS_Comment']) {
          currentWorkingData[itemGroupIndex]['WA_VIS_Comment'] = currentItemGroup['WA_VIS_Comment'];
        }
        if (currentItemGroup['WA_VIS_Approved']) {
          currentWorkingData[itemGroupIndex]['WA_VIS_Approved'] = currentItemGroup['WA_VIS_Approved'];
        }
        
        // Sincronizar imagen principal del Item Group (WA_Gallery_01)
        if (currentItemGroup['WA_Gallery_01'] !== undefined) {
          currentWorkingData[itemGroupIndex]['WA_Gallery_01'] = currentItemGroup['WA_Gallery_01'] || '';
        }
        
        console.log(`✅ Sincronizado Item Group actual: ${currentItemGroup.Name}`);
      }
    }
  });
  
  // 3. Sincronizar comentarios de Item Codes para Item Groups guardados
  savedItemGroups.forEach(itemGroupId => {
    // Encontrar todos los Item Codes que pertenecen a este Item Group
    const itemGroup = currentWorkingData.find(item => 
      item['Object Type'] === 'Item Group' && 
      item.Id === itemGroupId
    );
    
    if (itemGroup) {
      // Si es el Item Group actual, usar currentItemCodes si está disponible
      if (currentItemGroup && currentItemGroup.Id === itemGroupId && currentItemCodes) {
        currentItemCodes.forEach(currentItemCode => {
          const itemCodeIndex = currentWorkingData.findIndex(item => 
            item['Object Type'] === 'Item Code' && 
            item.NamePath === currentItemCode.NamePath
          );
          
          if (itemCodeIndex !== -1) {
            if (currentItemCode['WA_VIS_Comment']) {
              currentWorkingData[itemCodeIndex]['WA_VIS_Comment'] = currentItemCode['WA_VIS_Comment'];
            }
            if (currentItemCode['WA_VIS_Approved']) {
              currentWorkingData[itemCodeIndex]['WA_VIS_Approved'] = currentItemCode['WA_VIS_Approved'];
            }
          }
        });
      }
    }
  });
  
  console.log('✅ Sincronización completada');
}

// Función para debuggear qué Item Groups están guardados
function debugSavedItemGroups() {
  console.log('=== DEBUG ITEM GROUPS GUARDADOS ===');
  console.log('savedItemGroups:', Array.from(savedItemGroups));
  console.log('currentItemGroup:', currentItemGroup ? `${currentItemGroup.Id} - ${currentItemGroup.Name}` : 'None');
  
  // Buscar información de cada Item Group guardado
  savedItemGroups.forEach(groupId => {
    const groupData = currentWorkingData.find(item => 
      item['Object Type'] === 'Item Group' && item.Id === groupId
    );
    if (groupData) {
      console.log(`- ID ${groupId}: ${groupData.Name}`);
      
      // Buscar Item Codes de este grupo
      const itemCodes = currentWorkingData.filter(item => 
        item['Object Type'] === 'Item Code' && 
        item.NamePath && item.NamePath.startsWith(groupData.NamePath + '/')
      );
      console.log(`  └─ ${itemCodes.length} Item Codes:`, itemCodes.map(ic => ic.Name));
    } else {
      console.log(`- ID ${groupId}: NO ENCONTRADO en currentWorkingData`);
    }
  });
  
  // Verificar localStorage
  try {
    const localStorageData = localStorage.getItem('vis-web-saved-itemgroups');
    if (localStorageData) {
      const parsed = JSON.parse(localStorageData);
      console.log('localStorage savedItemGroups:', parsed.savedItemGroups);
    } else {
      console.log('localStorage: Sin datos guardados');
    }
  } catch (error) {
    console.log('localStorage: Error leyendo datos');
  }
  
  console.log('==================================');
}

// Función para limpiar Item Groups guardados anteriores
function clearSavedItemGroups() {
  const confirmMessage = `¿Estás seguro de que quieres limpiar todos los Item Groups guardados anteriormente?\n\nEsto eliminará: ${Array.from(savedItemGroups).length} Item Groups de la lista de exportación.\n\nDespués de esto, solo se exportará el Item Group actual cuando lo guardes.`;
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  savedItemGroups.clear();
  
  // Limpiar también el localStorage
  try {
    localStorage.removeItem('vis-web-saved-groups');
    localStorage.removeItem('vis-web-saved-itemgroups');
  } catch (error) {
    console.warn('No se pudo limpiar localStorage:', error);
  }
  
  console.log('✅ Se limpiaron todos los Item Groups guardados anteriormente');
  alert('✅ Item Groups anteriores limpiados. Ahora solo se exportará el Item Group actual cuando lo guardes.');
}

// Funciones para agregar contenido personalizado
function addContentToBox3(content) {
  const box3Content = document.getElementById('box3-content');
  if (box3Content) {
    box3Content.innerHTML = content;
  }
}

function addContentToBox4(content) {
  const box4Content = document.getElementById('box4-content');
  if (box4Content) {
    box4Content.innerHTML = content;
  }
}

// Ejemplo de función para agregar contenido dinámico
function addSampleContent() {
  addContentToBox3(`
    <div class="p-3">
      <h3>Box 3 - Nueva Funcionalidad</h3>
      <p>Aquí puedes agregar tu contenido personalizado</p>
      <button class="btn btn-primary" onclick="handleBox3Action()">Acción Box 3</button>
    </div>
  `);
  
  addContentToBox4(`
    <div class="p-3">
      <h3>Box 4 - Nueva Funcionalidad</h3>
      <p>Aquí puedes agregar tu contenido personalizado</p>
      <button class="btn btn-secondary" onclick="handleBox4Action()">Acción Box 4</button>
    </div>
  `);
}

// Funciones de ejemplo para las acciones de los boxes
function handleBox3Action() {
  alert('Acción ejecutada en Box 3');
}

function handleBox4Action() {
  alert('Acción ejecutada en Box 4');
}

// Función para configurar el scroll master unificado
function setupScrollSynchronization() {
  // En la nueva estructura, solo hay UN contenedor con scroll vertical
  const masterScrollContainer = document.getElementById('masterScrollContainer');
  
  if (!masterScrollContainer) {
    return;
  }

  // El scroll vertical ya es naturalmente sincronizado porque todas las secciones
  // están en el mismo contenedor
  
  // Ahora configuramos la sincronización horizontal por sección
  setupHorizontalScrollSynchronization();
}

// ===== FUNCIÓN DE LIMPIEZA INTELIGENTE GAL =====

// Función para limpiar la sección GAL de imágenes que no pertenecen
function handleGalCleanup() {
  console.log('=== INICIANDO LIMPIEZA INTELIGENTE GAL ===');
  
  // Obtener SOLO los Item Codes que están visibles según filtros
  const visibleItemCodes = getVisibleItemCodes();
  const visibleItemCodeNames = visibleItemCodes.map(item => item.Name || item['Item Code']);
  console.log('Item Codes visibles por filtro:', visibleItemCodeNames.length);
  
  // Obtener todas las celdas de la sección GAL que tienen imágenes
  const allGalCells = document.querySelectorAll('[data-section="gallery"].image-cell');
  
  // Filtrar solo las celdas que pertenecen a Item Codes visibles
  const visibleGalCells = Array.from(allGalCells).filter(cell => {
    const itemCode = cell.getAttribute('data-item-code');
    return visibleItemCodeNames.includes(itemCode);
  });
  
  console.log('Celdas GAL totales:', allGalCells.length);
  console.log('Celdas GAL visibles (filtradas):', visibleGalCells.length);
  
  const imagesToRemove = [];
  let totalImages = 0;
  
  visibleGalCells.forEach(cell => {
    const imageThumbnail = cell.querySelector('.image-thumbnail');
    
    // Solo procesar celdas que tienen imagen real (no placeholder)
    if (imageThumbnail && !imageThumbnail.src.includes('data:image/svg+xml')) {
      totalImages++;
      
      // Priorizar data-filename, luego alt como fallback
      const imageName = imageThumbnail.getAttribute('data-filename') || imageThumbnail.alt;
      const cellItemCode = cell.getAttribute('data-item-code');
      const rowIndex = parseInt(cell.getAttribute('data-row-index'));
      const colIndex = parseInt(cell.getAttribute('data-col-index'));
      
      // Extraer Item Code de la imagen
      const imageItemCode = extractItemCodeFromImageName(imageName);
      
      // Si el Item Code de la imagen NO coincide con el Item Code de la celda
      if (imageItemCode !== cellItemCode) {
        imagesToRemove.push({
          cell: cell,
          imageName: imageName,
          cellItemCode: cellItemCode,
          imageItemCode: imageItemCode,
          rowIndex: rowIndex,
          colIndex: colIndex
        });
      }
    }
  });
  
  if (imagesToRemove.length === 0) {
    console.log('GAL está limpio, no hay imágenes fuera de lugar.');
    return;
  }
  
  // PASO 1: ELIMINAR TODAS las imágenes marcadas de una vez (sin recorrimiento individual)
  imagesToRemove.forEach(imageInfo => {
    // Solo quitar la imagen, SIN hacer recorrimiento todavía
    imageInfo.cell.innerHTML = generateEmptyImageCell();
  });
  
  // PASO 2: DESPUÉS de eliminar todas, hacer recorrimiento completo de TODAS las filas afectadas
  const affectedRows = [...new Set(imagesToRemove.map(img => img.rowIndex))];
  
  affectedRows.forEach(rowIndex => {
    compactGalleryRow(rowIndex);
  });
  
  console.log(`=== LIMPIEZA COMPLETADA: ${imagesToRemove.length} imágenes eliminadas ===`);
}

// Función auxiliar para compactar una fila completa de GAL
function compactGalleryRow(rowIndex) {
  const galleryCells = document.querySelectorAll(`[data-section="gallery"][data-row-index="${rowIndex}"]`);
  const images = [];
  
  // Recopilar todas las imágenes existentes
  galleryCells.forEach(cell => {
    const imageThumbnail = cell.querySelector('.image-thumbnail');
    if (imageThumbnail && !imageThumbnail.src.includes('data:image/svg+xml')) {
      images.push({
        src: imageThumbnail.src,
        alt: imageThumbnail.alt
      });
    }
    // Limpiar la celda
    cell.innerHTML = generateEmptyImageCell();
  });
  
  // Redistribuir las imágenes desde la izquierda
  images.forEach((image, index) => {
    if (index < galleryCells.length) {
      const cell = galleryCells[index];
      cell.innerHTML = generateImageCell(image.alt, cell.getAttribute('data-item-code'));
    }
  });
  
  // Actualizar indicadores de múltiples imágenes después de compactar
  updateMultipleImagesIndicators();
}

function setupHorizontalScrollSynchronization() {
  // NUEVA SINCRONIZACIÓN: headers scrollable-headers con contenido horizontal-scrollable
  const sections = ['cov', 'gallery', 'rest'];
  
  sections.forEach(sectionName => {
    const contentContainer = document.querySelector(`.horizontal-scrollable[data-section="${sectionName}"]`);
    const headerContainer = document.querySelector(`.scrollable-headers[data-section="${sectionName}"]`);
    
    if (contentContainer && headerContainer) {
      // Cuando el contenido hace scroll horizontal, mover el header
      contentContainer.addEventListener('scroll', () => {
        headerContainer.scrollLeft = contentContainer.scrollLeft;
      });
      
      // Cuando el header hace scroll horizontal, mover el contenido  
      headerContainer.addEventListener('scroll', () => {
        contentContainer.scrollLeft = headerContainer.scrollLeft;
      });
    }
  });
}

// Funciones para vista de aprobación
function applyApprovalColors(treeContainer) {
  console.log('Aplicando vista de aprobación...');
  
  if (!currentWorkingData || currentWorkingData.length === 0) {
    console.log('No hay datos disponibles para evaluar aprobación');
    return;
  }
  
  // Debug: verificar si existe la columna Vis_color
  const sampleItem = currentWorkingData.find(item => item['Vis_color'] !== undefined);
  if (sampleItem) {
    console.log('Columna Vis_color encontrada. Ejemplo:', sampleItem['Vis_color']);
  } else {
    console.log('Columna Vis_color NO encontrada en los datos');
    console.log('Columnas disponibles:', Object.keys(currentWorkingData[0] || {}));
  }
  
  // Debug: verificar si existe la columna filtro_color
  const sampleFilterItem = currentWorkingData.find(item => item['filtro_color'] !== undefined);
  if (sampleFilterItem) {
    console.log('Columna filtro_color encontrada. Ejemplo:', sampleFilterItem['filtro_color']);
  } else {
    console.log('Columna filtro_color NO encontrada en los datos');
  }
  
  // OPTIMIZACIÓN: Crear un mapa de datos para acceso rápido
  const dataMap = new Map();
  currentWorkingData.forEach(item => {
    if (item.NamePath) {
      dataMap.set(item.NamePath, item);
    }
  });
  
  // OPTIMIZACIÓN: Obtener todos los elementos de una vez con selector eficiente
  const allLiElements = treeContainer.querySelectorAll('.category-tree-li-content[data-path]');
  console.log(`Evaluando ${allLiElements.length} elementos del árbol con optimización`);
  
  // OPTIMIZACIÓN: Procesar en chunks para no bloquear la UI
  const CHUNK_SIZE = 50; // Procesar 50 elementos por vez
  let currentIndex = 0;
  
  function processChunk() {
    const endIndex = Math.min(currentIndex + CHUNK_SIZE, allLiElements.length);
    
    for (let i = currentIndex; i < endIndex; i++) {
      const content = allLiElements[i];
      const label = content.querySelector('.category-tree-label');
      if (!label) continue;
      
      const dataPath = label.getAttribute('data-path');
      if (!dataPath) continue;
      
      // OPTIMIZACIÓN: Usar el mapa para acceso O(1)
      const dataItem = dataMap.get(dataPath);
      if (!dataItem) continue;
      
      // Aplicar coloración según el valor directo de Vis_color
      const approvalStatus = evaluateApprovalStatus(dataItem);
      
      // OPTIMIZACIÓN: Usar classList de manera más eficiente
      content.classList.add('approval-mode');
      if (approvalStatus === 'green') {
        content.classList.remove('approval-orange');
        content.classList.add('approval-green');
      } else {
        content.classList.remove('approval-green');
        content.classList.add('approval-orange');
      }
    }
    
    currentIndex = endIndex;
    
    // Si hay más elementos, continuar en el siguiente frame
    if (currentIndex < allLiElements.length) {
      requestAnimationFrame(processChunk);
    } else {
      console.log('Vista de aprobación aplicada completamente');
    }
  }
  
  // Iniciar el procesamiento
  requestAnimationFrame(processChunk);
}

function evaluateApprovalStatus(dataItem) {
  // Nueva lógica simple: solo leer el valor directo de Vis_color
  const visColor = dataItem['Vis_color'];
  return (visColor === 1 || visColor === '1') ? 'green' : 'orange';
}

function removeApprovalColors(treeContainer) {
  console.log('Removiendo vista de aprobación...');
  
  // OPTIMIZACIÓN: Usar selector más específico y procesar en batch
  const allElements = treeContainer.querySelectorAll('.category-tree-li-content.approval-mode');
  
  // OPTIMIZACIÓN: Procesar en chunks para no bloquear la UI
  const CHUNK_SIZE = 100; // Remover es más rápido, podemos usar chunks más grandes
  let currentIndex = 0;
  
  function processRemovalChunk() {
    const endIndex = Math.min(currentIndex + CHUNK_SIZE, allElements.length);
    
    for (let i = currentIndex; i < endIndex; i++) {
      const element = allElements[i];
      // OPTIMIZACIÓN: Remover todas las clases de una vez
      element.classList.remove('approval-mode', 'approval-green', 'approval-orange');
    }
    
    currentIndex = endIndex;
    
    // Si hay más elementos, continuar en el siguiente frame
    if (currentIndex < allElements.length) {
      requestAnimationFrame(processRemovalChunk);
    } else {
      console.log('Vista de aprobación removida completamente');
    }
  }
  
  // Iniciar el procesamiento
  requestAnimationFrame(processRemovalChunk);
}

// Función para mostrar todos los elementos (remover filtros)
function showAllElements(treeContainer) {
  if (!treeContainer) return;
  
  console.log('Restaurando visibilidad de todos los elementos...');
  
  // Restaurar todos los elementos li que pudieron haber sido ocultados
  const allLiElements = treeContainer.querySelectorAll('.category-tree-li');
  allLiElements.forEach(liElement => {
    liElement.style.display = '';
  });
  
  // También restaurar los elementos content por si acaso
  const allContentElements = treeContainer.querySelectorAll('.category-tree-li-content');
  allContentElements.forEach(contentElement => {
    contentElement.style.display = '';
  });
  
  console.log(`Restaurados ${allLiElements.length} elementos li y ${allContentElements.length} elementos content`);
}

// Función para aplicar colores de aprobación al grid (Item Codes)
function applyApprovalColorsToGrid() {
  if (!currentWorkingData || currentWorkingData.length === 0) {
    return;
  }

  // Crear mapa de datos para acceso rápido por NamePath
  const dataMap = new Map();
  currentWorkingData.forEach(item => {
    if (item.NamePath) {
      dataMap.set(item.NamePath, item);
    }
  });

  // Aplicar clase approval-view-active al contenedor del grid también
  const gridContainer = document.querySelector('.image-grid-container');
  if (gridContainer) {
    gridContainer.classList.add('approval-view-active');
  }

  // Buscar todos los Item Code cells en el grid
  const itemCodeCells = document.querySelectorAll('.item-code-cell[data-name-path]');
  
  itemCodeCells.forEach((cell, index) => {
    const itemCodeName = cell.getAttribute('data-item-code');
    
    // Buscar por Name en lugar de NamePath (ya que NamePath está vacío)
    const dataItem = Array.from(dataMap.values()).find(item => item.Name === itemCodeName);
    
    if (!dataItem) {
      return;
    }

    // Evaluar el status de aprobación igual que en el árbol
    const approvalStatus = evaluateApprovalStatus(dataItem);
    
    // Aplicar las clases CSS
    cell.classList.add('approval-mode');
    cell.classList.remove('approval-green', 'approval-orange');
    
    if (approvalStatus === 'green') {
      cell.classList.add('approval-green');
    } else {
      cell.classList.add('approval-orange');
    }
  });
}

// Función para remover colores de aprobación del grid
function removeApprovalColorsFromGrid() {
  // Remover clase del contenedor del grid
  const gridContainer = document.querySelector('.image-grid-container');
  if (gridContainer) {
    gridContainer.classList.remove('approval-view-active', 'approval-filtered-active');
  }
  
  const itemCodeCells = document.querySelectorAll('.item-code-cell.approval-mode');
  
  itemCodeCells.forEach(cell => {
    cell.classList.remove('approval-mode', 'approval-green', 'approval-orange');
  });
}

// Función para aplicar filtro + colores basado en filtro_color
function applyFilterAndColors(treeContainer) {
  if (!treeContainer || !currentWorkingData) return;
  
  console.log('Aplicando filtro y colores de aprobación...');
  console.log('Total datos disponibles:', currentWorkingData.length);
  
  // Mostrar algunos ejemplos de datos
  console.log('Ejemplos de datos:');
  currentWorkingData.slice(0, 3).forEach(item => {
    console.log(`- ${item.NamePath}: filtro_color=${item['filtro_color']}, vis_color=${item['Vis_color']}`);
  });
  
  // Crear Map para acceso rápido a los datos (igual que applyApprovalColors)
  const dataMap = new Map();
  console.log('Creando dataMap...');
  currentWorkingData.forEach((item, index) => {
    if (item.NamePath) {
      dataMap.set(item.NamePath, item);
      // Debug para los primeros 10 elementos
      if (index < 10) {
        console.log(`DataMap[${index}]: "${item.NamePath}" -> filtro_color=${item['filtro_color']}, vis_color=${item['Vis_color']}`);
      }
    }
  });
  
  console.log('DataMap creado con', dataMap.size, 'entradas');
  
  // Usar el mismo selector que applyApprovalColors
  const allElements = treeContainer.querySelectorAll('.category-tree-li-content[data-path]');
  console.log('Total elementos encontrados:', allElements.length);
  
  // Debug: mostrar los primeros 10 paths de elementos DOM
  console.log('Primeros 10 paths de elementos DOM:');
  for (let i = 0; i < Math.min(10, allElements.length); i++) {
    const elementPath = allElements[i].getAttribute('data-path');
    console.log(`  DOM[${i}]: "${elementPath}"`);
  }
  let currentIndex = 0;
  const chunkSize = 50;
  let hiddenCount = 0;
  let shownCount = 0;
  
  function processFilterChunk() {
    const endIndex = Math.min(currentIndex + chunkSize, allElements.length);
    
    for (let i = currentIndex; i < endIndex; i++) {
      const element = allElements[i];
      const elementPath = element.getAttribute('data-path');
      const dataItem = dataMap.get(elementPath);
      
      if (dataItem) {
        // Convertir a números para asegurar comparación correcta
        const filtroColorRaw = dataItem['filtro_color'];
        const visColorRaw = dataItem['Vis_color'];
        const filtroColor = filtroColorRaw === "" || filtroColorRaw === null || filtroColorRaw === undefined ? 0 : parseInt(filtroColorRaw);
        const visColor = visColorRaw === "" || visColorRaw === null || visColorRaw === undefined ? 0 : parseInt(visColorRaw);
        
        // Debug detallado solo para los primeros 10 elementos
        if (i < 10) {
          console.log(`Elemento: ${elementPath}`);
          console.log(`  - filtro_color raw: "${filtroColorRaw}" (tipo: ${typeof filtroColorRaw})`);
          console.log(`  - filtro_color parsed: ${filtroColor} (tipo: ${typeof filtroColor})`);
          console.log(`  - vis_color raw: "${visColorRaw}" (tipo: ${typeof visColorRaw})`);
          console.log(`  - vis_color parsed: ${visColor} (tipo: ${typeof visColor})`);
        }
        
        // Aplicar filtro basado en filtro_color
        if (filtroColor === 1) {
          // Ocultar elemento (ocultar el li padre)
          const liElement = element.closest('.category-tree-li');
          if (liElement) {
            liElement.style.display = 'none';
          }
          hiddenCount++;
          if (i < 10) console.log(`  - ACCIÓN: Ocultar (filtro_color === 1)`);
        } else if (filtroColor === 0) {
          // Mostrar elemento y aplicar color basado en vis_color
          const liElement = element.closest('.category-tree-li');
          if (liElement) {
            liElement.style.display = '';
          }
          shownCount++;
          if (i < 10) console.log(`  - ACCIÓN: Mostrar (filtro_color === 0)`);
          
          // Aplicar colores de aprobación (igual que applyApprovalColors)
          element.classList.add('approval-mode');
          element.classList.remove('approval-green', 'approval-orange');
          if (visColor === 1) {
            element.classList.add('approval-green');
            if (i < 10) console.log(`  - COLOR: Verde (vis_color === 1)`);
          } else if (visColor === 0) {
            element.classList.add('approval-orange');
            if (i < 10) console.log(`  - COLOR: Naranja (vis_color === 0)`);
          }
        } else {
          // Si filtro_color no es 0 ni 1, ocultar por defecto
          const liElement = element.closest('.category-tree-li');
          if (liElement) {
            liElement.style.display = 'none';
          }
          hiddenCount++;
          if (i < 10) console.log(`  - ACCIÓN: Ocultar (filtro_color no es 0 ni 1, valor: ${filtroColor})`);
        }
      } else {
        // Si no hay datos, ocultar el elemento
        const liElement = element.closest('.category-tree-li');
        if (liElement) {
          liElement.style.display = 'none';
        }
        hiddenCount++;
        if (i < 10) console.log(`Elemento sin datos: ${elementPath} - OCULTAR`);
      }
    }
    
    currentIndex = endIndex;
    
    // Si hay más elementos, continuar en el siguiente frame
    if (currentIndex < allElements.length) {
      requestAnimationFrame(processFilterChunk);
    } else {
      console.log(`Filtro aplicado: ${shownCount} elementos mostrados, ${hiddenCount} elementos ocultos`);
    }
  }
  
  // Iniciar el procesamiento
  requestAnimationFrame(processFilterChunk);
}

// Función para aplicar filtro de comentarios (solo filtro, sin colores)
function applyCommentsFilter(treeContainer) {
  if (!treeContainer || !currentWorkingData) return;
  
  console.log('Aplicando filtro de comentarios...');
  console.log('Total datos disponibles:', currentWorkingData.length);
  
  // Mostrar algunos ejemplos de datos
  console.log('Ejemplos de datos:');
  currentWorkingData.slice(0, 3).forEach(item => {
    console.log(`- ${item.NamePath}: filtro_comment=${item['filtro_comment']}`);
  });
  
  // Crear Map para acceso rápido a los datos
  const dataMap = new Map();
  console.log('Creando dataMap...');
  currentWorkingData.forEach((item, index) => {
    if (item.NamePath) {
      dataMap.set(item.NamePath, item);
      // Debug para los primeros 10 elementos
      if (index < 10) {
        console.log(`DataMap[${index}]: "${item.NamePath}" -> filtro_comment=${item['filtro_comment']}`);
      }
    }
  });
  
  console.log('DataMap creado con', dataMap.size, 'entradas');
  
  // Usar el mismo selector que applyFilterAndColors
  const allElements = treeContainer.querySelectorAll('.category-tree-li-content[data-path]');
  console.log('Total elementos encontrados:', allElements.length);
  
  // Debug: mostrar los primeros 10 paths de elementos DOM
  console.log('Primeros 10 paths de elementos DOM:');
  for (let i = 0; i < Math.min(10, allElements.length); i++) {
    const elementPath = allElements[i].getAttribute('data-path');
    console.log(`  DOM[${i}]: "${elementPath}"`);
  }
  
  let currentIndex = 0;
  const chunkSize = 50;
  let hiddenCount = 0;
  let shownCount = 0;
  
  function processCommentsFilterChunk() {
    const endIndex = Math.min(currentIndex + chunkSize, allElements.length);
    
    for (let i = currentIndex; i < endIndex; i++) {
      const element = allElements[i];
      const elementPath = element.getAttribute('data-path');
      const dataItem = dataMap.get(elementPath);
      
      if (dataItem) {
        // Convertir a número para asegurar comparación correcta
        const filtroCommentRaw = dataItem['filtro_comment'];
        const filtroComment = filtroCommentRaw === "" || filtroCommentRaw === null || filtroCommentRaw === undefined ? 0 : parseInt(filtroCommentRaw);
        
        // Debug detallado solo para los primeros 10 elementos
        if (i < 10) {
          console.log(`Elemento: ${elementPath}`);
          console.log(`  - filtro_comment raw: "${filtroCommentRaw}" (tipo: ${typeof filtroCommentRaw})`);
          console.log(`  - filtro_comment parsed: ${filtroComment} (tipo: ${typeof filtroComment})`);
        }
        
        // Aplicar filtro basado en filtro_comment
        // 0 = visible, 1 = oculto
        if (filtroComment === 1) {
          // Ocultar elemento
          const liElement = element.closest('.category-tree-li');
          if (liElement) {
            liElement.style.display = 'none';
          }
          hiddenCount++;
          if (i < 10) console.log(`  - ACCIÓN: Ocultar (filtro_comment === 1)`);
        } else {
          // Mostrar elemento (filtro_comment === 0 o cualquier otro valor)
          const liElement = element.closest('.category-tree-li');
          if (liElement) {
            liElement.style.display = '';
          }
          shownCount++;
          if (i < 10) console.log(`  - ACCIÓN: Mostrar (filtro_comment === 0)`);
        }
      } else {
        // Si no hay datos, mostrar el elemento (comportamiento por defecto)
        const liElement = element.closest('.category-tree-li');
        if (liElement) {
          liElement.style.display = '';
        }
        shownCount++;
        if (i < 10) console.log(`Elemento sin datos: ${elementPath} - MOSTRAR`);
      }
    }
    
    currentIndex = endIndex;
    
    // Si hay más elementos, continuar en el siguiente frame
    if (currentIndex < allElements.length) {
      requestAnimationFrame(processCommentsFilterChunk);
    } else {
      console.log(`Filtro de comentarios aplicado: ${shownCount} elementos mostrados, ${hiddenCount} elementos ocultos`);
    }
  }
  
  // Iniciar el procesamiento
  requestAnimationFrame(processCommentsFilterChunk);
}

// Inicializar contenido de ejemplo al cargar la página
document.addEventListener('DOMContentLoaded', function() {
  // Intentar cargar datos desde localStorage al iniciar
  loadFromLocalStorage();
  
  // Configurar sincronización de scroll después de que se carge el contenido
  setTimeout(() => {
    setupScrollSynchronization();
  }, 1000);
  
  // Opcionalmente puedes agregar contenido de ejemplo:
  // addSampleContent();
});

// ================================
// SISTEMA DE GALERÍAS - BOX 3
// ================================

// Función para inicializar el sistema de galerías
function initializeGallerySystem() {
  console.log('🔄 Inicializando sistema de galerías...');
  
  const box3Content = document.getElementById('box3-content');
  if (!box3Content) {
    console.error('❌ No se encontró box3-content para inicializar galerías');
    return;
  }

  // Limpiar contenido existente
  box3Content.innerHTML = '';

  // Crear header sticky (igual que el árbol)
  const header = document.createElement('div');
  header.className = 'category-tree-header';
  box3Content.appendChild(header);

  // Crear el contenedor con recuadro que incluye galería y búsqueda
  const galleryContainer = document.createElement('div');
  galleryContainer.className = 'approval-toggle-container';
  galleryContainer.style.marginBottom = '10px';
  galleryContainer.innerHTML = `
    <div class="gallery-row">
      <select class="form-select gallery-select" id="gallerySelect">
        <option value="">Cargando galerías...</option>
      </select>
    </div>
    <div class="search-row">
      <input type="text" class="search-input" id="imageSearchInput" placeholder="Buscar imágenes...">
      <button class="search-button" id="imageSearchButton">Buscar</button>
    </div>
  `;
  header.appendChild(galleryContainer);

  // Contenedor para el grid (hace scroll, igual que category-tree-list)
  const galleryList = document.createElement('div');
  galleryList.className = 'category-tree-list'; // Usar la misma clase que funciona
  galleryList.id = 'galleryGridContainer';
  box3Content.appendChild(galleryList);

  // Grid de imágenes dentro del contenedor con scroll
  const galleryGrid = document.createElement('div');
  galleryGrid.className = 'gallery-grid';
  galleryGrid.id = 'galleryGrid';
  galleryGrid.innerHTML = ``;
  galleryList.appendChild(galleryGrid);

  // Si ya hay datos de galerías cargados, poblar el dropdown
  if (currentAssetGroups && currentAssetGroups.length > 0) {
    console.log('📊 Datos de galerías ya disponibles, poblando dropdown inmediatamente...');
    populateGalleryDropdown(currentAssetGroups);
  } else {
    console.log('⏳ Datos de galerías no disponibles aún, se poblarán cuando se carguen');
  }

  // Event listener para el dropdown
  const gallerySelect = document.getElementById('gallerySelect');
  if (gallerySelect) {
    gallerySelect.addEventListener('change', function() {
      const selectedGallery = this.value;
      if (selectedGallery) {
        // Limpiar búsqueda cuando se selecciona una galería
        const searchInput = document.getElementById('imageSearchInput');
        if (searchInput) searchInput.value = '';
        
        console.log('🎯 Galería seleccionada:', selectedGallery);
        loadGalleryImages(selectedGallery);
      } else {
        clearGalleryGrid();
      }
    });
  }

  // Event listeners para la búsqueda
  const searchInput = document.getElementById('imageSearchInput');
  const searchButton = document.getElementById('imageSearchButton');
  
  if (searchButton) {
    searchButton.addEventListener('click', performImageSearchNew);
  }
  
  if (searchInput) {
    searchInput.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        performImageSearchNew();
      }
    });
  }
  
  console.log('✅ Sistema de galerías inicializado correctamente');
}

// Función para realizar búsqueda de imágenes ACTUALIZADA
function performImageSearchNew() {
  const searchInput = document.getElementById('imageSearchInput');
  const gallerySelect = document.getElementById('gallerySelect');
  
  if (!searchInput) {
    console.log('⚠️ No se encontró searchInput, inicializando Box 3...');
    initializeGallerySystem();
    return;
  }
  
  const searchTerm = searchInput.value.trim();
  
  if (!searchTerm) {
    clearGalleryGrid();
    return;
  }
  
  // Limpiar selección de galería cuando se busca
  if (gallerySelect) {
    gallerySelect.value = '';
  }

  console.log('🔍 Búsqueda de imágenes por Item Code:', searchTerm);
  
  // Array para almacenar todos los resultados
  let allResults = [];
  let uniqueResults = []; // Declarar aquí para que esté disponible siempre
  
  // BUSCAR EN DATOS COMPLETOS: window.allItemGroupsData (datos procesados con campos de imagen)
  if (window.allItemGroupsData && window.allItemGroupsData.length > 0) {
    console.log('📊 Buscando Item Codes en', window.allItemGroupsData.length, 'registros completos...');
    
    // Filtrar Item Codes que contengan el término de búsqueda en el campo Name
    const matchingItemCodes = window.allItemGroupsData.filter(item => {
      const itemName = item.Name || '';
      return itemName.toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    console.log('🎯 Encontrados', matchingItemCodes.length, 'Item Codes que coinciden');
    
    // Extraer imágenes usando formato Attribute-Value
    matchingItemCodes.forEach(itemCode => {
      const itemName = itemCode.Name || '';
      const itemId = itemCode.ID || itemCode.Id;
      
      // Buscar TODAS las filas con este ID para obtener todos los atributos
      const allRowsForThisItem = window.allItemGroupsData.filter(row => row.ID === itemId || row.Id === itemId);
      
      // Buscar filas de imagen específicamente
      const imageRows = allRowsForThisItem.filter(row => {
        const attr = (row.Attribute || '').toLowerCase();
        return attr === 'wa_vis_cover' || attr === 'wa_vis_gallery' || attr === 'wa_vis_rest';
      });
      
      // Procesar cada fila de imagen encontrada
      imageRows.forEach(imageRow => {
        const attribute = imageRow.Attribute || '';
        const imageValue = imageRow.value || '';
        
        if (imageValue && imageValue.trim()) {
          // Dividir por comas y procesar cada imagen
          const images = imageValue.split(',').map(img => img.trim()).filter(img => img);
          
          images.forEach(imageName => {
            let imageType = 'Unknown';
            let source = 'ItemCode';
            
            if (attribute === 'WA_VIS_Cover') {
              imageType = 'Cover';
              source = 'ItemCodeCover';
            } else if (attribute === 'WA_VIS_Gallery') {
              imageType = 'Gallery';
              source = 'ItemCodeGallery';
            } else if (attribute === 'WA_VIS_Rest') {
              imageType = 'Rest';
              source = 'ItemCodeRest';
            }
            
            allResults.push({
              Name: imageName,
              Source: source,
              ObjectType: 'Image',
              ItemCodeName: itemName,
              ItemCodeId: itemId,
              ImageType: imageType,
              Attribute: attribute
            });
          });
        }
      });
    });
    
    console.log('✨ Extraídas', allResults.length, 'imágenes de los Item Codes encontrados (con duplicados)');
    
    // DEDUPLICAR resultados por nombre de imagen
    const seenImages = new Set();
    
    allResults.forEach(result => {
      if (!seenImages.has(result.Name)) {
        seenImages.add(result.Name);
        uniqueResults.push(result);
      }
    });
    
    console.log('🎯 Después de deduplicar:', uniqueResults.length, 'imágenes únicas');
  } else {
    console.log('⚠️ No hay datos de window.allItemGroupsData cargados');
    uniqueResults = []; // Asegurar que uniqueResults esté definido
  }
  
  // Mostrar resultados únicos
  showSearchResults(uniqueResults);
}// Función para realizar búsqueda de imágenes (ORIGINAL - mantener como backup)
function performImageSearch() {
  const searchInput = document.getElementById('imageSearchInput');
  const gallerySelect = document.getElementById('gallerySelect');
  
  if (!searchInput) return;
  
  const searchTerm = searchInput.value.trim();
  
  if (!searchTerm) {
    clearGalleryGrid();
    return;
  }
  
  // Limpiar selección de galería cuando se busca
  if (gallerySelect) {
    gallerySelect.value = '';
  }
  
  console.log('🔍 Iniciando búsqueda expandida para:', searchTerm);
  
  // Array para almacenar todos los resultados (Assets + Library)
  let allResults = [];
  
  // 1. BÚSQUEDA EN ASSETS (funcionalidad original)
  if (currentAssetComments && currentAssetComments.length > 0) {
    console.log('🔍 Buscando en Assets:', currentAssetComments.length, 'registros');
    
    const assetResults = currentAssetComments.filter(asset => {
      const imageName = asset.Name || '';
      return imageName.toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    console.log('📸 Resultados en Assets:', assetResults.length, 'imágenes encontradas');
    allResults = [...assetResults];
  } else {
    console.log('❌ No hay datos de Assets cargados para buscar');
  }
  
  // 2. NUEVA BÚSQUEDA EN LIBRARY
  if (allLibraryData && allLibraryData.length > 0) {
    console.log('🔍 Buscando en Library:', allLibraryData.length, 'registros');
    
    const libraryMatches = allLibraryData.filter(item => {
      const itemName = item.Name || '';
      return itemName.toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    console.log(' Elementos encontrados en Library:', libraryMatches.length);
    
    // Extraer imágenes de las columnas de Library
    const imageColumns = [
      // Cover Images (5 columnas)
      'WA_Cover_Image_01', 'WA_Cover_Image_02', 'WA_Cover_Image_03', 'WA_Cover_Image_04', 'WA_Cover_Image_05',
      // Gallery Images (25 columnas)
      'WA_Gallery_01', 'WA_Gallery_02', 'WA_Gallery_03', 'WA_Gallery_04', 'WA_Gallery_05',
      'WA_Gallery_06', 'WA_Gallery_07', 'WA_Gallery_08', 'WA_Gallery_09', 'WA_Gallery_10',
      'WA_Gallery_11', 'WA_Gallery_12', 'WA_Gallery_13', 'WA_Gallery_14', 'WA_Gallery_15',
      'WA_Gallery_16', 'WA_Gallery_17', 'WA_Gallery_18', 'WA_Gallery_19', 'WA_Gallery_20',
      'WA_Gallery_21', 'WA_Gallery_22', 'WA_Gallery_23', 'WA_Gallery_24', 'WA_Gallery_25',
      // Rest Images (25 columnas)
      'WA_Rest_01', 'WA_Rest_02', 'WA_Rest_03', 'WA_Rest_04', 'WA_Rest_05',
      'WA_Rest_06', 'WA_Rest_07', 'WA_Rest_08', 'WA_Rest_09', 'WA_Rest_10',
      'WA_Rest_11', 'WA_Rest_12', 'WA_Rest_13', 'WA_Rest_14', 'WA_Rest_15',
      'WA_Rest_16', 'WA_Rest_17', 'WA_Rest_18', 'WA_Rest_19', 'WA_Rest_20',
      'WA_Rest_21', 'WA_Rest_22', 'WA_Rest_23', 'WA_Rest_24', 'WA_Rest_25'
    ];
    
    libraryMatches.forEach(item => {
      imageColumns.forEach(column => {
        const imageName = item[column];
        if (imageName && imageName.trim() !== '') {
          // Crear objeto similar al formato de Assets
          const libraryImageResult = {
            Name: imageName.trim(),
            ID: item.Id || item.ID,
            Source: 'Library',
            LibraryItem: item.Name,
            ObjectType: item['Object Type']
          };
          allResults.push(libraryImageResult);
        }
      });
    });
    
    console.log('🖼️ Imágenes extraídas de Library:', allResults.length - (currentAssetComments ? currentAssetComments.filter(asset => asset.Name.toLowerCase().includes(searchTerm.toLowerCase())).length : 0));
  } else {
    console.log('❌ No hay datos de Library cargados para buscar');
  }
  
  // 3. DEDUPLICACIÓN - Eliminar imágenes repetidas por nombre
  const uniqueResults = [];
  const seenImages = new Set();
  
  allResults.forEach(result => {
    const imageName = result.Name.toLowerCase();
    if (!seenImages.has(imageName)) {
      seenImages.add(imageName);
      uniqueResults.push(result);
    }
  });
  
  console.log('✨ Resultados finales despues de deduplicación:', uniqueResults.length, 'imágenes únicas');
  console.log('🔍 Búsqueda completada - Assets + Library con deduplicación');
  
  // Mostrar resultados
  showSearchResults(uniqueResults);
}

// Función para mostrar resultados de búsqueda
function showSearchResults(results) {
  let galleryGrid = document.getElementById('galleryGrid');
  
  // Si no existe galleryGrid, intentar crearlo
  if (!galleryGrid) {
    console.log('⚠️ galleryGrid no encontrado, verificando si Box 3 está inicializado...');
    
    // Verificar si existe el contenedor padre
    const box3Content = document.getElementById('box3-content');
    if (!box3Content) {
      console.error('❌ Box 3 no está disponible');
      return;
    }
    
    // Verificar si ya existe galleryGridContainer
    let galleryContainer = document.getElementById('galleryGridContainer');
    if (!galleryContainer) {
      console.log('🔧 Inicializando sistema de galerías...');
      initializeGallerySystem();
      galleryGrid = document.getElementById('galleryGrid');
    } else {
      galleryGrid = galleryContainer.querySelector('#galleryGrid');
    }
    
    if (!galleryGrid) {
      console.error('❌ No se pudo crear galleryGrid');
      return;
    }
  }
  
  if (results.length === 0) {
    galleryGrid.innerHTML = '<div class="gallery-placeholder">No se encontraron imágenes</div>';
    return;
  }
  
  // Convertir formato para usar la función existente de renderizado
  const formattedResults = results.map(asset => {
    const result = {
      Imagen: asset.Name
    };
    
    // Agregar información adicional según la fuente
    if (asset.Source === 'Library') {
      result.LibrarySource = true;
      result.LibraryItem = asset.LibraryItem;
      result.ObjectType = asset.ObjectType;
    } else if (asset.Source === 'DirectImage') {
      result.DirectImageSource = true;
      result.ObjectType = asset.ObjectType;
    } else if (asset.Source === 'ItemCodeMatch') {
      result.ItemCodeMatchSource = true;
      result.ObjectType = asset.ObjectType;
      result.Note = asset.Note;
    } else if (asset.Source === 'ItemCodeCached') {
      result.ItemCodeCachedSource = true;
      result.ItemCodeName = asset.ItemCodeName;
      result.ItemGroupId = asset.ItemGroupId;
      result.ObjectType = asset.ObjectType;
    } else if (asset.Source === 'TransformedData') {
      result.TransformedDataSource = true;
      result.ParentName = asset.ParentName;
      result.ObjectType = asset.ObjectType;
    }
    
    return result;
  });
  
  console.log('🎨 Renderizando', formattedResults.length, 'resultados de búsqueda ACTUALIZADOS');
  
  // Mostrar estadísticas detalladas de la búsqueda
  const sourceStats = {
    Assets: results.filter(r => !r.Source).length,
    DirectImage: results.filter(r => r.Source === 'DirectImage').length,
    ItemCodeMatch: results.filter(r => r.Source === 'ItemCodeMatch').length,
    ItemCodeCached: results.filter(r => r.Source === 'ItemCodeCached').length,
    TransformedData: results.filter(r => r.Source === 'TransformedData').length,
    Library: results.filter(r => r.Source === 'Library').length
  };
  
  console.log('📊 Estadísticas de fuentes:', sourceStats);
  
  renderGalleryGrid(formattedResults);
}

// Función para poblar el dropdown con las galerías
function populateGalleryDropdown(data) {
  const gallerySelect = document.getElementById('gallerySelect');
  if (!gallerySelect) {
    console.error('❌ No se encontró el elemento gallerySelect - el DOM puede no estar listo');
    // Intentar nuevamente en 500ms
    setTimeout(() => {
      populateGalleryDropdown(data);
    }, 500);
    return;
  }
  
  if (!data || data.length === 0) {
    console.warn('⚠️ No hay datos para poblar el dropdown de galerías');
    gallerySelect.innerHTML = '<option value="">Sin galerías disponibles</option>';
    return;
  }
  
  // Obtener galerías únicas - probando diferentes variaciones de nombre de columna
  const galleries = [];
  
  data.forEach((item, index) => {
    // Intentar diferentes formas de acceder a la columna Galeria
    const galleryName = item.Galeria || item.galeria || item.GALERIA || 
                       item['Galeria'] || item['"Galeria"'] || item.Gallery || 
                       item.gallery || item.GALLERY || '';
    
    if (galleryName && galleryName.trim() && !galleries.includes(galleryName.trim())) {
      galleries.push(galleryName.trim());
    }
  });
  
  // Limpiar opciones existentes (excepto la primera)
  gallerySelect.innerHTML = '<option value="">Galerías...</option>';
  
  if (galleries.length === 0) {
    console.warn('⚠️ No se encontraron galerías válidas en los datos');
    gallerySelect.innerHTML = '<option value="">Sin galerías válidas</option>';
    return;
  }
  
  // Agregar opciones
  galleries.forEach(gallery => {
    const option = document.createElement('option');
    option.value = gallery;
    option.textContent = gallery;
    gallerySelect.appendChild(option);
  });
}

// Función para cargar las imágenes de una galería específica
function loadGalleryImages(galleryName) {
  // Filtrar las imágenes que pertenecen a esta galería
  const galleryImages = currentAssetGroups.filter(item => {
    const itemGallery = item.Galeria || item.galeria || item.GALERIA || item['Galeria'] || '';
    const itemImage = item.Imagen || item.imagen || item.IMAGEN || item['Imagen'] || '';
    
    return itemGallery === galleryName && itemImage && itemImage.trim();
  });
  
  // Renderizar el grid de imágenes
  renderGalleryGrid(galleryImages);
}

// Función para renderizar el grid de imágenes
function renderGalleryGrid(images) {
  const galleryGrid = document.getElementById('galleryGrid');
  if (!galleryGrid) {
    console.error('❌ No se encontró el elemento galleryGrid');
    return;
  }
  
  if (images.length === 0) {
    galleryGrid.innerHTML = '<div class="gallery-placeholder">No hay imágenes en esta galería</div>';
    return;
  }
  
  // Crear el HTML del grid
  const gridHTML = images.map(item => {
    const imageName = item.Imagen || item.imagen || item.IMAGEN || item['Imagen'] || '';
    const imageUrl = `https://www.travers.com.mx/media/catalog/product/agility/img/${imageName}`;
    
    console.log('🖼️ Procesando imagen:', imageName);
    
    return `
      <div class="gallery-image-item" data-image-name="${imageName}">
        <div class="gallery-image-container">
          <img src="${imageUrl}" 
               alt="${imageName}"
               onerror="this.src='https://www.travers.com.mx/media/catalog/product/agility/img/prod_img_blank.jpg';"
               class="gallery-image">
        </div>
        <div class="gallery-image-name">${imageName}</div>
      </div>
    `;
  }).join('');
  
  galleryGrid.innerHTML = gridHTML;
  
  // Agregar event listeners para Shift+Click
  setupGalleryImageSelection();
  
  console.log('✅ Grid renderizado exitosamente');
}

// Función para configurar la selección de imágenes con Shift+Click y vista previa con Click
function setupGalleryImageSelection() {
  const galleryImages = document.querySelectorAll('.gallery-image-item');
  
  galleryImages.forEach(item => {
    item.addEventListener('click', function(event) {
      if (event.shiftKey) {
        // Shift+Click: Seleccionar como imagen de trabajo
        event.preventDefault();
        const imageName = this.getAttribute('data-image-name');
        loadImageAsWorkingImage(imageName);
      } else {
        // Click simple: Mostrar vista previa
        event.preventDefault();
        const imageName = this.getAttribute('data-image-name');
        const imageElement = this.querySelector('.gallery-image');
        if (imageElement) {
          const imageSrc = imageElement.src;
          console.log(`🖼️ Mostrando vista previa desde galería: ${imageName}`);
          openImagePreviewModal(imageName, imageSrc);
        }
      }
    });
  });
}

// Función para cargar una imagen como imagen de trabajo
function loadImageAsWorkingImage(imageName) {
  // Establecer la imagen de trabajo con datos de galería
  workingImage = {
    imageName: imageName,
    itemCode: 'GALERÍA', // Indicar que viene de galería
    section: 'gallery',
    originalPosition: { row: -1, col: -1 } // Posición especial para galería
  };
  
  console.log('Imagen cargada desde galería como imagen de trabajo:', workingImage);
  
  // Actualizar el placeholder visual
  updateWorkingImagePlaceholder();
  
  // Feedback visual en el grid de galería
  const galleryItems = document.querySelectorAll('.gallery-image-item');
  galleryItems.forEach(item => item.classList.remove('selected'));
  
  const selectedItem = document.querySelector(`[data-image-name="${imageName}"]`);
  if (selectedItem) {
    selectedItem.classList.add('selected');
  }
  
  // Mostrar mensaje de confirmación
  console.log('✅ Imagen lista para asignar. Usa Command+Click en el grid para colocarla.');
}

// Función para limpiar el grid
function clearGalleryGrid() {
  const galleryGrid = document.getElementById('galleryGrid');
  if (galleryGrid) {
    galleryGrid.innerHTML = '';
  }
}

// Función para toggle de vista limpia
function toggleCleanView() {
  console.log('🎯 toggleCleanView ejecutado');
  console.log('🔍 Estado antes - isCleanViewActive:', isCleanViewActive);
  
  // NUEVO: Guardar estado unificado antes de cambiar vista
  if (isCleanViewActive) {
    // Si estamos saliendo de vista limpia, guardar estado completo
    console.log('💾 Guardando estado completo al salir de vista de información...');
    saveUnifiedViewState();
  }
  
  // Compatibilidad: También guardar en sistema legacy
  saveInventoryViewState();
  
  isCleanViewActive = !isCleanViewActive;
  const toggleButton = document.getElementById('cleanViewToggle');
  
  console.log('🔍 Estado después - isCleanViewActive:', isCleanViewActive);
  console.log('🔍 ToggleButton encontrado:', !!toggleButton);
  
  if (isCleanViewActive) {
    // Activar vista limpia - mostrar vista de datos (tabla de inventario)
    console.log('🔄 Activando vista de datos...');
    clearAllBoxes();
    toggleButton.innerHTML = '<i class="fa-solid fa-eye" style="margin-right: 8px;"></i>Visualizador';
    toggleButton.className = 'btn btn-warning btn-compact'; // AMARILLO para "Visualizador"
    console.log('✅ Vista de datos activada - mostrando tabla de inventario');
  } else {
    // Restaurar vista normal - mostrar árbol/visualizador
    console.log('🔄 Restaurando vista normal...');
    restoreNormalView();
    toggleButton.innerHTML = '<i class="fa-solid fa-table-list" style="margin-right: 6px;"></i>Información';
    toggleButton.className = 'btn btn-secondary btn-compact'; // MORADO para "Información"
    console.log('✅ Vista normal restaurada - mostrando elementos del visualizador');
  }
}

// Función para limpiar todos los boxes
function clearAllBoxes() {
  console.log('🚀 clearAllBoxes iniciado');
  
  // Limpiar Box 1 (Árbol)
  const treeContainer = document.getElementById('tree');
  console.log('🔍 treeContainer encontrado:', !!treeContainer);
  if (treeContainer) {
    treeContainer.innerHTML = '<div class="empty-box-message">Box 1 - Árbol (Vacío)</div>';
  }
  
  // Limpiar Box 3 (Galerías)
  const box3Content = document.getElementById('box3-content');
  console.log('🔍 box3Content encontrado:', !!box3Content);
  if (box3Content) {
    box3Content.innerHTML = '<div class="empty-box-message">Box 3 - Galerías (Vacío)</div>';
  }
  
  // Crear tabla de inventario de imágenes en Box 4
  const box4Content = document.getElementById('box4-content');
  console.log('🔍 box4Content encontrado:', !!box4Content);
  if (box4Content) {
    console.log('🔍 DEBUG toggleCleanView - currentWorkingData length:', currentWorkingData ? currentWorkingData.length : 'null/undefined');
    console.log('🔍 DEBUG toggleCleanView - allLibraryData length:', allLibraryData ? allLibraryData.length : 'null/undefined');
    console.log('🔍 DEBUG toggleCleanView - fullItemGroupCache size:', itemGroupDataCache ? itemGroupDataCache.size : 'null/undefined');
    
    // NUEVO SISTEMA: Verificar si tenemos estado que preservar O filtros activos
    const hasActiveFilters = unifiedViewState.tables.analysts.activeElements.length > 0 ||
                            unifiedViewState.tables.designers.activeElements.length > 0 ||
                            Object.keys(unifiedViewState.tables.comments.filters || {}).length > 0;
    
    // También verificar inventoryViewState como fallback
    const hasInventoryFilters = inventoryViewState && inventoryViewState.activeFilters &&
                               Object.keys(inventoryViewState.activeFilters).length > 0;
    
    const hasStateToPreserve = unifiedViewState.preserveState || hasActiveFilters || hasInventoryFilters;
    const hasCommentData = (masterCommentData && masterCommentData.length > 0) || 
                          (commentedItemsData && commentedItemsData.length > 0);
    
    console.log('🔍 Estado de preservación:', {
      preserveState: unifiedViewState.preserveState,
      hasActiveFilters: hasActiveFilters,
      hasInventoryFilters: hasInventoryFilters,
      hasStateToPreserve: hasStateToPreserve,
      hasCommentData: hasCommentData,
      masterCommentDataLength: masterCommentData ? masterCommentData.length : 0,
      commentedItemsDataLength: commentedItemsData ? commentedItemsData.length : 0,
      unifiedFilters: unifiedViewState.tables.comments.filters,
      inventoryFilters: inventoryViewState ? inventoryViewState.activeFilters : null
    });
    
    if (hasStateToPreserve && hasCommentData) {
      console.log('🔄 Regenerando tabla de información con estado preservado...');
      
      // Usar el nuevo sistema para regenerar tabla con filtros
      setTimeout(() => {
        regenerateAllTablesWithState();
      }, 100);
      
      // Mostrar loading mientras se regenera
      box4Content.innerHTML = '<div class="loading-message"><i class="fa-solid fa-spinner fa-spin"></i> Restaurando tabla con filtros...</div>';
      
    } else {
      // SISTEMA LEGACY: Generar tabla desde caché o datos disponibles
      console.log('🔄 Generando tabla de información desde datos disponibles...');
      
      // PRIMERA OPCIÓN: Usar datos del caché si está disponible (datos transformados con comentarios)
      if (itemGroupDataCache && itemGroupDataCache.size > 0) {
        if (isPreProcessingComplete) {
          console.log('⚡ Generando tabla de inventario INSTANTÁNEA desde datos pre-procesados...');
        } else {
          console.log('🔄 Generando tabla de inventario desde caché (método legacy - puede tardar)...');
          console.log('⏳ Pre-procesamiento aún en curso - esperando finalización...');
          // Mostrar mensaje de carga mientras procesa
          box4Content.innerHTML = '<div class="loading-message"><i class="fa-solid fa-spinner fa-spin"></i> Finalizando optimización de datos...</div>';
          
          // Verificar periódicamente si el pre-procesamiento terminó
          const checkPreProcessing = setInterval(() => {
            if (isPreProcessingComplete) {
              clearInterval(checkPreProcessing);
              console.log('✅ Pre-procesamiento completado - generando tabla...');
              const inventoryHTML = generateImageInventoryTableFromCache();
              box4Content.innerHTML = inventoryHTML;
            
            // CRÍTICO: Configurar event listeners después de insertar HTML
            setTimeout(() => {
              setupInventoryClickListeners();
              setupAssignButtonListener();
              restoreInventoryViewState();
            }, 100);
          }
        }, 500);
        return; // Salir temprano para evitar ejecución duplicada
      }
      
      const inventoryHTML = generateImageInventoryTableFromCache();
      console.log('📊 Tabla de inventario generada desde caché, longitud HTML:', inventoryHTML.length);
      box4Content.innerHTML = inventoryHTML;
      
      // CRÍTICO: Configurar event listeners después de insertar HTML
      setupInventoryClickListeners();
      setupAssignButtonListener();
      
      // Restaurar estado después de generar la tabla con más tiempo
      setTimeout(() => {
        console.log('🔄 Restaurando estado después de generar tabla desde caché...');
        restoreInventoryViewState();
      }, 500); // Aumentar timing para asegurar renderizado completo
      
      } else {
        // SEGUNDA OPCIÓN: Usar currentWorkingData solo como fallback (datos del árbol, sin comentarios)
        if (window.allItemGroupsData && window.allItemGroupsData.length > 0) {
          console.log('🔄 Generando tabla de inventario desde currentWorkingData (fallback - datos del árbol)...');
          const inventoryHTML = generateImageInventoryTable();
          console.log('📊 Tabla de inventario generada, longitud HTML:', inventoryHTML.length);
          box4Content.innerHTML = inventoryHTML;
          // Restaurar estado después de generar la tabla con más tiempo
          setTimeout(() => {
            console.log('🔄 Restaurando estado después de generar tabla de fallback...');
            restoreInventoryViewState();
          }, 500); // Aumentar timing para asegurar renderizado completo
        } else {
          box4Content.innerHTML = '<div class="empty-box-message">Box 4 - Cargar Excel o usar "Optimizar" para ver inventario de imágenes</div>';
        }
      } // Cierre del else del SISTEMA LEGACY
    } // Cierre del if (box4Content)
    
    // SIEMPRE regenerar tablas de estadísticas cuando se activa vista de datos
    console.log('📊 Regenerando tablas de resumen para vista de datos...');
    setTimeout(() => {
      // Verificar si tenemos datos para generar estadísticas
      if (commentedItemsData && commentedItemsData.length > 0) {
        console.log('📊 Generando tablas de resumen desde commentedItemsData...');
        updateStatsTablesOnDataChange();
        
        // Aplicar filtro automático después de generar las tablas (solo si NO hay filtros previos)
        setTimeout(() => {
          if (!window.isInAutoFilter && !window.isApplyingStatsFilter) {
            // Verificar si realmente hay filtros activos guardados (no solo flags)
            const hasActiveTableFilters = inventoryViewState.activeFilters && 
                                         Object.keys(inventoryViewState.activeFilters).length > 0;
            
            const hasSavedDropdownFilters = inventoryViewState.dropdownFilters &&
                                          Object.values(inventoryViewState.dropdownFilters).some(val => val !== '');
            
            const hasRealActiveState = hasActiveTableFilters || hasSavedDropdownFilters;
            
            console.log('🔍 Debug filtro automático:', {
              hasActiveTableFilters,
              activeFilters: inventoryViewState.activeFilters,
              hasSavedDropdownFilters,
              dropdownFilters: inventoryViewState.dropdownFilters,
              hasRealActiveState
            });
            
            // ALWAYS apply automatic filter - ignore any saved filters
            console.log('✅ Aplicando filtro automático SIEMPRE - filtro predeterminado por rol');
            applyAutoFilterByUserRole();
          }
        }, 500);
        
      } else if (masterCommentData && masterCommentData.length > 0) {
        console.log('📊 Generando tablas de resumen desde masterCommentData...');
        // Forzar actualización de commentedItemsData desde masterCommentData
        initializeCommentedItemsData();
        setTimeout(() => {
          updateStatsTablesOnDataChange();
          
          // Aplicar filtro automático después de generar las tablas (solo si NO hay filtros previos)
          setTimeout(() => {
            if (!window.isInAutoFilter && !window.isApplyingStatsFilter) {
              // Verificar si realmente hay filtros activos guardados (no solo flags)
              const hasActiveTableFilters = inventoryViewState.activeFilters && 
                                           Object.keys(inventoryViewState.activeFilters).length > 0;
              
              const hasSavedDropdownFilters = inventoryViewState.dropdownFilters &&
                                            Object.values(inventoryViewState.dropdownFilters).some(val => val !== '');
              
              const hasRealActiveState = hasActiveTableFilters || hasSavedDropdownFilters;
              
              console.log('🔍 Debug filtro automático (path 2):', {
                hasActiveTableFilters,
                activeFilters: inventoryViewState.activeFilters,
                hasSavedDropdownFilters,
                dropdownFilters: inventoryViewState.dropdownFilters,
                hasRealActiveState
              });
              
              if (hasRealActiveState) {
                console.log('🚫 NO aplicando filtro automático - hay filtros reales guardados (regreso del visualizador)');
              } else {
                console.log('✅ Aplicando filtro automático - primera carga sin filtros previos');
                applyAutoFilterByUserRole();
              }
            }
          }, 500);
          
        }, 100);
      } else {
        console.log('⚠️ No hay datos de comentarios para generar tablas de estadísticas');
      }
    }, 200);
  }
}

// Función para restaurar la vista normal
function restoreNormalView() {
  // INMEDIATAMENTE: Limpiar Box 4 para mostrar estado de carga mientras se restaura
  const box4Content = document.getElementById('box4-content');
  if (box4Content) {
    box4Content.innerHTML = '<div class="loading-state">Cargando visualizador...</div>';
    console.log('🧹 Box 4 limpiado INMEDIATAMENTE en restoreNormalView');
  }
  
  // Restaurar el contenido de los boxes según el estado actual
  if (originalTreeData && originalTreeData.length > 0) {
    // Si hay datos cargados, regenerar el contenido
    
    // Restaurar Box 1 (Árbol) - USAR originalTreeData para árbol completo
    const treeContainer = document.getElementById('tree');
    if (treeContainer) {
      console.log(`🌳 RESTAURANDO ÁRBOL con ${originalTreeData.length} elementos`);
      renderAssetLibraryTree(originalTreeData, treeContainer);
      
      // Verificar que el árbol se renderizó correctamente
      setTimeout(() => {
        const renderedLabels = treeContainer.querySelectorAll('.category-tree-label[data-path]');
        console.log(`✅ ÁRBOL RENDERIZADO: ${renderedLabels.length} labels creados`);
        if (renderedLabels.length > 0) {
          const samplePaths = Array.from(renderedLabels).slice(0, 3).map(l => l.getAttribute('data-path'));
          console.log(`📋 MUESTRA DE PATHS en árbol:`, samplePaths);
        }
      }, 100);
    }
    
    // Restaurar Box 3 (Galerías)
    initializeGallerySystem();
    
    // Restaurar Box 4 (Grid principal) si hay un Item Group seleccionado
    if (currentItemGroup) {
      // Regenerar el grid de imágenes si hay un item group activo
      regenerateImageGrid();
    } else {
      // Si no hay item group seleccionado, mostrar mensaje
      const box4Content = document.getElementById('box4-content');
      if (box4Content) {
        box4Content.innerHTML = '<div class="empty-state">Selecciona un Item Group del árbol para ver el grid</div>';
      }
    }
    
    // NUEVO SISTEMA: Actualizar datos maestros y preservar estado
    console.log('🔄 Actualizando datos maestros y preservando estado...');
    
    // PASO 1: Actualizar datos maestros desde todas las fuentes
    updateMasterDataFromAllSources();
    
    // PASO 2: Regenerar todas las tablas con el estado preservado
    setTimeout(() => {
      if (unifiedViewState.preserveState) {
        console.log('🔄 Preservando estado - regenerando todas las tablas con filtros...');
        // IMPORTANTE: Solo regenerar tablas si estamos en vista de información
        if (isCleanViewActive) {
          regenerateAllTablesWithState();
        } else {
          // En visualizador, solo restaurar elementos activos sin regenerar tabla de comentarios
          restoreUnifiedViewState();
        }
        unifiedViewState.preserveState = false; // Reset flag
      } else {
        console.log('🔄 Regenerando tablas sin filtros específicos...');
        // IMPORTANTE: Solo regenerar tablas si estamos en vista de información
        if (isCleanViewActive) {
          regenerateAllTablesWithState();
        }
      }
    }, 250);
    
  } else {
    // Si no hay datos, mostrar mensajes de estado inicial
    const treeContainer = document.getElementById('tree');
    if (treeContainer) {
      treeContainer.innerHTML = '<div class="empty-state">Cargar Excel para ver el árbol de navegación</div>';
    }
    
    const box3Content = document.getElementById('box3-content');
    if (box3Content) {
      box3Content.innerHTML = '<div class="empty-state">Cargar Excel para ver las galerías</div>';
    }
    
    const box4Content = document.getElementById('box4-content');
    if (box4Content) {
      box4Content.innerHTML = '<div class="empty-state">Cargar Excel para ver el grid de imágenes</div>';
    }
  }
}

// Función para generar tabla de inventario de imágenes
function generateImageInventoryTable(dataOverride = null, showAllData = false, suppressStatsUpdate = false) {
  if (logFunctionCall('generateImageInventoryTable')) return '<div class="error">Bucle detectado</div>';
  
  const workingData = dataOverride || currentWorkingData;
  
  if (!workingData || workingData.length === 0) {
    return '<div class="empty-box-message">No hay datos para mostrar</div>';
  }

  // Solo filtrar por comentarios si showAllData es false
  let dataToShow = workingData;
  if (!showAllData) {
    // Contar cuántos tienen comentarios
    const withComments = workingData.filter(item => item['WA_VIS_Comment'] && item['WA_VIS_Comment'].trim() !== '');
    
    // Si no hay comentarios, mostrar mensaje específico
    if (withComments.length === 0) {
      return `<div class="empty-box-message">
        <h3>No hay elementos con comentarios</h3>
        <p>Se encontraron ${workingData.length} elementos en total, pero ninguno tiene comentarios en WA_VIS_Comment.</p>
        <p>Los datos parecen estar cargados correctamente desde Google Sheets.</p>
      </div>`;
    }
    dataToShow = withComments;
  } else {
    console.log(`📊 Mostrando TODOS los datos: ${workingData.length} elementos (sin filtrar por comentarios)`);
  }

  // Función para obtener el Item Group ID de una fila
  function getItemGroupId(row, dataSource = null) {
    // Usar dataSource si está disponible (datos transformados), sino usar allLibraryData
    const searchData = dataSource || allLibraryData;
    
    // CASO ESPECIAL: Para Images, usar directamente la columna Item Groups
    if (row['Object Type'] === 'Image') {
      const itemGroupId = row['Item Groups'] || '';
      return itemGroupId.toString();
    }
    
    // CASO ESPECIAL: Para Item Codes, usar getItemGroupIdFromData si no hay itemGroupId
    if (row['Object Type'] === 'Item Code') {
      const itemGroupFromData = getItemGroupIdFromData(row);
      if (itemGroupFromData) {
        return itemGroupFromData;
      }
    }
    
    // CASO 1: Si la fila ES un Item Group, usar su propio ID
    if (row['Object Type'] === 'Item Group') {
      return row['Id'] || '';
    }
    
    // CASO 2: Si es un Item Code, buscar el ID del Item Group padre
    if (!row.NamePath) {
      return '';
    }
    
    // Obtener el path del Item Group padre (remover último nivel que es el Item Code)
    const pathParts = row.NamePath.split('/');
    if (pathParts.length <= 1) return '';
    
    const itemGroupPath = pathParts.slice(0, -1).join('/');
    
    // BUSCAR PRIMERO en searchData (datos transformados si están disponibles)
    if (searchData && searchData.length > 0) {
      const itemGroup = searchData.find(item => 
        item['Object Type'] === 'Item Group' && item.NamePath === itemGroupPath
      );
      
      if (itemGroup && itemGroup.Id) {
        return itemGroup.Id;
      }
    }
    
    // Fallback: buscar en currentWorkingData
    const itemGroup = currentWorkingData.find(item => 
      item['Object Type'] === 'Item Group' && item.NamePath === itemGroupPath
    );
    
    if (itemGroup && itemGroup.Id) {
      return itemGroup.Id;
    }
    
    // Si no se encuentra, usar currentItemGroup como fallback
    // Esto debería funcionar en la mayoría de los casos ya que estamos viendo 
    // los Item Codes de un Item Group específico
    if (currentItemGroup && currentItemGroup.NamePath === itemGroupPath) {
      return currentItemGroup.Id || '';
    }
    
    return '';
  }

  // Columnas de imágenes a procesar
  const imageColumns = [
    'WA_Cover_Image_01', 'WA_Cover_Image_02', 'WA_Cover_Image_03', 'WA_Cover_Image_04', 'WA_Cover_Image_05',
    'WA_Gallery_01', 'WA_Gallery_02', 'WA_Gallery_03', 'WA_Gallery_04', 'WA_Gallery_05',
    'WA_Gallery_06', 'WA_Gallery_07', 'WA_Gallery_08', 'WA_Gallery_09', 'WA_Gallery_10',
    'WA_Gallery_11', 'WA_Gallery_12', 'WA_Gallery_13', 'WA_Gallery_14', 'WA_Gallery_15',
    'WA_Gallery_16', 'WA_Gallery_17', 'WA_Gallery_18', 'WA_Gallery_19', 'WA_Gallery_20',
    'WA_Gallery_21', 'WA_Gallery_22', 'WA_Gallery_23', 'WA_Gallery_24', 'WA_Gallery_25',
    'WA_Rest_01', 'WA_Rest_02', 'WA_Rest_03', 'WA_Rest_04', 'WA_Rest_05',
    'WA_Rest_06', 'WA_Rest_07', 'WA_Rest_08', 'WA_Rest_09', 'WA_Rest_10',
    'WA_Rest_11', 'WA_Rest_12', 'WA_Rest_13', 'WA_Rest_14', 'WA_Rest_15',
    'WA_Rest_16', 'WA_Rest_17', 'WA_Rest_18', 'WA_Rest_19', 'WA_Rest_20',
    'WA_Rest_21', 'WA_Rest_22', 'WA_Rest_23', 'WA_Rest_24', 'WA_Rest_25'
  ];

  // Función para buscar comentario de imagen en currentAssetComments
  function getImageComment(imageName) {
    if (!currentAssetComments || !imageName || imageName.trim() === '') {
      return '';
    }
    
    const asset = currentAssetComments.find(asset => 
      asset.Name === imageName.trim()
    );
    
    return asset && asset.WA_VIS_Comment ? asset.WA_VIS_Comment.trim() : '';
  }

  // Función para obtener el ID del asset basado en el nombre de la imagen
  function getAssetId(imageName) {
    if (!currentAssetComments || !imageName || imageName.trim() === '') {
      return '';
    }
    
    const searchName = imageName.trim();
    
    const asset = currentAssetComments.find(asset => 
      asset.Name === searchName
    );
    
    if (asset) {
      // Usar el campo ID (mayúscula) que contiene el ID específico de la imagen
      const result = asset.ID;
      return result ? result.toString().trim() : '';
    } else {
      return '';
    }
  }

  // Función para parsear comentarios estructurados
  function parseComment(commentText) {
    // Inicializar estructura de respuesta
    const result = {
      analista: '',
      primeraFechaAnalista: '',
      ultimaFechaAnalista: '',
      ultimoComentarioAnalista: '',
      diseñador: '',
      ultimaFechaDisenador: '',
      ultimoComentarioDisenador: '',
      ultimoTipo: '',
      ultimoStatus: ''
    };

    if (!commentText || commentText.trim() === '') {
      return result;
    }

    try {
      // Dividir por ¶ para separar todas las entradas
      const sections = commentText.split('¶');
      
      let allEntries = [];
      
      // Procesar cada sección
      sections.forEach(section => {
        if (section.trim()) {
          // Dividir por ¦ para obtener los campos
          const fields = section.split('¦');
          
          if (fields.length >= 5) {
            const entry = {
              usuario: fields[0].trim(),
              fecha: fields[1].trim(),
              tipo: fields[2].trim(),
              comentario: fields[3].trim(),
              status: fields[4].trim(),
              fechaDate: new Date(fields[1].trim())
            };
            allEntries.push(entry);
          }
        }
      });

      if (allEntries.length === 0) {
        return result;
      }

      // Separar analistas y diseñadores basado en los usuarios conocidos
      // Lista de analistas conocidos (basada en VALID_USERS)
      const analistasConocidos = ['Sandra', 'Victor', 'Ximena', 'Carlos', 'Kalem', 'Diego'];
      // Lista de diseñadores conocidos (basada en VALID_USERS)  
      const diseñadoresConocidos = ['Veronica', 'Verónica', 'Rossana', 'Carla', 'Gabriela', 'Thanya', 'Grecia', 'Cinthya'];
      
      let analistas = [];
      let diseñadores = [];
      
      // Clasificar entradas por tipo de usuario
      allEntries.forEach(entry => {
        if (analistasConocidos.includes(entry.usuario)) {
          analistas.push(entry);
        } else if (diseñadoresConocidos.includes(entry.usuario)) {
          diseñadores.push(entry);
        } else {
          // Si no se reconoce, asumir que es analista por defecto
          analistas.push(entry);
        }
      });

      // Ordenar por fecha
      analistas.sort((a, b) => a.fechaDate - b.fechaDate);
      diseñadores.sort((a, b) => a.fechaDate - b.fechaDate);

      // Procesar analistas
      if (analistas.length > 0) {
        const primerAnalista = analistas[0];
        const ultimoAnalista = analistas[analistas.length - 1];
        
        result.analista = ultimoAnalista.usuario; // CORREGIDO: Usar el último analista (más reciente)
        result.primeraFechaAnalista = primerAnalista.fecha;
        result.ultimaFechaAnalista = ultimoAnalista.fecha;
        result.ultimoComentarioAnalista = ultimoAnalista.comentario;
      }

      // Procesar diseñadores
      if (diseñadores.length > 0) {
        const ultimoDisenador = diseñadores[diseñadores.length - 1];
        
        result.diseñador = ultimoDisenador.usuario;
        result.ultimaFechaDisenador = ultimoDisenador.fecha;
        result.ultimoComentarioDisenador = ultimoDisenador.comentario;
      }

      // Encontrar la entrada más reciente para tipo y status
      if (allEntries.length > 0) {
        // Ordenar todas las entradas por fecha
        allEntries.sort((a, b) => b.fechaDate - a.fechaDate);
        
        result.ultimoTipo = allEntries[0].tipo;
        result.ultimoStatus = allEntries[0].status;
      }
    } catch (error) {
      console.warn('Error parseando comentario:', commentText, error);
    }

    return result;
  }

  // Generar filas de datos - solo para imágenes con comentarios
  let tableRowsData = []; // Array temporal para ordenar
  let rowIndex = 0;
  let totalImagesWithComments = 0;
  
  // Set para trackear combinaciones únicas de Item Group ID + Nombre de Imagen
  const uniqueItemGroupImageCombos = new Set();

  workingData.forEach((row, originalIndex) => {
    // Extraer metadatos fijos
    const itemGroupId = getItemGroupId(row, workingData); // Pasar workingData como parámetro
    const metadata = {
      name: row['Name'] || '',
      id: row['Id'] || '',
      itemGroup: row['NamePath'] || '', // El NamePath contiene la ruta del Item Group
      itemGroupId: itemGroupId, // NUEVO: ID específico del Item Group
      objectType: row['Object Type'] || '',
      cms: row['CMS'] || row.CMS || '',
      marca: row['Marca'] || '',
      titulo: row['Título'] || '',
      importancia: row['WA Importancia'] || ''
    };

    // Debug: solo mostrar si no hay itemGroupId para investigar problemas
    if (!itemGroupId && originalIndex < 3) {
      // Log removido para limpieza
    }

  // 1. PRIMERO: Verificar si la fila tiene comentario directo en WA_VIS_Comment
  const directComment = row['WA_VIS_Comment'];
  if (directComment && directComment.trim() !== '') {
    const parsedComment = parseComment(directComment.trim());
    rowIndex++;
    totalImagesWithComments++;
    
    tableRowsData.push({
        rowNumber: rowIndex,
        name: metadata.name,
        id: metadata.id,
        itemGroupId: metadata.itemGroupId,
        objectType: metadata.objectType,
        cms: metadata.cms,
        marca: metadata.marca,
        titulo: metadata.titulo,
        importancia: metadata.importancia,
        campo: 'WA_VIS_Comment',
        imagen: metadata.objectType === 'Image' ? metadata.name : '-',
        analista: parsedComment.analista,
        primeraFechaAnalista: parsedComment.primeraFechaAnalista,
        ultimaFechaAnalista: parsedComment.ultimaFechaAnalista,
        ultimoComentarioAnalista: truncateTextForTable(parsedComment.ultimoComentarioAnalista),
        diseñador: parsedComment.diseñador,
        ultimaFechaDisenador: parsedComment.ultimaFechaDisenador,
        ultimoComentarioDisenador: truncateTextForTable(parsedComment.ultimoComentarioDisenador),
        ultimoTipo: parsedComment.ultimoTipo,
        ultimoStatus: parsedComment.ultimoStatus,
        originalRowIndex: originalIndex,
        rowType: 'direct-comment',
        itemName: metadata.name,
        itemId: metadata.id,
        imageName: metadata.objectType === 'Image' ? metadata.name : null,
        commentType: 'item',
        sortDate: parsedComment.primeraFechaAnalista
      });
    }

    // 2. SEGUNDO: Procesar cada columna de imagen para buscar comentarios en assets
    imageColumns.forEach(column => {
      const imageValue = row[column];
      if (imageValue && imageValue.trim() !== '') {
        // Buscar comentario para esta imagen
        const comment = getImageComment(imageValue.trim());
        
        // Solo incluir si tiene comentario
        if (comment !== '') {
          // Crear clave única: Item Group ID + Nombre de Imagen
          const uniqueKey = `${metadata.itemGroupId}|${imageValue.trim()}`;
          
          // Solo agregar si esta combinación no existe ya
          if (!uniqueItemGroupImageCombos.has(uniqueKey)) {
            uniqueItemGroupImageCombos.add(uniqueKey);
            
            const parsedComment = parseComment(comment);
            rowIndex++;
            totalImagesWithComments++;
            
            // Determinar si será una fila de tipo 'Image' 
            const isImageType = imageValue && String(imageValue).toLowerCase().includes('.jpg');
            const finalId = isImageType ? (getAssetId(imageValue.trim()) || metadata.id) : metadata.id;
            
            tableRowsData.push({
              rowNumber: rowIndex,
              name: metadata.name,
              id: finalId,
              itemGroupId: metadata.itemGroupId,
              objectType: metadata.objectType,
              cms: metadata.cms,
              marca: metadata.marca,
              titulo: metadata.titulo,
              importancia: metadata.importancia,
              campo: column,
              imagen: imageValue.trim(),
              analista: parsedComment.analista,
              primeraFechaAnalista: parsedComment.primeraFechaAnalista,
              ultimaFechaAnalista: parsedComment.ultimaFechaAnalista,
              ultimoComentarioAnalista: truncateTextForTable(parsedComment.ultimoComentarioAnalista),
              diseñador: parsedComment.diseñador,
              ultimaFechaDisenador: parsedComment.ultimaFechaDisenador,
              ultimoComentarioDisenador: truncateTextForTable(parsedComment.ultimoComentarioDisenador),
              ultimoTipo: parsedComment.ultimoTipo,
              ultimoStatus: parsedComment.ultimoStatus,
              originalRowIndex: originalIndex,
              rowType: 'image-comment',
              imageName: imageValue.trim(),
              commentType: 'image',
              sortDate: parsedComment.primeraFechaAnalista
            });
          }
        }
      }
    });
  });

  // Si no hay elementos con comentarios, mostrar mensaje
  if (tableRowsData.length === 0) {
    return `
      <div class="image-inventory-container">
        <div class="inventory-header">
          <h3>Comentarios del Visualizador</h3>
          <div class="inventory-stats">
            <span style="color: #6c757d;">No se encontraron elementos con comentarios</span>
          </div>
        </div>
        <div class="inventory-empty-state">
          <p>No hay elementos con comentarios en los datos cargados.</p>
        </div>
      </div>
    `;
  }

  // ORDENAR datos por fecha del analista (más antiguos primero)
  tableRowsData.sort((a, b) => {
    const dateA = a.sortDate ? new Date(a.sortDate) : new Date(0);
    const dateB = b.sortDate ? new Date(b.sortDate) : new Date(0);
    return dateA - dateB; // Orden ascendente (más antiguos primero)
  });

  // Renumerar las filas después del ordenamiento
  tableRowsData.forEach((row, index) => {
    row.rowNumber = index + 1;
  });

  // Convertir datos ordenados a HTML
  const tableRows = tableRowsData.map((rowData, index) => {
    
    if (rowData.rowType === 'direct-comment') {
      return `
        <tr class="inventory-row inventory-direct-comment" data-original-row="${rowData.originalRowIndex}">
          <td class="inventory-cell">${rowData.rowNumber}</td>
          <td class="inventory-cell inventory-item-group">${escapeHtml(rowData.id)}</td>
          <td class="inventory-cell">${escapeHtml(getObjectTypeValue(rowData))}</td>
          <td class="inventory-cell">${escapeHtml(rowData.cms)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.marca)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.titulo)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.importancia)}</td>
          <td class="inventory-cell inventory-image-empty">${escapeHtml(getImageColumnValue(rowData))}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="analista-clean" title="Click para ver historial completo">${escapeHtml(rowData.analista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-column="fecha-analista" data-comment-type="fecha-analista" title="Click para ver historial completo">${escapeHtml(rowData.primeraFechaAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-column="fecha-analista" data-comment-type="fecha-analista" title="Click para ver historial completo">${escapeHtml(rowData.ultimaFechaAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="analista-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="diseñador-clean" title="Click para ver historial completo">${escapeHtml(rowData.diseñador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-column="fecha-diseñador" data-comment-type="fecha-diseñador" title="Click para ver historial completo">${escapeHtml(rowData.ultimaFechaDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="diseñador-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-column="tipo-clean" data-comment-type="tipo-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo || '')}</td>
          <td class="inventory-cell-clean clickable-status-clean" data-column="status-clean" data-item-id="${rowData.itemId || ""}" data-item-group-id="${escapeHtml(rowData.itemGroupId || getItemGroupIdFromData(rowData) || "")}" title="Click para navegar al Item Group">${createStatusTag(rowData.ultimoStatus)}</td>
          <td class="inventory-cell">${rowData.rowNumber}</td>
        </tr>
      `;
    } else {
      return `
        <tr class="inventory-row inventory-image-comment" data-original-row="${rowData.originalRowIndex}">
          <td class="inventory-cell">${rowData.rowNumber}</td>
          <td class="inventory-cell inventory-item-group">${escapeHtml(rowData.id)}</td>
          <td class="inventory-cell">${escapeHtml(getObjectTypeValue(rowData))}</td>
          <td class="inventory-cell">${escapeHtml(rowData.cms)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.marca)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.titulo)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.importancia)}</td>
          <td class="inventory-cell inventory-image">${escapeHtml(getImageColumnValue(rowData))}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="analista-clean" title="Click para ver historial completo">${escapeHtml(rowData.analista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-column="fecha-analista" data-comment-type="fecha-analista" title="Click para ver historial completo">${escapeHtml(rowData.primeraFechaAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-column="fecha-analista" data-comment-type="fecha-analista" title="Click para ver historial completo">${escapeHtml(rowData.ultimaFechaAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="analista-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="diseñador-clean" title="Click para ver historial completo">${escapeHtml(rowData.diseñador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-column="fecha-diseñador" data-comment-type="fecha-diseñador" title="Click para ver historial completo">${escapeHtml(rowData.ultimaFechaDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="diseñador-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-column="tipo-clean" data-comment-type="tipo-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo || '')}</td>
          <td class="inventory-cell-clean clickable-status-clean" data-column="status-clean" data-item-id="${rowData.itemId || ""}" data-item-group-id="${escapeHtml(rowData.itemGroupId || getItemGroupIdFromData(rowData) || "")}" title="Click para navegar al Item Group">${createStatusTag(rowData.ultimoStatus)}</td>
          <td class="inventory-cell">${rowData.rowNumber}</td>
        </tr>
      `;
    }
  });

  // Generar HTML de la tabla
  const inventoryHTML = `
    <div class="image-inventory-container">
      <div class="inventory-header">
        <h3>Comentarios del Visualizador</h3>
        <div class="inventory-actions">
          <button id="assignDesignerBtn" class="inventory-btn inventory-btn-primary">
            <i class="fas fa-user-plus"></i> Asignar
          </button>
          <button id="openInventoryFilters" class="inventory-btn inventory-btn-secondary">
            <i class="fas fa-filter"></i> Filtros
          </button>
          <button id="clearFiltersBtn" class="inventory-btn inventory-btn-secondary" onclick="clearInventoryFilter()">
            <i class="fas fa-times"></i> Limpiar Filtros
          </button>
          <div class="inventory-stats">
            Comentarios visibles: <strong>${totalImagesWithComments}</strong>
          </div>
        </div>
      </div>
      <div class="inventory-table-wrapper">
        <table class="image-inventory-table">
          <thead>
            <tr class="inventory-header-row">
              <th class="inventory-header-cell">#</th>
              <th class="inventory-header-cell">ID</th>
              <th class="inventory-header-cell">Object</br>Type</th>
              <th class="inventory-header-cell">CMS</th>
              <th class="inventory-header-cell">Marca</th>
              <th class="inventory-header-cell">Título</th>
              <th class="inventory-header-cell">Imp</th>
              <th class="inventory-header-cell">Imagen</th>
              <th class="inventory-header-cell">Analista</th>
              <th class="inventory-header-cell">Fecha</br>Creación</th>
              <th class="inventory-header-cell">Fecha</br>Analista</th>
              <th class="inventory-header-cell">Comentario</br>Analista</th>
              <th class="inventory-header-cell">Diseñador</th>
              <th class="inventory-header-cell">Fecha</br>Diseño</th>
              <th class="inventory-header-cell">Comentario</br>Diseñador</th>
              <th class="inventory-header-cell">Tipo</th>
              <th class="inventory-header-cell">Status</th>
              <th class="inventory-header-cell">#</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows.join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Configurar event listeners para elementos clickeables después de insertar el HTML
  setTimeout(() => {
    setupInventoryClickListeners();
    
    // Configurar el botón de filtros
    const filterButton = document.getElementById('openInventoryFilters');
    if (filterButton) {
      filterButton.onclick = openInventoryFiltersModal;
    }
    
    // Configurar el botón de asignar diseñadora con múltiples intentos
    // Solo configurar si estamos en vista de comentarios
    if (isCleanViewActive) {
      setupAssignButtonListener();
    }
  }, 100);

  // Guardar datos originales para filtros SOLO si no existen ya (para preservar asignaciones)
  if (originalInventoryData.length === 0) {
    originalInventoryData = [...tableRowsData];
  } else {
    // CRÍTICO: Solo actualizar originalInventoryData si NO estamos en medio de un proceso de asignaciones
    // Verificar si algún elemento en originalInventoryData tiene asignaciones recientes que no están en tableRowsData
    const hasRecentAssignments = originalInventoryData.some(originalRow => {
      const matchingTableRow = tableRowsData.find(tableRow => {
        // Matching mejorado: usar commentType y múltiples criterios
        if (originalRow.commentType === 'item' && tableRow.commentType === 'item') {
          // Para elementos tipo "item": comparar IDs de forma flexible (id o itemId) y name
          const originalId = originalRow.itemId || originalRow.id;
          const tableId = tableRow.itemId || tableRow.id;
          return String(tableId) === String(originalId) && tableRow.name === originalRow.name;
        } else if (originalRow.commentType === 'image' && tableRow.commentType === 'image') {
          // Para elementos tipo "image": usar id y name
          return String(tableRow.id) === String(originalRow.id) && tableRow.name === originalRow.name;
        } else {
          // Fallback: usar id y name
          return String(tableRow.id) === String(originalRow.id) && tableRow.name === originalRow.name;
        }
      });
      // Si el elemento tiene diseñador en original pero no en tableRowsData, preservar original
      return originalRow.diseñador && originalRow.diseñador.trim() !== '' && 
             (!matchingTableRow || !matchingTableRow.diseñador || matchingTableRow.diseñador.trim() === '');
    });
    
    // CORREGIR: Después de agregar comentarios, siempre actualizar datos para reflejar cambios de Analista/Diseñador
    const isAfterCommentUpdate = window.justAddedComment === true;
    

    
    if (hasRecentAssignments && !isAfterCommentUpdate) {
      // Solo actualizar comentarios en originalInventoryData sin perder asignaciones
      originalInventoryData.forEach(originalRow => {
        const matchingTableRow = tableRowsData.find(tableRow => {
          // Matching mejorado: usar commentType y múltiples criterios
          if (originalRow.commentType === 'item' && tableRow.commentType === 'item') {
            // Para elementos tipo "item": comparar IDs de forma flexible (id o itemId) y name
            const originalId = originalRow.itemId || originalRow.id;
            const tableId = tableRow.itemId || tableRow.id;
            const match = String(tableId) === String(originalId) && tableRow.name === originalRow.name;
            return match;
          } else if (originalRow.commentType === 'image' && tableRow.commentType === 'image') {
            // Para elementos tipo "image": usar id y name
            return String(tableRow.id) === String(originalRow.id) && tableRow.name === originalRow.name;
          } else {
            // Fallback: usar id y name
            return tableRow.id === originalRow.id && tableRow.name === originalRow.name;
          }
        });
        if (matchingTableRow && matchingTableRow['WA_VIS_Comment'] !== originalRow['WA_VIS_Comment']) {
          originalRow['WA_VIS_Comment'] = matchingTableRow['WA_VIS_Comment'];
          originalRow.ultimoStatus = matchingTableRow.ultimoStatus;
          originalRow.ultimaFechaEstatus = matchingTableRow.ultimaFechaEstatus;
        }
      });
      
      // CRÍTICO: Sincronizar asignaciones desde originalInventoryData hacia tableRowsData
      let syncCount = 0;
      originalInventoryData.forEach(originalRow => {
        if (originalRow.diseñador && originalRow.diseñador.trim() !== '') {
          const matchingTableRow = tableRowsData.find(tableRow => {
            if (originalRow.commentType === 'item' && tableRow.commentType === 'item') {
              // Para elementos tipo "item": comparar IDs de forma flexible (id o itemId) y name
              const originalId = originalRow.itemId || originalRow.id;
              const tableId = tableRow.itemId || tableRow.id;
              return String(tableId) === String(originalId) && tableRow.name === originalRow.name;
            } else if (originalRow.commentType === 'image' && tableRow.commentType === 'image') {
              return String(tableRow.id) === String(originalRow.id) && tableRow.name === originalRow.name;
            } else {
              return String(tableRow.id) === String(originalRow.id) && tableRow.name === originalRow.name;
            }
          });
          
          if (matchingTableRow) {
            // console.log(`✅ Sincronizando ${originalRow.name}: "${matchingTableRow.diseñador}" → "${originalRow.diseñador}"`);
            matchingTableRow.diseñador = originalRow.diseñador;
            syncCount++;
          } else {
            // console.log(`❌ No se pudo sincronizar ${originalRow.name} (${originalRow.commentType}) - ID original: ${originalRow.itemId || originalRow.id}`);
          }
        }
      });
      console.log(`🔄 Sincronización completada: ${syncCount} asignaciones transferidas a tableRowsData`);
      
      // NO reaplicar filtros activos - siempre usar filtro automático predeterminado
      console.log('🚫 NO reaplicando filtros anteriores - se usará filtro automático predeterminado');
    } else {
      console.log('✅ FORZANDO actualización de originalInventoryData después de agregar comentario');
      // Después de comentarios, siempre actualizar para reflejar cambios de Analista/Diseñador
      originalInventoryData = [...tableRowsData];
      console.log('🔄 originalInventoryData actualizado con nuevos datos de Analista/Diseñador');
      
      // Limpiar la bandera
      window.justAddedComment = false;
    }
  }
  
  // DEBUGGING: Verificar IDs problemáticos en originalInventoryData
  const problematicIds = ['42990', '23591'];
  // Limpiar logs de verificación
  problematicIds.forEach(id => {
    const found = originalInventoryData.find(row => row.id === id);
    if (found) {
      console.log(`🚨 ID ${id} encontrado en originalInventoryData:`);
      console.log(`   - Diseñador: "${found.diseñador}"`);
      console.log(`   - Comment Type: "${found.commentType}"`);
      console.log(`   - Status: "${found.ultimoStatus}"`);
      console.log(`   - Nombre: "${found.name}"`);
    }
  });

  // Actualizar las tablas de estadísticas SOLO si no está suprimido
  if (!suppressStatsUpdate) {
    setTimeout(() => {
      // Usar función segura con debouncing
      safeUpdateStatsTablesOnDataChange();
    }, 200);
  } else {
    console.log('🚫 Actualizaci\u00f3n de estadísticas SUPRIMIDA por suppressStatsUpdate');
  }

  return inventoryHTML;
}

// Función para generar tabla de inventario mostrando TODOS los datos (sin filtrar por comentarios)
function generateImageInventoryTableFromAllData() {
  console.log('🚀 generateImageInventoryTableFromAllData iniciada - SIN filtros de comentarios');
  
  // Simplemente usar allLibraryData completo si está disponible
  if (allLibraryData && allLibraryData.length > 0) {
    console.log(`📊 Usando allLibraryData directamente: ${allLibraryData.length} elementos`);
    
    try {
      // Generar la tabla usando la función existente con showAllData = true
      const inventoryHTML = generateImageInventoryTable(allLibraryData, true);
      
      console.log('✅ Tabla de inventario generada exitosamente con TODOS los datos de allLibraryData');
      
      return inventoryHTML;
      
    } catch (error) {
      console.error('❌ Error generando tabla con allLibraryData:', error);
      return '<div class="empty-box-message">Error generando tabla de inventario</div>';
    }
  }
  
  // Fallback: usar caché si allLibraryData no está disponible
  console.log('📊 itemGroupDataCache disponible:', !!itemGroupDataCache);
  console.log('📊 itemGroupDataCache size:', itemGroupDataCache ? itemGroupDataCache.size : 'N/A');
  
  if (!itemGroupDataCache || itemGroupDataCache.size === 0) {
    console.log('❌ No hay caché para generar tabla de inventario');
    return '<div class="empty-box-message">No hay datos en caché para mostrar. Haz click en "Optimizar" primero.</div>';
  }

  // Convertir el caché a un array plano de todos los elementos
  let allCachedData = [];
  let totalItemGroups = 0;
  let totalItems = 0;
  
  console.log('🔄 Procesando TODOS los datos del caché...');
  
  itemGroupDataCache.forEach((itemGroupData, itemGroupId) => {
    if (itemGroupData && Array.isArray(itemGroupData)) {
      totalItemGroups++;
      itemGroupData.forEach(item => {
        if (item && typeof item === 'object') {
          totalItems++;
          allCachedData.push(item);
        }
      });
    }
  });
  
  console.log(`📊 Datos del caché procesados: ${totalItemGroups} Item Groups, ${totalItems} items totales`);
  
  if (allCachedData.length === 0) {
    return '<div class="empty-box-message">No hay datos para mostrar en el caché</div>';
  }
  
  try {
    // Usar directamente los datos del caché sin transformación compleja
    const inventoryHTML = generateImageInventoryTable(allCachedData, true);
    
    console.log('✅ Tabla de inventario generada exitosamente con datos del caché');
    
    return inventoryHTML;
    
  } catch (error) {
    console.error('❌ Error generando tabla con datos del caché:', error);
    return '<div class="empty-box-message">Error generando tabla de inventario desde caché</div>';
  }
}

// Función para generar tabla de inventario de imágenes desde el caché de Item Groups
function generateImageInventoryTableFromCache() {
  if (logFunctionCall('generateImageInventoryTableFromCache')) return '<div class="error">Bucle detectado</div>';
  
  console.log('🚀 generateImageInventoryTableFromCache iniciada');
  
  // OPTIMIZACIÓN: Usar datos pre-procesados si están disponibles
  if (isPreProcessingComplete && preProcessedInventoryHTML && preProcessedInventoryData) {
    console.log('⚡ FAST PATH: Usando datos pre-procesados - respuesta instantánea');
    console.log(`📊 HTML pre-generado: ${preProcessedInventoryHTML.length} caracteres`);
    console.log(`📊 Datos pre-procesados: ${preProcessedInventoryData.length} elementos`);
    
    // Actualizar allLibraryData para que funcionen los clicks en comentarios
    const originalAllLibraryData = allLibraryData;
    allLibraryData = preProcessedInventoryData;
    
    // Inicializar commentedItemsData con los datos pre-procesados
    console.log('🔄 Inicializando commentedItemsData con datos pre-procesados...');
    const originalCurrentWorkingData = currentWorkingData;
    currentWorkingData = preProcessedInventoryData;
    initializeCommentedItemsData();
    currentWorkingData = originalCurrentWorkingData;
    
    // CRÍTICO: Generar tablas de resumen después de configurar datos
    setTimeout(() => {
      // Usar función segura con debouncing
      console.log('📊 Generando tablas de resumen desde datos pre-procesados...');
      safeUpdateStatsTablesOnDataChange();
    }, 100);
    
    return preProcessedInventoryHTML;
  }
  
  console.log('🐌 SLOW PATH: Pre-procesamiento no disponible, usando método legacy...');
  console.log('📊 itemGroupDataCache disponible:', !!itemGroupDataCache);
  console.log('📊 itemGroupDataCache size:', itemGroupDataCache ? itemGroupDataCache.size : 'N/A');
  
  // SOLO usar allLibraryData cuando haya comentarios recientes que preservar
  if (recentCommentsFlag && allLibraryData && Array.isArray(allLibraryData) && allLibraryData.length > 0) {
    // Verificar si han pasado más de 10 minutos desde el último comentario
    const now = new Date();
    const timeSinceLastComment = lastCommentTimestamp ? (now - lastCommentTimestamp) / (1000 * 60) : Infinity;
    
    if (timeSinceLastComment <= 10) {
      console.log(`🚀 DETECTADOS comentarios recientes (hace ${timeSinceLastComment.toFixed(1)} min) - usando allLibraryData para preservarlos`);
      
      // Usar solo los elementos de inventario de allLibraryData
      const inventoryItems = allLibraryData.filter(item => 
        item['Object Type'] === 'Item Code' || item['Object Type'] === 'Image'
      );
      
      console.log(`📊 Datos de inventario con comentarios recientes: ${inventoryItems.length} elementos`);
      
      // Generar tabla directamente desde datos de inventario filtrados
      const originalCurrentWorkingData = currentWorkingData;
      currentWorkingData = inventoryItems;
      const tableHTML = generateImageInventoryTable();
      currentWorkingData = originalCurrentWorkingData;
      
      console.log('✅ Tabla generada preservando comentarios recientes');
      return tableHTML;
    } else {
      console.log(`⏰ Los comentarios ya no son recientes (hace ${timeSinceLastComment.toFixed(1)} min) - limpiando flag`);
      recentCommentsFlag = false;
      lastCommentTimestamp = null;
    }
  }
  
  console.log('🔍 No hay comentarios recientes que preservar - usando caché normal');
  
  if (!itemGroupDataCache || itemGroupDataCache.size === 0) {
    console.log('❌ No hay caché para generar tabla de inventario');
    return '<div class="empty-box-message">No hay datos en caché para mostrar. Haz click en "Optimizar" primero.</div>';
  }

  console.log('🔄 Generando desde caché porque allLibraryData no está disponible');
  // Convertir el caché a un array plano de todos los elementos
  let allCachedData = [];
  let totalItemGroups = 0;
  let totalItems = 0;
  
  console.log('🔄 Procesando datos del caché...');
  
  itemGroupDataCache.forEach((itemGroupData, itemGroupId) => {
    if (itemGroupData && Array.isArray(itemGroupData)) {
      totalItemGroups++;
      itemGroupData.forEach(item => {
        allCachedData.push(item);
        totalItems++;
      });
    }
  });
  
  console.log(`📊 Datos del caché procesados: ${totalItemGroups} Item Groups, ${totalItems} items totales`);
  
  if (allCachedData.length === 0) {
    return '<div class="empty-box-message">No hay datos válidos en el caché para mostrar</div>';
  }

  //  CONVERTIR datos concatenados a formato Attribute-Value
  console.log('🔄 Convirtiendo datos concatenados a formato Attribute-Value...');
  let attributeValueData = [];
  
  allCachedData.forEach(item => {
    const dataConcatenated = item['data_concatenated'];
    const itemGroups = item['Item Groups'];
    const id = item['ID'];
    const objectType = item['Object Type'];
    
    if (dataConcatenated && dataConcatenated.trim() !== '') {
      // Parsear los datos concatenados para extraer atributos individuales
      const parsedData = parseUniversalConcatenatedData(item);
      
      // Convertir cada campo parseado a una fila Attribute-Value
      Object.keys(parsedData).forEach(attribute => {
        if (attribute !== 'Item Groups' && attribute !== 'ID' && attribute !== 'Object Type') {
          attributeValueData.push({
            'Item Groups': itemGroups,
            'ID': id,
            'Object Type': objectType,
            'Attribute': attribute,
            'value': parsedData[attribute] || ''
          });
        }
      });
    }
  });
  
  console.log(`📊 Datos convertidos a Attribute-Value: ${attributeValueData.length} registros`);

  // 🚀 NUEVA LÓGICA: Transformar los datos de Attribute-Value al formato expandido
  // 🚀 NUEVA LÓGICA: Transformar los datos de Attribute-Value al formato expandido
  console.log('🔄 Transformando datos de formato Attribute-Value...');
  const transformedData = transformAttributeValueData(allCachedData);
  
  // Convertir el objeto transformado a array
  const transformedArray = Object.values(transformedData);
  console.log(`📊 Datos transformados: ${transformedArray.length} elementos`);
  
  // Verificar si hay comentarios después de la transformación
  const withComments = transformedArray.filter(item => item['WA_VIS_Comment'] && item['WA_VIS_Comment'].trim() !== '');
  console.log(`📊 Elementos CON comentarios después de transformación: ${withComments.length}/${transformedArray.length}`);
  
  if (withComments.length > 0) {
    console.log('✅ ¡Comentarios encontrados! Primeros 3 ejemplos:');
    withComments.slice(0, 3).forEach((item, index) => {
      console.log(`📋 Comentario ${index + 1}: ${item.Name} (${item['Object Type']}) - "${item['WA_VIS_Comment'].substring(0, 50)}..."`);
    });
  }
  
  // Usar la lógica existente pero con los datos transformados
  const originalCurrentWorkingData = currentWorkingData;
  
  // Temporalmente asignar los datos transformados a currentWorkingData Y allLibraryData
  currentWorkingData = transformedArray;
  allLibraryData = transformedArray; // ¡IMPORTANTE! Para que funcionen los clicks en comentarios
  
  // NUEVO: Inicializar commentedItemsData con los datos transformados que tienen comentarios
  console.log('🔄 Inicializando commentedItemsData con datos transformados del caché...');
  initializeCommentedItemsData();
  
  try {
    // Generar la tabla usando la función existente, pasando los datos transformados directamente
    const inventoryHTML = generateImageInventoryTable(transformedArray);
    
    console.log('✅ Tabla de inventario generada exitosamente desde caché transformado');
    
    // Restaurar currentWorkingData original DESPUÉS de generar la tabla (pero mantener allLibraryData)
    currentWorkingData = originalCurrentWorkingData;
    
    return inventoryHTML;
    
  } catch (error) {
    console.error('❌ Error generando tabla desde caché:', error);
    
    // Restaurar currentWorkingData original en caso de error (mantener allLibraryData)
    currentWorkingData = originalCurrentWorkingData;
    
    return '<div class="empty-box-message">Error generando tabla de inventario desde caché</div>';
  }
}

// Función auxiliar para escapar HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Función para configurar event listeners en la tabla de inventario
function setupInventoryClickListeners() {
  const clickableComments = document.querySelectorAll('.clickable-comment');
  const clickableStatuses = document.querySelectorAll('.clickable-status');
  
  // NUEVAS CLASES LIMPIAS
  const clickableCommentsClean = document.querySelectorAll('.clickable-comment-clean');
  const clickableStatusesClean = document.querySelectorAll('.clickable-status-clean');
  
  if (!allLibraryData || allLibraryData.length === 0) {
    console.warn('⚠️ allLibraryData no está disponible. Los clicks en Item Codes/Groups no funcionarán.');
  }
  
  // Event listeners para comentarios clickeables
  clickableComments.forEach((cell, index) => {
    cell.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const commentType = this.getAttribute('data-comment-type');
      const imageName = this.getAttribute('data-image-name');
      const itemName = this.getAttribute('data-item-name');
      const itemId = this.getAttribute('data-item-id');
      
      console.log(`🔍 Debug click ${index}:`, { commentType, imageName, itemName, itemId });
      console.log(`📊 currentWorkingData tiene ${currentWorkingData ? currentWorkingData.length : 0} elementos`);
      
      // Validar que tenemos los datos mínimos necesarios según el tipo de comentario
      if (commentType === 'image' && imageName && imageName !== '-') {
        // Guardar estado de scroll antes de abrir modal de historial
        saveInventoryViewState();
        
        // Para comentarios de imagen - usar el comentario original completo
        const originalComment = getOriginalImageComment(imageName);
        const modalTitle = `Comentarios de Imagen`;
        
        console.log('📸 Abriendo modal de imagen:', { imageName, originalComment });
        openCommentModal(modalTitle, imageName, originalComment, 'image', imageName);
        
      } else if ((commentType === 'fecha-analista' || commentType === 'fecha-diseñador') && imageName && imageName !== '-') {
        // Fechas de imagen - abrir modal de imagen
        saveInventoryViewState();
        
        const originalComment = getOriginalImageComment(imageName);
        const modalTitle = `Comentarios de Imagen`;
        
        console.log('📅📸 Abriendo modal de imagen por fecha:', { imageName, commentType, originalComment });
        openCommentModal(modalTitle, imageName, originalComment, 'image', imageName);
        
      } else if ((commentType === 'item' || commentType === 'diseñador' || commentType === 'analista' || commentType === 'tipo' || 
                 (commentType === 'fecha-analista' || commentType === 'fecha-diseñador')) && itemName && itemId) {
        // Fechas de item o comentarios directos de Item Code/Item Group - buscar en todos los datos
        saveInventoryViewState();
        
        // Para comentarios directos de Item Code/Item Group - buscar en todos los datos
        console.log(`🔍 Buscando item en allLibraryData (${allLibraryData.length} elementos):`, { itemName, itemId });
        
        // Buscar en todos los datos de la library, no solo en currentWorkingData
        const itemData = allLibraryData.find(item => {
          // Comparación flexible para nombres (trimear espacios)
          const nameMatch = (item.Name && item.Name.trim()) === (itemName && itemName.trim());
          // Comparación flexible para IDs (string y number)
          const idMatch = item.Id === itemId || 
                         String(item.Id) === String(itemId) || 
                         Number(item.Id) === Number(itemId);
          
          if (index < 5) { // Solo mostrar los primeros 5 para no saturar el log
            console.log(`   Comparando: "${item.Name?.trim()}" === "${itemName?.trim()}" (${nameMatch}) && "${item.Id}" === "${itemId}" (${idMatch}) [tipos: ${typeof item.Id} vs ${typeof itemId}]`);
          }
          return nameMatch && idMatch;
        });
        
        if (itemData) {
          const originalComment = itemData['WA_VIS_Comment'] || '';
          const contextInfo = `${itemData.Name} (${itemData.Id})`;
          const modalTitle = itemData['Object Type'] === 'Item Group' 
            ? `Comentarios de Item Group`
            : `Comentarios de Item Code`;
          
          // Debug completo de todos los campos del item
          console.log('📋 ITEM COMPLETO encontrado por búsqueda directa:', {
            Name: itemData.Name,
            Id: itemData.Id,
            ObjectType: itemData['Object Type'],
            WA_VIS_Comment: itemData['WA_VIS_Comment'],
            hasWA_VIS_Comment: !!itemData['WA_VIS_Comment'],
            commentLength: (itemData['WA_VIS_Comment'] || '').length,
            allCommentFields: Object.keys(itemData).filter(key => 
              key.toLowerCase().includes('comment') || 
              key.toLowerCase().includes('vis') ||
              key.toLowerCase().includes('wa')
            ).map(key => ({ field: key, value: itemData[key]?.substring?.(0, 50) || itemData[key] }))
          });
          
          console.log('📝 Abriendo modal de item (búsqueda directa):', { 
            itemName, 
            itemId, 
            originalComment: originalComment ? originalComment.substring(0, 100) + '...' : 'VACÍO', 
            objectType: itemData['Object Type'],
            hasComment: !!originalComment,
            commentLength: originalComment.length
          });
          
          openCommentModal(modalTitle, contextInfo, originalComment, 'item', null);
        } else {
          console.warn('❌ No se encontró el item en allLibraryData:', { itemName, itemId });
          console.log(`📋 Primeros 10 items en allLibraryData:`, allLibraryData.slice(0, 10).map(item => ({ Name: item.Name, Id: item.Id, ObjectType: item['Object Type'] })));
          
          // SOLUCIÓN TEMPORAL: Si no encuentra por nombre+ID, intentar buscar solo por ID (más confiable)
          console.log(`🔄 Intentando búsqueda solo por ID...`);
          const itemDataById = allLibraryData.find(item => 
            item.Id === itemId || String(item.Id) === String(itemId) || Number(item.Id) === Number(itemId)
          );
          
          if (itemDataById) {
            console.log(`✅ Encontrado por ID solamente:`, { Name: itemDataById.Name, Id: itemDataById.Id, ObjectType: itemDataById['Object Type'] });
            
            // Debug completo de todos los campos del item encontrado por ID
            console.log('📋 ITEM COMPLETO encontrado por ID:', {
              Name: itemDataById.Name,
              Id: itemDataById.Id,
              ObjectType: itemDataById['Object Type'],
              WA_VIS_Comment: itemDataById['WA_VIS_Comment'],
              hasWA_VIS_Comment: !!itemDataById['WA_VIS_Comment'],
              commentLength: (itemDataById['WA_VIS_Comment'] || '').length,
              allCommentFields: Object.keys(itemDataById).filter(key => 
                key.toLowerCase().includes('comment') || 
                key.toLowerCase().includes('vis') ||
                key.toLowerCase().includes('wa')
              ).map(key => ({ field: key, value: itemDataById[key]?.substring?.(0, 50) || itemDataById[key] }))
            });
            
            const originalComment = itemDataById['WA_VIS_Comment'] || '';
            const contextInfo = `${itemDataById.Name} (${itemDataById.Id})`;
            const modalTitle = itemDataById['Object Type'] === 'Item Group' 
              ? `Comentarios de Item Group`
              : `Comentarios de Item Code`;
            
            console.log('📝 Abriendo modal por ID:', { 
              Name: itemDataById.Name, 
              Id: itemDataById.Id, 
              originalComment: itemDataById['WA_VIS_Comment'] ? itemDataById['WA_VIS_Comment'].substring(0, 100) + '...' : 'VACÍO', 
              objectType: itemDataById['Object Type'],
              hasComment: !!itemDataById['WA_VIS_Comment'],
              commentLength: (itemDataById['WA_VIS_Comment'] || '').length
            });
            
            openCommentModal(modalTitle, contextInfo, originalComment, 'item', null);
            return; // Salir de la función aquí
          }
          
          // Debug adicional solo si falla también la búsqueda por ID
          const itemsByName = allLibraryData.filter(item => 
            (item.Name && item.Name.trim()) === (itemName && itemName.trim())
          );
          const itemsById = allLibraryData.filter(item => 
            item.Id === itemId || String(item.Id) === String(itemId) || Number(item.Id) === Number(itemId)
          );
          
          console.log(`🔍 Items con nombre '${itemName?.trim()}':`, itemsByName.map(item => ({ Name: item.Name, Id: item.Id, ObjectType: item['Object Type'] })));
          console.log(`🔍 Items con ID '${itemId}':`, itemsById.map(item => ({ Name: item.Name, Id: item.Id, ObjectType: item['Object Type'] })));
          
          // DETALLE COMPLETO de los items encontrados
          if (itemsByName.length > 0) {
            console.log(`📝 DETALLE item por nombre:`, itemsByName[0]);
          }
          if (itemsById.length > 0) {
            console.log(`📝 DETALLE item por ID:`, itemsById[0]);
          }
          
          // Buscar nombres similares (partial match)
          const similarNames = allLibraryData.filter(item => 
            item.Name && itemName && (
              item.Name.toLowerCase().includes(itemName.toLowerCase().trim()) ||
              itemName.toLowerCase().includes(item.Name.toLowerCase().trim())
            )
          ).slice(0, 5);
          
          console.log(`🔍 Nombres similares a '${itemName}':`, similarNames.map(item => ({ Name: item.Name, Id: item.Id, ObjectType: item['Object Type'] })));
          
          // Revisar si hay problemas de tipo de datos
          console.log(`📝 Tipos de datos - itemName: ${typeof itemName} (${itemName}), itemId: ${typeof itemId} (${itemId})`);
          if (allLibraryData.length > 0) {
            const firstItem = allLibraryData[0];
            console.log(`📝 Tipos en datos - Name: ${typeof firstItem.Name} (${firstItem.Name}), Id: ${typeof firstItem.Id} (${firstItem.Id})`);
          }
        }
      } else {
        console.warn('❌ Datos insuficientes para abrir modal:', { commentType, imageName, itemName, itemId });
        console.log('📋 Se requiere: commentType válido y (imageName válida != "-" para imagen) O (itemName + itemId para item/diseñador/analista/tipo)');
      }
    });
    
    // Agregar estilo de cursor pointer
    cell.style.cursor = 'pointer';
  });

  // Event listeners para status clickeable
  clickableStatuses.forEach((cell, index) => {
    cell.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const itemGroupId = this.getAttribute('data-item-group-id');
      
      if (!itemGroupId || itemGroupId.trim() === '') {
        console.error('❌ Item Group ID vacío o no válido:', itemGroupId);
        alert('Error: No se pudo determinar el Item Group ID');
        return;
      }
      
      console.log(`🟢 Click en status, navegando a Item Group:`, itemGroupId);
      navigateToItemGroup(itemGroupId);
    });
    cell.style.cursor = 'pointer';
  });
  
  // EVENT LISTENERS PARA NUEVAS CLASES LIMPIAS
  
  // Event listeners para comentarios clickeables LIMPIOS
  clickableCommentsClean.forEach((cell, index) => {
    // Verificar si ya tiene event listener configurado
    if (cell.dataset.listenerAdded === 'true') {
      return;
    }
    
    // Marcar como procesado
    cell.dataset.listenerAdded = 'true';
    
    // Asegurar cursor pointer con múltiples métodos
    cell.style.cursor = 'pointer';
    cell.style.setProperty('cursor', 'pointer', 'important');
    cell.classList.add('force-pointer-cursor');
    cell.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const commentType = this.getAttribute('data-comment-type');
      const imageName = this.getAttribute('data-image-name');
      const itemName = this.getAttribute('data-item-name');
      const itemId = this.getAttribute('data-item-id');
      
      // DEBUG: Log all attributes for click debugging
      console.log(`🔍 CLEAN CLICK DEBUG:`, {
        commentType,
        imageName,
        itemName, 
        itemId,
        hasImageName: !!imageName,
        imageNameNotDash: imageName !== '-',
        hasItemData: !!(itemName && itemId)
      });
      
      // Lógica específica para comentarios limpios y fechas
      if (commentType && (commentType.includes('-clean') || commentType === 'fecha-analista' || commentType === 'fecha-diseñador')) {
        // DETECCIÓN INTELIGENTE: Si itemName termina en .jpg, es una Imagen
        const isImageByName = itemName && itemName.includes('.jpg');
        
        // Para comentarios de imagen - PRIORIZAR IMAGENES
        if ((imageName && imageName !== '-' && imageName !== 'null' && imageName.trim() !== '') || isImageByName) {
          const finalImageName = imageName || itemName; // Usar imageName si existe, sino itemName
          console.log(`📸 DETECTADO COMO IMAGEN:`, { imageName, itemName, finalImageName, commentType, isImageByName });
          const originalComment = getOriginalImageComment(finalImageName);
          const modalTitle = `Comentarios de Imagen`;
          openCommentModal(modalTitle, finalImageName, originalComment, 'image', finalImageName);
        }
        // Para comentarios directos (item-based) - SOLO si NO es imagen
        else if (itemName && itemId && !isImageByName) {
          console.log(`📋 DETECTADO COMO ITEM:`, { itemName, itemId, commentType });
          const itemData = allLibraryData.find(item => {
            const nameMatch = (item.Name && item.Name.trim()) === (itemName && itemName.trim());
            const idMatch = item.Id === itemId || String(item.Id) === String(itemId) || Number(item.Id) === Number(itemId);
            return nameMatch && idMatch;
          });
          
          if (itemData) {
            const originalComment = itemData['WA_VIS_Comment'] || '';
            const contextInfo = `${itemData.Name} (${itemData.Id})`;
            const modalTitle = itemData['Object Type'] === 'Item Group' 
              ? `Comentarios de Item Group`
              : `Comentarios de Item Code`;
            
            openCommentModal(modalTitle, contextInfo, originalComment, 'item', null);
          } else {
            console.warn('❌ No se encontró item LIMPIO:', { itemName, itemId });
            
            // Buscar solo por ID como fallback
            const itemDataById = allLibraryData.find(item => 
              item.Id === itemId || String(item.Id) === String(itemId) || Number(item.Id) === Number(itemId)
            );
            
            if (itemDataById) {
              const originalComment = itemDataById['WA_VIS_Comment'] || '';
              const contextInfo = `${itemDataById.Name} (${itemDataById.Id})`;
              const modalTitle = itemDataById['Object Type'] === 'Item Group' 
                ? `Comentarios de Item Group`
                : `Comentarios de Item Code`;
              
              openCommentModal(modalTitle, contextInfo, originalComment, 'item', null);
            }
          }
        }
      }
    });
    cell.style.cursor = 'pointer';
    cell.style.setProperty('cursor', 'pointer', 'important');
  });
  
  // Event listeners para status clickeables LIMPIOS
  clickableStatusesClean.forEach((cell, index) => {
    cell.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const itemGroupId = this.getAttribute('data-item-group-id');
      
      if (!itemGroupId || itemGroupId.trim() === '') {
        console.warn('❌ Click en status: No se encontró Item Group ID');
        return;
      }
      
      console.log(`✅ Click en status: Navegando a Item Group "${itemGroupId}"`);
      navigateToItemGroup(itemGroupId);
    });
    cell.style.cursor = 'pointer';
  });
}

// Función auxiliar para obtener comentario original completo de imagen
function getOriginalImageComment(imageName) {
  if (!imageName || imageName.trim() === '') {
    console.log('🔍 getOriginalImageComment: imageName vacío o inválido');
    return '';
  }
  
  console.log('🔍 getOriginalImageComment: Buscando imagen:', imageName);
  
  // Buscar en allLibraryData directamente
  if (allLibraryData && allLibraryData.length > 0) {
    const imageAsset = allLibraryData.find(item => 
      item['Object Type'] === 'Image' && item.Name === imageName.trim()
    );
    
    if (imageAsset && imageAsset['WA_VIS_Comment']) {
      console.log('✅ Comentario encontrado en allLibraryData para:', imageName);
      console.log('📋 Comentario:', imageAsset['WA_VIS_Comment'].substring(0, 100) + '...');
      return imageAsset['WA_VIS_Comment'].trim();
    }
  }
  
  // Fallback: buscar en currentAssetComments si existe
  if (currentAssetComments) {
    const asset = currentAssetComments.find(asset => 
      asset.Name === imageName.trim()
    );
    
    if (asset && asset.WA_VIS_Comment) {
      console.log('✅ Comentario encontrado en currentAssetComments para:', imageName);
      return asset.WA_VIS_Comment.trim();
    }
  }
  
  console.log('❌ No se encontró comentario para imagen:', imageName);
  return '';
}

// ===== MODAL DE FILTROS DE INVENTARIO =====

// Variable global para almacenar los datos originales del inventario
let originalInventoryData = [];

// Función para abrir el modal de filtros
function openInventoryFiltersModal() {
  const modal = document.getElementById('inventoryFiltersModal');
  
  // Poblar dropdowns con valores únicos de los datos
  populateFilterDropdowns();
  
  // Mostrar modal
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
}

// Función para cerrar el modal de filtros
function closeInventoryFiltersModal() {
  const modal = document.getElementById('inventoryFiltersModal');
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

// Función para poblar los dropdowns con valores únicos
function populateFilterDropdowns() {
  if (!originalInventoryData || originalInventoryData.length === 0) return;
  
  // Analistas únicos (incluyendo vacíos)
  const analistas = [...new Set(originalInventoryData.map(row => row.analista || ''))].sort();
  const analistaSelect = document.getElementById('filterAnalista');
  analistaSelect.innerHTML = '<option value="">Todos</option>' + 
    analistas.map(analista => {
      const displayValue = analista === '' ? '(Vacío)' : analista;
      const optionValue = analista === '' ? 'EMPTY' : analista;
      return `<option value="${escapeHtml(optionValue)}">${escapeHtml(displayValue)}</option>`;
    }).join('');
  
  // Diseñadores únicos (incluyendo vacíos)
  const disenadores = [...new Set(originalInventoryData.map(row => row.diseñador || ''))].sort();
  const disenadorSelect = document.getElementById('filterDisenador');
  disenadorSelect.innerHTML = '<option value="">Todos</option>' + 
    disenadores.map(disenador => {
      const displayValue = disenador === '' ? '(Vacío)' : disenador;
      const optionValue = disenador === '' ? 'EMPTY' : disenador;
      return `<option value="${escapeHtml(optionValue)}">${escapeHtml(displayValue)}</option>`;
    }).join('');
  
  // Status únicos (incluyendo vacíos)
  const statuses = [...new Set(originalInventoryData.map(row => row.ultimoStatus || ''))].sort();
  const statusSelect = document.getElementById('filterStatus');
  statusSelect.innerHTML = '<option value="">Todos</option>' + 
    statuses.map(status => {
      const displayValue = status === '' ? '(Vacío)' : status;
      const optionValue = status === '' ? 'EMPTY' : status;
      return `<option value="${escapeHtml(optionValue)}">${escapeHtml(displayValue)}</option>`;
    }).join('');
  
  // Tipos únicos (incluyendo vacíos)
  const tipos = [...new Set(originalInventoryData.map(row => row.ultimoTipo || ''))].sort();
  const tipoSelect = document.getElementById('filterTipo');
  tipoSelect.innerHTML = '<option value="">Todos</option>' + 
    tipos.map(tipo => {
      const displayValue = tipo === '' ? '(Vacío)' : tipo;
      const optionValue = tipo === '' ? 'EMPTY' : tipo;
      return `<option value="${escapeHtml(optionValue)}">${escapeHtml(displayValue)}</option>`;
    }).join('');
}

// Función para limpiar filtros
function clearInventoryFilters() {
  document.getElementById('filterAnalista').value = '';
  document.getElementById('filterDisenador').value = '';
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterTipo').value = '';
  
  // Limpiar selecciones de las tablas de stats
  clearStatsTableSelections();
  
  // Aplicar filtros vacíos (mostrar todo)
  applyInventoryFilters();
}

// Función para aplicar filtros
function applyInventoryFilters() {
  const analistaFilter = document.getElementById('filterAnalista').value;
  const disenadorFilter = document.getElementById('filterDisenador').value;
  const statusFilter = document.getElementById('filterStatus').value;
  const tipoFilter = document.getElementById('filterTipo').value;
  
  // Filtrar datos
  let filteredData = originalInventoryData.filter(row => {
    // Filtro de analista
    const analistaMatch = !analistaFilter || 
      (analistaFilter === 'EMPTY' ? (!row.analista || row.analista === '') : row.analista === analistaFilter);
    
    // Filtro de diseñador
    const disenadorMatch = !disenadorFilter || 
      (disenadorFilter === 'EMPTY' ? (!row.diseñador || row.diseñador === '') : row.diseñador === disenadorFilter);
    
    // Filtro de status
    const statusMatch = !statusFilter || 
      (statusFilter === 'EMPTY' ? (!row.ultimoStatus || row.ultimoStatus === '') : row.ultimoStatus === statusFilter);
    
    // Filtro de tipo
    const tipoMatch = !tipoFilter || 
      (tipoFilter === 'EMPTY' ? (!row.ultimoTipo || row.ultimoTipo === '') : row.ultimoTipo === tipoFilter);
    
    return analistaMatch && disenadorMatch && statusMatch && tipoMatch;
  });
  
  // Ordenar datos filtrados por fecha (más antiguos primero)
  filteredData.sort((a, b) => {
    const dateA = a.sortDate ? new Date(a.sortDate) : new Date(0);
    const dateB = b.sortDate ? new Date(b.sortDate) : new Date(0);
    return dateA - dateB;
  });
  
  // Regenerar la tabla con datos filtrados
  regenerateInventoryTable(filteredData);
  
  // Guardar estado después de aplicar filtros
  setTimeout(() => {
    saveInventoryViewState();
  }, 100);
  
  // Cerrar modal
  closeInventoryFiltersModal();
}

// Función para regenerar la tabla con datos filtrados
function regenerateInventoryTable(filteredData) {
  // Renumerar las filas filtradas
  filteredData.forEach((row, index) => {
    row.rowNumber = index + 1;
  });
  
  // Convertir datos filtrados a HTML
  const tableRows = filteredData.map(rowData => {
    if (rowData.rowType === 'direct-comment') {
      return `
        <tr class="inventory-row inventory-direct-comment" data-original-row="${rowData.originalRowIndex}">
          <td class="inventory-cell">${rowData.rowNumber}</td>
          <td class="inventory-cell inventory-item-group">${escapeHtml(rowData.id)}</td>
          <td class="inventory-cell">${escapeHtml(getObjectTypeValue(rowData))}</td>
          <td class="inventory-cell">${escapeHtml(rowData.cms)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.marca)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.titulo)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.importancia)}</td>
          <td class="inventory-cell inventory-image-empty">${escapeHtml(getImageColumnValue(rowData))}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="analista-clean" title="Click para ver historial completo">${escapeHtml(rowData.analista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-column="fecha-analista" data-comment-type="fecha-analista" title="Click para ver historial completo">${escapeHtml(rowData.primeraFechaAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-column="fecha-analista" data-comment-type="fecha-analista" title="Click para ver historial completo">${escapeHtml(rowData.ultimaFechaAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="analista-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="diseñador-clean" title="Click para ver historial completo">${escapeHtml(rowData.diseñador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-column="fecha-diseñador" data-comment-type="fecha-diseñador" title="Click para ver historial completo">${escapeHtml(rowData.ultimaFechaDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="diseñador-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-column="tipo-clean" data-comment-type="tipo-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo || '')}</td>
          <td class="inventory-cell-clean clickable-status-clean" data-column="status-clean" data-item-id="${rowData.itemId || ""}" data-item-group-id="${escapeHtml(rowData.itemGroupId || getItemGroupIdFromData(rowData) || "")}" title="Click para navegar al Item Group">${createStatusTag(rowData.ultimoStatus)}</td>
          <td class="inventory-cell">${rowData.rowNumber}</td>
        </tr>
      `;
    } else {
      return `
        <tr class="inventory-row inventory-image-comment" data-original-row="${rowData.originalRowIndex}">
          <td class="inventory-cell">${rowData.rowNumber}</td>
          <td class="inventory-cell inventory-item-group">${escapeHtml(rowData.id)}</td>
          <td class="inventory-cell">${escapeHtml(getObjectTypeValue(rowData))}</td>
          <td class="inventory-cell">${escapeHtml(rowData.cms)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.marca)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.titulo)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.importancia)}</td>
          <td class="inventory-cell inventory-image">${escapeHtml(getImageColumnValue(rowData))}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="analista-clean" title="Click para ver historial completo">${escapeHtml(rowData.analista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-column="fecha-analista" data-comment-type="fecha-analista" title="Click para ver historial completo">${escapeHtml(rowData.primeraFechaAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-column="fecha-analista" data-comment-type="fecha-analista" title="Click para ver historial completo">${escapeHtml(rowData.ultimaFechaAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="analista-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="diseñador-clean" title="Click para ver historial completo">${escapeHtml(rowData.diseñador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-column="fecha-diseñador" data-comment-type="fecha-diseñador" title="Click para ver historial completo">${escapeHtml(rowData.ultimaFechaDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="diseñador-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-column="tipo-clean" data-comment-type="tipo-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo || '')}</td>
          <td class="inventory-cell-clean clickable-status-clean" data-column="status-clean" data-item-id="${rowData.itemId || ""}" data-item-group-id="${escapeHtml(rowData.itemGroupId || getItemGroupIdFromData(rowData) || "")}" title="Click para navegar al Item Group">${createStatusTag(rowData.ultimoStatus)}</td>
          <td class="inventory-cell">${rowData.rowNumber}</td>
        </tr>
      `;
    }
  });
  
  // Actualizar la tabla en el DOM
  const tbody = document.querySelector('.image-inventory-table tbody');
  if (tbody) {
    tbody.innerHTML = tableRows.join('');
    
    // Reconfigurar event listeners
    setupInventoryClickListeners();
    setupAssignButtonListener();
    
    // Actualizar stats
    const statsElement = document.querySelector('.inventory-stats');
    if (statsElement) {
      statsElement.innerHTML = `Comentarios visibles: <strong>${filteredData.length}</strong>`;
    }
  }
}

// ===== FUNCIONES PARA MODAL DE ASIGNACIÓN DE DISEÑADORAS =====

// Modal de asignación de diseñadoras
window.openAssignDesignerModal = function() {
  // Normalizar datos existentes antes de abrir el modal
  normalizeExistingAssignments();
  
  const modal = document.getElementById('assignDesignerModal');
  updateAssignmentSummary();
  renderDesignersList();
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
};

// Función para normalizar asignaciones existentes
function normalizeExistingAssignments() {
  const designerKeys = Object.keys(USERS).filter(user => USERS[user].group === 'Diseño');
  
  originalInventoryData.forEach(row => {
    if (row.diseñador) {
      // Buscar la clave correcta en USERS
      const correctKey = designerKeys.find(key => 
        key.toLowerCase() === row.diseñador.toLowerCase()
      );
      
      if (correctKey) {
        row.diseñador = correctKey; // Usar la clave correcta con mayúscula inicial
      }
    }
  });
}

// Función para configurar el listener del botón de asignar con reintentos
function setupAssignButtonListener(attempts = 0) {
  // Solo intentar si estamos en vista de comentarios (tabla de inventario visible)
  if (!isCleanViewActive) {
    // console.log('Saltando setupAssignButtonListener - no estamos en vista de comentarios');
    return;
  }
  
  const maxAttempts = 10;
  const assignButton = document.getElementById('assignDesignerBtn');
  
  if (assignButton) {
    // Remover listener previo si existe
    assignButton.onclick = null;
    // Asignar el nuevo listener
    assignButton.onclick = openAssignDesignerModal;
    // console.log('Assign button listener attached successfully');
    return;
  }
  
  // Si no se encuentra el botón y aún tenemos intentos
  if (attempts < maxAttempts) {
    setTimeout(() => {
      setupAssignButtonListener(attempts + 1);
    }, 50);
  } else {
    // Solo mostrar warning si realmente deberíamos encontrar el botón
    if (isCleanViewActive) {
      console.warn('Assign button not found after', maxAttempts, 'attempts');
    }
  }
}

window.closeAssignDesignerModal = function() {
  const modal = document.getElementById('assignDesignerModal');
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
};

function updateAssignmentSummary() {
  const totalUnassigned = originalInventoryData.filter(row => !row.diseñador || row.diseñador.trim() === '').length;
  
  // Calcular asignaciones planificadas
  const designers = Object.keys(USERS).filter(user => USERS[user].group === 'Diseño');
  let plannedAssignments = 0;
  designers.forEach(designer => {
    const input = document.getElementById(`assignment-${designer}`);
    if (input && !input.disabled) {
      plannedAssignments += parseInt(input.value) || 0;
    }
  });
  
  const remainingUnassigned = totalUnassigned - plannedAssignments;
  
  const unassignedCountElement = document.getElementById('unassignedCount');
  unassignedCountElement.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span>Total: <strong>${totalUnassigned}</strong></span>
      <span>Sin asignar: <strong style="color: ${remainingUnassigned < 0 ? '#dc3545' : '#28a745'}">${remainingUnassigned < 0 ? remainingUnassigned : remainingUnassigned}</strong></span>
    </div>
  `;
}

function renderDesignersList() {
  const designersContainer = document.getElementById('designersList');
  const designers = Object.keys(USERS).filter(user => USERS[user].group === 'Diseño');
  
  if (!designersContainer) {
    console.error('No se encontró el contenedor designersList');
    return;
  }
  
  designersContainer.innerHTML = '';
  
  if (designers.length === 0) {
    designersContainer.innerHTML = '<p>No hay diseñadoras disponibles</p>';
    return;
  }
  
  designers.forEach(designer => {
    const assignedCount = originalInventoryData.filter(row => row.diseñador === designer).length;
    
    const designerDiv = document.createElement('div');
    designerDiv.className = 'designer-item';
    designerDiv.innerHTML = `
      <div class="designer-info">
        <label class="exclude-checkbox">
          <input type="checkbox" checked onchange="toggleDesignerExclusion('${designer}', this.checked)" id="checkbox-${designer}">
        </label>
        <span class="designer-name">${USERS[designer].name}</span>
      </div>
      <div class="designer-controls">
        <span>Asignados: ${assignedCount}</span>
        <input type="number" 
               class="assignment-input" 
               id="assignment-${designer}"
               value="0" 
               min="0"
               onchange="updateAssignmentInput('${designer}', this.value)"
               oninput="updateAssignmentInput('${designer}', this.value)">
      </div>
    `;
    
    // Hacer clickeable todo el box excepto el input
    designerDiv.addEventListener('click', function(e) {
      // No hacer nada si se clickea en el input de números
      if (e.target.classList.contains('assignment-input')) {
        return;
      }
      
      // Toggle del checkbox
      const checkbox = document.getElementById(`checkbox-${designer}`);
      checkbox.checked = !checkbox.checked;
      toggleDesignerExclusion(designer, checkbox.checked);
    });
    
    designersContainer.appendChild(designerDiv);
  });
}

window.toggleDesignerExclusion = function(designer, isIncluded) {
  const designerItem = document.querySelector(`input[id="assignment-${designer}"]`).closest('.designer-item');
  const assignmentInput = document.getElementById(`assignment-${designer}`);
  
  if (!isIncluded) { // Si NO está incluido (excluido)
    designerItem.classList.add('excluded');
    assignmentInput.disabled = true;
    assignmentInput.value = 0;
  } else { // Si está incluido
    designerItem.classList.remove('excluded');
    assignmentInput.disabled = false;
  }
  
  // Actualizar el resumen dinámicamente
  updateAssignmentSummary();
};

window.updateAssignmentInput = function(designer, value) {
  // Validación básica del input
  if (value < 0) {
    document.getElementById(`assignment-${designer}`).value = 0;
  }
  
  // Actualizar el resumen dinámicamente
  updateAssignmentSummary();
};

window.distributeEqually = function() {
  const designers = getActiveDesigners();
  const unassignedComments = originalInventoryData.filter(row => !row.diseñador || row.diseñador.trim() === '');
  
  if (designers.length === 0) {
    alert('No hay diseñadoras activas seleccionadas para la distribución.');
    return;
  }
  
  const commentsPerDesigner = Math.floor(unassignedComments.length / designers.length);
  const remainder = unassignedComments.length % designers.length;
  
  // Resetear valores de input
  designers.forEach(designer => {
    document.getElementById(`assignment-${designer}`).value = commentsPerDesigner;
  });
  
  // Distribuir comentarios restantes a las primeras diseñadoras
  for (let i = 0; i < remainder; i++) {
    const currentValue = parseInt(document.getElementById(`assignment-${designers[i]}`).value);
    document.getElementById(`assignment-${designers[i]}`).value = currentValue + 1;
  }
  
  updateAssignmentSummary();
};

// Función para obtener el número de asignaciones de un diseñador
function getAssignmentCount(designer) {
  const input = document.getElementById(`assignment-${designer}`);
  if (!input) {
    console.warn(`⚠️ Input no encontrado para diseñador: ${designer}`);
    return 0;
  }
  const value = parseInt(input.value) || 0;
  console.log(`📊 ${designer}: ${value} asignaciones`);
  return value;
}

window.applyDesignerAssignments = async function() {
  // CERRAR EL MODAL INMEDIATAMENTE para mejor UX
  try {
    closeAssignDesignerModal();
  } catch (error) {
    console.error('❌ Error cerrando modal al inicio:', error);
    const modal = document.getElementById('assignDesignerModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
  }
  
  // Mostrar notificación inmediata de que el proceso ha comenzado
  showAutoSaveNotification('Procesando asignaciones...', 'info');
  
  // LÍMITE DE SEGURIDAD para evitar bucles infinitos
  const MAX_ASSIGNMENTS = 10000;
  let assignmentCounter = 0;
  
  const designers = getActiveDesigners();
  const unassignedComments = originalInventoryData.filter(row => !row.diseñador || row.diseñador.trim() === '');
  
  // Validar que la suma de asignaciones no exceda los comentarios sin asignar
  let totalAssignments = 0;
  designers.forEach(designer => {
    const assignmentCount = getAssignmentCount(designer);
    totalAssignments += assignmentCount;
  });
  
  if (totalAssignments > unassignedComments.length) {
    alert(`Error: Estás intentando asignar ${totalAssignments} comentarios pero solo hay ${unassignedComments.length} sin asignar.`);
    return;
  }
  
  // Realizar las asignaciones
  let commentIndex = 0;
  const batchRecords = [];
  const currentUser = getCurrentUser();
  const currentUserInfo = getCurrentUserInfo();
  const formattedUserName = currentUserInfo?.name || currentUser;
  const currentDate = new Date().toLocaleString('es-ES', { 
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  designers.forEach(designer => {
    const assignmentCount = parseInt(document.getElementById(`assignment-${designer}`).value) || 0;
    console.log(`🔄 Procesando ${assignmentCount} asignaciones para ${designer}`);
    
    for (let i = 0; i < assignmentCount && commentIndex < unassignedComments.length; i++) {
      // VERIFICAR LÍMITE DE SEGURIDAD
      if (assignmentCounter >= MAX_ASSIGNMENTS) {
        console.error(`⚠️ LÍMITE DE SEGURIDAD ALCANZADO: ${MAX_ASSIGNMENTS} asignaciones`);
        break;
      }
      
      const row = unassignedComments[commentIndex];
      
      // Solo log cada 100 elementos para evitar spam
      if (commentIndex % 100 === 0 || commentIndex < 5) {
        console.log(`📝 Procesando ${commentIndex + 1}/${unassignedComments.length}: ${row.name} → ${designer}`);
      }
      
      row.diseñador = designer;
      
      // Preparar registro para batch (sin enviar individualmente)
      const record = prepareAssignmentRecord(row, formattedUserName, currentDate);
      if (record) {
        batchRecords.push(record);
      }
      
      commentIndex++;
      assignmentCounter++;
    }
  });
  
  // Enviar todas las asignaciones en un solo batch
  if (batchRecords.length > 0) {
    console.log(`🚀 Enviando ${batchRecords.length} asignaciones en batch...`);
    try {
      await sendAssignmentsBatch(batchRecords, "data-update", currentDate);
      console.log(`✅ Batch de asignaciones enviado exitosamente`);
    } catch (error) {
      console.error('❌ Error enviando batch de asignaciones:', error);
      alert('Error al guardar las asignaciones. Por favor, inténtalo de nuevo.');
      return;
    }
  }
  
  // Verificar si se alcanzó el límite de seguridad
  if (assignmentCounter >= MAX_ASSIGNMENTS) {
    alert(`⚠️ Se alcanzó el límite de seguridad de ${MAX_ASSIGNMENTS} asignaciones. Proceso detenido.`);
    return;
  }
  
  // Solo actualizar estadísticas básicas si estamos en vista de datos
  if (isCleanViewActive) {
    const box1 = document.getElementById('tree');
    const box3 = document.getElementById('box3-content');
    
    if (box1) {
      box1.innerHTML = generateDesignerStatsTable();
    }
    
    if (box3) {
      box3.innerHTML = generateAnalystStatsTable();
    }
    
    setupStatsTableListeners();
  }
  
  // Mostrar notificación de éxito
  showAutoSaveNotification(`Asignaciones completadas: ${commentIndex} elementos procesados`);
};

// Función para agregar comentario automático al asignar diseñadora
function addAssignmentComment(row) {
  console.log('📝 === INICIO addAssignmentComment ===');
  console.log('📝 Agregando comentario de asignación para:', row.name, 'ID:', row.id, 'Tipo:', row.objectType);
  console.log('📝 CommentType:', row.commentType, 'Diseñador asignado:', row.diseñador);
  
  // Buscar el comentario existente COMPLETO según el commentType
  let existingComments = '';
  
  if (row.commentType === 'item') {
    // Buscar en allLibraryData para Item Codes e Item Groups
    console.log('🔍 Buscando comentarios existentes en allLibraryData para', row.objectType, 'ID:', row.id);
    console.log('🔍 Total elementos en allLibraryData:', allLibraryData.length);
    
    // Buscar con diferentes propiedades de ID, considerando el Object Type
    let libraryItem = allLibraryData.find(item => 
      (item['Object Type'] === row.objectType) && 
      (item.ID == row.id || item.Id == row.id || item.id == row.id)
    );
    
    // Si aún no encuentra, buscar por nombre
    if (!libraryItem && row.name) {
      libraryItem = allLibraryData.find(item => 
        (item['Object Type'] === row.objectType) &&
        ((item.Name === row.name) || 
        (item.Title === row.name) ||
        (item.name === row.name))
      );
      if (libraryItem) {
        console.log('✅ Encontrado por NOMBRE en allLibraryData:', libraryItem.Name || libraryItem.Title);
      }
    }
    
    if (libraryItem) {
      existingComments = libraryItem['WA_VIS_Comment'] || '';
      console.log('✅ Encontrado en allLibraryData:', row.objectType, 'Name:', libraryItem.Name || libraryItem.Title);
      console.log('📜 Comentarios existentes encontrados:', existingComments);
      console.log('🔍 Estructura del elemento encontrado:', libraryItem);
    } else {
      console.warn('❌ No se encontró', row.objectType, 'en allLibraryData con ID:', row.id, 'ni por nombre:', row.name);
      
      // Debug: buscar elementos que contengan parte del nombre o ID
      console.log('🔍 Buscando elementos similares...');
      const similarItems = allLibraryData.filter(item => {
        const itemName = item.Name || item.Title || item.name || '';
        const itemId = item.ID || item.Id || item.id || '';
        return itemName.includes(row.name.substring(0, 5)) || 
               itemId.toString().includes(row.id.toString().substring(0, 3));
      }).slice(0, 3);
      
      console.log('🔍 Elementos similares encontrados:', similarItems);
      console.log('🔍 Verificando primeros 5 elementos de allLibraryData:');
      allLibraryData.slice(0, 5).forEach((item, idx) => {
        console.log(`   ${idx + 1}. Estructura completa:`, item);
        console.log(`   ${idx + 1}. ID: ${item.ID}, Type: ${item.ObjectTypeName}, Name: ${item.Name || item.Title}`);
        console.log(`   ${idx + 1}. Claves disponibles:`, Object.keys(item));
      });
    }
  } else if (row.commentType === 'image') {
    // Buscar en currentAssetComments para imágenes
    console.log('🔍 Buscando comentarios existentes en currentAssetComments para imagen ID:', row.id);
    const assetItem = currentAssetComments.find(asset => asset.ID == row.id);
    if (assetItem) {
      existingComments = assetItem['WA_VIS_Comment'] || '';
      console.log('✅ Encontrado en currentAssetComments:', assetItem.Name);
      console.log('📜 Comentarios existentes encontrados:', existingComments);
    } else {
      console.warn('❌ No se encontró asset en currentAssetComments con ID:', row.id);
      console.log('🔍 Verificando primeros 5 elementos de currentAssetComments:');
      currentAssetComments.slice(0, 5).forEach((asset, idx) => {
        console.log(`   ${idx + 1}. ID: ${asset.ID}, Name: ${asset.Name}`);
      });
    }
  } else {
    console.warn('⚠️ Tipo de comentario desconocido:', row.commentType);
    // Usar el comentario de la fila como fallback
    existingComments = row['WA_VIS_Comment'] || '';
    console.log('📜 Usando comentarios de fila como fallback:', existingComments);
  }
  
  // Función para obtener el último tipo de comentario de los comentarios existentes
  function getLastCommentType(commentsString) {
    if (!commentsString || !commentsString.trim()) {
      return 'General'; // Default si no hay comentarios
    }
    
    // Separar comentarios individuales por ¶
    const individualComments = commentsString.split('¶');
    if (individualComments.length === 0) {
      return 'General';
    }
    
    // Obtener el último comentario
    const lastComment = individualComments[individualComments.length - 1];
    if (!lastComment) {
      return 'General';
    }
    
    // Separar campos por ¦ (usuario¦fecha¦tipo¦texto¦status)
    const fields = lastComment.split('¦');
    if (fields.length >= 3) {
      const tipoComentario = fields[2]?.trim();
      if (tipoComentario && tipoComentario !== '') {
        return tipoComentario;
      }
    }
    
    return 'General'; // Default si no se puede extraer
  }
  
  // Obtener el último tipo de comentario usado
  const lastCommentType = getLastCommentType(existingComments);
  console.log('📝 Último tipo de comentario encontrado:', lastCommentType);
  
  // Obtener el nombre formateado del diseñador
  const formattedDesignerName = getFormattedUserName(row.diseñador);
  
  // Crear el nuevo comentario de asignación
  const assignmentComment = {
    usuario: formattedDesignerName,
    fechaHora: getLocalDateTime(),
    tipoComentario: lastCommentType, // Usar el último tipo en lugar de 'General'
    textoComentario: `Se asignó comentario a ${formattedDesignerName}`, // Texto con nombre formateado
    status: 'Diseño'
  };
  
  const newCommentString = `${assignmentComment.usuario}¦${assignmentComment.fechaHora}¦${assignmentComment.tipoComentario}¦${assignmentComment.textoComentario}¦${assignmentComment.status}`;
  console.log('🆕 Nuevo comentario creado:', newCommentString);
  
  // Combinar comentarios existentes con el nuevo
  const updatedComments = existingComments ? existingComments + '¶' + newCommentString : newCommentString;
  console.log('📋 Comentarios finales combinados:', updatedComments);
  
  // Actualizar comentarios en la fila local
  row['WA_VIS_Comment'] = updatedComments;
  console.log('✅ Comentario de asignación agregado localmente:', row.name, 'ID:', row.id);
  
  // Actualizar en la estructura de datos correcta según el commentType
  let dataUpdated = false;
  
  if (row.commentType === 'item') {
    // Actualizar en allLibraryData
    if (allLibraryData && row.id) {
      const libraryItem = allLibraryData.find(item => 
        (item['Object Type'] === row.objectType) && 
        (item.ID == row.id || item.Id == row.id)
      );
      if (libraryItem) {
        libraryItem['WA_VIS_Comment'] = updatedComments;
        console.log('✅ Comentarios actualizados en allLibraryData para', row.objectType, 'ID:', row.id, 'Name:', row.name);
        dataUpdated = true;
      } else {
        console.warn('❌ No se encontró', row.objectType, 'en allLibraryData con ID:', row.id);
      }
    }
  } else if (row.commentType === 'image') {
    // Actualizar en currentAssetComments
    if (currentAssetComments && row.id) {
      const assetItem = currentAssetComments.find(asset => asset.ID == row.id);
      if (assetItem) {
        assetItem['WA_VIS_Comment'] = updatedComments;
        console.log('✅ Comentarios actualizados en currentAssetComments para Image ID:', row.id, 'Name:', row.name);
        dataUpdated = true;
      } else {
        console.warn('❌ No se encontró asset en currentAssetComments con ID:', row.id);
      }
    }
  }
  
  // Auto-guardar el comentario usando el commentType correcto
  const currentDate = getLocalDateTime();
  const currentUser = getCurrentUser();
  const currentUserInfo = getCurrentUserInfo();
  const formattedUserName = currentUserInfo?.name || currentUser;
  
  if (row.commentType === 'item') {
    // Para Item Codes e Item Groups, crear payload directamente con ID conocido
    console.log('🎯 Auto-guardando', row.objectType, 'ID:', row.id, 'Nombre:', row.name, 'CommentType:', row.commentType);
    
    const record = {
      id: parseInt(row.id),
      objectType: row.objectType,
      attribute: 'WA_VIS_Comment',
      value: updatedComments, // Usar los comentarios combinados
      date: currentDate,
      user: formattedUserName
    };
    
    console.log('📋 Registro completo a enviar:', record);
    console.log('📊 Datos por columna que se enviarán:');
    console.log('   - ID:', record.id);
    console.log('   - Object Type:', record.objectType);
    console.log('   - Attribute:', record.attribute);
    console.log('   - Value:', record.value);
    console.log('   - Date:', record.date);
    console.log('   - User:', record.user);
    
    // Usar el sistema de cola para evitar rate limiting
    addToAutoSaveQueue(record, formattedUserName, currentDate);
    
  } else if (row.commentType === 'image') {
    // Para imágenes, usar el método original con el nombre de imagen
    const imageContext = row.imageName || (row.name + '.jpg');
    console.log('🎯 Auto-guardando imagen ID:', row.id, 'ImageName:', imageContext, 'CommentType:', row.commentType);
    console.log('📋 Comentario completo a auto-guardar:', updatedComments);
    autoSaveComment(newCommentString, 'image', imageContext, imageContext);
    
  } else {
    console.warn('⚠️ Tipo de comentario no reconocido para auto-guardado:', row.commentType);
  }
  
  console.log('💾 === FIN addAssignmentComment ===');
}

function getActiveDesigners() {
  console.log('🔍 Buscando diseñadores activos...');
  const designers = Object.keys(USERS).filter(user => USERS[user].group === 'Diseño');
  console.log('👥 Todos los diseñadores disponibles:', designers);
  
  const activeDesigners = designers.filter(designer => {
    const checkbox = document.querySelector(`input[onchange*="${designer}"]`);
    console.log(`👤 ${designer}: checkbox found=${!!checkbox}, checked=${checkbox?.checked}`);
    return checkbox && checkbox.checked; // Incluidos (checked = true)
  });
  
  console.log('✅ Diseñadores activos finales:', activeDesigners);
  return activeDesigners;
}

// Event listener para cerrar el modal de asignación al hacer clic fuera de él
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('assignment-modal')) {
    closeAssignDesignerModal();
  }
});

// ===== FUNCIONES PARA TABLAS DE ESTADÍSTICAS =====

// Función para normalizar nombres de diseñadores (manejar acentos)
function normalizeDesignerName(name) {
  if (!name) return '';
  // Crear mapeo de nombres con acentos a sin acentos
  const nameMapping = {
    'Verónica': 'Veronica',
    'Veronica': 'Veronica'
  };
  const normalized = nameMapping[name] || name;
  
  return normalized;
}

function generateDesignerStatsTable(statsData = null) {
  let designers = Object.keys(USERS).filter(user => USERS[user].group === 'Diseño').sort();
  
  // Debug: Verificar el estado del usuario actual
  console.log('🔍 DEBUG generateDesignerStatsTable - currentUser:', currentUser);
  console.log('🔍 DEBUG generateDesignerStatsTable - currentUser.group:', currentUser?.group);
  console.log('🔍 DEBUG generateDesignerStatsTable - currentUser.username:', currentUser?.username);
  
  // Filtrar diseñadores según el usuario conectado
  if (currentUser && currentUser.group === 'Diseño') {
    console.log('🔍 DEBUG - Usuario es diseñador, filtrando para mostrar solo su línea');
    const currentUsername = currentUser.username;
    console.log('🔍 DEBUG - Username actual:', currentUsername);
    console.log('🔍 DEBUG - Diseñadores disponibles:', designers);
    if (designers.includes(currentUsername)) {
      designers = [currentUsername];
      console.log('✅ DEBUG - Filtrado aplicado, solo mostrando:', currentUsername);
    } else {
      designers = [];
      console.log('⚠️ DEBUG - No se encontraron datos para el diseñador:', currentUsername);
    }
  } else {
    console.log('🔍 DEBUG - Usuario NO es diseñador o currentUser es null, mostrando todos');
  }
  
  let tableHTML = `
    <div class="stats-table-container">
      <div class="stats-header">
        <h4>Resumen Diseño</h4>
      </div>
      <table class="stats-table">
        <thead>
          <tr>
            <th>Diseño</th>
            <th>Total</th>
            <th>Act</th>
            <th>Rev</th>
            <th>Dis</th>
            <th>Com</th>
            <th>Can</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  // Variables para calcular totales
  let totalGeneral = 0;
  let totalActivos = 0;
  let totalRevision = 0;
  let totalDiseño = 0;
  let totalCancelado = 0;
  let totalCompletado = 0;
  
  designers.forEach(designer => {
    // Usar statsData temporal o fallback a statsInventoryData/originalInventoryData
    const dataSource = statsData || window.statsInventoryData || originalInventoryData || [];
    
    // Filtrar por diseñador usando normalización para manejar acentos
    const assignedItems = dataSource.filter(row => 
      normalizeDesignerName(row.diseñador) === normalizeDesignerName(designer) ||
      normalizeDesignerName(row.diseñador) === normalizeDesignerName(USERS[designer]?.name)
    );
    const total = assignedItems.length;
    
    // Revisar los status con múltiples variaciones posibles (basado en: Revision, Cancelado, Diseño, Completado)
    const revision = assignedItems.filter(row => {
      if (!row.ultimoStatus) return false;
      const status = row.ultimoStatus.toLowerCase();
      return status.includes('revision') || status.includes('revisión') || status.includes('review');
    }).length;
    
    const diseño = assignedItems.filter(row => {
      if (!row.ultimoStatus) return false;
      const status = row.ultimoStatus.toLowerCase();
      return status.includes('diseño') || status.includes('diseno') || status.includes('design');
    }).length;
    
    const cancelado = assignedItems.filter(row => {
      if (!row.ultimoStatus) return false;
      const status = row.ultimoStatus.toLowerCase();
      return status.includes('cancelado') || status.includes('cancelled') || status.includes('cancel');
    }).length;
    
    const completado = assignedItems.filter(row => {
      if (!row.ultimoStatus) return false;
      const status = row.ultimoStatus.toLowerCase();
      return status.includes('completado') || status.includes('completed') || status.includes('complete');
    }).length;
    
    // Acumular totales
    totalGeneral += total;
    totalRevision += revision;
    totalDiseño += diseño;
    totalCancelado += cancelado;
    totalCompletado += completado;
    
    // Calcular activos (Revision + Diseño)
    const activos = assignedItems.filter(row => {
      if (!row.ultimoStatus) return false;
      const status = row.ultimoStatus.toLowerCase();
      return (status.includes('revision') || status.includes('revisión') || status.includes('review')) ||
             (status.includes('diseño') || status.includes('diseno') || status.includes('design'));
    }).length;
    
    totalActivos += activos;
    
    tableHTML += `
      <tr>
        <td class="clickable-name" data-user="${designer}" data-type="designer">${USERS[designer].name}</td>
        <td class="clickable-stat" data-user="${designer}" data-status="" data-type="designer">${total}</td>
        <td class="clickable-stat" data-user="${designer}" data-status="activos" data-type="designer">${activos}</td>
        <td class="clickable-stat" data-user="${designer}" data-status="revisión" data-type="designer">${revision}</td>
        <td class="clickable-stat" data-user="${designer}" data-status="diseño" data-type="designer">${diseño}</td>
        <td class="clickable-stat" data-user="${designer}" data-status="completado" data-type="designer">${completado}</td>
        <td class="clickable-stat" data-user="${designer}" data-status="cancelado" data-type="designer">${cancelado}</td>
      </tr>
    `;
  });
  
  // Agregar la fila "Vacío" para elementos sin diseñador
  const dataSourceForEmpty = statsData || window.statsInventoryData || originalInventoryData || [];
  const emptyItems = dataSourceForEmpty.filter(row => !row.diseñador || row.diseñador === '');
  const emptyTotal = emptyItems.length;
  
  const emptyRevision = emptyItems.filter(row => {
    if (!row.ultimoStatus) return false;
    const status = row.ultimoStatus.toLowerCase();
    return status.includes('revision') || status.includes('revisión') || status.includes('review');
  }).length;
  
  const emptyDiseño = emptyItems.filter(row => {
    if (!row.ultimoStatus) return false;
    const status = row.ultimoStatus.toLowerCase();
    return status.includes('diseño') || status.includes('diseno') || status.includes('design');
  }).length;
  
  const emptyCancelado = emptyItems.filter(row => {
    if (!row.ultimoStatus) return false;
    const status = row.ultimoStatus.toLowerCase();
    return status.includes('cancelado') || status.includes('cancelled') || status.includes('cancel');
  }).length;
  
  const emptyCompletado = emptyItems.filter(row => {
    if (!row.ultimoStatus) return false;
    const status = row.ultimoStatus.toLowerCase();
    return status.includes('completado') || status.includes('completed') || status.includes('complete');
  }).length;
  
  // Calcular activos vacíos (Revision + Diseño)
  const emptyActivos = emptyItems.filter(row => {
    if (!row.ultimoStatus) return false;
    const status = row.ultimoStatus.toLowerCase();
    return (status.includes('revision') || status.includes('revisión') || status.includes('review')) ||
           (status.includes('diseño') || status.includes('diseno') || status.includes('design'));
  }).length;
  
  // Acumular totales incluyendo vacíos
  totalGeneral += emptyTotal;
  totalActivos += emptyActivos;
  totalRevision += emptyRevision;
  totalDiseño += emptyDiseño;
  totalCancelado += emptyCancelado;
  totalCompletado += emptyCompletado;
  
  tableHTML += `
    <tr>
      <td class="clickable-name" data-user="" data-type="designer">Vacío</td>
      <td class="clickable-stat" data-user="" data-status="" data-type="designer">${emptyTotal}</td>
      <td class="clickable-stat" data-user="" data-status="activos" data-type="designer">${emptyActivos}</td>
      <td class="clickable-stat" data-user="" data-status="revisión" data-type="designer">${emptyRevision}</td>
      <td class="clickable-stat" data-user="" data-status="diseño" data-type="designer">${emptyDiseño}</td>
      <td class="clickable-stat" data-user="" data-status="completado" data-type="designer">${emptyCompletado}</td>
      <td class="clickable-stat" data-user="" data-status="cancelado" data-type="designer">${emptyCancelado}</td>
    </tr>
    <tr class="total-row">
      <td>Total</td>
      <td class="clickable-stat" data-user="all" data-status="" data-type="designer">${totalGeneral}</td>
      <td class="clickable-stat" data-user="all" data-status="activos" data-type="designer">${totalActivos}</td>
      <td class="clickable-stat" data-user="all" data-status="revisión" data-type="designer">${totalRevision}</td>
      <td class="clickable-stat" data-user="all" data-status="diseño" data-type="designer">${totalDiseño}</td>
      <td class="clickable-stat" data-user="all" data-status="completado" data-type="designer">${totalCompletado}</td>
      <td class="clickable-stat" data-user="all" data-status="cancelado" data-type="designer">${totalCancelado}</td>
    </tr>
  `;
  
  tableHTML += `
        </tbody>
      </table>
    </div>
  `;
  
  return tableHTML;
}

function generateAnalystStatsTable(statsData = null) {
  let analysts = Object.keys(USERS).filter(user => USERS[user].group === 'Analistas').sort();
  
  // Debug: Verificar el estado del usuario actual
  console.log('🔍 DEBUG generateAnalystStatsTable - currentUser:', currentUser);
  console.log('🔍 DEBUG generateAnalystStatsTable - currentUser.group:', currentUser?.group);
  console.log('🔍 DEBUG generateAnalystStatsTable - currentUser.username:', currentUser?.username);
  
  // Filtrar analistas según el usuario conectado
  if (currentUser && currentUser.group === 'Analista') {
    console.log('🔍 DEBUG - Usuario es analista, filtrando para mostrar solo su línea');
    const currentUsername = currentUser.username;
    console.log('🔍 DEBUG - Username actual:', currentUsername);
    console.log('🔍 DEBUG - Analistas disponibles:', analysts);
    if (analysts.includes(currentUsername)) {
      analysts = [currentUsername];
      console.log('✅ DEBUG - Filtrado aplicado, solo mostrando:', currentUsername);
    } else {
      analysts = [];
      console.log('⚠️ DEBUG - No se encontraron datos para el analista:', currentUsername);
    }
  } else {
    console.log('🔍 DEBUG - Usuario NO es analista o currentUser es null, mostrando todos');
  }
  
  // Función para normalizar nombres de analistas (manejar acentos)
  function normalizeAnalystName(name) {
    if (!name) return '';
    // Crear mapeo de nombres con acentos a sin acentos si es necesario
    const nameMapping = {
      // Agregar mapeos si hay analistas con acentos
    };
    return nameMapping[name] || name;
  }
  
  let tableHTML = `
    <div class="stats-table-container">
      <div class="stats-header">
        <h4>Resumen Analistas</h4>
      </div>
      <table class="stats-table">
        <thead>
          <tr>
            <th>Analista</th>
            <th>Total</th>
            <th>Act</th>
            <th>Rev</th>
            <th>Dis</th>
            <th>Com</th>
            <th>Can</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  // Variables para calcular totales
  let totalGeneral = 0;
  let totalActivos = 0;
  let totalRevision = 0;
  let totalDiseño = 0;
  let totalCancelado = 0;
  let totalCompletado = 0;
  
  analysts.forEach(analyst => {
    let assignedItems;
    
    // Lógica especial para Arturo: solo contar comentarios iniciados por él
    if (analyst === 'arturo' || USERS[analyst]?.name === 'Arturo') {
      // Para Arturo, usar statsData temporal o fallback a allLibraryData
      const arturoDataSource = statsData || allLibraryData;
      assignedItems = arturoDataSource.filter(row => {
        // Para Arturo, solo contar si él inició el comentario (primer comentario en la conversación)
        if (!row['WA_VIS_Comment'] || row['WA_VIS_Comment'].trim() === '') {
          return false;
        }
        
        // Parsear los comentarios para encontrar el primero
        const comentarios = parseCommentsFromExcel(row['WA_VIS_Comment']);
        if (comentarios.length === 0) {
          return false;
        }
        
        // Verificar si el primer comentario fue de Arturo
        const primerComentario = comentarios[0];
        return primerComentario.usuario.toLowerCase() === 'arturo';
      });
      
    } else {
      // Para otros analistas, usar statsData temporal o fallback a statsInventoryData/originalInventoryData
      const dataSource = statsData || window.statsInventoryData || originalInventoryData || [];
      assignedItems = dataSource.filter(row => 
        normalizeAnalystName(row.analista) === normalizeAnalystName(analyst) ||
        normalizeAnalystName(row.analista) === normalizeAnalystName(USERS[analyst]?.name)
      );
    }
    
    const total = assignedItems.length;
    
    // Calcular estados - usar diferentes campos según la fuente de datos
    let revision, diseño, cancelado, completado, activos;
    
    if (analyst === 'arturo' || USERS[analyst]?.name === 'Arturo') {
      // Para Arturo, extraer el status del comentario en lugar de campos directos
      const itemsWithStatus = assignedItems.map(row => {
        if (!row['WA_VIS_Comment']) return { ...row, extractedStatus: null };
        
        const comentarios = parseCommentsFromExcel(row['WA_VIS_Comment']);
        // Encontrar el último comentario iniciado por Arturo
        const arturoComment = comentarios.find(comment => comment.usuario === 'Arturo');
        const extractedStatus = arturoComment ? arturoComment.status : null;
        
        return { ...row, extractedStatus };
      });
      
      revision = itemsWithStatus.filter(row => {
        if (!row.extractedStatus) return false;
        const status = row.extractedStatus.toLowerCase();
        return status.includes('revision') || status.includes('revisión') || status.includes('review');
      }).length;
      
      diseño = itemsWithStatus.filter(row => {
        if (!row.extractedStatus) return false;
        const status = row.extractedStatus.toLowerCase();
        return status.includes('diseño') || status.includes('diseno') || status.includes('design');
      }).length;
      
      cancelado = itemsWithStatus.filter(row => {
        if (!row.extractedStatus) return false;
        const status = row.extractedStatus.toLowerCase();
        return status.includes('cancelado') || status.includes('cancelled') || status.includes('cancel');
      }).length;
      
      completado = itemsWithStatus.filter(row => {
        if (!row.extractedStatus) return false;
        const status = row.extractedStatus.toLowerCase();
        return status.includes('completado') || status.includes('completed') || status.includes('complete');
      }).length;
      
      activos = itemsWithStatus.filter(row => {
        if (!row.extractedStatus) return false;
        const status = row.extractedStatus.toLowerCase();
        return (status.includes('revision') || status.includes('revisión') || status.includes('review')) ||
               (status.includes('diseño') || status.includes('diseno') || status.includes('design'));
      }).length;
      
    } else {
      // Para otros analistas, usar 'ultimoStatus' como siempre
      revision = assignedItems.filter(row => {
        if (!row.ultimoStatus) return false;
        const status = row.ultimoStatus.toLowerCase();
        return status.includes('revision') || status.includes('revisión') || status.includes('review');
      }).length;
      
      diseño = assignedItems.filter(row => {
        if (!row.ultimoStatus) return false;
        const status = row.ultimoStatus.toLowerCase();
        return status.includes('diseño') || status.includes('diseno') || status.includes('design');
      }).length;
      
      cancelado = assignedItems.filter(row => {
        if (!row.ultimoStatus) return false;
        const status = row.ultimoStatus.toLowerCase();
        return status.includes('cancelado') || status.includes('cancelled') || status.includes('cancel');
      }).length;
      
      completado = assignedItems.filter(row => {
        if (!row.ultimoStatus) return false;
        const status = row.ultimoStatus.toLowerCase();
        return status.includes('completado') || status.includes('completed') || status.includes('complete');
      }).length;
      
      activos = assignedItems.filter(row => {
        if (!row.ultimoStatus) return false;
        const status = row.ultimoStatus.toLowerCase();
        return (status.includes('revision') || status.includes('revisión') || status.includes('review')) ||
               (status.includes('diseño') || status.includes('diseno') || status.includes('design'));
      }).length;
    }
    
    // Acumular totales
    totalGeneral += total;
    totalRevision += revision;
    totalDiseño += diseño;
    totalCancelado += cancelado;
    totalCompletado += completado;
    totalActivos += activos;
    
    tableHTML += `
      <tr>
        <td class="clickable-name" data-user="${analyst}" data-type="analyst">${USERS[analyst].name}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="" data-type="analyst">${total}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="activos" data-type="analyst">${activos}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="revisión" data-type="analyst">${revision}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="diseño" data-type="analyst">${diseño}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="completado" data-type="analyst">${completado}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="cancelado" data-type="analyst">${cancelado}</td>
      </tr>
    `;
  });
  
  // CALCULAR TOTALES BASÁNDOSE EN TODO EL INVENTARIO (como en diseño)
  // Sumar elementos asignados a diseñadores + elementos vacíos de diseñador
  const allItems = statsData || window.statsInventoryData || originalInventoryData || [];
  
  // Recalcular totales usando TODO el inventario (igual que diseño)
  totalGeneral = allItems.length;
  
  totalRevision = allItems.filter(row => {
    if (!row.ultimoStatus) return false;
    const status = row.ultimoStatus.toLowerCase();
    return status.includes('revision') || status.includes('revisión') || status.includes('review');
  }).length;
  
  totalDiseño = allItems.filter(row => {
    if (!row.ultimoStatus) return false;
    const status = row.ultimoStatus.toLowerCase();
    return status.includes('diseño') || status.includes('diseno') || status.includes('design');
  }).length;
  
  totalCancelado = allItems.filter(row => {
    if (!row.ultimoStatus) return false;
    const status = row.ultimoStatus.toLowerCase();
    return status.includes('cancelado') || status.includes('cancelled') || status.includes('cancel');
  }).length;
  
  totalCompletado = allItems.filter(row => {
    if (!row.ultimoStatus) return false;
    const status = row.ultimoStatus.toLowerCase();
    return status.includes('completado') || status.includes('completed') || status.includes('complete');
  }).length;
  
  totalActivos = allItems.filter(row => {
    if (!row.ultimoStatus) return false;
    const status = row.ultimoStatus.toLowerCase();
    return (status.includes('revision') || status.includes('revisión') || status.includes('review')) ||
           (status.includes('diseño') || status.includes('diseno') || status.includes('design'));
  }).length;
  
  tableHTML += `
    <tr class="total-row">
      <td>Total</td>
      <td class="clickable-stat" data-user="all" data-status="" data-type="analyst">${totalGeneral}</td>
      <td class="clickable-stat" data-user="all" data-status="activos" data-type="analyst">${totalActivos}</td>
      <td class="clickable-stat" data-user="all" data-status="revisión" data-type="analyst">${totalRevision}</td>
      <td class="clickable-stat" data-user="all" data-status="diseño" data-type="analyst">${totalDiseño}</td>
      <td class="clickable-stat" data-user="all" data-status="completado" data-type="analyst">${totalCompletado}</td>
      <td class="clickable-stat" data-user="all" data-status="cancelado" data-type="analyst">${totalCancelado}</td>
    </tr>
  `;
  
  tableHTML += `
        </tbody>
      </table>
    </div>
  `;
  
  return tableHTML;
}

// Función para configurar event listeners de elementos clicables en la tabla de inventario
function setupClickableElements() {
  // Event listeners para comentarios clicables en la tabla de inventario
  document.querySelectorAll('.comment-indicator').forEach(indicator => {
    if (!indicator.hasAttribute('data-listener-setup')) {
      indicator.addEventListener('click', function(event) {
        event.stopPropagation();
        const context = this.getAttribute('data-context');
        if (context) {
          handleCommentClick(event, this);
        }
      });
      indicator.setAttribute('data-listener-setup', 'true');
    }
  });
  
  // Event listeners para imágenes clicables en la tabla de inventario
  document.querySelectorAll('.image-thumbnail').forEach(thumbnail => {
    if (!thumbnail.hasAttribute('data-listener-setup')) {
      thumbnail.addEventListener('click', function(event) {
        event.stopPropagation();
        const imageName = this.getAttribute('data-image-name');
        if (imageName) {
          handleImageCommentClick(event, imageName);
        }
      });
      thumbnail.setAttribute('data-listener-setup', 'true');
    }
  });
  
  // Event listeners para celdas de imagen en Item Groups
  document.querySelectorAll('.item-group-image-cell').forEach(cell => {
    if (!cell.hasAttribute('data-listener-setup')) {
      const thumbnail = cell.querySelector('.image-thumbnail');
      if (thumbnail) {
        cell.addEventListener('click', function(event) {
          event.stopPropagation();
          handleItemGroupImageAssignment(event, this, thumbnail);
        });
        cell.setAttribute('data-listener-setup', 'true');
      }
    }
  });
  
  console.log('✅ Event listeners configurados correctamente');
}

function setupStatsTableListeners() {
  // Event listeners para nombres clickeables
  document.querySelectorAll('.clickable-name').forEach(element => {
    element.addEventListener('click', function() {
      // Limpiar selecciones anteriores
      clearStatsTableSelections();
      
      // Marcar como seleccionado (temporal) y activo (persistente)
      this.classList.add('selected');
      this.classList.add('active');
      
      const user = this.dataset.user;
      const type = this.dataset.type;
      
      // Guardar el filtro activo en inventoryViewState
      if (!inventoryViewState) inventoryViewState = {};
      if (!inventoryViewState.activeFilters) inventoryViewState.activeFilters = {};
      
      if (type === 'designer') {
        inventoryViewState.activeFilters.diseñador = user;
        // Limpiar status cuando se selecciona solo usuario
        delete inventoryViewState.activeFilters.diseñadorStatus;
      } else if (type === 'analyst') {
        inventoryViewState.activeFilters.analista = user;
        // Limpiar status cuando se selecciona solo usuario  
        delete inventoryViewState.activeFilters.analistaStatus;
      }
      
      filterInventoryByUser(user, type);
    });
  });
  
  // Event listeners para estadísticas clickeables
  document.querySelectorAll('.clickable-stat').forEach(element => {
    element.addEventListener('click', function() {
      // Limpiar selecciones anteriores
      clearStatsTableSelections();
      
      // Marcar como seleccionado (temporal) y activo (persistente)
      this.classList.add('selected');
      this.classList.add('active');
      
      const user = this.dataset.user;
      const status = this.dataset.status;
      const type = this.dataset.type;
      
      // Guardar el filtro activo en inventoryViewState
      if (!inventoryViewState) inventoryViewState = {};
      if (!inventoryViewState.activeFilters) inventoryViewState.activeFilters = {};
      
      if (type === 'designer') {
        inventoryViewState.activeFilters.diseñador = user;
        inventoryViewState.activeFilters.diseñadorStatus = status;
      } else if (type === 'analyst') {
        inventoryViewState.activeFilters.analista = user;
        inventoryViewState.activeFilters.analistaStatus = status;
      }
      
      filterInventoryByUserAndStatus(user, status, type);
    });
  });
}

function clearStatsTableSelections() {
  // CORREGIDO: No limpiar selecciones si se está actualizando después de comentarios
  if (window.isUpdatingCommentTables) {
    console.log('🚫 clearStatsTableSelections cancelado - se está actualizando después de comentarios');
    return;
  }
  
  // Limpiar solo las selecciones temporales (selected), mantener las activas (active) hasta que se establezca nueva
  document.querySelectorAll('.clickable-name.selected, .clickable-stat.selected').forEach(element => {
    element.classList.remove('selected');
  });
  
  // Limpiar las clases active de filtros anteriores SOLAMENTE al establecer un nuevo filtro
  document.querySelectorAll('.clickable-name.active, .clickable-stat.active').forEach(element => {
    element.classList.remove('active');
  });
}

function filterInventoryByUser(user, type) {
  // Filtrar por usuario (analista o diseñador) siempre desde datos originales
  let filteredData;
  
  if (user === 'all') {
    // Mostrar todos los datos para todos los usuarios
    filteredData = originalInventoryData;
  } else if (type === 'designer') {
    // Filtrar por diseñador específico o vacío
    if (user === '') {
      filteredData = originalInventoryData.filter(row => !row.diseñador || row.diseñador === '');
    } else {
      // Usar normalización para manejar acentos en nombres de diseñadores
      filteredData = originalInventoryData.filter(row => 
        normalizeDesignerName(row.diseñador) === normalizeDesignerName(user) ||
        normalizeDesignerName(row.diseñador) === normalizeDesignerName(USERS[user]?.name)
      );
    }
  } else if (type === 'analyst') {
    // Filtrar por analista específico o vacío
    if (user === '') {
      filteredData = originalInventoryData.filter(row => !row.analista || row.analista === '');
    } else {
      // Usar nombre capitalizado del usuario para comparar con comentarios
      const userCapitalized = USERS[user]?.name || user;
      filteredData = originalInventoryData.filter(row => 
        row.analista === user || row.analista === userCapitalized
      );
    }
  }
  
  updateInventoryDisplay(filteredData);
  saveInventoryViewState(); // Guardar estado después del filtro
}

function filterInventoryByUserAndStatus(user, status, type) {
  let filteredData;
  
  // Manejar caso especial de "all" (todos los usuarios)
  if (user === 'all') {
    filteredData = [...originalInventoryData]; // Usar todos los datos
  } else if (user === '' && type === 'designer') {
    // Manejar caso especial de "Vacío" (elementos sin diseñador asignado)
    filteredData = originalInventoryData.filter(row => !row.diseñador || row.diseñador === '');
  } else if (user === '' && type === 'analyst') {
    // Manejar caso especial de "Vacío" (elementos sin analista asignado)
    filteredData = originalInventoryData.filter(row => !row.analista || row.analista === '');
  } else {
    // Filtrar por usuario específico
    if (type === 'designer') {
      // Usar normalización para manejar acentos en nombres de diseñadores
      filteredData = originalInventoryData.filter(row => 
        normalizeDesignerName(row.diseñador) === normalizeDesignerName(user) ||
        normalizeDesignerName(row.diseñador) === normalizeDesignerName(USERS[user]?.name)
      );
    } else if (type === 'analyst') {
      // Usar nombre capitalizado del usuario para comparar con comentarios
      const userCapitalized = USERS[user]?.name || user;
      filteredData = originalInventoryData.filter(row => 
        row.analista === user || row.analista === userCapitalized
      );
    }
  }
  
  // Si hay un status específico, filtrar también por status usando la misma lógica que las tablas
  if (status && status !== '') {
    
    filteredData = filteredData.filter(row => {
      if (!row.ultimoStatus) return false;
      const rowStatus = row.ultimoStatus.toLowerCase();
      
      switch(status.toLowerCase()) {
        case 'activos':
        case 'act':
          return (rowStatus.includes('revision') || rowStatus.includes('revisión') || rowStatus.includes('review')) ||
                 (rowStatus.includes('diseño') || rowStatus.includes('diseno') || rowStatus.includes('design'));
        case 'diseño':
        case 'dis':
          return rowStatus.includes('diseño') || rowStatus.includes('diseno') || rowStatus.includes('design');
        case 'revisión':
        case 'revision':
        case 'rev':
          return rowStatus.includes('revision') || rowStatus.includes('revisión') || rowStatus.includes('review');
        case 'cancelado':
        case 'cancel':
        case 'can':
          return rowStatus.includes('cancelado') || rowStatus.includes('cancelled') || rowStatus.includes('cancel');
        case 'completado':
        case 'completed':
        case 'com':
          return rowStatus.includes('completado') || rowStatus.includes('completed') || rowStatus.includes('complete');
        default:
          return rowStatus.includes(status.toLowerCase());
      }
    });
  }
  
  updateInventoryDisplay(filteredData);
  saveInventoryViewState(); // Guardar estado después del filtro
}

function clearInventoryFilter() {
  // CORREGIDO: No limpiar filtros si se está actualizando después de comentarios
  if (window.isUpdatingCommentTables) {
    console.log('🚫 clearInventoryFilter (función local) cancelado - se está actualizando después de comentarios');
    return;
  }
  
  console.log('🧹 === LIMPIANDO FILTROS - Nueva versión con commentedItemsData ===');
  
  // Limpiar también los filtros del modal
  document.getElementById('filterAnalyst').value = '';
  document.getElementById('filterDesigner').value = '';
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterItemGroup').value = '';
  
  // Limpiar selecciones de las tablas de stats
  clearStatsTableSelections();
  
  // NUEVO: Limpiar filtros y regenerar tabla completa
  console.log('📋 Restaurando vista completa desde commentedItemsData...');
  
  // Limpiar filtros en el estado
  if (inventoryViewState) {
    inventoryViewState.activeFilters = {};
    inventoryViewState.dropdownFilters = {};
  }
  
  // Limpiar también filtros de localStorage
  localStorage.removeItem('lastActiveFilters');
  console.log('🧹 Filtros limpiados de localStorage');
  
  // Regenerar tabla completa sin filtros
  regenerateInventoryTableFromCommentedData();
  
  console.log('✅ Filtros limpiados - tabla regenerada desde commentedItemsData');
}

function updateInventoryDisplay(filteredData) {
  // En lugar de reemplazar todo el box4, vamos a actualizar solo la tabla de inventario
  // manteniendo la estructura y funcionalidad original
  
  // Si no hay datos, mostrar mensaje
  if (!filteredData || filteredData.length === 0) {
    const inventoryTable = document.querySelector('.image-inventory-table tbody');
    if (inventoryTable) {
      inventoryTable.innerHTML = '<tr><td colspan="17" style="text-align: center; color: #666;">No hay datos que coincidan con el filtro actual</td></tr>';
    }
    return;
  }
  
  // NO modificar originalInventoryData, solo usar los datos filtrados para mostrar
  updateInventoryTableDirectly(filteredData);
  
  // Limpiar los filtros del estado guardado
  inventoryViewState.dropdownFilters = {
    analista: '',
    disenador: '',
    status: '',
    tipo: ''
  };
  
  // Guardar estado después de actualizar el display
  setTimeout(() => {
    saveInventoryViewState();
  }, 100);
}

// Función para obtener Item Group ID desde la columna "Item Groups" para item codes
function getItemGroupIdFromData(rowData) {
  // Buscar Item Groups en diferentes formatos posibles
  const possibleKeys = ['Item Groups', 'itemGroups', 'Item_Groups', 'ItemGroups'];
  let itemGroupsValue = null;
  
  for (const key of possibleKeys) {
    if (rowData[key] && rowData[key] !== 'undefined' && rowData[key] !== '"undefined"') {
      itemGroupsValue = rowData[key];
      break;
    }
  }
  
  // Si no tiene itemGroupId pero sí tiene Item Groups
  if (!rowData.itemGroupId && itemGroupsValue) {
    const itemGroups = String(itemGroupsValue).trim();
    
    // Si hay múltiples valores separados por comas, tomar el primero
    if (itemGroups.includes(',')) {
      const firstItemGroup = itemGroups.split(',')[0].trim();
      return firstItemGroup;
    } else if (itemGroups !== '') {
      return itemGroups;
    }
  }
  
  return '';
}

function updateInventoryTableDirectly(filteredData) {
  console.log('🔄 === INICIO updateInventoryTableDirectly ===');
  console.log('📊 Datos recibidos:', filteredData.length, 'elementos');
  
  // Función para obtener el ID del asset basado en el nombre de la imagen
  function getAssetId(imageName) {
    if (!currentAssetComments || !imageName || imageName.trim() === '') {
      return '';
    }
    
    const searchName = imageName.trim();
    
    const asset = currentAssetComments.find(asset => 
      asset.Name === searchName
    );
    
    if (asset) {
      // Usar el campo ID (mayúscula) que contiene el ID específico de la imagen
      const result = asset.ID;
      return result ? result.toString().trim() : '';
    } else {
      return '';
    }
  }

  // Buscar la tabla de inventario existente
  const inventoryTable = document.querySelector('.image-inventory-table tbody');
  
  if (!inventoryTable) {
    console.log('No se encontró la tabla de inventario');
    return;
  }
  
  // Limpiar contenido actual
  inventoryTable.innerHTML = '';
  
  if (!filteredData || filteredData.length === 0) {
    inventoryTable.innerHTML = '<tr><td colspan="17" class="no-data">No hay datos que coincidan con el filtro seleccionado.</td></tr>';
    return;
  }
  
  // Regenerar filas usando la misma lógica que la tabla original
  filteredData.forEach((rowData, index) => {
    const row = document.createElement('tr');
    row.className = 'inventory-row';
    row.setAttribute('data-original-row', rowData.originalRowIndex || index);
    
    // Determinar el ID correcto: solo si Object Type será 'Image'
    const objectTypeValue = getObjectTypeValue(rowData);
    const displayId = (objectTypeValue === 'Image') 
      ? (getAssetId(rowData.imageName) || rowData.id || rowData.itemGroupId || '')
      : (rowData.id || rowData.itemGroupId || '');

    // DEBUG: calcular el Item Group ID que se usará
    const itemGroupIdForClick = rowData.itemGroupId || getItemGroupIdFromData(rowData) || '';

    row.innerHTML = `
      <td class="inventory-cell">${index + 1}</td>
      <td class="inventory-cell inventory-item-group">${escapeHtml(displayId)}</td>
      <td class="inventory-cell">${escapeHtml(getObjectTypeValue(rowData))}</td>
      <td class="inventory-cell">${escapeHtml(rowData.cms || '')}</td>
      <td class="inventory-cell">${escapeHtml(rowData.marca || '')}</td>
      <td class="inventory-cell">${escapeHtml(rowData.titulo || '')}</td>
      <td class="inventory-cell">${escapeHtml(rowData.importancia || '')}</td>
      <td class="inventory-cell inventory-image">${escapeHtml(getImageColumnValue(rowData))}</td>
      <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName || ''}" data-item-name="${rowData.itemName || ''}" data-item-id="${rowData.itemId || ''}" data-comment-type="analista-clean" title="Click para ver historial completo">${escapeHtml(rowData.analista || '')}</td>
      <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-column="fecha-analista" data-comment-type="fecha-analista" title="Click para ver historial completo">${escapeHtml(rowData.primeraFechaAnalista || '')}</td>
      <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-column="fecha-analista" data-comment-type="fecha-analista" title="Click para ver historial completo">${escapeHtml(rowData.ultimaFechaAnalista || '')}</td>
      <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName || ''}" data-item-name="${rowData.itemName || ''}" data-item-id="${rowData.itemId || ''}" data-comment-type="analista-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista || '')}</td>
      <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName || ''}" data-item-name="${rowData.itemName || ''}" data-item-id="${rowData.itemId || ''}" data-comment-type="diseñador-clean" title="Click para ver historial completo">${escapeHtml(rowData.diseñador || '')}</td>
      <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-column="fecha-diseñador" data-comment-type="fecha-diseñador" title="Click para ver historial completo">${escapeHtml(rowData.ultimaFechaDisenador || '')}</td>
      <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName || ''}" data-item-name="${rowData.itemName || ''}" data-item-id="${rowData.itemId || ''}" data-comment-type="diseñador-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador || '')}</td>
      <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName || ''}" data-item-name="${rowData.itemName || ''}" data-item-id="${rowData.itemId || ''}" data-column="tipo-clean" data-comment-type="tipo-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo || '')}</td>
      <td class="inventory-cell-clean clickable-status-clean" data-column="status-clean" data-item-id="${rowData.itemId || ""}" data-item-group-id="${escapeHtml(itemGroupIdForClick)}" title="Click para navegar al Item Group">${createStatusTag(rowData.ultimoStatus)}</td>
    `;
    
    inventoryTable.appendChild(row);
  });
  
  // Actualizar estadísticas
  const statsElement = document.querySelector('.inventory-stats');
  if (statsElement) {
    statsElement.innerHTML = `Comentarios visibles: <strong>${filteredData.length}</strong>`;
  }
  
  // Reconfigurar event listeners
  setTimeout(() => {
    setupInventoryClickListeners();
    setupAssignButtonListener();
  }, 100);
  
  console.log('✅ === FIN updateInventoryTableDirectly - Tabla actualizada con', filteredData.length, 'filas ===');
}

window.clearInventoryFilter = function() {
  // CORREGIDO: No limpiar filtros si se está actualizando después de comentarios
  if (window.isUpdatingCommentTables) {
    console.log('🚫 clearInventoryFilter cancelado - se está actualizando después de comentarios');
    return;
  }
  
  console.log('🧹 === LIMPIANDO FILTROS (función global) - Nueva versión con commentedItemsData ===');
  
  // Limpiar selecciones de las tablas de stats
  clearStatsTableSelections();
  
  // NUEVO: Limpiar filtros en inventoryViewState y regenerar tabla completa
  console.log('📋 Restaurando vista completa desde commentedItemsData...');
  
  // Limpiar filtros en el estado
  if (inventoryViewState) {
    inventoryViewState.activeFilters = {};
    inventoryViewState.dropdownFilters = {};
  }
  
  // Regenerar tabla completa sin filtros usando la función de regeneración
  regenerateInventoryTableFromCommentedData();
  
  // ✅ GUARDAR ESTADO SIN FILTROS - Limpiar filtros activos
  console.log('🧹 Guardando estado SIN filtros');
  if (inventoryViewState) {
    inventoryViewState.activeFilters = {};
    inventoryViewState.dropdownFilters = {};
    // Mantener posición de scroll pero limpiar filtros
    inventoryViewState.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    inventoryViewState.scrollPositionX = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Guardar estado limpio en localStorage
    saveInventoryViewState();
    console.log('✅ Estado sin filtros guardado:', inventoryViewState);
  }
};

// Función para restaurar visualmente las selecciones de filtros después de regenerar tablas
function restoreVisualFilterSelections() {
  try {
    if (!inventoryViewState || !inventoryViewState.activeFilters) {
      console.log('📝 No hay filtros activos para restaurar visualmente');
      return;
    }
    
    const activeFilters = inventoryViewState.activeFilters;
    console.log('🎨 Restaurando selecciones visuales para filtros:', activeFilters);
    
    // Restaurar selección de analista
    if (activeFilters.analista) {
      const analistaElements = document.querySelectorAll(`[data-user="${activeFilters.analista}"][data-type="analyst"]`);
      analistaElements.forEach(element => {
        element.classList.add('active');
        console.log('✅ Restaurada selección visual de analista:', activeFilters.analista);
      });
    }
    
    // Restaurar selección de diseñador
    if (activeFilters.diseñador) {
      const disenadorElements = document.querySelectorAll(`[data-user="${activeFilters.diseñador}"][data-type="designer"]`);
      disenadorElements.forEach(element => {
        element.classList.add('active');
        console.log('✅ Restaurada selección visual de diseñador:', activeFilters.diseñador);
      });
    }
    
    // Restaurar selección de status de analista
    if (activeFilters.analistaStatus) {
      const statusElements = document.querySelectorAll(`[data-user="${activeFilters.analista}"][data-status="${activeFilters.analistaStatus}"][data-type="analyst"]`);
      statusElements.forEach(element => {
        element.classList.add('active');
        console.log('✅ Restaurada selección visual de status analista:', activeFilters.analistaStatus);
      });
    }
    
    // Restaurar selección de status de diseñador
    if (activeFilters.diseñadorStatus) {
      const statusElements = document.querySelectorAll(`[data-user="${activeFilters.diseñador}"][data-status="${activeFilters.diseñadorStatus}"][data-type="designer"]`);
      statusElements.forEach(element => {
        element.classList.add('active');
        console.log('✅ Restaurada selección visual de status diseñador:', activeFilters.diseñadorStatus);
      });
    }
    
  } catch (error) {
    console.error('❌ Error restaurando selecciones visuales:', error);
  }
}

function restoreStatsTableFilters() {
  try {
    // BANDERA: Evitar restauración durante actualización de comentarios
    console.log('🔍 BANDERA CHECK: isUpdatingCommentTables =', window.isUpdatingCommentTables);
    if (window.isUpdatingCommentTables) {
      console.log('⏸️ SALTANDO restauración de filtros - actualización de comentarios en progreso');
      return;
    }
    
    const savedState = localStorage.getItem('inventoryViewState');
    if (!savedState) return;
    
    const inventoryViewState = JSON.parse(savedState);
    
    if (inventoryViewState.activeFilters && Object.keys(inventoryViewState.activeFilters).length > 0) {
      
      // Restaurar filtro de analista
      if (inventoryViewState.activeFilters.analista) {
        console.log('🔍 Buscando elementos de analista:', inventoryViewState.activeFilters.analista);
        const analistaElements = document.querySelectorAll('[data-type="analyst"][data-user="' + inventoryViewState.activeFilters.analista + '"]');
        console.log('📊 Elementos de analista encontrados:', analistaElements.length);
        
        analistaElements.forEach((element, index) => {
          console.log(`📊 Elemento ${index}:`, {
            user: element.dataset.user,
            status: element.dataset.status,
            type: element.dataset.type,
            hasStatus: !!inventoryViewState.activeFilters.analistaStatus,
            expectedStatus: inventoryViewState.activeFilters.analistaStatus,
            isClickableName: element.classList.contains('clickable-name'),
            isClickableStat: element.classList.contains('clickable-stat')
          });
          
          // Si hay status específico, buscar el elemento con ese status
          if (inventoryViewState.activeFilters.analistaStatus && element.dataset.status === inventoryViewState.activeFilters.analistaStatus) {
            console.log('✅ RESTAURANDO filtro de analista con status:', element.dataset.user, element.dataset.status);
            element.click();
          } else if (!inventoryViewState.activeFilters.analistaStatus && element.classList.contains('clickable-name')) {
            console.log('✅ RESTAURANDO filtro de analista:', element.dataset.user);
            element.click();
          }
        });
      }
      
      // Restaurar filtro de diseñador
      if (inventoryViewState.activeFilters.diseñador) {
        console.log('🔍 Buscando elementos de diseñador:', inventoryViewState.activeFilters.diseñador);
        const designerElements = document.querySelectorAll('[data-type="designer"][data-user="' + inventoryViewState.activeFilters.diseñador + '"]');
        console.log('📊 Elementos de diseñador encontrados:', designerElements.length);
        
        designerElements.forEach((element, index) => {
          console.log(`📊 Elemento ${index}:`, {
            user: element.dataset.user,
            status: element.dataset.status,
            type: element.dataset.type,
            hasStatus: !!inventoryViewState.activeFilters.diseñadorStatus,
            expectedStatus: inventoryViewState.activeFilters.diseñadorStatus,
            isClickableName: element.classList.contains('clickable-name'),
            isClickableStat: element.classList.contains('clickable-stat')
          });
          
          // Si hay status específico, buscar el elemento con ese status
          if (inventoryViewState.activeFilters.diseñadorStatus && element.dataset.status === inventoryViewState.activeFilters.diseñadorStatus) {
            console.log('✅ RESTAURANDO filtro de diseñador con status:', element.dataset.user, element.dataset.status);
            element.click();
          } else if (!inventoryViewState.activeFilters.diseñadorStatus && element.classList.contains('clickable-name')) {
            console.log('✅ RESTAURANDO filtro de diseñador:', element.dataset.user);
            element.click();
          }
        });
      }
    } else {
      console.log('ℹ️ No hay filtros de tablas para restaurar');
    }
  } catch (error) {
    console.error('❌ Error restaurando filtros de tablas:', error);
  }
}

// ===== FUNCIONES PARA GUARDAR EN GOOGLE SHEETS =====

// Función de prueba simple
async function testConnection() {
  try {
    const testData = {
      user: 'data-update',
      records: [{
        id: 'TEST001',
        objectType: 'Test',
        attribute: 'WA_Test',
        value: 'test-value',
        date: getLocalDateTime(),
        user: 'data-update'
      }]
    };
    
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    alert('✅ Petición enviada! Revisa tu Google Sheet para confirmar que llegaron los datos.');
    
  } catch (error) {
    if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
      try {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = GOOGLE_APPS_SCRIPT_URL;
        form.target = '_blank';
        form.style.display = 'none';
        
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'data';
        input.value = JSON.stringify(testData);
        
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        
        alert('✅ Datos enviados usando método alternativo. Revisa la nueva pestaña y tu Google Sheet.');
        
      } catch (formError) {
        alert(`❌ Error: ${error.message}\n\nPuedes probar abriendo la URL manualmente en el navegador.`);
      }
    } else {
      alert(`❌ Error: ${error.message}`);
    }
  }
}

async function saveToGoogleSheets() {
  try {
    // Verificar que tengamos la URL del Apps Script
    if (GOOGLE_APPS_SCRIPT_URL === 'TU_URL_DE_APPS_SCRIPT_AQUI') {
      alert('Error: URL de Google Apps Script no configurada. Contacta al administrador.');
      return;
    }
    
    // Obtener usuario actual
    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert('Error: No hay usuario seleccionado');
      return;
    }
    
    // Recopilar datos visibles (del visualizador - SOLO imágenes, NO comentarios)
    const visibleData = collectVisibleData();
    
    // IMPORTANTE: Los comentarios (WA_VIS_Comment) se auto-guardan individualmente cuando se crean
    // Esta función solo maneja los datos del visualizador (imágenes de galerías, covers, etc.)
    
    if (visibleData.length === 0) {
      alert('No hay cambios del visualizador para guardar.\n\nℹ️ Nota: Los comentarios se guardan automáticamente cuando los escribes.');
      return;
    }
    
    console.log(`📊 Total de datos del visualizador a guardar: ${visibleData.length}`);
    
    // Mostrar progreso
    const saveBtn = document.getElementById('saveChangesButton');
    if (saveBtn) {
      const originalText = saveBtn.innerHTML;
      saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
      saveBtn.disabled = true;
      
      try {
        // Usar la función unificada que sabemos que funciona
        const success = await saveToVisSandra(visibleData, 'manual');
        
        if (success) {
          console.log(`✅ ${visibleData.length} registros guardados exitosamente en vis-sandra`);
        } else {
          throw new Error('Error en el guardado unificado');
        }
      } catch (error) {
        console.error('❌ Error en saveToGoogleSheets:', error);
        alert(`❌ Error al guardar: ${error.message}`);
      } finally {
        // Restaurar botón
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
      }
    } else {
      // Si no hay botón (diseñador), solo hacer el guardado
      try {
        const success = await saveToVisSandra(visibleData, 'manual');
        
        if (success) {
          console.log(`✅ ${visibleData.length} registros guardados exitosamente en vis-sandra`);
        } else {
          throw new Error('Error en el guardado unificado');
        }
      } catch (error) {
        console.error('❌ Error en saveToGoogleSheets:', error);
        alert(`❌ Error al guardar: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Error general en saveToGoogleSheets:', error);
    alert(`❌ Error: ${error.message}`);
  }
}

// Función para auto-guardar un comentario individual inmediatamente después de crearlo
function autoSaveComment(newComment, type, imageName = null, context = null) {
  console.log('🚀 === INICIO autoSaveComment ===');
  console.log('📝 DEBUG - newComment recibido:', newComment);
  console.log('📝 DEBUG - type:', type);
  console.log('📝 DEBUG - imageName:', imageName);
  console.log('📝 DEBUG - context:', context);
  
  const currentDate = getLocalDateTime();
  const currentUser = getCurrentUser();
  const currentUserInfo = getCurrentUserInfo();
  const formattedUserName = currentUserInfo?.name || currentUser;
  
  // Obtener comentarios actualizados (que ya incluyen el nuevo comentario)
  let completeCommentHistory = '';
  
  if (type === 'image' && imageName) {
    // Para imágenes, obtener comentarios actualizados directamente de los datos ya modificados
    console.log('📝 DEBUG - Buscando comentarios actualizados para imagen:', imageName);
    
    // PASO 1: Buscar en currentWorkingData primero (donde se agregó el comentario)
    let imageInCurrentWorking = currentWorkingData.find(item => 
      item['Object Type'] === 'Image' && item.Name === imageName
    );
    
    if (imageInCurrentWorking && imageInCurrentWorking['WA_VIS_Comment']) {
      completeCommentHistory = imageInCurrentWorking['WA_VIS_Comment'];
      console.log('✅ DEBUG - Comentarios encontrados en currentWorkingData:', completeCommentHistory);
    } else {
      // PASO 2: Buscar en allLibraryData como respaldo
      let imageInAllLibrary = allLibraryData.find(item => 
        item['Object Type'] === 'Image' && item.Name === imageName
      );
      
      if (imageInAllLibrary && imageInAllLibrary['WA_VIS_Comment']) {
        completeCommentHistory = imageInAllLibrary['WA_VIS_Comment'];
        console.log('✅ DEBUG - Comentarios encontrados en allLibraryData:', completeCommentHistory);
      } else {
        console.log('❌ DEBUG - No se encontraron comentarios para imagen:', imageName);
      }
    }
  } else {
    // Para Item Groups/Codes, buscar en los datos usando el contexto
    if (context) {
      let itemId = null;
      let searchItem = null;
      
      // Verificar si es un contexto complejo de Item Code (formato: "Item Group (ID) | Item Code | Marca")
      if (typeof context === 'string' && context.includes(' | ')) {
        const parts = context.split(' | ');
        if (parts.length >= 2) {
          // Es un Item Code - buscar por nombre en la parte [1]
          const itemCodeName = parts[1];
          
          // Buscar en allLibraryData por nombre
          searchItem = allLibraryData.find(item => item.Name === itemCodeName || item['Item Code'] === itemCodeName);
          if (searchItem) {
            itemId = searchItem.Id;
            console.log('✅ Item Code encontrado - Nombre:', itemCodeName, 'ID:', itemId);
          }
        }
      } else {
        // Contexto simple - extraer ID del formato "nombre (id)"
        if (typeof context === 'string' && context.includes('(') && context.includes(')')) {
          const match = context.match(/\((\d+)\)/);
          if (match) {
            itemId = match[1];
          }
        } else if (typeof context === 'object' && context.id) {
          itemId = context.id;
        }
        
        console.log('🔍 Contexto simple, buscando item con ID:', itemId);
        
        if (itemId) {
          // Buscar en allLibraryData
          searchItem = allLibraryData.find(item => item.Id == itemId);
        } else if (typeof context === 'string') {
          // Si no hay ID, buscar por nombre directamente
          console.log('🔍 No se pudo extraer ID del contexto, buscando por nombre:', context);
          searchItem = allLibraryData.find(item => 
            item['Object Type'] === 'Item Code' && 
            (item.Name === context || item['Item Code'] === context)
          );
          if (searchItem) {
            itemId = searchItem.Id;
            console.log('✅ Item Code encontrado por nombre - Nombre:', context, 'ID:', itemId);
          }
        }
      }
      
      // Obtener comentarios del item encontrado
      if (searchItem && searchItem['WA_VIS_Comment']) {
        completeCommentHistory = searchItem['WA_VIS_Comment'];
        console.log('✅ Comentarios encontrados en allLibraryData:', completeCommentHistory);
      } else if (searchItem) {
        console.log('ℹ️ Item encontrado pero sin comentarios:', searchItem.Name || searchItem.Id);
      } else {
        console.log('❌ No se encontró item para contexto:', context);
      }
    }
    
    console.log('📜 Historial completo de comentarios (ya actualizado):', completeCommentHistory);
  }
  
  // Crear registro con el historial completo
  const record = {
    id: null,
    objectType: null,
    attribute: 'WA_VIS_Comment',
    value: completeCommentHistory,
    date: currentDate,
    user: formattedUserName
  };
  
  if (type === 'image' && imageName) {
    // Comentario de imagen - buscar asset usando la función mejorada
    console.log('🔍 Buscando asset para imagen:', imageName);
    let asset = findImageAssetByName(imageName);
    
    if (asset && asset.ID) {
      record.id = asset.ID;
      record.objectType = 'Image';
      console.log('✅ Asset válido con ID:', asset.ID);
    } else {
      // Crear un nuevo registro de imagen con ID consistente
      const newImageId = generateConsistentImageId(imageName);
      record.id = newImageId;
      record.objectType = 'Image';
      
      console.log('🔢 Creando nuevo registro de imagen con ID consistente:', newImageId);
      
      // Agregar a currentAssetComments para futuras referencias
      const newImageAsset = {
        Name: imageName,
        'Object Type': 'Image',
        'WA_VIS_Comment': completeCommentHistory,
        ID: newImageId,
        Id: newImageId
      };
      
      currentAssetComments.push(newImageAsset);
      console.log('✅ Nuevo asset de imagen creado y agregado a currentAssetComments');
    }
  } else {
    // Comentario de Item Group o Item Code - usar contexto
    if (context) {
      let itemId = null;
      let targetItem = null;
      
      // Verificar si es un contexto complejo de Item Code (formato: "Item Group (ID) | Item Code | Marca")
      if (typeof context === 'string' && context.includes(' | ')) {
        const parts = context.split(' | ');
        if (parts.length >= 2) {
          // Es un Item Code - buscar por nombre en la parte [1]
          const itemCodeName = parts[1];
          console.log('🔍 Contexto de Item Code detectado para guardar, buscando por nombre:', itemCodeName);
          
          // Buscar en allLibraryData por nombre
          targetItem = allLibraryData.find(item => item.Name === itemCodeName || item['Item Code'] === itemCodeName);
          if (targetItem) {
            itemId = targetItem.Id;
            console.log('✅ Item Code encontrado para guardar - Nombre:', itemCodeName, 'ID:', itemId);
          }
        }
      } else {
        // Contexto simple - extraer ID del formato "nombre (id)"
        if (typeof context === 'string' && context.includes('(') && context.includes(')')) {
          const match = context.match(/\((\d+)\)/);
          if (match) {
            itemId = match[1];
          }
        } else if (typeof context === 'object' && context.id) {
          itemId = context.id;
        }
        
        console.log('🔍 Contexto simple para guardar, usando ID:', itemId);
        
        if (itemId) {
          // Buscar en allLibraryData para determinar el tipo
          targetItem = allLibraryData.find(item => item.Id == itemId);
        }
      }
      
      if (targetItem && itemId) {
        record.id = itemId;
        record.objectType = targetItem['Object Type'] || 'Item Code'; // Asumir Item Code por defecto
        console.log('✅ Item encontrado para guardar - ID:', itemId, 'Tipo:', record.objectType);
      } else {
        console.warn('❌ No se encontró item para contexto:', context);
        showAutoSaveNotification('Error: No se encontró item', 'error');
        return;
      }
    } else {
      console.warn('❌ No se proporcionó contexto para comentario');
      showAutoSaveNotification('Error: No se pudo determinar contexto', 'error');
      return;
    }
  }
  
  console.log('📋 Registro a enviar:', record);
  console.log('📊 Datos por columna que se enviarán:');
  console.log('   - ID:', record.id);
  console.log('   - Object Type:', record.objectType);  
  console.log('   - Attribute:', record.attribute);
  console.log('   - Value:', record.value);
  console.log('   - Date:', record.date);
  console.log('   - User:', record.user);
  
  // Enviar a Google Sheets
  const payload = {
    records: [record],
    user: formattedUserName,
    date: currentDate,
    type: 'comment_autosave'
  };
  
  // Usar el sistema de cola para evitar rate limiting
  addToAutoSaveQueue(record, formattedUserName, currentDate);
}

// Función para mostrar notificación discreta de auto-guardado
function showAutoSaveNotification(message, type = 'success') {
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = `autosave-notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'success' ? '#6c757d' : type === 'warning' ? '#ffc107' : '#dc3545'};
    color: ${type === 'warning' ? '#000' : 'white'};
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s ease;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    max-width: 250px;
  `;
  
  // Agregar al DOM
  document.body.appendChild(notification);
  
  // Mostrar con animación
  setTimeout(() => {
    notification.style.opacity = '1';
  }, 100);
  
  // Ocultar y remover después del tiempo apropiado
  const displayTime = type === 'warning' ? 3000 : 2000; // Más tiempo para warnings
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, displayTime);
}

// Función para obtener solo los Item Codes que están visualmente visibles (no filtrados)
function getVisibleItemCodes() {
  if (!currentItemCodes || currentItemCodes.length === 0) {
    return [];
  }
  
  // Buscar el grid actual
  const currentGrid = document.querySelector('#imageGridContainer');
  if (!currentGrid) {
    console.log('⚠️ No se encontró grid actual, retornando todos los Item Codes');
    return currentItemCodes;
  }
  
  // Obtener todas las celdas de Item Code que están visibles
  const visibleItemCodes = [];
  const itemCodeCells = currentGrid.querySelectorAll('.item-code-cell');
  
  itemCodeCells.forEach(cell => {
    // Verificar si la celda está visible (no oculta por filtros)
    const parentRow = cell.closest('.table-row');
    if (parentRow && parentRow.style.display !== 'none') {
      const itemCodeName = cell.getAttribute('data-item-code');
      
      // Buscar el Item Code en los datos
      const itemData = currentItemCodes.find(item => 
        item.Name === itemCodeName || item['Item Code'] === itemCodeName
      );
      
      if (itemData) {
        visibleItemCodes.push(itemData);
      }
    }
  });
  
  console.log(`📊 Item Codes visibles: ${visibleItemCodes.length} de ${currentItemCodes.length} totales`);
  return visibleItemCodes;
}

// Función para detectar secciones vacías y crear registros <EMPTY>
function createEmptyRecords(itemData, currentDate, formattedUserName) {
  const emptyRecords = [];
  const itemId = itemData['Id'];
  const objectType = itemData['Object Type'] || 'Item Code';
  
  // Definir las secciones y sus atributos
  const sections = {
    cover: ['WA_Cover_Image_01', 'WA_Cover_Image_02', 'WA_Cover_Image_03', 'WA_Cover_Image_04', 'WA_Cover_Image_05'],
    gallery: ['WA_Gallery_01', 'WA_Gallery_02', 'WA_Gallery_03', 'WA_Gallery_04', 'WA_Gallery_05', 'WA_Gallery_06', 'WA_Gallery_07', 'WA_Gallery_08', 'WA_Gallery_09', 'WA_Gallery_10', 'WA_Gallery_11', 'WA_Gallery_12', 'WA_Gallery_13', 'WA_Gallery_14', 'WA_Gallery_15', 'WA_Gallery_16', 'WA_Gallery_17', 'WA_Gallery_18', 'WA_Gallery_19', 'WA_Gallery_20'],
    rest: ['WA_Rest_01', 'WA_Rest_02', 'WA_Rest_03', 'WA_Rest_04', 'WA_Rest_05', 'WA_Rest_06', 'WA_Rest_07', 'WA_Rest_08', 'WA_Rest_09', 'WA_Rest_10']
  };
  
  // Para Item Groups, solo verificar Gallery
  if (objectType === 'Item Group') {
    const sectionToCheck = { gallery: sections.gallery };
    
    Object.entries(sectionToCheck).forEach(([sectionName, attributes]) => {
      const hasAnyImage = attributes.some(attr => {
        const value = itemData[attr];
        return value && value.toString().trim() !== '' && value !== '-' && 
               !value.includes('logo_img_blank') && !value.includes('prod_img_blank');
      });
      
      if (!hasAnyImage) {
        console.log(`🗂️ Item Group ${itemData['Name'] || itemId}: Sección ${sectionName} completamente vacía, creando registro <EMPTY>`);
        emptyRecords.push({
          id: itemId,
          objectType: objectType,
          attribute: attributes[0], // WA_Gallery_01
          value: '<EMPTY>',
          date: currentDate,
          user: formattedUserName
        });
      }
    });
  } else {
    // Para Item Codes, verificar todas las secciones
    Object.entries(sections).forEach(([sectionName, attributes]) => {
      const hasAnyImage = attributes.some(attr => {
        const value = itemData[attr];
        return value && value.toString().trim() !== '' && value !== '-' && 
               !value.includes('logo_img_blank') && !value.includes('prod_img_blank');
      });
      
      if (!hasAnyImage) {
        console.log(`📋 Item Code ${itemData['Name'] || itemId}: Sección ${sectionName} completamente vacía, creando registro <EMPTY>`);
        emptyRecords.push({
          id: itemId,
          objectType: objectType,
          attribute: attributes[0], // WA_Cover_Image_01, WA_Gallery_01, o WA_Rest_01
          value: '<EMPTY>',
          date: currentDate,
          user: formattedUserName
        });
      }
    });
  }
  
  return emptyRecords;
}

function collectVisibleData() {
  // Sincronizar datos del grid con currentWorkingData antes de recopilar
  updateCurrentWorkingDataWithGridStateImmediate();
  
  const records = [];
  const currentDate = getLocalDateTime();
  const currentUser = getCurrentUser();
  const currentUserInfo = getCurrentUserInfo();
  const formattedUserName = currentUserInfo?.name || currentUser;
  
  console.log('=== INICIANDO RECOPILACIÓN DE DATOS VISIBLES ===');
  
  // PASO 1: Recopilar datos del Item Group actual
  if (currentItemGroup) {
    const itemGroupId = currentItemGroup['Id'];
    const itemGroupName = currentItemGroup['Name'];
    
    console.log(`\n🏷️ Procesando Item Group: ${itemGroupName} (ID: ${itemGroupId})`);
    
    // IMPORTANTE: Combinar datos originales del Item Group con modificaciones de currentWorkingData
    const updatesFromWorkingData = currentWorkingData.find(item => 
      item['Id'] == itemGroupId || item['ID'] == itemGroupId
    );
    
    // Crear objeto combinado: datos originales + modificaciones
    const updatedItemGroup = { ...currentItemGroup };
    if (updatesFromWorkingData) {
      // Aplicar solo las modificaciones que existen en currentWorkingData
      Object.keys(updatesFromWorkingData).forEach(key => {
        if (updatesFromWorkingData[key] !== undefined) {
          updatedItemGroup[key] = updatesFromWorkingData[key];
        }
      });
    }
    
    let groupRecordCount = 0;
    
    // Recopilar campos WA del Item Group (EXCLUYENDO comentarios que se auto-guardan)
    WA_ATTRIBUTES.forEach(attribute => {
      // Saltar WA_VIS_Comment porque se auto-guarda cuando se crean comentarios
      if (attribute === 'WA_VIS_Comment') {
        return;
      }
      
      if (updatedItemGroup[attribute] !== undefined && updatedItemGroup[attribute] !== null) {
        const value = updatedItemGroup[attribute].toString().trim();
        if (value && 
            value !== '' && 
            value !== '-' && 
            !value.includes('logo_img_blank') &&
            !value.includes('prod_img_blank')) {
          
          groupRecordCount++;
          
          if (attribute.includes('Comment')) {
            console.log(`💬 Item Group Comentario: ${attribute} = "${value}"`);
          } else {
            console.log(`🖼️ Item Group Imagen: ${attribute} = "${value}"`);
          }
          
          records.push({
            id: itemGroupId,
            objectType: 'Item Group',
            attribute: attribute,
            value: value,
            date: currentDate,
            user: formattedUserName
          });
        }
      }
    });
    
    console.log(`✅ Item Group ${itemGroupName}: ${groupRecordCount} registros recopilados`);
    
    // Verificar secciones vacías del Item Group y crear registros <EMPTY>
    const emptyGroupRecords = createEmptyRecords(updatedItemGroup, currentDate, formattedUserName);
    records.push(...emptyGroupRecords);
    
    if (emptyGroupRecords.length > 0) {
      console.log(`🗂️ Item Group ${itemGroupName}: ${emptyGroupRecords.length} registros <EMPTY> agregados`);
    }
  }
  
  // PASO 2: Recopilar datos de Item Codes visibles (solo los que no están ocultos por filtros)
  if (!currentItemCodes || currentItemCodes.length === 0) {
    console.log('❌ No hay currentItemCodes disponibles');
    return records;
  }
  
  console.log(`\n🔍 Item Codes totales: ${currentItemCodes.length}`);
  
  // Obtener solo los Item Codes que están visualmente visibles (no filtrados)
  const visibleItemCodes = getVisibleItemCodes();
  console.log(`\n🔍 Item Codes visibles después de filtros: ${visibleItemCodes.length}`);
  
  // Procesar solo los Item Codes visibles
  visibleItemCodes.forEach(itemData => {
    const itemId = itemData['Id'];
    const itemCodeName = itemData['Name']; // Ej: "61-251-105"
    const objectType = itemData['Object Type'] || 'Unknown';
    
    console.log(`\n📋 Procesando Item Code VISIBLE: ${itemCodeName} (ID: ${itemId})`);
    
    if (itemId) {
      let itemRecordCount = 0;
      
      // IMPORTANTE: Combinar datos originales con modificaciones de currentWorkingData
      const updatesFromWorkingData = currentWorkingData.find(item => 
        item['Id'] == itemId || item['ID'] == itemId
      );
      
      // Crear objeto combinado: datos originales + modificaciones
      const updatedItemData = { ...itemData };
      if (updatesFromWorkingData) {
        // Aplicar solo las modificaciones que existen en currentWorkingData
        Object.keys(updatesFromWorkingData).forEach(key => {
          if (updatesFromWorkingData[key] !== undefined) {
            updatedItemData[key] = updatesFromWorkingData[key];
          }
        });
      }
      
      // Recopilar TODOS los campos WA que tengan cualquier valor (EXCLUYENDO comentarios que se auto-guardan)
      WA_ATTRIBUTES.forEach(attribute => {
        // Saltar WA_VIS_Comment porque se auto-guarda cuando se crean comentarios
        if (attribute === 'WA_VIS_Comment') {
          return;
        }
        
        if (updatedItemData[attribute] !== undefined && updatedItemData[attribute] !== null) {
          const value = updatedItemData[attribute].toString().trim();
          if (value && 
              value !== '' && 
              value !== '-' && 
              !value.includes('logo_img_blank') &&
              !value.includes('prod_img_blank')) {
            
            itemRecordCount++;
            
            if (attribute.includes('Comment')) {
              console.log(`💬 Item Code Comentario: ${attribute} = "${value}"`);
            } else {
              console.log(`🖼️ Item Code Imagen: ${attribute} = "${value}"`);
            }
            
            records.push({
              id: itemId,
              objectType: objectType,
              attribute: attribute,
              value: value,
              date: currentDate,
              user: formattedUserName
            });
          }
        }
      });
      
      console.log(`✅ ${itemCodeName}: ${itemRecordCount} registros recopilados`);
      
      // Verificar secciones vacías del Item Code y crear registros <EMPTY>
      const emptyItemRecords = createEmptyRecords(updatedItemData, currentDate, formattedUserName);
      records.push(...emptyItemRecords);
      
      if (emptyItemRecords.length > 0) {
        console.log(`📋 Item Code ${itemCodeName}: ${emptyItemRecords.length} registros <EMPTY> agregados`);
      }
    }
  });
  
  // NOTA: Los comentarios de imágenes se auto-guardan cuando se crean,
  // por lo que no necesitamos recopilarlos aquí en el guardado principal.
  
  return records;
}

function collectImageAssignments(gridItem, itemId, objectType, currentDate, currentUser, records) {
  // Buscar todas las imágenes asignadas en el grid item
  const imageSlots = gridItem.querySelectorAll('.image-slot, .gallery-slot, .cover-slot, .rest-slot, img[src]');
  
  imageSlots.forEach(slot => {
    let img = slot;
    let slotAttribute = '';
    
    // Si el slot contiene una imagen, obtenerla
    if (slot.tagName !== 'IMG') {
      img = slot.querySelector('img');
      slotAttribute = slot.dataset.attribute || slot.dataset.slot || slot.className;
    }
    
    if (img && img.src && !img.src.includes('placeholder') && !img.src.includes('blank') && !img.src.includes('logo_img_blank')) {
      // Intentar obtener el atributo del slot o del elemento padre
      if (!slotAttribute) {
        slotAttribute = img.dataset.attribute || img.dataset.slot;
        if (!slotAttribute) {
          // Buscar en elementos padre
          let parent = img.parentElement;
          while (parent && !slotAttribute && parent !== gridItem) {
            slotAttribute = parent.dataset.attribute || parent.dataset.slot;
            parent = parent.parentElement;
          }
        }
      }
      
      // Si encontramos un atributo WA válido
      if (slotAttribute && WA_ATTRIBUTES.includes(slotAttribute)) {
        const imageName = extractImageName(img.src);
        
        records.push({
          id: itemId,
          objectType: objectType,
          attribute: slotAttribute,
          value: imageName,
          date: currentDate,
          user: currentUser
        });
      }
    }
  });
}

function collectVisibleCommentsAndImages(gridItem, itemData, itemId, objectType, currentDate, currentUser, records) {
  // Solo recopilar datos de campos que tengan valores y no sean placeholders
  WA_ATTRIBUTES.forEach(attribute => {
    if (itemData[attribute]) {
      const value = itemData[attribute].toString().trim();
      if (value && value !== '' && value !== '-' && !value.includes('logo_img_blank')) {
        records.push({
          id: itemId,
          objectType: objectType,
          attribute: attribute,
          value: value,
          date: currentDate,
          user: currentUser
        });
      }
    }
  });
}

function collectCommentsAndImages(itemData, itemId, objectType, currentDate, currentUser, records) {
  // Esta función mantiene compatibilidad pero sin logs
  WA_ATTRIBUTES.forEach(attribute => {
    if (itemData[attribute]) {
      const value = itemData[attribute].toString().trim();
      if (value && value !== '' && value !== '-' && !value.includes('logo_img_blank')) {
        records.push({
          id: itemId,
          objectType: objectType,
          attribute: attribute,
          value: value,
          date: currentDate,
          user: currentUser
        });
      }
    }
  });
}

function collectComments(itemData, itemId, objectType, currentDate, currentUser, records) {
  // Buscar campos de comentarios en los datos del item
  WA_ATTRIBUTES.forEach(attribute => {
    if (attribute.includes('Comment') && itemData[attribute]) {
      const commentValue = itemData[attribute].toString().trim();
      if (commentValue && commentValue !== '' && commentValue !== '-') {
        records.push({
          id: itemId,
          objectType: objectType,
          attribute: attribute,
          value: commentValue,
          date: currentDate,
          user: currentUser
        });
      }
    }
  });
  
  // También buscar imágenes asignadas en los datos actuales
  WA_ATTRIBUTES.forEach(attribute => {
    if (!attribute.includes('Comment') && itemData[attribute]) {
      const imageValue = itemData[attribute].toString().trim();
      if (imageValue && imageValue !== '' && imageValue !== '-' && !imageValue.includes('logo_img_blank')) {
        records.push({
          id: itemId,
          objectType: objectType,
          attribute: attribute,
          value: imageValue,
          date: currentDate,
          user: currentUser
        });
      }
    }
  });
}

function extractImageName(imageSrc) {
  // Extraer solo el nombre del archivo de la URL
  try {
    const url = new URL(imageSrc);
    const pathname = url.pathname;
    return pathname.split('/').pop() || imageSrc;
  } catch (error) {
    // Si no es una URL válida, usar el src completo
    return imageSrc.split('/').pop() || imageSrc;
  }
}

function createStatusTag(status) {
  if (!status) return "<span class=\"status-tag\">-</span>";
  
  const s = status.toLowerCase();
  let c = "default"; // Cambiar valor por defecto
  
  // Mapear status a clases CSS apropiadas
  if (s.includes("diseño") || s.includes("diseno") || s.includes("design")) {
    c = "diseno";
  } else if (s.includes("revision") || s.includes("revisión") || s.includes("review")) {
    c = "revision";
  } else if (s.includes("cancelado") || s.includes("cancelled") || s.includes("cancel")) {
    c = "cancelado";
  } else if (s.includes("completado") || s.includes("completed") || s.includes("complete")) {
    c = "completado";
  } else if (s.includes("analista") || s.includes("analyst")) {
    c = "analista";
  } else {
    // Para otros status, usar una clase genérica
    c = "default";
  }
  
  // console.log(`🏷️ createStatusTag: "${status}" → clase "${c}"`); // Comentado para evitar spam
  return `<span class="status-tag ${c}">${status}</span>`;
}

// Funciones para guardar y restaurar estado de scroll y filtros
function saveInventoryViewState() {
  try {
    
    const inventoryWrapper = document.querySelector('.inventory-table-wrapper');
    if (inventoryWrapper) {
      inventoryViewState.scrollPosition = inventoryWrapper.scrollTop;
      inventoryViewState.scrollPositionX = inventoryWrapper.scrollLeft;
    }
    
    // Guardar filtros de dropdown
    const dropdownFilters = {
      analista: '',
      disenador: '',
      status: '',
      tipo: ''
    };
    
    const analistaFilter = document.getElementById('filterAnalista');
    const disenadorFilter = document.getElementById('filterDisenador');
    const statusFilter = document.getElementById('filterStatus');
    const tipoFilter = document.getElementById('filterTipo');
    
    // Solo actualizar si los elementos existen (modal abierto)
    if (analistaFilter) {
      dropdownFilters.analista = analistaFilter.value;
    } else if (inventoryViewState.dropdownFilters) {
      // Mantener valores previos si el modal no está abierto
      dropdownFilters.analista = inventoryViewState.dropdownFilters.analista || '';
    }
    
    if (disenadorFilter) {
      dropdownFilters.disenador = disenadorFilter.value;
    } else if (inventoryViewState.dropdownFilters) {
      dropdownFilters.disenador = inventoryViewState.dropdownFilters.disenador || '';
    }
    
    if (statusFilter) {
      dropdownFilters.status = statusFilter.value;
    } else if (inventoryViewState.dropdownFilters) {
      dropdownFilters.status = inventoryViewState.dropdownFilters.status || '';
    }
    
    if (tipoFilter) {
      dropdownFilters.tipo = tipoFilter.value;
    } else if (inventoryViewState.dropdownFilters) {
      dropdownFilters.tipo = inventoryViewState.dropdownFilters.tipo || '';
    }
    
    inventoryViewState.dropdownFilters = dropdownFilters;
    console.log('🔧 Filtros dropdown guardados:', dropdownFilters);
    
    // Guardar filtros de tablas de estadísticas
    // Buscar elementos seleccionados (.active)
    const selectedElements = document.querySelectorAll('.clickable-name.active, .clickable-stat.active');
    console.log('🔍 Elementos seleccionados encontrados:', selectedElements.length);
    
    // NO guardar filtros activos - siempre usar filtro automático predeterminado
    console.log('� NO guardando filtros activos - se usará filtro automático predeterminado');
    const activeFilters = {};
    
    // Extraer filtros desde elementos activos del DOM
    selectedElements.forEach(element => {
      const user = element.getAttribute('data-user');
      const status = element.getAttribute('data-status');
      const type = element.getAttribute('data-type');
      
      if (user && type === 'analyst') {
        activeFilters.analista = user;
        if (status) {
          activeFilters.analistaStatus = status;
        }
      } else if (user && type === 'designer') {
        activeFilters.diseñador = user;
        if (status) {
          activeFilters.diseñadorStatus = status;
        }
      }
    });
    
    // Sincronizar con unifiedViewState si está disponible
    if (unifiedViewState && unifiedViewState.tables && unifiedViewState.tables.comments) {
      const unifiedFilters = unifiedViewState.tables.comments.filters || {};
      Object.assign(activeFilters, unifiedFilters);
    }
    
    inventoryViewState.activeFilters = activeFilters;
    console.log('📊 Filtros de tablas guardados (preservados):', activeFilters);
    
    localStorage.setItem('inventoryViewState', JSON.stringify(inventoryViewState));
    console.log('✅ Estado guardado exitosamente');
  } catch (error) {
    console.error('❌ Error guardando estado:', error);
  }
}


// Función para obtener filtros activos de tablas
function getActiveTableFilters() {
  try {
    if (inventoryViewState && inventoryViewState.activeFilters) {
      return inventoryViewState.activeFilters;
    }
    return {};
  } catch (error) {
    console.error('❌ Error obteniendo filtros activos:', error);
    return {};
  }
}

function restoreInventoryViewState() {
  console.log('📍 Restaurando SOLO posición del scroll (no filtros - se usará filtro automático)');
  
  try {
    const savedState = localStorage.getItem('inventoryViewState');
    if (savedState) {
      inventoryViewState = JSON.parse(savedState);
      
      // Restaurar SOLO scroll positions
      setTimeout(() => {
        const inventoryWrapper = document.querySelector('.inventory-table-wrapper');
        if (inventoryWrapper && inventoryViewState.scrollPosition > 0) {
          console.log('📍 Restaurando scroll vertical:', inventoryViewState.scrollPosition);
          inventoryWrapper.scrollTop = inventoryViewState.scrollPosition;
        }
        if (inventoryWrapper && inventoryViewState.scrollPositionX > 0) {
          console.log('📍 Restaurando scroll horizontal:', inventoryViewState.scrollPositionX);
          inventoryWrapper.scrollLeft = inventoryViewState.scrollPositionX;
        }
      }, 100);
    }
  } catch (error) {
    console.error('❌ Error restaurando estado del inventario:', error);
  }
}

// Función para deshacer todos los cambios en el Item Group actual
function undoAllChanges() {
  try {
    if (!originalItemGroupState) {
      console.log('❌ No hay estado original guardado para deshacer');
      return;
    }
    
    console.log('🔄 Deshaciendo cambios del Item Group...');
    
    // Obtener SOLO los Item Codes que están visibles según filtros
    const visibleItemCodes = getVisibleItemCodes();
    const visibleItemCodeNames = visibleItemCodes.map(item => item.Name || item['Item Code']);
    console.log('Item Codes visibles por filtro:', visibleItemCodeNames.length);
    
    if (visibleItemCodeNames.length === 0) {
      console.log('⚠️ No hay Item Codes visibles para deshacer');
      return;
    }
    
    // Restaurar solo los Item Codes visibles en currentItemCodes
    const originalItemCodes = originalItemGroupState.currentItemCodes;
    currentItemCodes = currentItemCodes.map(currentItem => {
      const itemName = currentItem.Name || currentItem['Item Code'];
      
      // Si este Item Code está visible, restaurar desde el estado original
      if (visibleItemCodeNames.includes(itemName)) {
        const originalItem = originalItemCodes.find(orig => 
          (orig.Name || orig['Item Code']) === itemName
        );
        return originalItem ? JSON.parse(JSON.stringify(originalItem)) : currentItem;
      }
      
      // Si no está visible, mantener el estado actual
      return currentItem;
    });
    
    // Restaurar solo los Item Codes visibles en currentWorkingData  
    const originalWorkingData = originalItemGroupState.currentWorkingData;
    currentWorkingData = currentWorkingData.map(currentItem => {
      if (currentItem['Object Type'] === 'Item Code') {
        const itemName = currentItem.Name || currentItem['Item Code'];
        
        // Si este Item Code está visible, restaurar desde el estado original
        if (visibleItemCodeNames.includes(itemName)) {
          const originalItem = originalWorkingData.find(orig => 
            orig['Object Type'] === 'Item Code' && 
            (orig.Name || orig['Item Code']) === itemName
          );
          return originalItem ? JSON.parse(JSON.stringify(originalItem)) : currentItem;
        }
      }
      
      // Para otros tipos de objetos o Item Codes no visibles, mantener estado actual
      return currentItem;
    });
    
    // Restaurar otras variables globales (estas no se filtran por Item Code)
    currentImageColumns = JSON.parse(JSON.stringify(originalItemGroupState.currentImageColumns));
    currentItemGroup = JSON.parse(JSON.stringify(originalItemGroupState.currentItemGroup));
    
    // Regenerar la grilla con el estado restaurado
    regenerateImageGrid();
    
    console.log(`✅ ${visibleItemCodeNames.length} Item Codes visibles restaurados al estado original`);
    
  } catch (error) {
    console.error('❌ Error deshaciendo cambios:', error);
  }
}

// ===== FUNCIONES PARA FILTROS CLICKEABLES EN TABLAS DE ESTADÍSTICAS =====

// Flag para evitar configurar event listeners múltiples veces
let statsTableClickEventsConfigured = false;

function setupStatsTableClickEvents() {
  if (logFunctionCall('setupStatsTableClickEvents')) return;
  
  console.log('🔧 setupStatsTableClickEvents llamada');
  
  // GUARD: Solo configurar una vez
  if (statsTableClickEventsConfigured) {
    console.log('🚫 Event listeners ya configurados - saltando');
    return;
  }
  
  console.log('🔧 Configurando event listeners para tablas de estadísticas (primera vez)...');
  
  // Limpiar event listeners existentes (por seguridad)
  document.removeEventListener('click', handleStatsTableClick);
  document.addEventListener('click', handleStatsTableClick);
  
  // Marcar como configurado
  statsTableClickEventsConfigured = true;
  console.log('✅ Event listeners configurados y marcados como completados');
}

// Variable para controlar debounce de clicks
let lastStatsClickTime = 0;
const STATS_CLICK_DEBOUNCE = 300; // Reducido de 500ms a 300ms

function handleStatsTableClick(event) {
  const clickedElement = event.target;
  
  // Verificar si se clickeó un elemento clickeable de las tablas de estadísticas
  if (clickedElement.classList.contains('clickable-name') || clickedElement.classList.contains('clickable-stat')) {
    
    // DEBOUNCE: Prevenir múltiples clicks rápidos
    const now = Date.now();
    if (now - lastStatsClickTime < STATS_CLICK_DEBOUNCE) {
      console.log('🚫 DEBOUNCED: Click muy rápido, ignorando');
      return;
    }
    lastStatsClickTime = now;
    
    event.preventDefault();
    event.stopPropagation();
    
    // 🚨 CANCELAR INMEDIATAMENTE CUALQUIER TIMEOUT PENDIENTE
    if (statsUpdateTimeout) {
      clearTimeout(statsUpdateTimeout);
      statsUpdateTimeout = null;
      console.log('❌ CANCELED: Timeout de estadísticas cancelado por filtro');
    }
    
    // MARCAR ACTIVIDAD DE FILTROS PARA BLOQUEAR ACTUALIZACIONES AUTOMÁTICAS
    window.recentFilterActivity = Date.now();
    console.log('🚨 FILTER ACTIVITY MARKED:', window.recentFilterActivity);
    
    console.log('📊 Click en elemento de tabla de estadísticas:', clickedElement);
    
    const userKey = clickedElement.getAttribute('data-user');
    const status = clickedElement.getAttribute('data-status');
    const type = clickedElement.getAttribute('data-type'); // 'designer' o 'analyst'
    
    console.log('🎯 Filtro solicitado:', { userKey, status, type });
    
    // Verificar que estamos en vista de datos limpia
    if (!isCleanViewActive) {
      console.log('⚠️ Filtro solo disponible en vista de datos (Clean View)');
      alert('Los filtros de resumen solo funcionan en la vista de datos. Por favor activa la vista de datos primero.');
      return;
    }
    
    // Aplicar el filtro
    applyStatsTableFilter(userKey, status, type);
  }
}

function applyStatsTableFilter(userKey, status, type) {
  if (logFunctionCall('applyStatsTableFilter')) return;
  
  // 🚨 DEBUG: Ver qué parámetros estamos recibiendo
  console.log('🚨 DEBUG applyStatsTableFilter recibió:', { userKey, status, type });
  
  // PROTECCIÓN ADICIONAL: No ejecutar si ya hay una operación de filtro en progreso
  if (window.isApplyingStatsFilter) {
    console.log('🚫 BLOCKED: applyStatsTableFilter ya está ejecutándose');
    return;
  }
  
  window.isApplyingStatsFilter = true;
  
  // NUEVO SISTEMA: Actualizar estado unificado con filtros
  console.log('🔧 Aplicando filtro unificado:', { userKey, status, type });
  
  // Guardar filtros en el estado unificado
  if (type === 'analyst') {
    const newFilters = {
      analista: userKey === 'all' ? null : userKey,
      analistaStatus: status || null
    };
    console.log('🚨 DEBUG: Guardando filtros de analista:', newFilters);
    unifiedViewState.tables.comments.filters = newFilters;
  } else if (type === 'designer') {
    const newFilters = {
      diseñador: userKey === 'all' ? null : userKey,
      diseñadorStatus: status || null
    };
    console.log('🚨 DEBUG: Guardando filtros de diseñador:', newFilters);
    unifiedViewState.tables.comments.filters = newFilters;
  }
  
  // Compatibilidad: También actualizar inventoryViewState para funciones legacy
  if (!inventoryViewState.activeFilters) {
    inventoryViewState.activeFilters = {};
  }
  
  if (type === 'analyst') {
    inventoryViewState.activeFilters.analista = userKey === 'all' ? null : userKey;
    inventoryViewState.activeFilters.analistaStatus = status || null;
    // Limpiar filtros de diseñador
    delete inventoryViewState.activeFilters.diseñador;
    delete inventoryViewState.activeFilters.diseñadorStatus;
  } else if (type === 'designer') {
    inventoryViewState.activeFilters.diseñador = userKey === 'all' ? null : userKey;
    inventoryViewState.activeFilters.diseñadorStatus = status || null;
    // Limpiar filtros de analista
    delete inventoryViewState.activeFilters.analista;
    delete inventoryViewState.activeFilters.analistaStatus;
  }
  
  // USAR NUEVO SISTEMA: Regenerar todas las tablas con filtros
  try {
    console.log('🔄 Usando sistema unificado para aplicar filtros...');
    
    // Marcar que debemos preservar estado
    unifiedViewState.preserveState = true;
    
    // Regenerar todas las tablas con el nuevo filtro
    setTimeout(() => {
      regenerateAllTablesWithState();
      window.isApplyingStatsFilter = false;
    }, 100);
    
  } catch (error) {
    console.error('❌ Error aplicando filtro unificado:', error);
    
    // FALLBACK: Usar sistema legacy si falla el nuevo
    console.log('⚠️ Fallback al sistema legacy...');
    
    // Continuar con lógica legacy (código original resumido)
    legacyApplyStatsTableFilter(userKey, status, type);
    
    window.isApplyingStatsFilter = false;
  }
}

/**
 * Función legacy de aplicación de filtros (como fallback)
 */
function legacyApplyStatsTableFilter(userKey, status, type) {
  console.log('🔄 Ejecutando lógica legacy de filtros...');
  
  // Aplicar filtros usando el sistema legacy original
  try {
    // Configurar inventoryViewState con el filtro solicitado
    if (!inventoryViewState) {
      inventoryViewState = { activeFilters: {}, dropdownFilters: {} };
    }
    if (!inventoryViewState.activeFilters) {
      inventoryViewState.activeFilters = {};
    }
    
    // Limpiar filtros anteriores
    inventoryViewState.activeFilters = {};
    
    // Configurar filtro actual
    if (type === 'analyst') {
      inventoryViewState.activeFilters.analista = userKey === 'all' ? null : userKey;
      if (status && status !== '') {
        inventoryViewState.activeFilters.analistaStatus = status;
      }
    } else if (type === 'designer') {
      inventoryViewState.activeFilters.diseñador = userKey === 'all' ? null : userKey;
      if (status && status !== '') {
        inventoryViewState.activeFilters.diseñadorStatus = status;
      }
    }
    
    // Aplicar filtros usando función legacy
    if (commentedItemsData && commentedItemsData.length > 0) {
      let filteredData = [...commentedItemsData];
      
      // Aplicar filtros básicos
      if (userKey !== 'all') {
        if (type === 'analyst') {
          filteredData = filteredData.filter(item => item.ultimoAnalista === userKey);
        } else if (type === 'designer') {
          filteredData = filteredData.filter(item => item.ultimoDisenador === userKey);
        }
      }
      
      // Regenerar tabla con datos filtrados
      const box4Content = document.getElementById('box4-content');
      if (box4Content) {
        const convertedData = filteredData.map(item => item.originalItem);
        const newTableHTML = generateImageInventoryTable(convertedData, true, true);
        box4Content.innerHTML = newTableHTML;
        
        // Reconfigurar event listeners
        setTimeout(() => {
          setupInventoryClickListeners();
        }, 100);
      }
    }
    
    // Marcar elemento activo visualmente
    markStatsElementAsActive(userKey, status, type);
    
  } catch (error) {
    console.error('❌ Error en fallback legacy:', error);
  }
}

function applyStatsTableFilter(userKey, status, type) {
  if (!userKey && !status) {
    console.warn('⚠️ No se proporcionaron parámetros de filtro');
    return;
  }

  console.log(`🎯 === INICIO FILTRO DE ESTADÍSTICAS ===`);
  console.log(`Usuario: ${userKey}, Status: ${status}, Tipo: ${type}`);
  console.log(`Vista activa: ${isCleanViewActive ? 'Limpia' : 'Normal'}`);

  // Verificar si la aplicación está en un estado válido para filtrar
  if (!isCleanViewActive && (!allLibraryData || allLibraryData.length === 0)) {
    console.warn('⚠️ No hay datos válidos para filtrar');
    return;
  }

  // Caso especial: click en userKey "all" con un status específico en vista de cuadrícula
  if (userKey === 'all' && status && !isCleanViewActive) {
    console.log('🔄 Navegando a vista de comentarios con filtro por status...');
    
    // Actualizar estado unificado con el filtro de status
    if (!unifiedViewState.tables.comments.filters) {
      unifiedViewState.tables.comments.filters = {};
    }
    unifiedViewState.tables.comments.filters.status = status;
    
    // Navegar a vista de comentarios con el filtro aplicado
    const box4Content = document.getElementById('box4-content');
    if (box4Content) {
      showCommentsTable();
      
      // Aplicar el filtro después de mostrar la tabla
      setTimeout(() => {
        const filteredData = masterCommentData.filter(item => {
          if (!item.ultimoStatus) return false;
          const statusLower = item.ultimoStatus.toLowerCase();
          
          if (status === 'activos') {
            return (statusLower.includes('revision') || statusLower.includes('revisión') || statusLower.includes('review')) ||
                   (statusLower.includes('diseño') || statusLower.includes('diseno') || statusLower.includes('design'));
          } else {
            const statusMap = {
              'revisión': ['revision', 'revisión', 'review'],
              'diseño': ['diseño', 'diseno', 'design'],
              'completado': ['completado', 'completed', 'complete'],
              'cancelado': ['cancelado', 'cancelled', 'cancel']
            };
            const statusTerms = statusMap[status] || [status];
            return statusTerms.some(term => statusLower.includes(term));
          }
        });
        
        // Regenerar tabla con datos filtrados
        box4Content.innerHTML = generateCommentsTableHTML(filteredData);
        setupInventoryClickListeners();
      }, 100);
    }
    
    // Marcar elemento activo visualmente
    markStatsElementAsActive(userKey, status, type);
    
    return; // Salir sin más procesamiento
  }

  try {
    // Activar bandera para prevenir regeneración de estadísticas
    isApplyingStatsFilter = true;
    
    // PASO 1: Actualizar datos maestros ANTES de filtrar
    console.log('🔄 Actualizando datos maestros antes de aplicar filtro...');
    updateMasterDataFromAllSources();
    
    // PASO 2: Obtener datos base desde el sistema unificado
    let dataToFilter;
    
    console.log('📊 === VERIFICANDO FUENTES DE DATOS ===');
    console.log(`masterCommentData: ${masterCommentData?.length || 0} elementos`);
    console.log(`commentedItemsData: ${commentedItemsData?.length || 0} elementos`);
    console.log(`allLibraryData: ${allLibraryData?.length || 0} elementos`);
    console.log(`recentCommentsFlag: ${recentCommentsFlag}`);
    
    if (isCleanViewActive && masterCommentData && masterCommentData.length > 0) {
      console.log('📊 Aplicando filtro usando masterCommentData...');
      dataToFilter = masterCommentData;
    } else if (commentedItemsData && commentedItemsData.length > 0) {
      console.log('📊 Aplicando filtro usando commentedItemsData...');
      dataToFilter = commentedItemsData;
    } else if (allLibraryData && allLibraryData.length > 0) {
      console.log('📊 Aplicando filtro usando allLibraryData...');
      dataToFilter = allLibraryData.filter(item => 
        (item['Object Type'] === 'Item Code' || item['Object Type'] === 'Image') && 
        item['WA_VIS_Comment'] && 
        item['WA_VIS_Comment'].trim() !== ''
      );
      console.log(`📊 Filtrados ${dataToFilter.length} elementos con comentarios de ${allLibraryData.length} totales`);
    } else {
      console.warn('⚠️ No hay datos disponibles para filtrar');
      console.log('📊 === ESTADO DE FUENTES DETALLADO ===');
      console.log('masterCommentData:', masterCommentData);
      console.log('commentedItemsData:', commentedItemsData);
      console.log('allLibraryData sample:', allLibraryData?.slice(0, 2));
      isApplyingStatsFilter = false;
      return;
    }

    console.log(`🔍 Iniciando filtro - Usuario: ${userKey}, Status: ${status}, Tipo: ${type}`);
    console.log(`📦 Datos base: ${dataToFilter.length} elementos`);
    
    let filteredData = [...dataToFilter];
    
    // Aplicar filtro por usuario
    if (userKey && userKey !== 'all') {
      console.log(`👤 Filtrando por usuario: ${userKey}`);
      
      if (userKey !== '') {
        const userName = userKey.toLowerCase(); // Convertir a minúsculas para comparación
        console.log(`🎯 Buscando usuario (case-insensitive): "${userName}"`);
        
        if (type === 'designer') {
          filteredData = filteredData.filter(row => {
            const rowDesigner = row.ultimoDisenador || row.diseñador || '';
            const rowDesignerLower = rowDesigner ? rowDesigner.toLowerCase() : '';
            return rowDesignerLower === userName;
          });
        } else if (type === 'analyst') {
          filteredData = filteredData.filter(row => {
            const rowAnalyst = row.ultimoAnalista || row.analista || '';
            const rowAnalystLower = rowAnalyst ? rowAnalyst.toLowerCase() : '';
            return rowAnalystLower === userName;
          });
        }
      }
    } else if (userKey === '') {
      // Filtrar por elementos "Vacío"
      console.log(`🔍 Filtrando por elementos vacíos de ${type}`);
      if (type === 'designer') {
        filteredData = filteredData.filter(row => !row.ultimoDisenador && !row.diseñador);
      } else if (type === 'analyst') {
        filteredData = filteredData.filter(row => !row.ultimoAnalista && !row.analista);
      }
    }
    
    // Aplicar filtro por status
    if (status && status !== '') {
      console.log(`📊 Filtrando por status: ${status}`);
      
      if (status === 'activos') {
        filteredData = filteredData.filter(row => {
          if (!row.ultimoStatus) return false;
          const statusLower = row.ultimoStatus.toLowerCase();
          return (statusLower.includes('revision') || statusLower.includes('revisión') || statusLower.includes('review')) ||
                 (statusLower.includes('diseño') || statusLower.includes('diseno') || statusLower.includes('design'));
        });
      } else {
        // USAR LA MISMA LÓGICA QUE EL RESUMEN: .includes() en lugar de ===
        // Esto debe coincidir exactamente con generateAggregatedStatsData()
        filteredData = filteredData.filter(row => {
          if (!row.ultimoStatus) return false;
          const statusLower = row.ultimoStatus.toLowerCase();
          const filterLower = status.toLowerCase();
          
          
          // Usar la misma lógica que generateAggregatedStatsData
          if (filterLower === 'revisión' || filterLower === 'revision') {
            return statusLower.includes('revision') || statusLower.includes('revisión');
          } else if (filterLower === 'diseño' || filterLower === 'design') {
            return statusLower.includes('diseño') || statusLower.includes('design');
          } else if (filterLower === 'completado' || filterLower === 'complete') {
            return statusLower.includes('completado') || statusLower.includes('complete');
          } else if (filterLower === 'cancelado' || filterLower === 'cancel') {
            return statusLower.includes('cancelado') || statusLower.includes('cancel');
          } else {
            // Para otros status, usar includes genérico
            return statusLower.includes(filterLower);
          }
        });
      }
    }
    
    console.log(`✅ Datos filtrados: ${filteredData.length} de ${dataToFilter.length}`);
    
    // Aplicar el filtro a la tabla principal
    applyInventoryTableFilter(filteredData);
    
    // Marcar visualmente el elemento clickeado como activo
    markStatsElementAsActive(userKey, status, type);
    
    // Liberar la bandera inmediatamente cuando todo termina bien
    window.isApplyingStatsFilter = false;
  
  } catch (error) {
    console.error('❌ Error aplicando filtro de tabla de estadísticas:', error);
    window.isApplyingStatsFilter = false;
  }
}

function applyInventoryTableFilter(filteredData) {
  console.log('� Aplicando filtro a tabla principal con', filteredData.length, 'elementos');
  // Actualizar originalInventoryData temporalmente para mostrar solo datos filtrados
  const previousData = window.originalInventoryData;
  window.originalInventoryData = filteredData;
  
  try {
    if (filteredData.length === 0) {
      // Solo reemplazar la tabla de inventario, NO todo el contenido de box4
      const inventoryTable = document.querySelector('#inventory-table-container');
      if (inventoryTable) {
        inventoryTable.innerHTML = '<div class="empty-results"><h3>No se encontraron resultados para este filtro</h3><p>Intenta con otros criterios de búsqueda.</p><button onclick="clearStatsTableFilters()">Limpiar Filtros</button></div>';
      } else {
        // Fallback: buscar la tabla directamente
        const table = document.querySelector('.inventory-table-clean');
        if (table) {
          table.innerHTML = '<tr><td colspan="100%" class="empty-results"><h3>No se encontraron resultados para este filtro</h3><p>Intenta con otros criterios de búsqueda.</p><button onclick="clearStatsTableFilters()">Limpiar Filtros</button></td></tr>';
        }
      }
      return;
    }
    
    // Verificar si estamos en vista limpia (comentarios) o normal
    if (isCleanViewActive) {
      // En vista limpia, usar el sistema unificado
      const box4Content = document.getElementById('box4-content');
      if (box4Content) {
        const tableHTML = generateCommentsTableHTML(filteredData);
        box4Content.innerHTML = tableHTML;
        setupInventoryClickListeners();
      }
    } else {
      // En vista normal, usar regenerateInventoryTable
      regenerateInventoryTable(filteredData);
    }
    
    console.log('✅ Tabla de inventario filtrada aplicada');
  } catch (error) {
    console.error('❌ Error regenerando tabla filtrada:', error);
    // Restaurar datos originales en caso de error
    window.originalInventoryData = previousData;
  } finally {
    // Desactivar bandera para permitir regeneración de estadísticas
    setTimeout(() => {
      isApplyingStatsFilter = false;
    }, 500); // Pequeño delay para evitar regeneración inmediata
  }
}

function generateInventoryTableFromFilteredData(filteredData) {
  // Esta función generará la tabla usando el mismo formato que generateImageInventoryTableFromCache
  // pero solo con los datos filtrados
  console.log('📊 Generando tabla filtrada con', filteredData.length, 'elementos');
  
  if (filteredData.length === 0) {
    return '<div class="empty-results"><h3>No se encontraron resultados para este filtro</h3><p>Intenta con otros criterios de búsqueda.</p></div>';
  }
  
  // Usar la función existente regenerateInventoryTable
  regenerateInventoryTable(filteredData);
  return ''; // regenerateInventoryTable maneja la actualización del DOM directamente
}

/**
 * Aplica filtro automático según el tipo de usuario conectado
 * Analistas: filtro por su usuario + estado "revisión"
 * Diseñadores: filtro por su usuario + estado "diseño"
 */
function applyAutoFilterByUserRole() {
  console.log('🎯 === APLICANDO FILTRO AUTOMÁTICO POR ROL DE USUARIO ===');
  
  // PREVENIR BUCLES: Si ya hay una operación de filtro en curso, cancelar
  if (window.isApplyingStatsFilter || window.isInAutoFilter) {
    console.log('🚫 Filtro automático cancelado - ya hay operación en curso');
    return false;
  }
  
  // Marcar que estamos aplicando filtro automático
  window.isInAutoFilter = true;
  
  // Verificar que hay un usuario conectado
  if (!currentUser || !currentUser.username || !currentUser.group) {
    console.log('⚠️ No hay usuario conectado o datos incompletos');
    window.isInAutoFilter = false;
    return false;
  }
  
  console.log('👤 Usuario conectado:', currentUser);
  
  // Verificar que estamos en vista de datos limpia
  if (!isCleanViewActive) {
    console.log('⚠️ Filtro automático solo disponible en vista de datos');
    window.isInAutoFilter = false;
    return false;
  }
  
  let userKey, status, type;
  
  // Configurar filtro según el grupo del usuario
  if (currentUser.group === 'Analista') {
    userKey = currentUser.username;
    status = 'revision'; // SIN ACENTO - para que coincida con datos del sistema
    type = 'analyst';
    console.log('📊 Aplicando filtro automático para ANALISTA:', { userKey, status, type });
  } else if (currentUser.group === 'Diseño') {
    userKey = currentUser.username;
    status = 'diseño'; // CON ACENTO - para que coincida con datos del sistema
    type = 'designer';
    console.log('🎨 Aplicando filtro automático para DISEÑADOR:', { userKey, status, type });
  } else {
    console.log('ℹ️ Usuario es Admin - no aplicando filtro automático');
    window.isInAutoFilter = false;
    return false;
  }
  
  // Aplicar el filtro automáticamente usando timeout para evitar bucles
  console.log('🚀 Ejecutando filtro automático...');
  setTimeout(() => {
    try {
      applyStatsTableFilter(userKey, status, type);
    } catch (error) {
      console.error('❌ Error aplicando filtro automático:', error);
    } finally {
      // Limpiar bandera después de un delay
      setTimeout(() => {
        window.isInAutoFilter = false;
      }, 1000);
    }
  }, 100);
  
  return true;
}

function markStatsElementAsActive(userKey, status, type) {
  console.log('🎨 Marcando elemento activo:', { userKey, status, type });
  
  // Limpiar elementos activos anteriores
  document.querySelectorAll('.clickable-name.active, .clickable-stat.active').forEach(el => {
    el.classList.remove('active');
  });
  
  // Marcar el elemento clickeado como activo
  const selector = `.clickable-name[data-user="${userKey}"][data-type="${type}"], .clickable-stat[data-user="${userKey}"][data-status="${status}"][data-type="${type}"]`;
  document.querySelectorAll(selector).forEach(el => {
    el.classList.add('active');
  });
}

function clearStatsTableFilters() {
  console.log('🧹 Limpiando filtros de tablas de estadísticas');
  
  // Limpiar elementos activos
  document.querySelectorAll('.clickable-name.active, .clickable-stat.active').forEach(el => {
    el.classList.remove('active');
  });
  
  // Limpiar elementos selected también (por si acaso)
  document.querySelectorAll('.clickable-name.selected, .clickable-stat.selected').forEach(el => {
    el.classList.remove('selected');
  });
  
  // Restaurar originalInventoryData a su estado completo
  if (window.allLibraryData) {
    // Filtrar solo elementos con comentarios como lo hace updateStatsTablesOnDataChange
    const statsData = window.allLibraryData.filter(row => 
      (row['Object Type'] === 'Item Code' || row['Object Type'] === 'Image') && 
      row['WA_VIS_Comment'] && 
      row['WA_VIS_Comment'].trim() !== ''
    );
    window.originalInventoryData = statsData;
  }
  
  // Regenerar tabla de inventario completa
  if (isCleanViewActive) {
    // Regenerar desde caché completo
    generateImageInventoryTableFromCache(); // Esto restaurará la tabla completa
    console.log('✅ Tabla de inventario restaurada completamente');
  }
}

// Hacer la función global para que pueda ser llamada desde HTML
window.clearStatsTableFilters = clearStatsTableFilters;

// ===== NUEVO SISTEMA UNIFICADO DE GESTIÓN DE ESTADO =====

/**
 * Actualiza los datos maestros desde todas las fuentes disponibles
 * Esta es la función central que unifica todos los datos
 */
function updateMasterDataFromAllSources() {
  console.log('🔄 === INICIO updateMasterDataFromAllSources ===');
  
  try {
    // 1. DETERMINAR LA FUENTE DE DATOS MÁS ACTUALIZADA
    let mostRecentData = null;
    let dataSource = 'none';
    
    // Prioridad 1: Datos pre-procesados si están frescos y completos
    if (isPreProcessingComplete && preProcessedInventoryData && preProcessedInventoryData.length > 0) {
      console.log('📊 Usando datos pre-procesados como fuente primaria');
      mostRecentData = [...preProcessedInventoryData];
      dataSource = 'preProcessed';
    }
    // Prioridad 2: allLibraryData si hay comentarios recientes
    else if (recentCommentsFlag && allLibraryData && allLibraryData.length > 0) {
      console.log('📊 Usando allLibraryData por comentarios recientes');
      const inventoryItems = allLibraryData.filter(item => 
        item['Object Type'] === 'Item Code' || item['Object Type'] === 'Image'
      );
      mostRecentData = [...inventoryItems];
      dataSource = 'allLibraryData';
    }
    // Prioridad 3: commentedItemsData como fallback
    else if (commentedItemsData && commentedItemsData.length > 0) {
      console.log('📊 Usando commentedItemsData como fallback');
      mostRecentData = commentedItemsData.map(item => item.originalItem || item);
      dataSource = 'commentedItemsData';
    }
    // Prioridad 4: Intentar reconstruir desde caché
    else if (itemGroupDataCache && itemGroupDataCache.size > 0) {
      console.log('📊 Reconstruyendo desde itemGroupDataCache');
      const allCachedData = [];
      itemGroupDataCache.forEach(groupData => {
        if (groupData && groupData.length > 0) {
          allCachedData.push(...groupData);
        }
      });
      
      if (allCachedData.length > 0) {
        const inventoryItems = allCachedData.filter(item => 
          item['Object Type'] === 'Item Code' || item['Object Type'] === 'Image'
        );
        mostRecentData = [...inventoryItems];
        dataSource = 'itemGroupDataCache';
      }
    }
    
    if (!mostRecentData || mostRecentData.length === 0) {
      console.warn('⚠️ No se encontraron datos válidos en ninguna fuente');
      masterCommentData = [];
      masterStatsData = [];
      return false;
    }
    
    console.log(`✅ Datos maestros actualizados desde: ${dataSource}`);
    console.log(`📊 Total elementos procesados: ${mostRecentData.length}`);
    
    // 2. FILTRAR SOLO ELEMENTOS CON COMENTARIOS PARA MASTER DATA
    const itemsWithComments = mostRecentData.filter(item => 
      item['WA_VIS_Comment'] && item['WA_VIS_Comment'].trim() !== ''
    );
    
    console.log(`📝 Elementos con comentarios: ${itemsWithComments.length} de ${mostRecentData.length}`);
    
    // 3. ACTUALIZAR MASTER COMMENT DATA
    masterCommentData = itemsWithComments.map(item => {
      // Parsear comentarios para extraer analista y diseñador
      const parsedComments = parseCommentsFromExcel(item['WA_VIS_Comment']);
      const analista = getLatestAnalyst(parsedComments);
      const diseñador = getLatestDesigner(parsedComments);
      
      // CRÍTICO: Extraer status del último comentario, no del campo Status
      const ultimoStatusFromComments = getCurrentStatus(item['WA_VIS_Comment']);
      const originalStatus = item['Status'] || item['WA_VIS_Status'] || '';
      
      // DEBUG: Log cuando hay discrepancia entre status de comentarios vs campo Status
      if (ultimoStatusFromComments && originalStatus && ultimoStatusFromComments !== originalStatus) {
        console.log(`🔍 DISCREPANCIA Status para ${item.Name || item['Item Code']}:`);
        console.log(`   - Status de comentarios: "${ultimoStatusFromComments}"`);
        console.log(`   - Status de campo: "${originalStatus}"`);
        console.log(`   - Comentarios raw: "${(item['WA_VIS_Comment'] || '').substring(0, 100)}..."`);
      }
      
      // Asegurar que tengamos todos los campos necesarios
      return {
        ...item,
        // Campos calculados para la tabla
        ultimoComentario: item['WA_VIS_Comment'] || '',
        ultimoStatus: ultimoStatusFromComments || originalStatus,
        ultimoAnalista: item['Analyst'] || item['WA_VIS_Analyst'] || analista || '',
        ultimoDisenador: item['Designer'] || item['WA_VIS_Designer'] || diseñador || '',
        fechaComentario: item['Comment Date'] || item['WA_VIS_Comment_Date'] || '',
        fechaAnalista: item['Analyst Date'] || item['WA_VIS_Analyst_Date'] || '',
        fechaDisenador: item['Designer Date'] || item['WA_VIS_Designer_Date'] || '',
        // Campos de compatibilidad con el filtro
        analista: analista || '',
        diseñador: diseñador || '',
        // Preservar item original para compatibilidad
        originalItem: item
      };
    });
    
    // 4. GENERAR MASTER STATS DATA (agregaciones para tablas de resumen)
    masterStatsData = generateAggregatedStatsData(masterCommentData);
    
    // 5. ACTUALIZAR TIMESTAMP
    unifiedViewState.lastDataUpdate = new Date();
    
    console.log('✅ === FIN updateMasterDataFromAllSources ===');
    console.log(`📊 Master Comment Data: ${masterCommentData.length} elementos`);
    console.log(`📊 Master Stats Data: ${Object.keys(masterStatsData).length} usuarios`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error en updateMasterDataFromAllSources:', error);
    return false;
  }
}

/**
 * Genera datos agregados para las tablas de resumen
 */
function generateAggregatedStatsData(commentData) {
  const stats = {
    analysts: {},
    designers: {}
  };
  
  commentData.forEach(item => {
    const analyst = item.ultimoAnalista || '';
    const designer = item.ultimoDisenador || '';
    const status = item.ultimoStatus || '';
    
    // Estadísticas de analistas
    if (analyst && analyst.trim() !== '') {
      if (!stats.analysts[analyst]) {
        stats.analysts[analyst] = {
          total: 0,
          activos: 0,
          revision: 0,
          diseño: 0,
          completado: 0,
          cancelado: 0
        };
      }
      
      stats.analysts[analyst].total++;
      
      if (status) {
        const statusLower = status.toLowerCase();
        if (statusLower.includes('revision') || statusLower.includes('revisión')) {
          stats.analysts[analyst].revision++;
          stats.analysts[analyst].activos++;
        } else if (statusLower.includes('diseño') || statusLower.includes('design')) {
          stats.analysts[analyst].diseño++;
          stats.analysts[analyst].activos++;
        } else if (statusLower.includes('completado') || statusLower.includes('complete')) {
          stats.analysts[analyst].completado++;
        } else if (statusLower.includes('cancelado') || statusLower.includes('cancel')) {
          stats.analysts[analyst].cancelado++;
        }
      }
    }
    
    // Estadísticas de diseñadores
    if (designer && designer.trim() !== '') {
      if (!stats.designers[designer]) {
        stats.designers[designer] = {
          total: 0,
          activos: 0,
          revision: 0,
          diseño: 0,
          completado: 0,
          cancelado: 0
        };
      }
      
      stats.designers[designer].total++;
      
      if (status) {
        const statusLower = status.toLowerCase();
        if (statusLower.includes('revision') || statusLower.includes('revisión')) {
          stats.designers[designer].revision++;
          stats.designers[designer].activos++;
        } else if (statusLower.includes('diseño') || statusLower.includes('design')) {
          stats.designers[designer].diseño++;
          stats.designers[designer].activos++;
        } else if (statusLower.includes('completado') || statusLower.includes('complete')) {
          stats.designers[designer].completado++;
        } else if (statusLower.includes('cancelado') || statusLower.includes('cancel')) {
          stats.designers[designer].cancelado++;
        }
      }
    }
  });
  
  return stats;
}

/**
 * Función central que regenera TODAS las tablas con estado preservado
 * Esta es la función principal que se debe llamar cuando se regresa del visualizador
 */
function regenerateAllTablesWithState() {
  console.log('🔄 === INICIO regenerateAllTablesWithState ===');
  
  try {
    // NOTA: NO guardar estado al inicio porque las tablas están vacías sin clases .active
    // saveUnifiedViewState(); // Comentado - esto sobrescribía los filtros guardados
    
    // 1. ACTUALIZAR DATOS MAESTROS DESDE TODAS LAS FUENTES
    const dataUpdated = updateMasterDataFromAllSources();
    
    if (!dataUpdated) {
      console.warn('⚠️ No se pudieron actualizar los datos maestros');
      return false;
    }
    
    // 2. REGENERAR TABLA DE COMENTARIOS (Box 4)
    const commentsRegenerated = regenerateCommentsTableWithFilters();
    
    // 4. REGENERAR TABLAS DE RESUMEN (Box 1)
    const statsRegenerated = regenerateStatsTablesWithFilters();
    
    // 5. RESTAURAR ESTADOS DE SCROLL Y ELEMENTOS ACTIVOS
    setTimeout(() => {
      restoreUnifiedViewState();
    }, 150);
    
    console.log('✅ === FIN regenerateAllTablesWithState ===');
    console.log(`📊 Comentarios regenerados: ${commentsRegenerated}`);
    console.log(`📊 Stats regenerados: ${statsRegenerated}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error en regenerateAllTablesWithState:', error);
    return false;
  }
}

/**
 * Regenera la tabla de comentarios aplicando filtros guardados
 */
function regenerateCommentsTableWithFilters() {
  console.log('🔄 Regenerando tabla de comentarios con filtros...');
  
  // CONTROL DE VISTA: Solo regenerar tabla de comentarios si estamos en vista de información
  if (!isCleanViewActive) {
    console.log('ℹ️ Vista de visualizador activa - saltando regeneración de tabla de comentarios');
    return false;
  }
  
  try {
    if (!masterCommentData || masterCommentData.length === 0) {
      console.warn('⚠️ No hay masterCommentData para regenerar tabla de comentarios');
      return false;
    }
    
    // USAR filtros guardados para restaurar estado
    let filteredData = [...masterCommentData];
    
    // Verificar si hay filtros guardados que aplicar
    const hasUnifiedFilters = unifiedViewState && unifiedViewState.tables && unifiedViewState.tables.comments && 
                             unifiedViewState.tables.comments.filters && 
                             Object.keys(unifiedViewState.tables.comments.filters).length > 0;
    
    const hasInventoryFilters = inventoryViewState && inventoryViewState.activeFilters &&
                               Object.keys(inventoryViewState.activeFilters).length > 0;
    
    if (hasUnifiedFilters || hasInventoryFilters) {
      // Usar filtros de unifiedViewState como prioridad, luego inventoryViewState
      const filtersToApply = hasUnifiedFilters ? unifiedViewState.tables.comments.filters : inventoryViewState.activeFilters;
      
      // Aplicar filtros
      if (filtersToApply.analista) {
        filteredData = filteredData.filter(item => item.analista === filtersToApply.analista);
      }
      
      if (filtersToApply.diseñador) {
        filteredData = filteredData.filter(item => item.diseñador === filtersToApply.diseñador);
      }
      
      if (filtersToApply.analistaStatus) {
        filteredData = filteredData.filter(item => {
          if (!item.ultimoStatus) return false;
          const status = item.ultimoStatus.toLowerCase();
          
          if (filtersToApply.analistaStatus === 'activos') {
            return (status.includes('revision') || status.includes('revisión')) ||
                   (status.includes('diseño') || status.includes('diseno'));
          } else if (filtersToApply.analistaStatus === 'diseño') {
            return status.includes('diseño') || status.includes('diseno');
          } else if (filtersToApply.analistaStatus === 'revisión') {
            return status.includes('revision') || status.includes('revisión');
          }
          return false;
        });
      }
    }
    
    // 2. REGENERAR HTML DE LA TABLA
    const box4Content = document.getElementById('box4-content');
    if (box4Content) {
      const tableHTML = generateCommentsTableHTML(filteredData);
      box4Content.innerHTML = tableHTML;
      
      // 3. RECONFIGURAR EVENT LISTENERS Y RESTAURAR SCROLL
      setTimeout(() => {
        setupInventoryClickListeners();
        
        // 4. RESTAURAR SCROLL después de regenerar la tabla
        if (unifiedViewState && unifiedViewState.tables && unifiedViewState.tables.comments && unifiedViewState.tables.comments.scroll) {
          const inventoryWrapper = document.querySelector('.inventory-table-wrapper');
          if (inventoryWrapper) {
            const scroll = unifiedViewState.tables.comments.scroll;
            if (scroll.top > 0) {
              inventoryWrapper.scrollTop = scroll.top;
            }
            if (scroll.left > 0) {
              inventoryWrapper.scrollLeft = scroll.left;
            }
          }
        }
      }, 50);
      
      console.log(`✅ Tabla de comentarios regenerada: ${filteredData.length} elementos`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Error regenerando tabla de comentarios:', error);
    return false;
  }
}

/**
 * Regenera las tablas de resumen (analistas y diseñadores) aplicando filtros guardados
 */
function regenerateStatsTablesWithFilters() {
  console.log('🔄 Regenerando tablas de resumen con filtros...');
  
  try {
    console.log('🔍 DEBUG - masterStatsData:', masterStatsData);
    
    if (!masterStatsData) {
      console.warn('⚠️ No hay masterStatsData para regenerar tablas de resumen');
      return false;
    }
    
    console.log('🔍 DEBUG - masterStatsData.analysts:', masterStatsData.analysts);
    console.log('🔍 DEBUG - masterStatsData.designers:', masterStatsData.designers);
    
    // 1. REGENERAR TABLA DE ANALISTAS
    const analystTableState = unifiedViewState.tables.analysts;
    console.log('🔍 DEBUG - analystTableState:', analystTableState);
    const analystHTML = generateAnalystStatsTableHTML(masterStatsData.analysts, analystTableState.filters);
    console.log('🔍 DEBUG - analystHTML length:', analystHTML.length);
    
    // 2. REGENERAR TABLA DE DISEÑADORES  
    const designerTableState = unifiedViewState.tables.designers;
    console.log('🔍 DEBUG - designerTableState:', designerTableState);
    const designerHTML = generateDesignerStatsTableHTML(masterStatsData.designers, designerTableState.filters);
    console.log('🔍 DEBUG - designerHTML length:', designerHTML.length);
    
    // 3. ACTUALIZAR DOM
    const box1Content = document.getElementById('box1-content');
    if (box1Content) {
      // Buscar contenedores existentes o crear estructura
      let analystContainer = box1Content.querySelector('.analyst-stats-container');
      let designerContainer = box1Content.querySelector('.designer-stats-container');
      
      if (!analystContainer || !designerContainer) {
        // Crear estructura completa si no existe
        box1Content.innerHTML = `
          <div class="analyst-stats-container">
            <h3>Resumen Analistas</h3>
            <div class="analyst-stats-table">${analystHTML}</div>
          </div>
          <div class="designer-stats-container">
            <h3>Resumen Diseñadores</h3>
            <div class="designer-stats-table">${designerHTML}</div>
          </div>
        `;
      } else {
        // Actualizar solo las tablas
        analystContainer.querySelector('.analyst-stats-table').innerHTML = analystHTML;
        designerContainer.querySelector('.designer-stats-table').innerHTML = designerHTML;
      }
      
      // CRÍTICO: Restaurar elementos activos después de regenerar las tablas
      setTimeout(() => {
        restoreActiveElementsInStatsTable();
      }, 50);
      
      console.log('✅ Tablas de resumen regeneradas');
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Error regenerando tablas de resumen:', error);
    return false;
  }
}

/**
 * Restaura elementos activos en las tablas de estadísticas después de regenerarlas
 */
function restoreActiveElementsInStatsTable() {
  try {
    // Verificar si hay filtros guardados para determinar qué elementos marcar
    const hasUnifiedFilters = unifiedViewState && unifiedViewState.tables && unifiedViewState.tables.comments && 
                             unifiedViewState.tables.comments.filters && 
                             Object.keys(unifiedViewState.tables.comments.filters).length > 0;
    
    const hasInventoryFilters = inventoryViewState && inventoryViewState.activeFilters &&
                               Object.keys(inventoryViewState.activeFilters).length > 0;
    
    if (hasUnifiedFilters || hasInventoryFilters) {
      const filtersToApply = hasUnifiedFilters ? unifiedViewState.tables.comments.filters : inventoryViewState.activeFilters;
      
      // Marcar analista activo
      if (filtersToApply.analista) {
        const analistaElements = document.querySelectorAll(`[data-user="${filtersToApply.analista}"][data-type="analyst"]`);
        analistaElements.forEach(el => {
          el.classList.add('active');
        });
        
        // Marcar status específico si existe
        if (filtersToApply.analistaStatus) {
          const statusElements = document.querySelectorAll(`[data-user="${filtersToApply.analista}"][data-status="${filtersToApply.analistaStatus}"][data-type="analyst"]`);
          statusElements.forEach(el => {
            el.classList.add('active');
          });
        }
      }
      
      // Marcar diseñador activo
      if (filtersToApply.diseñador) {
        const designerElements = document.querySelectorAll(`[data-user="${filtersToApply.diseñador}"][data-type="designer"]`);
        designerElements.forEach(el => {
          el.classList.add('active');
        });
        
        // Marcar status específico si existe
        if (filtersToApply.diseñadorStatus) {
          const statusElements = document.querySelectorAll(`[data-user="${filtersToApply.diseñador}"][data-status="${filtersToApply.diseñadorStatus}"][data-type="designer"]`);
          statusElements.forEach(el => {
            el.classList.add('active');
          });
        }
      }
    }
  } catch (error) {
    console.error('❌ Error restaurando elementos activos:', error);
  }
}

/**
 * Guarda el estado actual de todas las tablas (scroll, filtros, elementos activos)
 */
// Variable global para prevenir múltiples ejecuciones
let isSavingState = false;

function saveUnifiedViewState() {
  // Prevenir múltiples ejecuciones simultáneas
  if (isSavingState) {
    return;
  }
  
  isSavingState = true;
  
  try {
    // 1. GUARDAR SCROLL DE TABLA DE COMENTARIOS (solo si estamos en vista de comentarios)
    if (isCleanViewActive) {
      const inventoryWrapper = document.querySelector('.inventory-table-wrapper') || 
                              document.querySelector('#box4-content .table-container') ||
                              document.querySelector('#box4-content');
      
      if (inventoryWrapper) {
        unifiedViewState.tables.comments.scroll = {
          top: inventoryWrapper.scrollTop,
          left: inventoryWrapper.scrollLeft
        };
        // console.log('💾 SCROLL GUARDADO:', unifiedViewState.tables.comments.scroll, 'desde:', inventoryWrapper.className);
      }
    } else {
      // PRESERVAR scroll existente cuando no estamos en vista de comentarios
      if (!unifiedViewState.tables.comments.scroll) {
        unifiedViewState.tables.comments.scroll = { top: 0, left: 0 };
      }
      console.log('💾 PRESERVANDO scroll existente (no en vista de comentarios):', unifiedViewState.tables.comments.scroll);
    }
    
    // 2. GUARDAR FILTROS ACTIVOS - DIRECTAMENTE DE LA INTERFAZ
    unifiedViewState.tables.comments.filters = {};
    
    // Buscar elementos activos en las tablas de estadísticas
    const activeElements = document.querySelectorAll('#box1-content .active[data-user], #box3-content .active[data-user]');
    
    activeElements.forEach(element => {
      const user = element.getAttribute('data-user');
      const status = element.getAttribute('data-status');
      const type = element.getAttribute('data-type');
      
      if (type === 'analyst') {
        unifiedViewState.tables.comments.filters.analista = user;
        if (status) {
          unifiedViewState.tables.comments.filters.analistaStatus = status;
        }
      } else if (type === 'designer') {
        unifiedViewState.tables.comments.filters.diseñador = user;
        if (status) {
          unifiedViewState.tables.comments.filters.diseñadorStatus = status;
        }
      }
    });
    
    // CRÍTICO: Guardar filtros también en localStorage para persistencia
    if (Object.keys(unifiedViewState.tables.comments.filters).length > 0) {
      localStorage.setItem('lastActiveFilters', JSON.stringify(unifiedViewState.tables.comments.filters));
    } else {
      localStorage.removeItem('lastActiveFilters');
    }
    
    // 3. GUARDAR ELEMENTOS ACTIVOS DE COMENTARIOS
    const activeCommentElements = document.querySelectorAll('#box4-content .active');
    unifiedViewState.tables.comments.activeElements = Array.from(activeCommentElements).map(el => ({
      selector: getElementSelector(el),
      classes: Array.from(el.classList)
    }));
    
    // 4. GUARDAR ELEMENTOS ACTIVOS DE TABLAS DE RESUMEN (para restaurar selecciones visuales)
    // Elementos activos de analistas
    const activeAnalystElements = document.querySelectorAll('#box1-content .analyst-stats-table .active');
    unifiedViewState.tables.analysts.activeElements = Array.from(activeAnalystElements).map(el => ({
      selector: getElementSelector(el),
      classes: Array.from(el.classList),
      dataAttributes: {
        user: el.getAttribute('data-user'),
        status: el.getAttribute('data-status'),
        type: el.getAttribute('data-type')
      }
    }));
    
    // Elementos activos de diseñadores  
    const activeDesignerElements = document.querySelectorAll('#box1-content .designer-stats-table .active');
    unifiedViewState.tables.designers.activeElements = Array.from(activeDesignerElements).map(el => ({
      selector: getElementSelector(el),
      classes: Array.from(el.classList),
      dataAttributes: {
        user: el.getAttribute('data-user'),
        status: el.getAttribute('data-status'),
        type: el.getAttribute('data-type')
      }
    }));
    
    // 5. SINCRONIZAR CON inventoryViewState para compatibilidad
    if (!inventoryViewState) inventoryViewState = {};
    inventoryViewState.activeFilters = { ...unifiedViewState.tables.comments.filters };
    
    // 6. GUARDAR EN LOCALSTORAGE PARA PERSISTENCIA
    localStorage.setItem('unifiedViewState', JSON.stringify(unifiedViewState));
    
  } catch (error) {
    console.error('❌ Error guardando estado unificado:', error);
  } finally {
    // Resetear flag al final
    isSavingState = false;
  }
}

/**
 * Restaura el estado de todas las tablas (scroll, filtros, elementos activos)
 */
function restoreUnifiedViewState() {
  try {
    // 1. RESTAURAR ELEMENTOS ACTIVOS PRIMERO (para que estén marcados visualmente)
    // Analistas
    unifiedViewState.tables.analysts.activeElements.forEach(elementInfo => {
      const selector = `.clickable-name[data-user="${elementInfo.dataAttributes.user}"][data-type="${elementInfo.dataAttributes.type}"], .clickable-stat[data-user="${elementInfo.dataAttributes.user}"][data-status="${elementInfo.dataAttributes.status}"][data-type="${elementInfo.dataAttributes.type}"]`;
      const element = document.querySelector(selector);
      if (element) {
        element.classList.add('active');
      }
    });
    
    // Diseñadores
    unifiedViewState.tables.designers.activeElements.forEach(elementInfo => {
      const selector = `.clickable-name[data-user="${elementInfo.dataAttributes.user}"][data-type="${elementInfo.dataAttributes.type}"], .clickable-stat[data-user="${elementInfo.dataAttributes.user}"][data-status="${elementInfo.dataAttributes.status}"][data-type="${elementInfo.dataAttributes.type}"]`;
      const element = document.querySelector(selector);
      if (element) {
        element.classList.add('active');
      }
    });

    // 2. RESTAURAR FILTROS GUARDADOS DESPUÉS DE MARCAR ELEMENTOS
    let filtersToRestore = {};
    
    // Prioridad 1: Filtros guardados en unifiedViewState
    if (unifiedViewState.tables.comments.filters && Object.keys(unifiedViewState.tables.comments.filters).length > 0) {
      filtersToRestore = { ...unifiedViewState.tables.comments.filters };
    }
    // Prioridad 2: Filtros de inventoryViewState como fallback
    else if (inventoryViewState && inventoryViewState.activeFilters && Object.keys(inventoryViewState.activeFilters).length > 0) {
      filtersToRestore = { ...inventoryViewState.activeFilters };
    }
    // Prioridad 3: Filtros de localStorage como último recurso
    else {
      try {
        const lastActiveFilters = localStorage.getItem('lastActiveFilters');
        if (lastActiveFilters) {
          const parsedFilters = JSON.parse(lastActiveFilters);
          if (Object.keys(parsedFilters).length > 0) {
            filtersToRestore = { ...parsedFilters };
          }
        }
      } catch (error) {
        console.error('❌ Error leyendo filtros de localStorage:', error);
      }
    }
    
    // SINCRONIZAR: Restaurar inventoryViewState.activeFilters para compatibilidad
    if (Object.keys(filtersToRestore).length > 0) {
      if (!inventoryViewState) inventoryViewState = {};
      inventoryViewState.activeFilters = { ...filtersToRestore };
      console.log('🔄 Sincronizando filtros desde unifiedViewState a inventoryViewState:', filtersToRestore);
    }
    
    if (Object.keys(filtersToRestore).length > 0) {
      // Restaurar inventoryViewState.activeFilters para compatibilidad
      if (!inventoryViewState) inventoryViewState = {};
      inventoryViewState.activeFilters = { ...filtersToRestore };
      
      // MARCAR ELEMENTOS COMO ACTIVOS ANTES DE APLICAR FILTROS
      setTimeout(() => {
        if (filtersToRestore.analista) {
          const analistaElements = document.querySelectorAll(`[data-user="${filtersToRestore.analista}"][data-type="analyst"]`);
          analistaElements.forEach(el => el.classList.add('active'));
          
          if (filtersToRestore.analistaStatus) {
            const statusElements = document.querySelectorAll(`[data-user="${filtersToRestore.analista}"][data-status="${filtersToRestore.analistaStatus}"][data-type="analyst"]`);
            statusElements.forEach(el => el.classList.add('active'));
          }
        }
        
        if (filtersToRestore.diseñador) {
          const designerElements = document.querySelectorAll(`[data-user="${filtersToRestore.diseñador}"][data-type="designer"]`);
          designerElements.forEach(el => el.classList.add('active'));
          
          if (filtersToRestore.diseñadorStatus) {
            const statusElements = document.querySelectorAll(`[data-user="${filtersToRestore.diseñador}"][data-status="${filtersToRestore.diseñadorStatus}"][data-type="designer"]`);
            statusElements.forEach(el => el.classList.add('active'));
          }
        }
        
        // 3. RESTAURAR SCROLL DESPUÉS DE APLICAR FILTROS
        setTimeout(() => {
          const inventoryWrapper = document.querySelector('.inventory-table-wrapper') ||
                                 document.querySelector('#box4-content .table-container') ||
                                 document.querySelector('#box4-content');
          
          if (inventoryWrapper && unifiedViewState.tables.comments.scroll) {
            const scroll = unifiedViewState.tables.comments.scroll;
            
            if (scroll.top > 0) {
              inventoryWrapper.scrollTop = scroll.top;
              // console.log('📍 SCROLL RESTAURADO:', scroll.top, 'en:', inventoryWrapper.className);
            }
            if (scroll.left > 0) {
              inventoryWrapper.scrollLeft = scroll.left;
            }
          }
        }, 300);
        
      }, 50);
    } else {
      // Si no hay filtros, restaurar scroll inmediatamente
      setTimeout(() => {
        const inventoryWrapper = document.querySelector('.inventory-table-wrapper') ||
                               document.querySelector('#box4-content .table-container') ||
                               document.querySelector('#box4-content');
        if (inventoryWrapper && unifiedViewState.tables.comments.scroll) {
          const scroll = unifiedViewState.tables.comments.scroll;
          if (scroll.top > 0 || scroll.left > 0) {
            inventoryWrapper.scrollTop = scroll.top;
            inventoryWrapper.scrollLeft = scroll.left;
            // console.log('📍 SCROLL RESTAURADO (sin filtros):', scroll.top, 'vertical,', scroll.left, 'horizontal');
          }
        }
      }, 200);
    }

    // 4. RESTAURAR ELEMENTOS ACTIVOS DE COMENTARIOS
    unifiedViewState.tables.comments.activeElements.forEach(elementInfo => {
      const element = document.querySelector(elementInfo.selector);
      if (element) {
        elementInfo.classes.forEach(className => {
          if (className !== 'active') element.classList.add(className);
        });
        element.classList.add('active');
      }
    });
    
  } catch (error) {
    console.error('❌ Error restaurando estado unificado:', error);
  }
}

/**
 * Aplica filtros a un conjunto de datos
 */
function applyFiltersToData(data, filters) {
  if (!filters || Object.keys(filters).length === 0) {
    return data;
  }
  
  return data.filter(item => {
    // Filtro por analista
    if (filters.analista && item.ultimoAnalista !== filters.analista) {
      return false;
    }
    
    // Filtro por diseñador
    if (filters.diseñador && item.ultimoDisenador !== filters.diseñador) {
      return false;
    }
    
    // Filtro por status de analista
    if (filters.analistaStatus && filters.analista) {
      if (!item.ultimoStatus) return false;
      const status = item.ultimoStatus.toLowerCase();
      
      if (filters.analistaStatus === 'activos') {
        // "Activos" = elementos con status de Revision o Diseño
        if (!(status.includes('revision') || status.includes('revisión') || status.includes('review')) &&
            !(status.includes('diseño') || status.includes('diseno') || status.includes('design'))) {
          return false;
        }
      } else if (filters.analistaStatus === 'diseño') {
        // "Diseño" = elementos con status que contenga diseño
        if (!(status.includes('diseño') || status.includes('diseno') || status.includes('design'))) {
          return false;
        }
      } else if (filters.analistaStatus === 'revisión') {
        // "Revisión" = elementos con status que contenga revisión
        if (!(status.includes('revision') || status.includes('revisión') || status.includes('review'))) {
          return false;
        }
      } else if (filters.analistaStatus === 'completado') {
        // "Completado" = elementos con status que contenga completado
        if (!(status.includes('completado') || status.includes('completed') || status.includes('complete'))) {
          return false;
        }
      } else if (filters.analistaStatus === 'cancelado') {
        // "Cancelado" = elementos con status que contenga cancelado
        if (!(status.includes('cancelado') || status.includes('cancelled') || status.includes('cancel'))) {
          return false;
        }
      } else {
        // Filtros específicos de status (comparación exacta)
        if (item.ultimoStatus !== filters.analistaStatus) {
          return false;
        }
      }
    }
    
    // Filtro por status de diseñador
    if (filters.diseñadorStatus && filters.diseñador) {
      if (!item.ultimoStatus) return false;
      const status = item.ultimoStatus.toLowerCase();
      
      if (filters.diseñadorStatus === 'activos') {
        // "Activos" = elementos con status de Revision o Diseño
        if (!(status.includes('revision') || status.includes('revisión') || status.includes('review')) &&
            !(status.includes('diseño') || status.includes('diseno') || status.includes('design'))) {
          return false;
        }
      } else if (filters.diseñadorStatus === 'diseño') {
        // "Diseño" = elementos con status que contenga diseño
        if (!(status.includes('diseño') || status.includes('diseno') || status.includes('design'))) {
          return false;
        }
      } else if (filters.diseñadorStatus === 'revisión') {
        // "Revisión" = elementos con status que contenga revisión
        if (!(status.includes('revision') || status.includes('revisión') || status.includes('review'))) {
          return false;
        }
      } else if (filters.diseñadorStatus === 'completado') {
        // "Completado" = elementos con status que contenga completado
        if (!(status.includes('completado') || status.includes('completed') || status.includes('complete'))) {
          return false;
        }
      } else if (filters.diseñadorStatus === 'cancelado') {
        // "Cancelado" = elementos con status que contenga cancelado
        if (!(status.includes('cancelado') || status.includes('cancelled') || status.includes('cancel'))) {
          return false;
        }
      } else {
        // Filtros específicos de status (comparación exacta)
        if (item.ultimoStatus !== filters.diseñadorStatus) {
          return false;
        }
      }
    }
    
    return true;
  });
}

/**
 * Genera un selector único para un elemento DOM
 */
function getElementSelector(element) {
  if (element.id) {
    return `#${element.id}`;
  }
  
  let selector = element.tagName.toLowerCase();
  
  if (element.className) {
    const classes = Array.from(element.classList).filter(c => c !== 'active' && c !== 'selected');
    if (classes.length > 0) {
      selector += '.' + classes.join('.');
    }
  }
  
  // Añadir data attributes para mayor especificidad
  ['data-user', 'data-status', 'data-type'].forEach(attr => {
    const value = element.getAttribute(attr);
    if (value) {
      selector += `[${attr}="${value}"]`;
    }
  });
  
  return selector;
}

/**
 * Genera HTML para la tabla de comentarios basada en datos filtrados
 */
function generateCommentsTableHTML(filteredData) {
  if (!filteredData || filteredData.length === 0) {
    return '<div class="empty-box-message">No hay comentarios que mostrar con los filtros actuales</div>';
  }
  
  console.log(`🔄 Generando HTML de tabla de comentarios para ${filteredData.length} elementos`);
  
  // Usar la función existente generateImageInventoryTable pero con datos específicos
  const originalCurrentWorkingData = currentWorkingData;
  currentWorkingData = filteredData.map(item => item.originalItem || item);
  
  const tableHTML = generateImageInventoryTable(null, true, true); // showAllData=true, suppressStatsUpdate=true
  
  // Restaurar currentWorkingData
  currentWorkingData = originalCurrentWorkingData;
  
  return tableHTML;
}

/**
 * Genera HTML para la tabla de resumen de analistas
 */
function generateAnalystStatsTableHTML(analystStats, filters = {}) {
  if (!analystStats || Object.keys(analystStats).length === 0) {
    return '<div class="empty-stats">No hay datos de analistas</div>';
  }
  
  let tableHTML = `
    <table class="stats-table">
      <thead>
        <tr>
          <th>Analista</th>
          <th>Total</th>
          <th>Activos</th>
          <th>Revisión</th>
          <th>Diseño</th>
          <th>Completado</th>
          <th>Cancelado</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  // Filtrar analistas según el usuario conectado
  let filteredAnalystStats = { ...analystStats };
  
  // Debug: Verificar el estado del usuario actual
  console.log('🔍 DEBUG generateAnalystStatsTableHTML - currentUser:', currentUser);
  console.log('🔍 DEBUG generateAnalystStatsTableHTML - currentUser.group:', currentUser?.group);
  console.log('🔍 DEBUG generateAnalystStatsTableHTML - currentUser.username:', currentUser?.username);
  
  // Si el usuario actual es un analista, solo mostrar su línea
  if (currentUser && currentUser.group === 'Analista') {
    console.log('🔍 DEBUG - Usuario es analista, filtrando para mostrar solo su línea');
    const currentUsername = currentUser.username;
    console.log('🔍 DEBUG - Username actual:', currentUsername);
    console.log('🔍 DEBUG - Analistas disponibles:', Object.keys(analystStats));
    if (analystStats[currentUsername]) {
      filteredAnalystStats = { [currentUsername]: analystStats[currentUsername] };
      console.log('✅ DEBUG - Filtrado aplicado, solo mostrando:', currentUsername);
    } else {
      filteredAnalystStats = {};
      console.log('⚠️ DEBUG - No se encontraron datos para el analista:', currentUsername);
    }
  } else {
    console.log('🔍 DEBUG - Usuario NO es analista o currentUser es null, mostrando todos');
  }
  
  // Ordenar analistas por total descendente
  const sortedAnalysts = Object.entries(filteredAnalystStats).sort((a, b) => b[1].total - a[1].total);
  
  sortedAnalysts.forEach(([analyst, stats]) => {
    tableHTML += `
      <tr>
        <td class="clickable-name" data-user="${analyst}" data-type="analyst">${analyst}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="" data-type="analyst">${stats.total}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="activos" data-type="analyst">${stats.activos}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="revisión" data-type="analyst">${stats.revision}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="diseño" data-type="analyst">${stats.diseño}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="completado" data-type="analyst">${stats.completado}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="cancelado" data-type="analyst">${stats.cancelado}</td>
      </tr>
    `;
  });
  
  // Totales generales (basados en los datos filtrados)
  const totals = {
    total: 0,
    activos: 0,
    revision: 0,
    diseño: 0,
    completado: 0,
    cancelado: 0
  };
  
  Object.values(filteredAnalystStats).forEach(stats => {
    totals.total += stats.total;
    totals.activos += stats.activos;
    totals.revision += stats.revision;
    totals.diseño += stats.diseño;
    totals.completado += stats.completado;
    totals.cancelado += stats.cancelado;
  });
  
  tableHTML += `
      <tr class="totals-row">
        <td><strong>TOTAL</strong></td>
        <td class="clickable-stat" data-user="all" data-status="" data-type="analyst"><strong>${totals.total}</strong></td>
        <td class="clickable-stat" data-user="all" data-status="activos" data-type="analyst"><strong>${totals.activos}</strong></td>
        <td class="clickable-stat" data-user="all" data-status="revisión" data-type="analyst"><strong>${totals.revision}</strong></td>
        <td class="clickable-stat" data-user="all" data-status="diseño" data-type="analyst"><strong>${totals.diseño}</strong></td>
        <td class="clickable-stat" data-user="all" data-status="completado" data-type="analyst"><strong>${totals.completado}</strong></td>
        <td class="clickable-stat" data-user="all" data-status="cancelado" data-type="analyst"><strong>${totals.cancelado}</strong></td>
      </tr>
    </tbody>
    </table>
  `;
  
  return tableHTML;
}

/**
 * Genera HTML para la tabla de resumen de diseñadores
 */
function generateDesignerStatsTableHTML(designerStats, filters = {}) {
  if (!designerStats || Object.keys(designerStats).length === 0) {
    return '<div class="empty-stats">No hay datos de diseñadores</div>';
  }
  
  let tableHTML = `
    <table class="stats-table">
      <thead>
        <tr>
          <th>Diseñador</th>
          <th>Total</th>
          <th>Activos</th>
          <th>Revisión</th>
          <th>Diseño</th>
          <th>Completado</th>
          <th>Cancelado</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  // Filtrar diseñadores según el usuario conectado
  let filteredDesignerStats = { ...designerStats };
  
  // Debug: Verificar el estado del usuario actual
  console.log('🔍 DEBUG generateDesignerStatsTableHTML - currentUser:', currentUser);
  console.log('🔍 DEBUG generateDesignerStatsTableHTML - currentUser.group:', currentUser?.group);
  console.log('🔍 DEBUG generateDesignerStatsTableHTML - currentUser.username:', currentUser?.username);
  
  // Si el usuario actual es un diseñador, solo mostrar su línea
  if (currentUser && currentUser.group === 'Diseño') {
    console.log('🔍 DEBUG - Usuario es diseñador, filtrando para mostrar solo su línea');
    const currentUsername = currentUser.username;
    console.log('🔍 DEBUG - Username actual:', currentUsername);
    console.log('🔍 DEBUG - Diseñadores disponibles:', Object.keys(designerStats));
    if (designerStats[currentUsername]) {
      filteredDesignerStats = { [currentUsername]: designerStats[currentUsername] };
      console.log('✅ DEBUG - Filtrado aplicado, solo mostrando:', currentUsername);
    } else {
      filteredDesignerStats = {};
      console.log('⚠️ DEBUG - No se encontraron datos para el diseñador:', currentUsername);
    }
  } else {
    console.log('🔍 DEBUG - Usuario NO es diseñador o currentUser es null, mostrando todos');
  }
  
  // Ordenar diseñadores por total descendente
  const sortedDesigners = Object.entries(filteredDesignerStats).sort((a, b) => b[1].total - a[1].total);
  
  sortedDesigners.forEach(([designer, stats]) => {
    tableHTML += `
      <tr>
        <td class="clickable-name" data-user="${designer}" data-type="designer">${designer}</td>
        <td class="clickable-stat" data-user="${designer}" data-status="" data-type="designer">${stats.total}</td>
        <td class="clickable-stat" data-user="${designer}" data-status="activos" data-type="designer">${stats.activos}</td>
        <td class="clickable-stat" data-user="${designer}" data-status="revisión" data-type="designer">${stats.revision}</td>
        <td class="clickable-stat" data-user="${designer}" data-status="diseño" data-type="designer">${stats.diseño}</td>
        <td class="clickable-stat" data-user="${designer}" data-status="completado" data-type="designer">${stats.completado}</td>
        <td class="clickable-stat" data-user="${designer}" data-status="cancelado" data-type="designer">${stats.cancelado}</td>
      </tr>
    `;
  });
  
  // Totales generales (basados en los datos filtrados)
  const totals = {
    total: 0,
    activos: 0,
    revision: 0,
    diseño: 0,
    completado: 0,
    cancelado: 0
  };
  
  Object.values(filteredDesignerStats).forEach(stats => {
    totals.total += stats.total;
    totals.activos += stats.activos;
    totals.revision += stats.revision;
    totals.diseño += stats.diseño;
    totals.completado += stats.completado;
    totals.cancelado += stats.cancelado;
  });
  
  tableHTML += `
      <tr class="totals-row">
        <td><strong>TOTAL</strong></td>
        <td class="clickable-stat" data-user="all" data-status="" data-type="designer"><strong>${totals.total}</strong></td>
        <td class="clickable-stat" data-user="all" data-status="activos" data-type="designer"><strong>${totals.activos}</strong></td>
        <td class="clickable-stat" data-user="all" data-status="revisión" data-type="designer"><strong>${totals.revision}</strong></td>
        <td class="clickable-stat" data-user="all" data-status="diseño" data-type="designer"><strong>${totals.diseño}</strong></td>
        <td class="clickable-stat" data-user="all" data-status="completado" data-type="designer"><strong>${totals.completado}</strong></td>
        <td class="clickable-stat" data-user="all" data-status="cancelado" data-type="designer"><strong>${totals.cancelado}</strong></td>
      </tr>
    </tbody>
    </table>
  `;
  
  return tableHTML;
}

/**
 * Función que se llama cuando se hacen asignaciones para actualizar el sistema unificado
 * Esta función debe ser llamada después de cualquier cambio de asignación
 */
function handleAssignmentUpdate(itemIds, newAnalyst, newDesigner) {
  console.log('🔄 === INICIO handleAssignmentUpdate ===');
  console.log('📋 Items afectados:', itemIds.length);
  console.log('👤 Nuevo analista:', newAnalyst);
  console.log('👤 Nuevo diseñador:', newDesigner);
  
  try {
    // 1. MARCAR QUE HAY CAMBIOS PENDIENTES
    unifiedViewState.pendingChanges.push({
      type: 'assignment',
      itemIds: itemIds,
      analyst: newAnalyst,
      designer: newDesigner,
      timestamp: new Date()
    });
    
    // 2. ACTUALIZAR DATOS LOCALES INMEDIATAMENTE
    updateLocalAssignmentData(itemIds, newAnalyst, newDesigner);
    
    // 3. REGENERAR TODAS LAS TABLAS CON NUEVO ESTADO
    if (isCleanViewActive) {
      console.log('🔄 Vista de información activa - regenerando tablas con asignaciones...');
      
      // Usar timeout para permitir que se complete la operación de asignación
      setTimeout(() => {
        regenerateAllTablesWithState();
      }, 100);
    }
    
    console.log('✅ === FIN handleAssignmentUpdate ===');
    
  } catch (error) {
    console.error('❌ Error en handleAssignmentUpdate:', error);
  }
}

/**
 * Actualiza los datos locales con las nuevas asignaciones
 */
function updateLocalAssignmentData(itemIds, newAnalyst, newDesigner) {
  console.log('📝 Actualizando datos locales con asignaciones...');
  
  // Actualizar masterCommentData si existe
  if (masterCommentData && masterCommentData.length > 0) {
    masterCommentData.forEach(item => {
      if (itemIds.includes(item.Id) || itemIds.includes(String(item.Id))) {
        if (newAnalyst) {
          item.ultimoAnalista = newAnalyst;
          item['Analyst'] = newAnalyst;
          item['WA_VIS_Analyst'] = newAnalyst;
          // Actualizar fecha de analista
          const now = new Date().toISOString().split('T')[0];
          item.fechaAnalista = now;
          item['Analyst Date'] = now;
          item['WA_VIS_Analyst_Date'] = now;
        }
        
        if (newDesigner) {
          item.ultimoDisenador = newDesigner;
          item['Designer'] = newDesigner;
          item['WA_VIS_Designer'] = newDesigner;
          // Actualizar fecha de diseñador
          const now = new Date().toISOString().split('T')[0];
          item.fechaDisenador = now;
          item['Designer Date'] = now;
          item['WA_VIS_Designer_Date'] = now;
        }
        
        // Actualizar originalItem también
        if (item.originalItem) {
          if (newAnalyst) {
            item.originalItem['Analyst'] = newAnalyst;
            item.originalItem['WA_VIS_Analyst'] = newAnalyst;
            item.originalItem['Analyst Date'] = item.fechaAnalista;
            item.originalItem['WA_VIS_Analyst_Date'] = item.fechaAnalista;
          }
          if (newDesigner) {
            item.originalItem['Designer'] = newDesigner;
            item.originalItem['WA_VIS_Designer'] = newDesigner;
            item.originalItem['Designer Date'] = item.fechaDisenador;
            item.originalItem['WA_VIS_Designer_Date'] = item.fechaDisenador;
          }
        }
      }
    });
  }
  
  // Actualizar allLibraryData si existe  
  if (allLibraryData && allLibraryData.length > 0) {
    allLibraryData.forEach(item => {
      if (itemIds.includes(item.Id) || itemIds.includes(String(item.Id))) {
        if (newAnalyst) {
          item['Analyst'] = newAnalyst;
          item['WA_VIS_Analyst'] = newAnalyst;
          item['Analyst Date'] = new Date().toISOString().split('T')[0];
          item['WA_VIS_Analyst_Date'] = item['Analyst Date'];
        }
        
        if (newDesigner) {
          item['Designer'] = newDesigner;
          item['WA_VIS_Designer'] = newDesigner;
          item['Designer Date'] = new Date().toISOString().split('T')[0];
          item['WA_VIS_Designer_Date'] = item['Designer Date'];
        }
      }
    });
  }
  
  // Marcar que hay comentarios recientes para preservar cambios
  recentCommentsFlag = true;
  lastCommentTimestamp = new Date();
  
  console.log(`✅ Datos locales actualizados para ${itemIds.length} items`);
}

// Hacer la función global para que pueda ser llamada desde otras partes del código
window.handleAssignmentUpdate = handleAssignmentUpdate;

// ========== HELP MODAL FUNCTIONS ==========
function showHelpModal() {
  const modal = document.getElementById('helpModal');
  if (modal) {
    modal.classList.add('show');
    
    // Focus en el modal para capturar teclas
    modal.focus();
  }
}

function hideHelpModal() {
  const modal = document.getElementById('helpModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

// Event listener global para ESC key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const helpModal = document.getElementById('helpModal');
    if (helpModal && helpModal.classList.contains('show')) {
      hideHelpModal();
      event.preventDefault();
      event.stopPropagation();
    }
  }
});

// Event listener para click fuera del modal
document.addEventListener('DOMContentLoaded', function() {
  const helpModal = document.getElementById('helpModal');
  if (helpModal) {
    helpModal.addEventListener('click', function(event) {
      if (event.target === helpModal) {
        hideHelpModal();
      }
    });
  }
});

// ========== CONTEXT MENU FUNCTIONS ==========
function showContextMenu(event, elements) {
  // Quitar menú contextual previo si existe
  hideContextMenu();
  
  const contextMenu = document.createElement('div');
  contextMenu.id = 'contextMenu';
  contextMenu.className = 'context-menu';
  
  // Crear opciones del menú
  const menuOptions = [];
  
  // 💬 COMENTARIOS - Siempre disponible (priorizar Item Group)
  if (elements.itemGroupImage || elements.itemGroupContainer || elements.itemGroupHeader) {
    menuOptions.push({
      icon: 'fa-solid fa-comment',
      text: 'Comentarios',
      action: () => {
        if (currentItemGroup) {
          const commentText = currentItemGroup['WA_VIS_Comment'] || '';
          const itemGroupId = currentItemGroup['ID'] || currentItemGroup['Item Group ID'] || currentItemGroup['Id'] || '';
          const itemGroupName = currentItemGroup['Name'] || 'Item Group';
          const contextInfo = `${itemGroupName} </br> (${itemGroupId})`;
          openCommentModal('Comentarios de Item Group', contextInfo, commentText, 'group', null);
        }
        hideContextMenu();
      }
    });
  } else if (elements.imageCell || elements.imageThumbnail) {
    // Comentarios de imagen
    menuOptions.push({
      icon: 'fa-solid fa-comment',
      text: 'Comentarios...',
      action: () => {
        const imageName = elements.imageThumbnail?.getAttribute('data-filename') || elements.imageThumbnail?.alt;
        if (imageName) {
          // Usar la misma lógica que Alt+Ctrl+Click para funcionar con imágenes con o sin comentarios
          const commentText = getImageComments(imageName);
          openCommentModal('Comentarios de Imagen', imageName, commentText || '', 'image', imageName);
        }
        hideContextMenu();
      }
    });
    
    // Para imágenes, agregar todas las opciones de manipulación en el orden solicitado
    menuOptions.push(
      {
        icon: 'fa-solid fa-up-right-from-square fa-flip-horizontal',
        text: 'Asignar al Item Group',
        action: () => {
          handleItemGroupImageAssignment(event, elements.imageCell, elements.imageThumbnail, 'Right-click menu');
          hideContextMenu();
        }
      },
      {
        icon: 'fa-solid fa-up-right-from-square',
        text: 'Seleccionar imagen',
        action: () => {
          handleImageSelection(event, elements.imageCell, elements.imageThumbnail);
          hideContextMenu();
        }
      },
      {
        icon: 'fa-solid fa-circle-plus',
        text: 'Asignar imagen',
        action: () => {
          handleImageAssignment(event, elements.imageCell);
          hideContextMenu();
        }
      },
      {
        icon: 'fa-solid fa-trash',
        text: 'Quitar del Item Code',
        action: () => {
          // Usar la misma lógica que Alt+Click - eliminar de la celda específica
          handleImageRemoval(event, elements.imageCell, elements.imageThumbnail);
          hideContextMenu();
        }
      },
      {
        icon: 'fa-solid fa-trash',
        text: 'Quitar del Item Group',
        action: () => {
          // Usar la misma lógica que el botón de hover - eliminación masiva de todos los items
          handleBulkImageRemoval(event, elements.imageCell);
          hideContextMenu();
        }
      }
    );
  } else if (elements.itemCodeCell || elements.emptyImageCell) {
    // Comentarios de Item Code
    menuOptions.push({
      icon: 'fa-solid fa-comment',
      text: 'Comentarios',
      action: () => {
        const itemCodeName = elements.itemCodeCell?.querySelector('.item-code-text')?.textContent?.trim() || 
                            elements.emptyImageCell?.getAttribute('data-item-code');
        
        if (itemCodeName) {
          // Usar la misma lógica que Alt+Ctrl+Click para funcionar siempre
          const item = currentItemCodes.find(item => item.Name === itemCodeName);
          const commentText = item ? (item['WA_VIS_Comment'] || '') : '';
          const fullContext = generateItemCodeContext(itemCodeName);
          openCommentModal('Comentarios de Item Code', fullContext, commentText, 'item', null);
        }
        hideContextMenu();
      }
    });
  }
  
  // Crear HTML del menú con iconos de Font Awesome
  contextMenu.innerHTML = `
    ${menuOptions.map((option, index) => `
      <div class="context-menu-item" data-index="${index}">
        <i class="${option.icon}"></i>
        <span>${option.text}</span>
      </div>
    `).join('')}
  `;
  
  // Posicionar el menú en la posición del mouse
  contextMenu.style.left = event.pageX + 'px';
  contextMenu.style.top = event.pageY + 'px';
  
  // Agregar al DOM
  document.body.appendChild(contextMenu);
  
  // Agregar event listeners a las opciones
  menuOptions.forEach((option, index) => {
    const menuItem = contextMenu.querySelector(`[data-index="${index}"]`);
    if (menuItem) {
      menuItem.addEventListener('click', option.action);
    }
  });
  
  // Cerrar menú al hacer click fuera
  setTimeout(() => {
    document.addEventListener('click', hideContextMenu, { once: true });
  }, 10);
}

function hideContextMenu() {
  const existingMenu = document.getElementById('contextMenu');
  if (existingMenu) {
    existingMenu.remove();
  }
}
