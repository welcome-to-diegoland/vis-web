// Elementos del DOM (sección limpia)
const verticalDivider = document.getElementById('verticalDivider');
const leftSection = document.getElementById('leftSection');
const rightSection = document.getElementById('rightSection');
const container = document.querySelector('.main-container');
const combinedFileInput = document.getElementById("combinedFile");

// Variables de estado básicas
let isVerticalDragging = false;
let startX, startLeftWidth;
let originalExcelSheets = {}; // Para guardar las hojas del Excel
let currentWorkingData = []; // Para guardar los datos que se están trabajando
let allLibraryData = []; // Para guardar TODOS los datos de la library (no se sobrescribe)
let currentColumnsOrder = []; // Para mantener el orden original de las columnas
let currentAssetComments = []; // Para guardar los comentarios de las imágenes
let currentAssetGroups = []; // Para guardar los datos de galerías

// Variable global para mantener el zoom persistente
let globalZoomScale = 1; // Zoom persistente entre cambios de Item Group

// Variables globales para el sistema de selección y asignación de imágenes
let savedItemGroups = new Set(); // Set para trackear Item Groups guardados
let isCleanViewActive = false; // Estado del toggle de vista limpia

// Sistema de gestión de estado para scroll y filtros
let inventoryViewState = {
  scrollPosition: 0,
  scrollPositionX: 0,
  activeFilters: {},
  lastFilteredData: null
};

// Configuración para Google Apps Script
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyNHLEg0zipYBpd7G7ZTCURdhFhQiB2-wQSiMiRMJDI89G_heWtEFv428aHmz1ghQlo/exec';

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
    COLUMNS: ['NamePath', 'Name', 'IdPath', 'Id', 'ObjectTypeName', 'Item Group', 'CMS', 'Vis_color', 'filtro_color']
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
const AUTO_SAVE_DELAY = 1000; // 1 segundo entre envíos

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

// Sistema de cola para auto-guardado (evitar rate limiting)
async function processAutoSaveQueue() {
  if (isProcessingAutoSave || autoSaveQueue.length === 0) {
    return;
  }
  
  isProcessingAutoSave = true;
  console.log(`🔄 Procesando cola de auto-guardado: ${autoSaveQueue.length} elementos pendientes`);
  
  while (autoSaveQueue.length > 0) {
    const saveRequest = autoSaveQueue.shift();
    console.log(`📤 Enviando auto-guardado ${autoSaveQueue.length + 1} de ${autoSaveQueue.length + 1}: ID ${saveRequest.record.id}`);
    
    try {
      await sendAutoSaveRequest(saveRequest);
      console.log(`✅ Auto-guardado exitoso para ID: ${saveRequest.record.id}`);
    } catch (error) {
      console.error(`❌ Error en auto-guardado para ID: ${saveRequest.record.id}`, error);
    }
    
    // Delay entre envíos para evitar rate limiting
    if (autoSaveQueue.length > 0) {
      console.log(`⏱️ Esperando ${AUTO_SAVE_DELAY}ms antes del siguiente envío...`);
      await new Promise(resolve => setTimeout(resolve, AUTO_SAVE_DELAY));
    }
  }
  
  isProcessingAutoSave = false;
  console.log('✅ Cola de auto-guardado procesada completamente');
}

function addToAutoSaveQueue(record, user, date) {
  const saveRequest = {
    record: record,
    user: user,
    date: date,
    type: 'comment_autosave'
  };
  
  autoSaveQueue.push(saveRequest);
  console.log(`📥 Agregado a cola de auto-guardado: ID ${record.id} (${autoSaveQueue.length} en cola)`);
  
  // Iniciar procesamiento si no está activo
  if (!isProcessingAutoSave) {
    processAutoSaveQueue();
  }
}

async function sendAutoSaveRequest(saveRequest) {
  const payload = {
    records: [saveRequest.record],
    user: saveRequest.user,
    date: saveRequest.date,
    type: saveRequest.type
  };
  
  console.log('🚀 Enviando auto-guardado a Google Sheets...');
  console.log('📦 Payload:', JSON.stringify(payload, null, 2));
  
  return fetch(GOOGLE_APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(() => {
    console.log('✅ Auto-guardado enviado exitosamente para ID:', saveRequest.record.id, 'Tipo:', saveRequest.record.objectType);
    showAutoSaveNotification('Comentario de asignación guardado');
  }).catch(error => {
    console.error('❌ Error en fetch de auto-guardado:', error);
    showAutoSaveNotification('Error al guardar comentario de asignación', 'error');
    throw error;
  });
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
  Sandra: {
    name: 'Sandra',
    group: 'Analistas',
    displayName: 'Sandra (Analistas)'
  },
  Victor: {
    name: 'Victor',
    group: 'Analistas',
    displayName: 'Victor (Analistas)'
  },
  Ximena: {
    name: 'Ximena',
    group: 'Analistas',
    displayName: 'Ximena (Analistas)'
  },
  Carlos: {
    name: 'Carlos',
    group: 'Analistas',
    displayName: 'Carlos (Analistas)'
  },
  Kalem: {
    name: 'Kalem',
    group: 'Analistas',
    displayName: 'Kalem (Analistas)'
  },
  Veronica: {
    name: 'Verónica',
    group: 'Diseño',
    displayName: 'Verónica (Diseño)'
  },
  Rossana: {
    name: 'Rossana',
    group: 'Diseño',
    displayName: 'Rossana (Diseño)'
  },
  Carla: {
    name: 'Carla',
    group: 'Diseño',
    displayName: 'Carla (Diseño)'
  },
  Gabriela: {
    name: 'Gabriela',
    group: 'Diseño',
    displayName: 'Gabriela (Diseño)'
  },
  Thanya: {
    name: 'Thanya',
    group: 'Diseño',
    displayName: 'Thanya (Diseño)'
  },
  Grecia: {
    name: 'Grecia',
    group: 'Diseño',
    displayName: 'Grecia (Diseño)'
  },
  Cinthya: {
    name: 'Cinthya',
    group: 'Diseño',
    displayName: 'Cinthya (Diseño)'
  }
};

// Función para obtener el usuario actual
function getCurrentUser() {
  const userSelect = document.getElementById('userSelect');
  return userSelect ? userSelect.value : 'usuario'; // Usuario por defecto
}

// Función para obtener información completa del usuario actual
function getCurrentUserInfo() {
  const currentUserId = getCurrentUser();
  return USERS[currentUserId] || USERS.usuario;
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

// Función para navegar a un Item Group específico desde la tabla de inventario
function navigateToItemGroup(itemGroupId) {
  console.log('Navegando a Item Group:', itemGroupId);
  
  if (!itemGroupId || !allLibraryData) {
    console.error('ID de Item Group no válido o datos no cargados');
    return;
  }
  
  // 0. Guardar estado antes de navegar
  saveInventoryViewState();
  
  // 1. Desactivar vista limpia si está activa
  if (isCleanViewActive) {
    console.log('Desactivando vista limpia...');
    toggleCleanView();
  }
  
  // 2. Buscar el Item Group en TODOS los datos de la library
  const itemGroup = allLibraryData.find(item => {
    return item['Object Type'] === 'Item Group' && (item.Id === itemGroupId || String(item.Id) === String(itemGroupId));
  });
  
  if (!itemGroup) {
    console.error('Item Group no encontrado:', itemGroupId);
    console.log('Buscando en allLibraryData con', allLibraryData.length, 'elementos');
    
    // Debug: mostrar algunos Item Groups disponibles
    const availableGroups = allLibraryData.filter(item => item['Object Type'] === 'Item Group').slice(0, 5);
    console.log('Primeros 5 Item Groups disponibles:', availableGroups.map(g => ({ Id: g.Id, Name: g.Name })));
    
    alert('Item Group no encontrado');
    return;
  }
  
  console.log('Item Group encontrado:', itemGroup);
  
  // 3. Expandir el árbol hasta el path del Item Group
  if (itemGroup.NamePath) {
    expandTreeToPath(itemGroup.NamePath, true);
    
    // 4. Seleccionar el Item Group en el árbol después de expandir
    setTimeout(() => {
      const treeContainer = document.getElementById('tree');
      if (treeContainer) {
        // Quitar selección previa
        treeContainer.querySelectorAll('.category-tree-label.selected').forEach(el => {
          el.classList.remove('selected');
        });
        
        // Seleccionar el nuevo Item Group - usar un método más robusto para evitar problemas con comillas
        let targetElement = null;
        const allLabels = treeContainer.querySelectorAll('.category-tree-label[data-path]');
        for (const label of allLabels) {
          if (label.getAttribute('data-path') === itemGroup.NamePath) {
            targetElement = label;
            break;
          }
        }
        if (targetElement) {
          targetElement.classList.add('selected');
          console.log('Item Group seleccionado en el árbol');
          
          // 5. Cargar el Item Group en el Box 4
          loadImageGridInBox4(itemGroup.NamePath);
          console.log('Item Group cargado en Box 4');
          
          // 6. Hacer scroll al Item Group seleccionado
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          console.error('No se pudo encontrar el elemento en el árbol:', itemGroup.NamePath);
        }
      }
    }, 1000); // Dar tiempo para que el árbol se expanda
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
  return lastComment.status || '';
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
  // Limpiar localStorage automáticamente al cargar la página
  console.clear();
  localStorage.clear();
  
  // DIAGNÓSTICO INICIAL: Verificar configuración y elementos DOM
  runInitialDiagnostics();
  
  // Inicializar sistema de caché de Item Groups
  loadCacheFromLocalStorage();
  
  setupDragAndDrop();
  
  // Inicializar sistema de usuarios
  initializeUserSelector();
  
  // Inicializar Box 3 con el sistema de galerías
  initializeGallerySystem();
  
  // Inicializar controles del árbol (Box 1)
  const treeDiv = document.getElementById('tree');
  if (treeDiv) {
    initializeTreeControls(treeDiv);
  }
  
  // Event listener para cargar archivo Excel
  combinedFileInput.addEventListener('change', handleCombinedExcel);
  
  // Event listeners para los botones del header
  const saveChangesBtn = document.getElementById('saveChangesBtn');
  const exportBtn = document.getElementById('exportBtn');
  
  if (saveChangesBtn) {
    saveChangesBtn.addEventListener('click', saveToGoogleSheets);
  }
  
  // Event listener para botón de limpiar Item Groups guardados
  const clearSavedBtn = document.getElementById('clearSavedBtn');
  if (clearSavedBtn) {
    clearSavedBtn.addEventListener('click', clearSavedItemGroups);
  }
  
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToExcel);
  }
});

// Función de diagnóstico inicial
function runInitialDiagnostics() {
  console.log('🔍 DIAGNÓSTICO INICIAL');
  console.log('====================');
  
  // 1. Verificar configuración de Google Sheets
  console.log('📋 Configuración de Google Sheets:');
  console.log('   • PROXY_URL:', GOOGLE_SHEETS_CONFIG.PROXY_URL);
  console.log('   • DATA_PROXY_URL:', GOOGLE_SHEETS_CONFIG.DATA_PROXY_URL);
  console.log('   • CATEGORY_SHEET ID:', GOOGLE_SHEETS_CONFIG.CATEGORY_SHEET.SPREADSHEET_ID);
  console.log('   • DATA_SHEET ID:', GOOGLE_SHEETS_CONFIG.DATA_SHEET.SPREADSHEET_ID);
  
  // 2. Verificar elementos DOM críticos
  const criticalElements = [
    'box3-content',
    'tree',
    'loadExcelBtn',
    'combinedFile'
  ];
  
  console.log('🎯 Verificación de elementos DOM críticos:');
  criticalElements.forEach(id => {
    const element = document.getElementById(id);
    console.log(`   • ${id}: ${element ? '✅ Encontrado' : '❌ No encontrado'}`);
  });
  
  // 3. Verificar estado inicial de variables
  console.log('📊 Estado inicial de variables:');
  console.log('   • currentWorkingData:', currentWorkingData.length, 'elementos');
  console.log('   • currentAssetGroups:', currentAssetGroups.length, 'elementos');
  console.log('   • itemGroupDataCache:', itemGroupDataCache.size, 'elementos en caché');
  
  // 4. Verificar conectividad básica
  console.log('🌐 Verificando conectividad...');
  fetch('https://www.google.com', { mode: 'no-cors' })
    .then(() => console.log('   • Conectividad a internet: ✅ OK'))
    .catch(() => console.log('   • Conectividad a internet: ❌ Problema'));
    
  console.log('====================');
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
  const originalText = loadButton.innerHTML;
  
  try {
    // Mostrar estado de carga
    loadButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cargando...';
    loadButton.disabled = true;
    
    // Crear notificación de progreso
    showLoadingProgress('Iniciando carga de datos...', 'info');
    
    // Detectar si estamos en un entorno local (file://)
    const isLocalFile = window.location.protocol === 'file:';
    
    if (isLocalFile) {
      console.log('⚠️ Entorno local detectado (file://). Usando Apps Script proxy...');
      showLoadingProgress('Entorno local detectado, usando Apps Script...', 'info');
      
      // En entorno local, continuar con Apps Script normalmente
      // El Apps Script maneja CORS correctamente
    }

    showLoadingProgress('Cargando árbol de categorías...', 'info');
    
    // Cargar datos de la pestaña 'category' para el árbol
    const categoryData = await loadGoogleSheetAsCSV(
      GOOGLE_SHEETS_CONFIG.CATEGORY_SHEET.CSV_URL,
      'category'
    );
    
    if (!categoryData || categoryData.length === 0) {
      throw new Error('No se pudieron cargar datos de la pestaña category');
    }

    showLoadingProgress('Procesando árbol de categorías...', 'info');
    
    // Procesar y filtrar datos para el árbol
    processCategoryData(categoryData);

    showLoadingProgress('Cargando galerías de imágenes...', 'info');
    
    // Cargar asset_groups usando el proxy de Apps Script (mismo que category)
    try {
      console.log('🔄 Cargando asset_groups usando Apps Script proxy...');
      const assetGroupsData = await loadGoogleSheetAsCSV(null, 'asset_groups');
      
      if (assetGroupsData && assetGroupsData.length > 0) {
        currentAssetGroups = assetGroupsData;
        console.log('✅ asset_groups cargado con éxito');
        console.log('📊 Cantidad de elementos en asset_groups:', assetGroupsData.length);
        console.log('📊 Primer elemento de asset_groups:', assetGroupsData[0]);
        console.log('📊 Headers/Keys disponibles:', Object.keys(assetGroupsData[0] || {}));
        
        showLoadingProgress(`Cargadas ${assetGroupsData.length} galerías de imágenes`, 'success');
        
        // IMPORTANTE: Poblar el dropdown AHORA que ya tenemos los datos
        console.log('🔄 Poblando dropdown de galerías con datos recién cargados...');
        
        // Usar setTimeout para asegurar que el DOM esté listo
        setTimeout(() => {
          populateGalleryDropdown(currentAssetGroups);
        }, 100);
        
      } else {
        console.warn('⚠️ asset_groups está vacío o no se pudo procesar');
        currentAssetGroups = [];
        showLoadingProgress('Sin galerías disponibles', 'warning');
      }
    } catch (assetGroupsError) {
      console.warn('⚠️ No se pudo cargar asset_groups:', assetGroupsError.message);
      console.warn('📋 Detalles del error:', assetGroupsError);
      currentAssetGroups = [];
      showLoadingProgress('Error cargando galerías: ' + assetGroupsError.message, 'error');
      
      // Intentar cargar desde archivo local como fallback
      console.log('🔄 Intentando método de fallback para asset_groups...');
    }
    
    showLoadingProgress('¡Carga completada exitosamente!', 'success');
    
    // Ocultar notificación después de 3 segundos
    setTimeout(() => {
      hideLoadingProgress();
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error cargando desde Google Sheets:', error);
    
    showLoadingProgress('Error: ' + error.message, 'error');
    
    const helpMessage = `❌ Error cargando desde Google Sheets

🔧 POSIBLES SOLUCIONES:

1️⃣ VERIFICAR APPS SCRIPT:
   • Asegúrate de que el Apps Script esté implementado como "Aplicación web"
   • Acceso debe estar configurado como "Cualquier persona"
   • URL del proxy: ${GOOGLE_SHEETS_CONFIG.PROXY_URL}

2️⃣ VERIFICAR GOOGLE SHEETS:
   • Archivo debe tener permisos "Cualquiera con el enlace puede ver"
   • Debe existir la pestaña 'category'
   • Debe existir la pestaña 'asset_groups'

3️⃣ ALTERNATIVA - ARCHIVO LOCAL:
   • Puedes cargar un archivo Excel/CSV local como respaldo

Error técnico: ${error.message}

¿Quieres cargar un archivo local como alternativa?`;
    
    const useLocalFile = confirm(helpMessage);
    
    if (useLocalFile) {
      document.getElementById('combinedFile')?.click();
    }
    
  } finally {
    loadButton.innerHTML = originalText;
    loadButton.disabled = false;
  }
}

// Funciones para mostrar progreso de carga
function showLoadingProgress(message, type = 'info') {
  // Buscar contenedor existente o crear uno nuevo
  let progressContainer = document.getElementById('loadingProgressContainer');
  
  if (!progressContainer) {
    progressContainer = document.createElement('div');
    progressContainer.id = 'loadingProgressContainer';
    progressContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      min-width: 300px;
      max-width: 400px;
    `;
    document.body.appendChild(progressContainer);
  }
  
  const alertClass = {
    'info': 'alert-info',
    'success': 'alert-success', 
    'warning': 'alert-warning',
    'error': 'alert-danger'
  }[type] || 'alert-info';
  
  const icon = {
    'info': '<i class="fa-solid fa-spinner fa-spin"></i>',
    'success': '<i class="fa-solid fa-check"></i>',
    'warning': '<i class="fa-solid fa-exclamation-triangle"></i>',
    'error': '<i class="fa-solid fa-exclamation-circle"></i>'
  }[type] || '<i class="fa-solid fa-info"></i>';
  
  progressContainer.innerHTML = `
    <div class="alert ${alertClass} alert-dismissible" role="alert" style="margin-bottom: 5px;">
      ${icon} ${message}
    </div>
  `;
}

function hideLoadingProgress() {
  const progressContainer = document.getElementById('loadingProgressContainer');
  if (progressContainer) {
    progressContainer.remove();
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
    console.log(`📋 Primeras líneas:`, responseText.split('\n').slice(0, 3));
    
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
   
� SOLUCIÓN:
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
    console.log('📋 Datos en formato original (no concatenados)');
    return data;
  }
  
  console.log('🔄 Detectados datos concatenados, transformando...');
  
  try {
    // Usar el adaptador que creamos
    const expandedData = transformConcatenatedDataToExpanded(data);
    console.log(`✅ Transformación exitosa: ${data.length} → ${expandedData.length} filas`);
    return expandedData;
    
  } catch (error) {
    console.error('❌ Error transformando datos concatenados:', error);
    console.log('📋 Usando datos originales como fallback');
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
      
      // Mostrar progreso cada 1000 filas para evitar spam en la consola
      if (processedCount % 1000 === 0) {
        console.log(`🔄 Procesadas ${processedCount}/${concatenatedData.length} filas...`);
      }
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
      'Name': objectType || id
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
      'value': objectType
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
      
      // 📋 LOG DETALLADO para Item Group/Item Code
      console.log(`📋 ═══════ DATOS DE ${objectType.toUpperCase()} ═══════`);
      console.log(`🆔 Item Group ID: ${itemGroupId}`);
      console.log(`🔢 Item ID: ${itemId}`);
      console.log(`📝 Object Type: ${objectType}`);
      console.log(`📊 ATRIBUTOS EXTRAÍDOS:`);
      
      const itemCodeAttributes = ['Name', 'Marca', 'Título', 'CMS', 'Página de Catálogo', 'WA Importancia', 'WA_VIS_Comment', 'WA_VIS_Cover', 'WA_VIS_Gallery', 'WA_VIS_Rest'];
      itemCodeAttributes.forEach((attr, index) => {
        const value = parsedData[attr] || '';
        const hasValue = value && value.trim() !== '';
        const status = hasValue ? '✅' : '❌';
        console.log(`   ${status} [${index + 1}] ${attr}: "${value}" ${hasValue ? `(${value.length} chars)` : '(vacío)'}`);
      });
      console.log(`📊 Total de atributos con valor: ${itemCodeAttributes.filter(attr => parsedData[attr] && parsedData[attr].trim() !== '').length}/${itemCodeAttributes.length}`);
      console.log(`═══════════════════════════════════`);
      break;
      
    case 'Image':
      parsedData = parseImageData(concatenated);
      
      // 📋 LOG DETALLADO para Image
      console.log(`📸 ═══════ DATOS DE IMAGE ═══════`);
      console.log(`🆔 Item Group ID: ${itemGroupId}`);
      console.log(`🔢 Item ID: ${itemId}`);
      console.log(`📝 Object Type: ${objectType}`);
      console.log(`📊 ATRIBUTOS EXTRAÍDOS:`);
      
      const imageAttributes = ['Name', 'WA_VIS_Comment'];
      imageAttributes.forEach((attr, index) => {
        const value = parsedData[attr] || '';
        const hasValue = value && value.trim() !== '';
        const status = hasValue ? '✅' : '❌';
        console.log(`   ${status} [${index + 1}] ${attr}: "${value}" ${hasValue ? `(${value.length} chars)` : '(vacío)'}`);
      });
      console.log(`📊 Total de atributos con valor: ${imageAttributes.filter(attr => parsedData[attr] && parsedData[attr].trim() !== '').length}/${imageAttributes.length}`);
      console.log(`═══════════════════════════════════`);
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
  
  // ATRIBUTOS FIJOS para Image (SIEMPRE en este orden)
  const FIXED_ATTRIBUTES = [
    'Name',
    'WA_VIS_Comment'
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
  
  console.log(`📋 Headers encontrados en ${sheetName}:`, headers);
  
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
    currentColumnsOrder = [...expectedColumns];
    
    // Limpiar arrays de comentarios ya que no los tenemos en esta fase
    currentAssetComments = [];
    
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
  const totalStartTime = performance.now();
  
  try {
    console.log(`🚀 Obteniendo Item Group ${itemGroupId} del caché...`);
    
    // MÉTODO CACHÉ: Verificar si ya tenemos el caché cargado
    if (allItemGroupsLoaded && itemGroupDataCache.has(itemGroupId)) {
      const cachedData = itemGroupDataCache.get(itemGroupId);
      const totalTime = performance.now() - totalStartTime;
      console.log(`✅ Datos obtenidos del caché en ${totalTime.toFixed(2)}ms`);
      console.log(`📊 Filas obtenidas del caché: ${cachedData.length}`);
      return cachedData;
    }
    
    // Si no hay caché, usar método directo
    console.log(`⚠️ Caché no disponible, usando método directo...`);
    
    // MÉTODO DIRECTO: Intentar primero el filtrado en Apps Script (más rápido)
    console.log(`� Intentando método directo para Item Group ${itemGroupId}...`);
    
    const directUrl = `${GOOGLE_SHEETS_CONFIG.DATA_PROXY_URL}?action=getItemGroupData&itemGroupId=${itemGroupId}&timestamp=${Date.now()}`;
    
    try {
      console.log(`🔗 Llamando a Apps Script (método directo): ${directUrl}`);
      
      const fetchStartTime = performance.now();
      const directResponse = await fetch(directUrl, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Accept': 'text/csv,text/plain,application/json,*/*'
        },
        timeout: 10000  // Timeout más corto para método directo
      });
      const fetchEndTime = performance.now();
      console.log(`⏱️ Tiempo de FETCH (directo): ${(fetchEndTime - fetchStartTime).toFixed(2)}ms`);
      
      if (directResponse.ok) {
        const parseStartTime = performance.now();
        const directData = await directResponse.text();
        console.log(`✅ Método directo exitoso, parseando datos...`);
        console.log(`📏 Tamaño de datos (directo): ${directData.length} caracteres`);
        
        const parsedDirectData = parseCSVToObjects(directData, 'data');
        const parseEndTime = performance.now();
        console.log(`📊 Filas cargadas (método directo): ${parsedDirectData.length}`);
        console.log(`⏱️ Tiempo de PARSING CSV: ${(parseEndTime - parseStartTime).toFixed(2)}ms`);
        
        return parsedDirectData;
      }
    } catch (directError) {
      console.warn(`⚠️ Método directo falló: ${directError.message}`);
    }
    
    // FALLBACK: Si el método directo falla, usar el método completo
    console.log(`🔄 Usando método fallback - cargando TODA la pestaña data y filtrando por Item Group ${itemGroupId}...`);
    
    const dataSheetUrl = `${GOOGLE_SHEETS_CONFIG.DATA_PROXY_URL}?sheet=data&format=csv&timestamp=${Date.now()}`;
    
    console.log(`🔗 Llamando a Apps Script (método fallback): ${dataSheetUrl}`);
    
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
    
    console.log(`✅ Datos completos cargados, parseando...`);
    console.log(`📏 Tamaño de datos: ${responseText.length} caracteres`);
    
    // Convertir CSV a array de objetos
    const allData = parseCSVToObjects(responseText, 'data');
    
    // 🔄 NUEVO: Detectar si los datos están concatenados y transformarlos
    const processedData = transformDataIfConcatenated(allData);
    
    if (!processedData || processedData.length === 0) {
      throw new Error('No se pudieron cargar datos de la pestaña data');
    }
    
    console.log(`📊 Total de filas cargadas: ${allData.length} → procesadas: ${processedData.length}`);
    
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
    
    console.log(`🎯 Filas filtradas para Item Group ${itemGroupId}: ${itemGroupData.length}`);
    
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
  const processStartTime = performance.now();
  
  if (!itemGroupId) {
    throw new Error('ID de Item Group requerido');
  }
  
  try {
    console.log(`🔄 Cargando datos para Item Group ID: ${itemGroupId} desde nuevo Apps Script...`);
    
    // Llamar al NUEVO Apps Script que filtra por Item Group ID
    const loadStartTime = performance.now();
    const itemGroupData = await loadItemGroupFromDatabase(itemGroupId);
    const loadEndTime = performance.now();
    console.log(`⏱️ TIEMPO TOTAL de loadItemGroupFromDatabase: ${(loadEndTime - loadStartTime).toFixed(2)}ms`);
    
    if (!itemGroupData || itemGroupData.length === 0) {
      console.warn(`⚠️ No se encontraron datos para Item Group: ${itemGroupId}`);
      return null;
    }
    
    console.log(`✅ Datos recibidos: ${itemGroupData.length} filas para Item Group ${itemGroupId}`);
    
    // 📋 LOG DETALLADO SOLO PARA ESTE ITEM GROUP ESPECÍFICO
    console.log(`📋 ═══════ ANÁLISIS DETALLADO ITEM GROUP ${itemGroupId} ═══════`);
    
    itemGroupData.forEach(row => {
      const objectType = row['Object Type'];
      const concatenated = row['data_concatenated'];
      const itemId = row['ID'];
      
      if (!concatenated) return;
      
      let parsedData = {};
      
      if (objectType === 'Item Group' || objectType === 'Item Code') {
        parsedData = parseItemCodeData(concatenated);
        
        console.log(`📝 ═══ ${objectType.toUpperCase()} (ID: ${itemId}) ═══`);
        const itemCodeAttributes = ['Name', 'Marca', 'Título', 'CMS', 'Página de Catálogo', 'WA Importancia', 'WA_VIS_Comment', 'WA_VIS_Cover', 'WA_VIS_Gallery', 'WA_VIS_Rest'];
        itemCodeAttributes.forEach((attr, index) => {
          const value = parsedData[attr] || '';
          const hasValue = value && value.trim() !== '';
          const status = hasValue ? '✅' : '❌';
          console.log(`   ${status} [${index + 1}] ${attr}: "${value}" ${hasValue ? `(${value.length} chars)` : '(vacío)'}`);
        });
        const filledCount = itemCodeAttributes.filter(attr => parsedData[attr] && parsedData[attr].trim() !== '').length;
        console.log(`📊 Completitud: ${filledCount}/${itemCodeAttributes.length} atributos con valor`);
        
      } else if (objectType === 'Image') {
        parsedData = parseImageData(concatenated);
        
        console.log(`📸 ═══ IMAGE (ID: ${itemId}) ═══`);
        const imageAttributes = ['Name', 'WA_VIS_Comment'];
        imageAttributes.forEach((attr, index) => {
          const value = parsedData[attr] || '';
          const hasValue = value && value.trim() !== '';
          const status = hasValue ? '✅' : '❌';
          console.log(`   ${status} [${index + 1}] ${attr}: "${value}" ${hasValue ? `(${value.length} chars)` : '(vacío)'}`);
        });
        const filledCount = imageAttributes.filter(attr => parsedData[attr] && parsedData[attr].trim() !== '').length;
        console.log(`📊 Completitud: ${filledCount}/${imageAttributes.length} atributos con valor`);
      }
    });
    console.log(`═══════════════════════════════════════════════════════`);
    
    // Transformar los datos de formato clave-valor al formato esperado por el grid
    const transformStartTime = performance.now();
    const transformedData = transformKeyValueData(itemGroupData);
    const transformEndTime = performance.now();
    console.log(`⏱️ TIEMPO de transformKeyValueData: ${(transformEndTime - transformStartTime).toFixed(2)}ms`);
    
    const processEndTime = performance.now();
    console.log(`🎯 TIEMPO TOTAL DE TODO EL PROCESO: ${(processEndTime - processStartTime).toFixed(2)}ms`);
    
    return transformedData;
    
  } catch (error) {
    console.error(`❌ Error cargando detalles de Item Group ${itemGroupId}:`, error);
    throw error;
  }
}

// Función para transformar datos de estructura clave-valor al formato esperado por el grid
function transformKeyValueData(keyValueData) {
  const transformedItems = {};
  
  // Agrupar por ID para reconstruir cada item
  keyValueData.forEach(row => {
    const id = row['ID'];
    const objectType = row['Object Type'];
    const attribute = row['Attribute'];
    const value = row['value'];
    
    // DEBUG: Mostrar algunos atributos para el Item Group principal
    if (objectType === 'Item Group' && (attribute === 'Título' || attribute === 'Marca')) {
      console.log(`🔍 DEBUG Item Group ID ${id}: ${attribute} = "${value}"`);
    }
    
    if (!transformedItems[id]) {
      transformedItems[id] = {
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
    }
    
    // Mapear atributos específicos
    if (attribute === 'CMS') {
      transformedItems[id]['CMS'] = value;
    } else if (attribute === 'Marca') {
      transformedItems[id]['Marca'] = value;
    } else if (attribute === 'Página de Catálogo') {
      transformedItems[id]['Página de Catálogo'] = value;
    } else if (attribute === 'Título') {
      transformedItems[id]['Título'] = value;
      console.log(`🔍 DEBUG: Título encontrado para ID ${id}: "${value}"`);
    } else if (attribute === 'WA Importancia') {
      transformedItems[id]['WA Importancia'] = value;
    } else if (attribute === 'WA_VIS_Comment') {
      transformedItems[id]['WA_VIS_Comment'] = value;
    } else if (attribute === 'WA_VIS_Gallery') {
      // Procesar las imágenes de galería (formato: imagen1.jpg, imagen2.jpg, ...)
      if (value && value.trim()) {
        const images = value.split(',').map(img => img.trim()).filter(img => img);
        images.forEach((image, index) => {
          if (index < 25) { // Máximo 25 imágenes de galería
            const galField = `WA_Gallery_${String(index + 1).padStart(2, '0')}`;
            transformedItems[id][galField] = image;
          }
        });
      }
    } else if (attribute === 'WA_VIS_Cover') {
      // Procesar las imágenes de portada
      if (value && value.trim()) {
        const images = value.split(',').map(img => img.trim()).filter(img => img);
        images.forEach((image, index) => {
          if (index < 5) { // Máximo 5 imágenes de portada
            const coverField = `WA_Cover_Image_${String(index + 1).padStart(2, '0')}`;
            transformedItems[id][coverField] = image;
          }
        });
      }
    } else if (attribute === 'WA_VIS_Rest') {
      // Procesar las imágenes de resto
      if (value && value.trim()) {
        const images = value.split(',').map(img => img.trim()).filter(img => img);
        images.forEach((image, index) => {
          if (index < 25) { // Máximo 25 imágenes de resto
            const restField = `WA_Rest_${String(index + 1).padStart(2, '0')}`;
            transformedItems[id][restField] = image;
          }
        });
      }
    }
    // Agregar más mapeos de atributos según sea necesario
  });
  
  // Buscar información adicional en los datos básicos del árbol para completar Name, NamePath, etc.
  Object.keys(transformedItems).forEach(id => {
    const basicData = allLibraryData.find(item => 
      String(item.Id) === String(id)
    );
    
    if (basicData) {
      transformedItems[id].Name = basicData.Name || '';
      transformedItems[id].NamePath = basicData.NamePath || '';
      transformedItems[id].IdPath = basicData.IdPath || '';
      transformedItems[id].Vis_color = basicData.Vis_color || '';
      transformedItems[id].filtro_color = basicData.filtro_color || '';
    }
  });
  
  console.log(`✅ Transformación completada: ${Object.keys(transformedItems).length} items transformados`);
  console.log('📊 Ejemplo de item transformado:', Object.values(transformedItems)[0]);
  
  return transformedItems;
}

// Función auxiliar para procesar workbook (extraída de handleCombinedExcel)
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
    
    // Columnas esperadas (igual que en handleCombinedExcel)
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
    
    // Procesar hoja VIS_AG_Library_Structure (igual que en handleCombinedExcel)
    if (originalExcelSheets['VIS_AG_Library_Structure']) {
      // Usar XLSX.utils.sheet_to_json para convertir directamente 
      const assetSheet = workbook.Sheets["VIS_AG_Library_Structure"];
      if (assetSheet) {
        allLibraryData = XLSX.utils.sheet_to_json(assetSheet, { defval: "" });
        console.log(`✅ VIS_AG_Library_Structure cargado: ${allLibraryData.length} registros`);
        console.log('📊 Muestra de datos:', allLibraryData.slice(0, 2));
      }
    }
    
    // Procesar hoja VIS_AG_Asset_Structure para comentarios (igual que en handleCombinedExcel)
    if (originalExcelSheets['VIS_AG_Asset_Structure']) {
      const assetCommentsSheet = workbook.Sheets["VIS_AG_Asset_Structure"];
      if (assetCommentsSheet) {
        currentAssetComments = XLSX.utils.sheet_to_json(assetCommentsSheet, { defval: "" });
        console.log(`✅ VIS_AG_Asset_Structure cargado: ${currentAssetComments.length} registros`);
      }
    }
    
    // Procesar hoja asset_groups para galerías (igual que en handleCombinedExcel)
    if (originalExcelSheets['asset_groups']) {
      const assetGroupsSheet = workbook.Sheets["asset_groups"];
      if (assetGroupsSheet) {
        currentAssetGroups = XLSX.utils.sheet_to_json(assetGroupsSheet, { defval: "" });
        console.log(`✅ asset_groups cargado: ${currentAssetGroups.length} registros`);
      }
    }
    
    // Filtrar SOLO los campos necesarios para el trabajo (igual que en handleCombinedExcel)
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

// Función para manejar archivos Excel y construir el árbol
function handleCombinedExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      // Guarda todas las hojas originales
      originalExcelSheets = {};
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        if (rows.length) {
          originalExcelSheets[sheetName] = {
            header: rows[0],
            data: XLSX.utils.sheet_to_json(sheet, { defval: "" })
          };
        }
      });

      // SOLO columnas que quieres leer
      const columnsToRead = [
        "NamePath", "Name", "IdPath", "Id", "Object Type", "CMS", "Marca", "Página de Catálogo", "Título", "WA Importancia", "WA_VIS_Comment", "WA_VIS_Approved", "Vis_color", "filtro_color",
        "WA_Cover_Image_01", "WA_Cover_Image_02", "WA_Cover_Image_03", "WA_Cover_Image_04", "WA_Cover_Image_05",
        ...Array.from({length: 22}, (_, i) => `WA_Gallery_${String(i+1).padStart(2,'0')}`),
        ...Array.from({length: 25}, (_, i) => `WA_Rest_${String(i+1).padStart(2,'0')}`)
      ];

      // Lee la hoja principal
      const assetSheet = workbook.Sheets["VIS_AG_Library_Structure"];
      if (!assetSheet) {
        console.error("No se encontró la hoja VIS_AG_Library_Structure.");
        return;
      }
      const allRows = XLSX.utils.sheet_to_json(assetSheet, { defval: "" });

      // Lee la hoja de comentarios de assets
      const assetCommentsSheet = workbook.Sheets["VIS_AG_Asset_Structure"];
      let assetCommentsData = [];
      if (assetCommentsSheet) {
        const assetCommentsRows = XLSX.utils.sheet_to_json(assetCommentsSheet, { defval: "" });
        // Guardar TODOS los registros de VIS_AG_Asset_Structure, no solo los que tienen comentarios
        assetCommentsData = assetCommentsRows;
      } else {
        console.warn("No se encontró la hoja VIS_AG_Asset_Structure para comentarios de imágenes.");
      }

      // Leer la hoja asset_groups del mismo archivo
      const assetGroupsSheet = workbook.Sheets["asset_groups"];
      let assetGroupsData = [];
      if (assetGroupsSheet) {
        assetGroupsData = XLSX.utils.sheet_to_json(assetGroupsSheet, { defval: "" });
        
        // Guardar los datos globalmente
        currentAssetGroups = assetGroupsData;
      } else {
        console.warn("No se encontró la hoja asset_groups para las galerías.");
      }

      // Filtra SOLO los campos necesarios
      const assetRows = allRows.map(row => {
        const filtered = {};
        columnsToRead.forEach(col => {
          filtered[col] = row[col] ?? "";
        });
        return filtered;
      });

      // Guarda los datos para trabajar, el orden de las columnas y los comentarios de assets
      currentWorkingData = [...assetRows];
      allLibraryData = [...assetRows]; // Guardar todos los datos globalmente (no se sobrescribe)
      currentAssetComments = [...assetCommentsData];
      currentColumnsOrder = [...columnsToRead];
      
      // Renderiza el árbol usando solo las columnas filtradas
      renderAssetLibraryTree(assetRows, document.getElementById('tree'));
      
      // Reinicializar Box 3 con el sistema de galerías y limpiar Box 4
      reinitializeBoxContents();
    } catch (error) {
      console.error("Error procesando archivo combinado:", error);
      console.error("Ocurrió un error procesando el archivo combinado:", error.message);
    }
  };
  reader.readAsArrayBuffer(file);
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
    console.warn('⚠️ No hay currentAssetGroups para poblar el dropdown');
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
      treeDiv.classList.remove('approval-view-active', 'approval-filtered-active');
      if (box4) box4.classList.remove('approval-view-active', 'approval-filtered-active');
      
      removeApprovalColors(treeList);
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
          break;
          
        case 'approval-filtered':
          // Vista aprobación filtrada: colores + filtro
          treeDiv.classList.add('approval-view-active', 'approval-filtered-active');
          if (box4) box4.classList.add('approval-view-active', 'approval-filtered-active');
          applyFilterAndColors(treeList);
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

    function performCatalogSearch() {
      const searchTerm = catalogSearchInput.value.trim();
      
      if (!searchTerm) {
        return;
      }

      if (!currentWorkingData || currentWorkingData.length === 0) {
        return;
      }

      // Buscar en la columna Name de VIS_AG_Library_Structure
      const searchResults = currentWorkingData.filter(item => {
        const itemName = item.Name || '';
        return itemName.toLowerCase().includes(searchTerm.toLowerCase());
      });

      if (searchResults.length === 0) {
        alert('No se encontraron resultados para: ' + searchTerm);
        return;
      }

      // Guardar resultados y resetear índice
      currentCatalogSearchResults = searchResults;
      currentCatalogSearchIndex = 0;
      
      // Ir al primer resultado
      navigateToSearchResult();
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

// Función para cargar la retícula de imágenes en box4 (NUEVA ARQUITECTURA - Carga bajo demanda)
async function loadImageGridInBox4(itemGroupPath) {
  // Buscar el Item Group actual en los datos básicos del árbol
  const itemGroup = currentWorkingData.find(item => {
    return item['Object Type'] === 'Item Group' && item.NamePath === itemGroupPath;
  });

  if (!itemGroup) {
    console.error('Item Group no encontrado en los datos básicos:', itemGroupPath);
    addContentToBox4('<div class="p-3"><p>Item Group no encontrado.</p></div>');
    return;
  }

  // IMPORTANTE: Guardar el Item Group actual globalmente para otras funciones
  currentItemGroup = itemGroup;
  
  const itemGroupId = itemGroup.Id;
  console.log(`🎯 ITEM GROUP SELECCIONADO: ${itemGroup.Name} (ID: ${itemGroupId})`);
  
  // Mostrar estado de carga
  addContentToBox4(`
    <div class="loading-container" style="display: flex; justify-content: center; align-items: center; height: 200px; flex-direction: column;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: #007bff; margin-bottom: 1rem;"></i>
      <p>Cargando datos detallados del Item Group...</p>
    </div>
  `);

  try {
    // FASE 2: Cargar datos detallados bajo demanda
    const detailedData = await loadItemGroupDetails(itemGroupId);
    
    // 📋 LOG DETALLADO SOLO PARA ESTE ITEM GROUP ESPECÍFICO SELECCIONADO
    if (detailedData && Object.keys(detailedData).length > 0) {
      console.log(`📋 ═════ ANÁLISIS DETALLADO ITEM GROUP ${itemGroupId} ═════`);
      
      Object.values(detailedData).forEach(item => {
        const objectType = item['Object Type'];
        const itemId = item['ID'];
        
        if (objectType === 'Item Group' || objectType === 'Item Code') {
          console.log(`📝 ═══ ${objectType.toUpperCase()} (ID: ${itemId}) ═══`);
          const itemCodeAttributes = ['Name', 'Marca', 'Título', 'CMS', 'Página de Catálogo', 'WA Importancia', 'WA_VIS_Comment', 'WA_VIS_Cover', 'WA_VIS_Gallery', 'WA_VIS_Rest'];
          itemCodeAttributes.forEach((attr, index) => {
            const value = item[attr] || '';
            const hasValue = value && value.trim() !== '';
            const status = hasValue ? '✅' : '❌';
            console.log(`   ${status} [${index + 1}] ${attr}: "${value}" ${hasValue ? `(${value.length} chars)` : '(vacío)'}`);
          });
          const filledCount = itemCodeAttributes.filter(attr => item[attr] && item[attr].trim() !== '').length;
          console.log(`📊 Completitud: ${filledCount}/${itemCodeAttributes.length} atributos con valor`);
          
        } else if (objectType === 'Image') {
          console.log(`📸 ═══ IMAGE (ID: ${itemId}) ═══`);
          const imageAttributes = ['Name', 'WA_VIS_Comment'];
          imageAttributes.forEach((attr, index) => {
            const value = item[attr] || '';
            const hasValue = value && value.trim() !== '';
            const status = hasValue ? '✅' : '❌';
            console.log(`   ${status} [${index + 1}] ${attr}: "${value}" ${hasValue ? `(${value.length} chars)` : '(vacío)'}`);
          });
          const filledCount = imageAttributes.filter(attr => item[attr] && item[attr].trim() !== '').length;
          console.log(`📊 Completitud: ${filledCount}/${imageAttributes.length} atributos con valor`);
        }
      });
      console.log(`═══════════════════════════════════════════════════════`);
    }
    
    if (!detailedData || Object.keys(detailedData).length === 0) {
      addContentToBox4('<div class="p-3"><p>No se encontraron datos detallados para este Item Group.</p></div>');
      return;
    }
    
    // Convertir el objeto transformado a array y separar Item Codes
    const allItems = Object.values(detailedData);
    const itemCodes = allItems.filter(item => item['Object Type'] === 'Item Code');
    
    console.log(`📦 ITEM CODES ENCONTRADOS: ${itemCodes.length} items`);
    itemCodes.forEach(code => {
      console.log(`   - ${code.Id} (${code.Name})`);
    });

    if (itemCodes.length === 0) {
      addContentToBox4('<div class="p-3"><p>No se encontraron Item Codes para este grupo.</p></div>');
      return;
    }

    // Buscar si hay datos del Item Group en los detalles
    const itemGroupDetails = allItems.find(item => item['Object Type'] === 'Item Group');
    if (itemGroupDetails) {
      // Mezclar datos básicos con datos detallados
      currentItemGroup = { ...itemGroup, ...itemGroupDetails };
    }

    // Definir las columnas de imágenes en el orden correcto
    const imageColumns = [
      'WA_Cover_Image_01', 'WA_Cover_Image_02', 'WA_Cover_Image_03', 'WA_Cover_Image_04', 'WA_Cover_Image_05',
      ...Array.from({length: 25}, (_, i) => `WA_Gallery_${String(i+1).padStart(2,'0')}`),
      ...Array.from({length: 25}, (_, i) => `WA_Rest_${String(i+1).padStart(2,'0')}`)
    ];

    // Guardar datos actuales para regeneración
    currentItemCodes = [...itemCodes];
    currentImageColumns = [...imageColumns];
    
    console.log(`🔧 CONFIGURANDO GRID CON ${itemCodes.length} ITEM CODES`);
    console.log(`📊 Columnas de imagen disponibles: ${imageColumns.length}`);

    // Crear la retícula
    const gridHtml = createImageGrid(itemCodes, imageColumns, currentItemGroup);
    
    // Crear la estructura con barra de controles separada
    const fullHtml = `
      <div class="image-management-container">
        <div class="controls-bar">
          <div class="controls-left">
            <span class="controls-title">Controles de Imágenes</span>
          </div>
          <div class="controls-right">
            <div class="zoom-controls">
              <button class="zoom-button" id="zoomOut" title="Reducir tamaño">🔍−</button>
              <span class="zoom-info" id="zoomInfo">100%</span>
              <button class="zoom-button" id="zoomIn" title="Aumentar tamaño">🔍+</button>
            </div>
            <button class="cleanup-button" id="cleanupGalButton" title="Limpiar GAL: Elimina imágenes que no pertenecen a su Item Code">
              Limpiar GAL
            </button>
          </div>
        </div>
        ${gridHtml}
      </div>
    `;
    
    addContentToBox4(fullHtml);
    
    // INICIALIZAR VARIABLES CSS INMEDIATAMENTE para evitar glitch visual
    const container = document.querySelector('.main-container');
    if (container) {
      // Calcular valores usando el zoom persistente global
      const imageSize = Math.round(80 * globalZoomScale);
      container.style.setProperty('--image-size', imageSize + 'px');
      
      // Calcular font-scale usando el mismo algoritmo que setupZoomControls
      let fontScale;
      if (globalZoomScale <= 0.5) {
        fontScale = '7px';
      } else if (globalZoomScale <= 0.75) {
        fontScale = '8px';
      } else if (globalZoomScale <= 1) {
        fontScale = '8px';
      } else if (globalZoomScale <= 1.5) {
        fontScale = '9px';
      } else if (globalZoomScale <= 2) {
        fontScale = '10px';
      } else if (globalZoomScale <= 2.5) {
        fontScale = '11px';
      } else {
        fontScale = '12px';
      }
      container.style.setProperty('--font-scale', fontScale);
    }
    
    // Configurar controles de zoom y sincronización después de que se agregue al DOM
    setTimeout(() => {
      setupZoomControls();
      setupScrollSynchronization();
      setupImageSystemEventListeners();
      setupItemGroupDeleteButton();
      setupItemGroupImageClick();
      setupBrandFilter();
      
      // Actualizar indicadores de múltiples imágenes después de cargar el grid
      updateMultipleImagesIndicators();
    }, 500);
    
    // Intentar de nuevo la sincronización después de un delay más largo
    setTimeout(() => {
      setupScrollSynchronization();
    }, 1500);
    
  } catch (error) {
    console.error('❌ Error cargando grid de imágenes:', error);
    addContentToBox4(`
      <div class="p-3 text-center">
        <p class="text-danger">❌ Error cargando datos detallados:</p>
        <p class="small">${error.message}</p>
        <button class="btn btn-secondary btn-sm" onclick="loadImageGridInBox4('${itemGroupPath}')">
          Reintentar
        </button>
      </div>
    `);
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
    rest: imageColumns.filter(col => col.includes('Rst') || col.includes('Rest'))
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
                 <div class="item-group-delete-btn" title="Quitar imagen del Item Group">🗑️</div>` : 
                '<div class="no-image">📷</div>'
              }
              ${itemGroup && itemGroup['WA_VIS_Comment'] && itemGroup['WA_VIS_Comment'].trim() ? 
                `<div class="comment-indicator group-comment" data-comment="${itemGroup['WA_VIS_Comment']}" data-status="${getCurrentStatus(itemGroup['WA_VIS_Comment'])}">💬</div>` : 
                ''
              }
            </div>
            <div class="item-group-details">
              <div class="group-title">
                ${itemGroup ? (itemGroup['Título'] || itemGroup['Title'] || 'Sin título') : 'Información no disponible'}
              </div>
              <div class="group-meta">
                <span class="group-brand">${itemGroup ? (itemGroup['Marca'] || 'Sin marca') : ''}</span>
                <span class="group-page">${itemGroup ? (itemGroup['Página de Catálogo'] || itemGroup['Catalog Page'] || 'Sin página') : ''}</span>
                <span class="group-id">
                  ${itemGroup ? (
                    itemGroup['Id'] || itemGroup['ID'] ? 
                      `<a href="https://www.travers.com.mx/${itemGroup['Id'] || itemGroup['ID']}" target="_blank" class="group-id-link" title="Ver en Travers.com.mx">${itemGroup['Id'] || itemGroup['ID']}</a>` 
                      : 'Sin ID'
                  ) : ''}
                </span>
                <span class="group-cms">${itemGroup ? (itemGroup['CMS'] || 'Sin CMS') : ''}</span>
                <span class="group-items">${itemCodes.length} items</span>
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
              <div class="no-image-selected">🖼️</div>
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
                <div class="table-cell item-code-cell" data-item-code="${row.itemCode.Name}" data-name-path="${row.itemCode.NamePath}">
                  <div class="approval-indicator" data-vis-color="${normalizeVisColor(row.itemCode['Vis_color'])}"></div>
                  ${row.itemCode['WA_VIS_Comment'] && row.itemCode['WA_VIS_Comment'].trim() ? 
                    `<div class="comment-indicator" data-comment="${row.itemCode['WA_VIS_Comment']}" data-status="${getCurrentStatus(row.itemCode['WA_VIS_Comment'])}">💬</div>` : 
                    ''
                  }
                  <div class="item-code-main">${row.itemCode.Name}</div>
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
           onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ci8+CjxwYXRoIGQ9Ik0xMiAxNkwyOCAyNE0yOCAxNkwxMiAyNCIgc3Ryb2tlPSIjOUM5Qzk5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K'; this.title='Imagen no encontrada: ${imageName}';">
      <div class="image-controls">
        <button class="btn-remove" title="Quitar imagen">🗑️</button>
      </div>
      ${hasComments ? `<div class="comment-bubble image-comment" data-image="${imageName}"${statusAttribute} onclick="handleImageCommentClick(event, '${imageName}')" title="Ver comentarios">💬</div>` : ''}
      ${multipleImagesIndicator}
      <div class="image-name">${imageName}</div>
    </div>
  `;
}

// Función auxiliar para generar celda vacía
function generateEmptyImageCell() {
  return `
    <div class="empty-image-cell">
      <div class="drop-zone" title="Arrastrar imagen aquí">
        <span class="add-icon">+</span>
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
  
  if (imageCount > 1) {
    // Mostrar o actualizar indicador
    if (existingIndicator) {
      // Actualizar contador
      const textElement = existingIndicator.querySelector('.indicator-text');
      if (textElement) {
        textElement.textContent = `+${imageCount - 1}`;
      }
      existingIndicator.title = `${imageCount} imágenes en ${sectionName.toUpperCase()}`;
    } else {
      // Crear nuevo indicador
      const container = firstCell.querySelector('.image-thumbnail-container');
      if (container) {
        const indicator = document.createElement('div');
        indicator.className = 'multiple-images-indicator';
        indicator.title = `${imageCount} imágenes en ${sectionName.toUpperCase()}`;
        indicator.innerHTML = `<span class="indicator-text">+${imageCount - 1}</span>`;
        container.appendChild(indicator);
      }
    }
  } else {
    // Quitar indicador si solo hay una imagen o ninguna
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
  const newGridHtml = createImageGrid(currentItemCodes, currentImageColumns, currentItemGroup);
  box4Content.innerHTML = newGridHtml;
  
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
  }, 100);
  
  // Grid regenerated
}

// Función para configurar los controles de zoom
function setupZoomControls() {
  console.log('Intentando configurar controles de zoom...');
  
  const container = document.getElementById('imageGridContainer'); // Usar el ID correcto
  const zoomInBtn = document.getElementById('zoomIn');
  const zoomOutBtn = document.getElementById('zoomOut');
  const zoomInfo = document.getElementById('zoomInfo');
  
  console.log('Elementos encontrados:', {
    container: !!container,
    zoomInBtn: !!zoomInBtn,
    zoomOutBtn: !!zoomOutBtn,
    zoomInfo: !!zoomInfo
  });
  
  if (!container || !zoomInBtn || !zoomOutBtn || !zoomInfo) {
    console.error('No se pudieron encontrar todos los elementos necesarios para el zoom');
    return;
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
    
    // Calcular tamaño de fuente según rangos de zoom
    // Base: 8px (igual que CSS) para evitar glitch visual
    let fontScale;
    if (currentScale <= 0.5) {
      fontScale = '7px';  // Muy pequeño (50%)
    } else if (currentScale <= 0.75) {
      fontScale = '8px';  // Pequeño (50-75%) - IGUAL QUE CSS INICIAL
    } else if (currentScale <= 1) {
      fontScale = '8px';  // Normal (75-100%) - IGUAL QUE CSS INICIAL 
    } else if (currentScale <= 1.5) {
      fontScale = '9px';  // Mediano pequeño (100-150%)
    } else if (currentScale <= 2) {
      fontScale = '10px'; // Mediano (150-200%)
    } else if (currentScale <= 2.5) {
      fontScale = '11px'; // Grande (200-250%)
    } else {
      fontScale = '12px'; // Muy grande (250%+)
    }
    
    container.style.setProperty('--font-scale', fontScale);
    
    // Actualizar estado de botones
    zoomOutBtn.disabled = currentScale <= minScale;
    zoomInBtn.disabled = currentScale >= maxScale;
    
    // Recalcular sincronización de scroll después del cambio de tamaño
    setTimeout(() => {
      setupScrollSynchronization();
    }, 100);
  }
  
  zoomInBtn.addEventListener('click', () => {
    if (currentScale < maxScale) {
      // Agregar clase para transiciones de zoom
      container.classList.add('zoom-active');
      
      currentScale = Math.min(maxScale, currentScale + scaleStep);
      globalZoomScale = currentScale; // Actualizar variable global
      updateScale();
      
      // Remover clase después de la transición
      setTimeout(() => {
        container.classList.remove('zoom-active');
      }, 300);
    }
  });

  zoomOutBtn.addEventListener('click', () => {
    if (currentScale > minScale) {
      // Agregar clase para transiciones de zoom
      container.classList.add('zoom-active');
      
      currentScale = Math.max(minScale, currentScale - scaleStep);
      globalZoomScale = currentScale; // Actualizar variable global
      updateScale();
      
      // Remover clase después de la transición
      setTimeout(() => {
        container.classList.remove('zoom-active');
      }, 300);
    }
  });
  
  // Inicializar
  updateScale();
  
  // Event listener para el botón de limpieza
  const cleanupBtn = document.getElementById('cleanupGalButton');
  if (cleanupBtn) {
    cleanupBtn.addEventListener('click', () => {
      handleGalCleanup();
    });
  }
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
    placeholder.innerHTML = '<div class="no-image-selected">🖼️</div>';
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

  // Event listener para el modo visual de asignación
  document.addEventListener('keydown', function(event) {
    if (event.metaKey && event.altKey && event.shiftKey) {
      container.classList.add('itemgroup-assignment-mode');
    }
  });

  document.addEventListener('keyup', function(event) {
    // Remover modo visual cuando se suelta cualquier tecla
    container.classList.remove('itemgroup-assignment-mode');
  });

  // Event listener para Command + Alt + Click para abrir comentarios
  document.addEventListener('click', function(event) {
    // Verificar si se presionaron Command + Alt pero NO Shift
    if (event.metaKey && event.altKey && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      
      console.log('🎯 Alt+Cmd+Click detectado');
      
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
          const contextInfo = `${itemGroupName} (${itemGroupId})`;
          openCommentModal('Comentario del Item Group', contextInfo, commentText, 'group', null);
        } else {
          console.log('❌ No hay currentItemGroup disponible');
        }
      } else if (imageThumbnail && imageCell) {
        // Click en imagen del grid
        console.log('💬 Abriendo comentario de imagen del grid');
        const imageName = imageThumbnail.alt;
        const commentText = getImageComments(imageName);
        openCommentModal('Comentario de la Imagen', imageName, commentText || '', 'image', imageName);
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
            openCommentModal('Comentario del Item Code', fullContext, commentText, 'item', null);
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
        openCommentModal('Comentario del Item Code', fullContext, commentText, 'item', null);
      } else {
        console.log('❌ No se detectó ningún elemento válido para comentario');
        console.log('Target:', event.target);
        console.log('Target classes:', event.target.className);
      }
      
      return false;
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
    
    // Cmd+Alt+Shift+Click: Asignar como imagen principal del Item Group
    if (event.metaKey && event.altKey && event.shiftKey) {
      handleItemGroupImageAssignment(event, imageCell, imageThumbnail);
    }
    
    // Alt+Click: Eliminar/quitar imagen de la celda
    else if (event.altKey && !event.metaKey && !event.shiftKey && !event.ctrlKey) {
      handleImageRemoval(event, imageCell, imageThumbnail);
    }
    
    // Shift+Click: Seleccionar imagen de trabajo
    else if (event.shiftKey && !event.metaKey && !event.altKey) {
      handleImageSelection(event, imageCell, imageThumbnail);
    }
    
    // Cmd+Click (Mac) / Ctrl+Click (Windows): Asignar imagen de trabajo
    else if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
      handleImageAssignment(event, imageCell);
    }
    
    // Click simple: Mostrar imagen en modal
    else if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && imageThumbnail) {
      handleImagePreview(event, imageThumbnail);
    }
  });

  // Event listener adicional para headers clickeables (asignación masiva por columna)
  container.addEventListener('click', function(event) {
    const headerSection = event.target.closest('.header-section');
    
    if (headerSection) {
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
    modalTitle = 'Comentario del Item Group';
    const itemGroupId = currentItemGroup['Id'] || currentItemGroup['ID'] || '';
    const itemGroupName = currentItemGroup['Name'] || 'Item Group';
    contextInfo = `${itemGroupName} (${itemGroupId})`;
  } else {
    modalTitle = 'Comentario del Item Code';
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
  
  const modalTitle = 'Comentario de la Imagen';
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

// Función para verificar si una imagen tiene comentarios
function hasImageComments(imageName) {
  if (!currentAssetComments || !imageName) return false;
  
  return currentAssetComments.some(asset => 
    asset.Name === imageName && asset.WA_VIS_Comment && asset.WA_VIS_Comment.trim()
  );
}

// Función para obtener los comentarios de una imagen
function getImageComments(imageName) {
  if (!currentAssetComments || !imageName) return '';
  
  const asset = currentAssetComments.find(asset => asset.Name === imageName);
  return asset ? asset.WA_VIS_Comment : '';
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
    'Completado': '#27ae60',
    'Pendiente': '#f39c12',
    'En proceso': '#3498db',
    'Cancelado': '#e74c3c',
    'Sin status': '#95a5a6'
  };
  return colors[status] || '#95a5a6';
}

// Función para crear y mostrar la ventana modal de comentarios
function openCommentModal(title, context, commentText, type = 'item', imageName = null) {
  // IMPORTANTE: Guardar estado actual antes de abrir modal
  console.log('💾 Guardando estado antes de abrir modal de comentarios...');
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
          <h4 class="section-title">Comentarios Existentes</h4>
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
                  <option value="Guardar IMGs de galería en página web">Guardar IMGs galería web</option>
                  <option value="Borrar, imagen no coincide con item code">Borrar imagen incorrecta</option>
                  <option value="Crear cover image">Crear cover image</option>
                  <option value="Agregar IMG adicional">Agregar IMG adicional</option>
                  <option value="Tomar foto">Tomar foto</option>
                  <option value="Renombrar y mover">Renombrar y mover</option>
                  <option value="Editar color a que corresponda con el producto">Editar color producto</option>
                  <option value="Mejora de Imagen">Mejora de Imagen</option>
                  <option value="Imagen en blanco">Imagen en blanco</option>
                  <option value="Corte de imagen">Corte de imagen</option>
                  <option value="Voltear Imagen">Voltear Imagen</option>
                  <option value="Montar producto en aplicación">Montar en aplicación</option>
                  <option value="Bodegón">Bodegón</option>
                  <option value="Retícula">Retícula</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <div class="textarea-actions-row">
                <textarea class="form-textarea comment-text-input" id="commentTextInput" placeholder="Escribir comentario..."></textarea>
                <div class="form-actions-vertical">
                  <button class="btn btn-comment-submit btn-textarea-height" id="addCommentBtn">✓</button>
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
              newBubble.textContent = '💬';
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
              newBubble.textContent = '💬';
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
  
  // Crear el string del nuevo comentario en formato Excel
  const newCommentString = `${newComment.usuario}¦${newComment.fechaHora}¦${newComment.tipoComentario}¦${newComment.textoComentario}¦${newComment.status}`;
  console.log('📋 String de comentario formateado:', newCommentString);
  
  if (type === 'image' && imageName) {
    // Es un comentario de imagen
    let assetData = currentAssetComments.find(asset => asset.Name === imageName);
    
    if (assetData) {
      // Ya existe el asset, agregar al comentario existente
      const existingComments = assetData.WA_VIS_Comment || '';
      assetData.WA_VIS_Comment = existingComments ? existingComments + '¶' + newCommentString : newCommentString;
    } else {
      // No existe, crear nuevo registro
      const newAssetComment = {
        Name: imageName,
        WA_VIS_Comment: newCommentString
      };
      currentAssetComments.push(newAssetComment);
    }
    
    console.log('Comentario puesto:', newComment, 'para:', imageName);
    console.log('currentAssetComments después de agregar:', currentAssetComments.length, 'assets');
    console.log('Asset agregado/actualizado:', assetData || newAssetComment);
    
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
                    newBubble.textContent = '💬';
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
                    newBubble.textContent = '💬';
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
                  newBubble.textContent = '💬';
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
      
      itemCodeData = currentWorkingData.find(item => 
        item['Object Type'] === 'Item Code' && 
        (item.Id === itemCodeId || String(item.Id) === itemCodeId)
      );
      
      if (itemCodeData) {
        console.log('✅ Item Code encontrado por ID:', itemCodeData.Name);
      }
    }
    
    // Si no se encuentra por ID, buscar por nombre
    if (!itemCodeData) {
      const itemName = context.split(' (')[0]; // Remover el (ID) del final
      console.log('🔍 Buscando Item Code por nombre:', itemName);
      
      itemCodeData = currentWorkingData.find(item => 
        item['Object Type'] === 'Item Code' && 
        (item.Name === itemName || item['Item Code'] === itemName)
      );
      
      if (itemCodeData) {
        console.log('✅ Item Code encontrado por nombre:', itemCodeData.Name);
      }
    }
    
    if (itemCodeData) {
      // Mostrar el estado ANTES del cambio
      const existingComments = itemCodeData['WA_VIS_Comment'] || '';
      console.log('📋 ANTES - Comentarios existentes (Item Code):', existingComments);
      
      // Parsear comentarios ANTES para comparar
      const commentsBefore = parseCommentForDebugging(existingComments);
      console.log('🔍 ANTES - Datos parseados (Item Code):', commentsBefore);
      
      // Actualizar el Item Code encontrado
      itemCodeData['WA_VIS_Comment'] = existingComments ? existingComments + '¶' + newCommentString : newCommentString;
      
      // Parsear comentarios DESPUÉS para comparar
      const commentsAfter = parseCommentForDebugging(itemCodeData['WA_VIS_Comment']);
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
      console.log('💾 Comentario completo guardado:', itemCodeData['WA_VIS_Comment']);
      
      // Actualizar también en allLibraryData si existe
      if (allLibraryData && allLibraryData.length > 0) {
        const allDataIndex = allLibraryData.findIndex(item => 
          item['Object Type'] === 'Item Code' && 
          (item.Id === itemCodeData.Id || item.Name === itemCodeData.Name)
        );
        
        if (allDataIndex !== -1) {
          allLibraryData[allDataIndex]['WA_VIS_Comment'] = itemCodeData['WA_VIS_Comment'];
          console.log('💾 También actualizado en allLibraryData (Item Code)');
        }
      }
      
    } else {
      console.error('❌ No se pudo encontrar el Item Code para guardar el comentario:', context);
      return;
    }
  }
  
  console.log('Comentario agregado:', newComment);
  
  // Marcar Item Group como modificado automáticamente
  markItemGroupAsModified();
  
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
    const analistasConocidos = ['Victor', 'Carlos', 'Kalem', 'Diego'];
    // Lista de diseñadores conocidos (puedes expandir esta lista)  
    const diseñadoresConocidos = ['Veronica', 'Cinthya', 'Thanya', 'Grecia', 'Rossana', 'Carla', 'Gabriela'];
    
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
  console.log('🔄 === INICIO updateTablesAfterComment ===');
  
  // IMPORTANTE: Guardar estado de scroll y filtros ANTES de actualizar
  console.log('💾 Guardando estado antes de actualizar tabla...');
  saveInventoryViewState();
  
  // 1. Actualizar tabla de inventario si existe
  const inventoryTable = document.querySelector('.image-inventory-table');
  if (inventoryTable) {
    console.log('📊 Tabla de inventario encontrada, regenerando...');
    
    // Verificar si hay filtros activos (dropdown o tabla)
    const hasDropdownFilters = inventoryViewState && (
      inventoryViewState.dropdownFilters?.analista ||
      inventoryViewState.dropdownFilters?.disenador ||
      inventoryViewState.dropdownFilters?.status ||
      inventoryViewState.dropdownFilters?.tipo
    );
    
    // CORREGIDO: Los filtros de tabla están en activeFilters, no en tableFilters
    const hasTableFilters = inventoryViewState && inventoryViewState.activeFilters && (
      inventoryViewState.activeFilters.analista ||
      inventoryViewState.activeFilters.disenador ||
      inventoryViewState.activeFilters.analistaStatus ||
      inventoryViewState.activeFilters.diseñadorStatus
    );
    
    const isFiltered = hasDropdownFilters || hasTableFilters;
    
    console.log('🔍 Estado de filtros:', {
      isFiltered: isFiltered,
      hasDropdownFilters: hasDropdownFilters,
      hasTableFilters: hasTableFilters,
      dropdownFiltros: inventoryViewState?.dropdownFilters || 'Sin filtros dropdown',
      tableFiltros: inventoryViewState?.activeFilters || 'Sin filtros tabla'
    });
    
    if (isFiltered) {
      console.log('⚠️ TABLA FILTRADA DETECTADA - Se requiere lógica especial');
      // Para tabla filtrada, necesitamos regenerar los datos filtrados
      updateFilteredInventoryTableAfterComment();
    } else {
      console.log('✅ TABLA NORMAL - Regenerando completamente');
      // Regenerar la tabla de inventario completamente
      const box4Content = document.getElementById('box4-content');
      if (box4Content && currentWorkingData && currentWorkingData.length > 0) {
        // Regenerar tabla de inventario
        box4Content.innerHTML = generateImageInventoryTable();
        
        // Restaurar estado de filtros y scroll después de regenerar
        setTimeout(() => {
          console.log('🔄 Restaurando estado después de regenerar tabla normal...');
          restoreInventoryViewState();
        }, 200);
        
        console.log('✅ Tabla de inventario normal actualizada');
      }
    }
  } else {
    console.log('⚠️ No se encontró tabla de inventario en el DOM');
  }
  
  // 2. Actualizar tablas de resumen/estadísticas si existen
  setTimeout(() => {
    updateStatsTablesOnDataChange();
  }, 300);
  
  console.log('✅ === FIN updateTablesAfterComment ===');
}

// Función específica para actualizar tabla filtrada después de comentario
function updateFilteredInventoryTableAfterComment() {
  console.log('🔄 === INICIO updateFilteredInventoryTableAfterComment ===');
  
  // CRÍTICO: Detener cualquier restauración automática que esté en curso
  console.log('⚠️ DESHABILITANDO restauración automática temporalmente...');
  
  // Regenerar originalInventoryData primero
  console.log('📊 Regenerando originalInventoryData...');
  
  // IMPORTANTE: Regenerar la tabla completa para actualizar originalInventoryData con los nuevos comentarios
  // Esto ejecuta generateImageInventoryTable() que actualiza originalInventoryData con la función parseComment actualizada
  const box4Content = document.getElementById('box4-content');
  if (box4Content && currentWorkingData && currentWorkingData.length > 0) {
    // Regenerar tabla de inventario completamente en el DOM real para que originalInventoryData se actualice
    console.log('🔄 Regenerando tabla completa para actualizar originalInventoryData...');
    box4Content.innerHTML = generateImageInventoryTable();
    console.log('✅ originalInventoryData regenerado con', originalInventoryData.length, 'elementos');
    
    // MOSTRAR DATOS ACTUALIZADOS PARA DEBUG
    const sampleItem = originalInventoryData.find(item => item.nombre === '87-100-122');
    if (sampleItem) {
      console.log('🔍 DATOS ACTUALIZADOS - Item 87-100-122:', {
        analista: sampleItem.analista,
        diseñador: sampleItem.diseñador,
        ultimoComentarioAnalista: sampleItem.ultimoComentarioAnalista,
        ultimoComentarioDisenador: sampleItem.ultimoComentarioDisenador,
        ultimoStatus: sampleItem.ultimoStatus
      });
    }
    
    // CRÍTICO: Aplicar filtros inmediatamente con datos actualizados
    const currentFilters = inventoryViewState?.activeFilters;
    if (currentFilters) {
      console.log('� APLICANDO filtros de tabla inmediatamente:', currentFilters);
      
      // Buscar el elemento de filtro activo y simular click para aplicar filtros actualizados
      let filterElement = null;
      
      if (currentFilters.analista && currentFilters.analistaStatus) {
        filterElement = document.querySelector(`[data-type="analyst"][data-user="${currentFilters.analista}"][data-status="${currentFilters.analistaStatus}"]`);
        console.log('🎯 Buscando analista:', currentFilters.analista, currentFilters.analistaStatus);
      } else if (currentFilters.analista) {
        filterElement = document.querySelector(`[data-type="analyst"][data-user="${currentFilters.analista}"]`);
        console.log('🎯 Buscando analista:', currentFilters.analista);
      } else if (currentFilters.disenador && currentFilters.diseñadorStatus) {
        filterElement = document.querySelector(`[data-type="designer"][data-user="${currentFilters.disenador}"][data-status="${currentFilters.diseñadorStatus}"]`);
        console.log('🎯 Buscando diseñador:', currentFilters.disenador, currentFilters.diseñadorStatus);
      } else if (currentFilters.disenador) {
        filterElement = document.querySelector(`[data-type="designer"][data-user="${currentFilters.disenador}"]`);
        console.log('🎯 Buscando diseñador:', currentFilters.disenador);
      }
      
      if (filterElement) {
        console.log('✅ FORZANDO click en filtro para aplicar datos actualizados...');
        // Simular click en el filtro para aplicar los datos actualizados
    // APLICAR FILTROS DIRECTAMENTE sobre los datos actualizados
    setTimeout(() => {
      // MOSTRAR DATOS ACTUALIZADOS PARA DEBUG después del timeout
      const sampleItem = originalInventoryData.find(item => item.nombre === '87-100-122');
      if (sampleItem) {
        console.log('🔍 DATOS ACTUALIZADOS DESPUÉS DEL TIMEOUT - Item 87-100-122:', {
          analista: sampleItem.analista,
          diseñador: sampleItem.diseñador,
          ultimoComentarioAnalista: sampleItem.ultimoComentarioAnalista,
          ultimoComentarioDisenador: sampleItem.ultimoComentarioDisenador,
          ultimoStatus: sampleItem.ultimoStatus
        });
      }
      
      const currentFilters = inventoryViewState?.activeFilters;
      if (currentFilters) {
        console.log('🔧 APLICANDO filtros directamente sobre datos actualizados CON TIMEOUT:', currentFilters);
        
        // Filtrar datos directamente usando la misma lógica que las stats tables
        let filteredData = originalInventoryData.filter(row => {
          let userMatch = true;
          let statusMatch = true;
          
          // Filtro por analista
          if (currentFilters.analista) {
            userMatch = row.analista === currentFilters.analista;
            if (currentFilters.analistaStatus) {
              statusMatch = row.ultimoStatus && row.ultimoStatus.toLowerCase() === currentFilters.analistaStatus.toLowerCase();
            }
          }
          
          // Filtro por diseñador
          if (currentFilters.disenador) {
            userMatch = row.diseñador === currentFilters.disenador;
            if (currentFilters.diseñadorStatus) {
              statusMatch = row.ultimoStatus && row.ultimoStatus.toLowerCase() === currentFilters.diseñadorStatus.toLowerCase();
            }
          }
          
          return userMatch && statusMatch;
        });
        
        console.log('📋 Datos filtrados directamente CON TIMEOUT:', filteredData.length, 'de', originalInventoryData.length, 'elementos');
        
        // Mostrar ejemplo de datos filtrados
        if (filteredData.length > 0) {
          console.log('🔍 PRIMER ELEMENTO FILTRADO CON TIMEOUT:', {
            nombre: filteredData[0].nombre,
            analista: filteredData[0].analista,
            diseñador: filteredData[0].diseñador,
            ultimoComentarioAnalista: filteredData[0].ultimoComentarioAnalista,
            ultimoComentarioDisenador: filteredData[0].ultimoComentarioDisenador,
            ultimoStatus: filteredData[0].ultimoStatus
          });
        }
        
        // Actualizar la tabla directamente con los datos filtrados
        updateInventoryTableDirectly(filteredData);
        
        // IMPORTANTE: Restaurar scroll después de actualizar tabla filtrada
        setTimeout(() => {
          console.log('🔄 Restaurando estado después de actualizar tabla filtrada...');
          restoreInventoryViewState();
        }, 200);
        
      } else {
        console.log('❌ No hay filtros activos para aplicar');
      }
    }, 150); // Timeout para asegurar que originalInventoryData se actualice
    
  } else {
    console.log('❌ No se pudo regenerar originalInventoryData: falta box4Content o currentWorkingData');
  }
  
  console.log('✅ === FIN updateFilteredInventoryTableAfterComment ===');
}

// Función para actualizar las tablas de estadísticas cuando cambian los datos
function updateStatsTablesOnDataChange() {
  console.log('📈 Actualizando tablas de estadísticas...');
  
  // Solo actualizar si estamos en vista de datos (no en visualizador)
  if (!isCleanViewActive) {
    console.log('🚫 No actualizando stats - estamos en visualizador');
    return;
  }
  
  // Buscar si hay tablas de estadísticas en el DOM
  const statsContainer = document.querySelector('.stats-table-container');
  if (statsContainer) {
    console.log('📊 Regenerando tablas de estadísticas...');
    
    // Si estamos en vista de datos (clean view), regenerar las estadísticas
    if (isCleanViewActive) {
      // Regenerar completamente las tablas de estadísticas
      const box3Content = document.getElementById('box3-content');
      if (box3Content && currentWorkingData && currentWorkingData.length > 0) {
        // Regenerar el contenido de estadísticas
        // Esto depende de cómo se generen las estadísticas en tu sistema
        // Por ahora, simplemente forzamos una actualización
        console.log('🔄 Forzando actualización de estadísticas en clean view');
      }
    }
  }
  
  console.log('✅ Tablas de estadísticas verificadas');
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
            newBubble.textContent = '💬';
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
          newBubble.textContent = '💬';
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
            newBubble.textContent = '💬';
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
            <div class="comment-type" style="background-color: ${getCommentTypeColor(comment.tipoComentario)};">
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

// Función para manejar la asignación de imagen principal del Item Group (Cmd+Alt+Shift+Click)
function handleItemGroupImageAssignment(event, imageCell, imageThumbnail) {
  event.preventDefault();
  
  if (!imageCell || !imageThumbnail || imageThumbnail.src.includes('data:image/svg+xml')) {
    console.log('No hay imagen válida para asignar al Item Group');
    return;
  }
  
  const imageName = imageThumbnail.alt;
  const itemCode = imageCell.getAttribute('data-item-code');
  
  // Encontrar el Item Group actual en los datos
  if (!currentItemGroup) {
    console.error('No hay Item Group cargado');
    return;
  }
  
  // Actualizar la imagen en los datos del Item Group
  const previousImage = currentItemGroup['WA_Gallery_01'] || '';
  currentItemGroup['WA_Gallery_01'] = imageName;
  
  // Actualizar también en currentWorkingData
  const itemGroupIndex = currentWorkingData.findIndex(item => 
    item['Object Type'] === 'Item Group' && 
    item.NamePath === currentItemGroup.NamePath
  );
  
  if (itemGroupIndex !== -1) {
    currentWorkingData[itemGroupIndex]['WA_Gallery_01'] = imageName;
  }
  
  // Actualizar la imagen en el header del grid
  updateItemGroupHeaderImage(imageName);
  
  console.log(`Imagen principal actualizada: "${previousImage}" → "${imageName}"`);
}

// Función para actualizar la imagen en el header del Item Group
function updateItemGroupHeaderImage(imageName) {
  const groupImageContainer = document.querySelector('.item-group-image');
  if (!groupImageContainer) {
    console.error('No se encontró el contenedor de imagen del Item Group');
    return;
  }
  
  // Crear nueva imagen o actualizar existente
  if (imageName) {
    groupImageContainer.innerHTML = `
      <img src="https://www.travers.com.mx/media/catalog/product/agility/img/${imageName}" 
           alt="Gallery 1" class="group-thumbnail"
           onerror="this.style.display='none';">
      <div class="item-group-delete-btn" title="Quitar imagen del Item Group">🗑️</div>
    `;
    
    // Configurar event listener para el botón de basura
    setupItemGroupDeleteButton();
    setupItemGroupImageClick(); // Configurar click en imagen
  } else {
    groupImageContainer.innerHTML = '<div class="no-image">📷</div>';
  }
  
  console.log('Header del Item Group actualizado con nueva imagen');
}

// Función para mostrar imagen en modal de vista previa
function handleImagePreview(event, imageThumbnail) {
  event.preventDefault();
  event.stopPropagation();
  
  if (!imageThumbnail || imageThumbnail.src.includes('data:image/svg+xml')) {
    return; // No mostrar modal para imágenes vacías
  }
  
  const imageName = imageThumbnail.alt;
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
    const imageName = imageThumbnail.alt;
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
  
  const imageName = imageThumbnail.alt;
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

// Función para configurar el event listener del botón de basura del Item Group
function setupItemGroupDeleteButton() {
  const deleteBtn = document.querySelector('.item-group-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      console.log('🗑️ CLICK en botón de basura del Item Group detectado');
      handleItemGroupImageRemoval();
    });
    console.log('✅ Event listener del botón de basura del Item Group configurado');
  } else {
    console.log('❌ No se encontró el botón de basura del Item Group');
  }
}

// Función para configurar el click en la imagen del Item Group
function setupItemGroupImageClick() {
  const groupImage = document.querySelector('.group-thumbnail');
  if (groupImage) {
    // Remover listener anterior si existe
    groupImage.removeEventListener('click', handleItemGroupImageClick);
    
    // Agregar nuevo listener
    groupImage.addEventListener('click', handleItemGroupImageClick);
    console.log('✅ Event listener del click en imagen del Item Group configurado');
  } else {
    console.log('❌ No se encontró la imagen del Item Group (.group-thumbnail)');
  }
}

// Función para manejar el click en la imagen del Item Group
function handleItemGroupImageClick(event) {
  // Solo procesar si no es click en el botón de basura
  if (event.target.closest('.item-group-delete-btn')) {
    return; // Dejar que el botón de basura maneje su propio click
  }
  
  // NO interceptar Alt+Cmd+Click - dejar que lo maneje el event listener de comentarios
  if (event.metaKey && event.altKey && !event.shiftKey) {
    console.log('🎯 Alt+Cmd+Click en Item Group - delegando al handler de comentarios');
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
  
  console.log(`�️ Quitando imagen del Item Group`);
  
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
  const brandFilter = document.getElementById('brandFilter');
  if (!brandFilter) {
    console.log('❌ No se encontró el elemento brandFilter');
    return;
  }
  
  brandFilter.addEventListener('change', function() {
    const selectedBrand = this.value;
    filterGridByBrand(selectedBrand);
  });
  
  console.log('✅ Filtro de marcas configurado');
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
  
  // DEBUG: Inspeccionar la estructura del grid
  console.log('🔍 DEBUG: Estructura del grid:');
  console.log('   Grid container:', currentGrid);
  console.log('   Todas las secciones:', currentGrid.querySelectorAll('.section-wrapper'));
  console.log('   Item code wrapper:', currentGrid.querySelector('.item-code-wrapper'));
  console.log('   Item code cells:', currentGrid.querySelectorAll('.item-code-cell'));
  console.log('   Todas las filas:', currentGrid.querySelectorAll('.table-row'));
  
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
  
  // LOGS DETALLADOS PARA DEBUG
  console.log('=== DEBUG REMOVE IMAGE ===');
  console.log('Item Code de la fila (targetItemCode):', targetItemCode);
  console.log('Nombre de la imagen (alt):', imageName);
  console.log('Item Code extraído del nombre:', imageItemCode);
  console.log('Sección:', targetSection);
  console.log('Imagen src:', existingImage.src);
  console.log('==========================');
  
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
    console.log('Quitando imagen de diferente Item Code');
    removeImageFromGrid(targetRowIndex, targetColIndex, targetSection);
    // Marcar Item Group como modificado automáticamente
    markItemGroupAsModified();
    // Actualizar currentWorkingData (con debouncing)
    updateCurrentWorkingDataWithGridState(100);
  }
  
  // Recorrer imágenes hacia la izquierda para llenar el espacio vacío
  shiftImagesLeft(targetRowIndex, targetColIndex, targetSection);
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
          
          if (itemCodeRow[columnName] !== undefined) {
            itemCodeRow[columnName] = imageName;
          }
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
  
  const imageName = imageThumbnail.alt;
  const sourceItemCode = imageCell.getAttribute('data-item-code');
  
  // Confirmación del usuario
  const confirmMessage = `¿Quieres quitar la imagen '${imageName}' de todos los Item Codes del Item Group?`;
  if (!confirm(confirmMessage)) {
    console.log('Eliminación masiva cancelada por el usuario');
    return;
  }
  
  console.log('=== ELIMINACIÓN MASIVA ===');
  console.log('Imagen a eliminar:', imageName);
  console.log('Item Code origen:', sourceItemCode);
  
  // Buscar TODAS las imágenes con el mismo nombre en TODO el Item Group
  const allImageCells = document.querySelectorAll('.image-cell .image-thumbnail');
  const imagesToRemove = [];
  
  allImageCells.forEach(img => {
    if (img.alt === imageName && !img.src.includes('data:image/svg+xml')) {
      const cell = img.closest('.image-cell');
      const itemCode = cell.getAttribute('data-item-code');
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
  
  console.log('Imágenes encontradas para eliminar:', imagesToRemove.length);
  
  // Procesar cada imagen encontrada
  imagesToRemove.forEach(imageInfo => {
    const imageItemCode = extractItemCodeFromImageName(imageInfo.imageName);
    
    console.log(`Procesando: ${imageInfo.imageName} en ${imageInfo.itemCode} ${imageInfo.section}`);
    
    // Si pertenece al mismo Item Code que donde se originó la eliminación, mover a REST
    if (imageItemCode === imageInfo.itemCode) {
      console.log('→ Moviendo a REST (mismo Item Code)');
      // Solo mover a REST si no está ya en REST
      if (imageInfo.section !== 'rest') {
        moveImageToRest(imageInfo.imageName, imageInfo.itemCode, imageInfo.rowIndex, imageInfo.colIndex, imageInfo.section);
      } else {
        console.log('→ Ya está en REST, eliminando directamente');
        removeImageFromGrid(imageInfo.rowIndex, imageInfo.colIndex, imageInfo.section);
      }
    } else {
      console.log('→ Eliminando directamente (diferente Item Code)');
      removeImageFromGrid(imageInfo.rowIndex, imageInfo.colIndex, imageInfo.section);
    }
    
    // Recorrer hacia la izquierda
    shiftImagesLeft(imageInfo.rowIndex, imageInfo.colIndex, imageInfo.section);
  });
  
  console.log('Eliminación masiva completada');
  
  // Actualizar currentWorkingData después de operación masiva
  updateCurrentWorkingDataWithGridState();
}

// Función para manejar asignación masiva por columna (click en headers)
function handleColumnBulkAssignment(event, headerSection) {
  event.preventDefault();
  
  // Determinar la sección y columna del header clickeado
  const headerText = headerSection.textContent.trim();
  const sectionContainer = headerSection.closest('.section-wrapper');
  let section = 'unknown';
  
  if (sectionContainer.classList.contains('cov-wrapper')) {
    section = 'cov';
  } else if (sectionContainer.classList.contains('gallery-wrapper')) {
    section = 'gallery';
  } else if (sectionContainer.classList.contains('rest-wrapper')) {
    section = 'rest';
  }
  
  // Extraer número de columna del texto del header (ej: "GAL 03" -> 2 (índice 0-based))
  const columnMatch = headerText.match(/\d+/);
  if (!columnMatch) {
    console.error('No se pudo extraer número de columna del header:', headerText);
    return;
  }
  const columnNumber = parseInt(columnMatch[0]) - 1; // Convertir a índice 0-based
  
  console.log('=== ASIGNACIÓN MASIVA POR COLUMNA ===');
  console.log('Header clickeado:', headerText);
  console.log('Sección:', section);
  console.log('Columna (0-based):', columnNumber);
  console.log('Imagen de trabajo:', workingImage);
  
  // Obtener todas las celdas de esta columna específica
  const columnCells = document.querySelectorAll(`[data-section="${section}"][data-col-index="${columnNumber}"].image-cell`);
  console.log('Celdas encontradas en la columna:', columnCells.length);
  
  if (workingImage) {
    // CASO 1: Hay imagen de trabajo - asignar a toda la columna
    handleBulkAssignToColumn(columnCells, section, columnNumber);
  } else {
    // CASO 2: No hay imagen de trabajo - eliminar toda la columna
    handleBulkRemoveFromColumn(columnCells, section, columnNumber);
  }
}

// Función para asignar imagen de trabajo a toda una columna
function handleBulkAssignToColumn(columnCells, section, columnNumber) {
  console.log('Asignando imagen de trabajo a toda la columna...');
  
  columnCells.forEach(cell => {
    const itemCode = cell.getAttribute('data-item-code');
    const rowIndex = parseInt(cell.getAttribute('data-row-index'));
    
    console.log(`Asignando a ${itemCode} en fila ${rowIndex}`);
    
    // Verificar duplicados en esta fila antes de insertar
    const existingPosition = findImageInItemCode(workingImage.imageName, itemCode);
    if (existingPosition) {
      console.log('→ Quitando duplicado existente');
      removeImageFromGrid(existingPosition.row, existingPosition.col, existingPosition.section);
      shiftImagesLeft(existingPosition.row, existingPosition.col, existingPosition.section);
    }
    
    // Insertar en la posición específica de la columna
    insertImageInGrid(workingImage.imageName, rowIndex, columnNumber, section);
  });
}

// Función para eliminar todas las imágenes de una columna
function handleBulkRemoveFromColumn(columnCells, section, columnNumber) {
  console.log('Eliminando todas las imágenes de la columna...');
  
  columnCells.forEach(cell => {
    const existingImage = cell.querySelector('.image-thumbnail');
    
    if (!existingImage || existingImage.src.includes('data:image/svg+xml')) {
      return; // No hay imagen para quitar
    }
    
    const imageName = existingImage.alt;
    const itemCode = cell.getAttribute('data-item-code');
    const rowIndex = parseInt(cell.getAttribute('data-row-index'));
    const imageItemCode = extractItemCodeFromImageName(imageName);
    
    console.log(`Quitando ${imageName} de ${itemCode}`);
    
    // Aplicar reglas de REST
    if (section !== 'rest' && imageItemCode === itemCode) {
      console.log('→ Moviendo a REST (mismo Item Code)');
      moveImageToRest(imageName, itemCode, rowIndex, columnNumber, section);
    } else {
      console.log('→ Eliminando directamente');
      removeImageFromGrid(rowIndex, columnNumber, section);
    }
    
    // Recorrer hacia la izquierda
    shiftImagesLeft(rowIndex, columnNumber, section);
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
      <div class="drop-zone" title="Arrastrar imagen aquí">
        <span class="add-icon">+</span>
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
  
  // Crear un array con solo las imágenes que vienen después de la posición eliminada
  const imagesToShift = [];
  for (let i = removedColIndex + 1; i < rowCells.length; i++) {
    const cellData = rowCells[i];
    if (cellData && cellData.hasImage) {
      const img = cellData.cell.querySelector('.image-thumbnail');
      imagesToShift.push({
        src: img.src,
        filename: img.getAttribute('data-filename') || '',
        colIndex: cellData.colIndex
      });
    }
  }
  
  // Limpiar las celdas que vamos a reorganizar (desde removedColIndex hacia adelante)
  for (let col = removedColIndex; col < rowCells.length; col++) {
    const cell = rowCells[col]?.cell;
    if (cell) {
      cell.innerHTML = `
        <div class="empty-image-cell">
          <div class="drop-zone" title="Arrastrar imagen aquí">
            <span class="add-icon">+</span>
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
        // Insertar la imagen en su nueva posición
        targetCell.innerHTML = `
          <div class="image-item">
            <img class="image-thumbnail" src="${imageData.src}" 
                 data-filename="${imageData.filename}" 
                 title="${imageData.filename}">
            <div class="image-overlay">
              <div class="image-info">
                <span class="image-name">${imageData.filename}</span>
              </div>
            </div>
          </div>
        `;
        
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
            <div class="drop-zone" title="Arrastrar imagen aquí">
              <span class="add-icon">+</span>
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
            <div class="drop-zone" title="Arrastrar imagen aquí">
              <span class="add-icon">+</span>
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
    const saveBtn = document.getElementById('saveChangesBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Guardado!';
    saveBtn.classList.remove('btn-success');
    saveBtn.classList.add('btn-outline-success');
    
    setTimeout(() => {
      saveBtn.innerHTML = originalText;
      saveBtn.classList.remove('btn-outline-success');
      saveBtn.classList.add('btn-success');
    }, 2000);
    
    console.log(`Se guarda Item Group: "${currentItemGroup.Name}"`);
  } catch (error) {
    console.error('Error guardando en localStorage:', error);
    
    // Mostrar feedback específico para error de cuota
    const saveBtn = document.getElementById('saveChangesBtn');
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
async function optimizeCache() {
  const btn = document.getElementById('loadCacheBtn');
  if (!btn) return;
  
  const originalHTML = btn.innerHTML;
  
  try {
    // Cambiar botón a estado de carga
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Optimizando...';
    
    await loadAllItemGroupsToCache();
    
    // Mostrar éxito
    btn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Optimizado!';
    btn.className = 'btn btn-success btn-compact';
    
    // Restaurar después de 3 segundos
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }, 3000);
    
  } catch (error) {
    console.error('Error optimizando caché:', error);
    
    // Mostrar error
    btn.innerHTML = '<i class="fa-solid fa-exclamation-triangle"></i> Error';
    btn.className = 'btn btn-danger btn-compact';
    
    // Restaurar después de 3 segundos
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
      btn.className = 'btn btn-success btn-compact';
    }, 3000);
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

// Función para exportar a Excel
function exportToExcel() {
  try {
    if (currentWorkingData.length === 0) {
      alert('No hay datos para exportar. Primero carga un archivo Excel.');
      return;
    }

    if (savedItemGroups.size === 0) {
      alert('No hay Item Groups guardados para exportar. Usa el botón "Guardar Cambios" después de trabajar en un Item Group.');
      return;
    }
    
    // IMPORTANTE: Sincronizar cambios antes de exportar
    syncChangesToWorkingData();
    
    // Crear un nuevo workbook
    const wb = XLSX.utils.book_new();
    
    // ===== PRIMERA PESTAÑA: VIS_AG_Library_Structure (solo Item Groups guardados) =====
    
    console.log(`🔍 Debug VIS_AG_Library_Structure:`);
    console.log(`- currentWorkingData length: ${currentWorkingData.length}`);
    console.log(`- savedItemGroups:`, Array.from(savedItemGroups));
    
    // Filtrar datos para incluir solo los Item Groups guardados y sus contenidos
    const dataForExport = currentWorkingData.filter(row => {
      if (row['Object Type'] === 'Item Group') {
        return savedItemGroups.has(row.Id);
      } else if (row['Object Type'] === 'Item Code') {
        // Buscar el Item Group padre de este Item Code
        const parentPath = row.NamePath ? row.NamePath.split('/').slice(0, -1).join('/') : '';
        const parentItemGroup = currentWorkingData.find(item => 
          item['Object Type'] === 'Item Group' && 
          item.NamePath === parentPath
        );
        return parentItemGroup && savedItemGroups.has(parentItemGroup.Id);
      }
      return false;
    }).map(row => {
      const orderedRow = {};
      currentColumnsOrder.forEach(col => {
        orderedRow[col] = row[col] || "";
      });
      return orderedRow;
    });
    
    console.log('🔍 DEBUG dataForExport sample:', dataForExport[0]);
    
    // DEBUG: Mostrar TODOS los Item Codes con imágenes de TODOS los Item Groups guardados
    const allItemCodesWithImages = dataForExport.filter(row => row['Object Type'] === 'Item Code' && 
      Object.keys(row).some(key => key.includes('WA_Gallery') && row[key])
    );
    
    console.log(`🔍 DEBUG: Total Item Codes con imágenes en export: ${allItemCodesWithImages.length}`);
    allItemCodesWithImages.forEach(itemCode => {
      console.log(`🔍 DEBUG: ${itemCode.Name} (${itemCode.NamePath.split('/').slice(-2, -1)[0]})`);
      const imageColumns = Object.keys(itemCode).filter(key => 
        (key.includes('WA_Gallery') || key.includes('WA_Cover') || key.includes('WA_Rest')) && 
        itemCode[key]
      );
      console.log(`   - Tiene ${imageColumns.length} imágenes:`, imageColumns.slice(0, 3).map(col => `${col}="${itemCode[col]}"`));
    });
    
    // Crear la hoja principal con los datos guardados
    const ws = XLSX.utils.json_to_sheet(dataForExport, { 
      header: currentColumnsOrder 
    });
    
    // Agregar la hoja principal
    XLSX.utils.book_append_sheet(wb, ws, "VIS_AG_Library_Structure");
    
    // ===== SEGUNDA PESTAÑA: VIS_AG_Asset_Structure (solo assets con comentarios de Item Groups guardados) =====
    
    console.log(`🔍 Debug VIS_AG_Asset_Structure:`);
    console.log(`- currentAssetComments length: ${currentAssetComments ? currentAssetComments.length : 0}`);
    console.log(`- savedItemGroups:`, Array.from(savedItemGroups));
    
    const assetStructureData = [];
    
    // Solo procesar si hay comentarios de assets
    if (currentAssetComments && currentAssetComments.length > 0) {
      console.log(`📋 Revisando ${currentAssetComments.length} assets en currentAssetComments`);
      
      // Filtrar solo assets con comentarios
      const assetsWithComments = currentAssetComments.filter(asset => 
        asset.WA_VIS_Comment && asset.WA_VIS_Comment.trim()
      );
      
      console.log(`📋 Assets con comentarios reales: ${assetsWithComments.length}`);
      
      assetsWithComments.forEach((asset) => {
        console.log(`✅ Asset con comentario encontrado: ${asset.Name}`);
        
        // ENFOQUE SIMPLIFICADO: Si estamos en un Item Group actual y está guardado,
        // entonces las imágenes con comentarios pertenecen a este Item Group
        if (currentItemGroup && currentItemGroup.Id && savedItemGroups.has(currentItemGroup.Id)) {
          const assetRow = {
            'Name': asset.Name,
            'Item_Group_Id': currentItemGroup.Id,
            'WA_VIS_Comment': asset.WA_VIS_Comment
          };
          assetStructureData.push(assetRow);
          console.log(`✅ Asset agregado al export (Item Group actual):`, assetRow);
        } else {
          console.log(`❌ No hay Item Group actual guardado para asociar la imagen`);
        }
      });
    } else {
      console.log(`⚠️ No se encontraron assets con comentarios en currentAssetComments`);
    }
    
    console.log(`📊 Total assets para exportar: ${assetStructureData.length}`);
    
    // Si no hay datos de assets con comentarios, crear estructura vacía con headers
    if (assetStructureData.length === 0) {
      assetStructureData.push({
        'Name': '',
        'Item_Group_Id': '',
        'WA_VIS_Comment': ''
      });
    }
    
    // Crear la hoja de estructura de assets
    const assetWs = XLSX.utils.json_to_sheet(assetStructureData, { 
      header: ['Name', 'Item_Group_Id', 'WA_VIS_Comment']
    });
    
    // Agregar la hoja de assets
    XLSX.utils.book_append_sheet(wb, assetWs, "VIS_AG_Asset_Structure");
    
    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `vis-web-export-${timestamp}.xlsx`;
    
    // Descargar el archivo
    XLSX.writeFile(wb, filename);
    
    // Mostrar feedback al usuario
    const exportBtn = document.getElementById('exportBtn');
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '<i class="bi bi-check-circle"></i> Exportado!';
    exportBtn.classList.remove('btn-warning');
    exportBtn.classList.add('btn-outline-warning');
    
    setTimeout(() => {
      exportBtn.innerHTML = originalText;
      exportBtn.classList.remove('btn-outline-warning');
      exportBtn.classList.add('btn-warning');
    }, 2000);
    
    console.log(`Se exporta:`, {filename, libraryRecords: dataForExport.length, assetRecords: assetStructureData.length});
    console.log(`- VIS_AG_Asset_Structure: ${assetStructureData.length > 0 && assetStructureData[0].Name !== '' ? assetStructureData.length : 0} assets con comentarios`);
  } catch (error) {
    console.error('Error exportando a Excel:', error);
    alert('Error al exportar: ' + error.message);
  }
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
  
  // Obtener todas las celdas de la sección GAL que tienen imágenes
  const galCells = document.querySelectorAll('[data-section="gallery"].image-cell');
  const imagesToRemove = [];
  let totalImages = 0;
  
  galCells.forEach(cell => {
    const imageThumbnail = cell.querySelector('.image-thumbnail');
    
    // Solo procesar celdas que tienen imagen real (no placeholder)
    if (imageThumbnail && !imageThumbnail.src.includes('data:image/svg+xml')) {
      totalImages++;
      
      const imageName = imageThumbnail.alt;
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
    alert('¡Perfecto! GAL está limpio, no hay imágenes fuera de lugar.');
    return;
  }
  
  // Confirmación única
  if (!confirm(`Se encontraron ${imagesToRemove.length} imágenes fuera de lugar en GAL. ¿Limpiar ahora?`)) {
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
        const filtroColor = parseInt(filtroColorRaw);
        const visColor = parseInt(visColorRaw);
        
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
  galleryGrid.innerHTML = `
    <div class="gallery-placeholder">
      Sistema de galerías iniciado. Cargue datos para ver galerías disponibles.
    </div>
  `;
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
  
  console.log('🔍 Iniciando búsqueda ACTUALIZADA para:', searchTerm);
  
  // Array para almacenar todos los resultados
  let allResults = [];
  
  // 1. BÚSQUEDA EN ASSETS (funcionalidad original - si existe)
  if (currentAssetComments && currentAssetComments.length > 0) {
    console.log('🔍 Buscando en Assets:', currentAssetComments.length, 'registros');
    
    const assetResults = currentAssetComments.filter(asset => {
      const imageName = asset.Name || '';
      return imageName.toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    console.log('📸 Resultados en Assets:', assetResults.length, 'imágenes encontradas');
    allResults = [...assetResults];
  } else {
    console.log('⚠️ No hay datos de Assets cargados');
  }
  
  // 2. NUEVA BÚSQUEDA EN DATOS ACTUALES (allLibraryData + currentWorkingData)
  console.log('🔍 Buscando en datos actuales...');
  
  // A. Buscar objetos Image directos que contengan el término
  if (allLibraryData && allLibraryData.length > 0) {
    const directImageMatches = allLibraryData.filter(item => {
      if (item['Object Type'] === 'Image') {
        const imageName = item.Name || '';
        return imageName.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return false;
    });
    
    console.log('🖼️ Objetos Image directos encontrados:', directImageMatches.length);
    
    directImageMatches.forEach(imageItem => {
      allResults.push({
        Name: imageItem.Name,
        ID: imageItem.Id || imageItem.ID,
        Source: 'DirectImage',
        ObjectType: 'Image'
      });
    });
    
    // B. Buscar Item Codes que contengan el término
    const itemCodeMatches = allLibraryData.filter(item => {
      if (item['Object Type'] === 'Item Code') {
        const itemName = item.Name || '';
        return itemName.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return false;
    });
    
    console.log('📦 Item Codes que contienen el término:', itemCodeMatches.length);
    
    // Para cada Item Code, buscar sus imágenes en el caché de Item Groups
    for (const itemCode of itemCodeMatches) {
      const itemCodeId = itemCode.Id || itemCode.ID;
      console.log(`🔍 Buscando imágenes para Item Code: ${itemCode.Name} (ID: ${itemCodeId})`);
      
      // Buscar en el caché de Item Groups si está disponible
      if (itemGroupDataCache && itemGroupDataCache.size > 0) {
        let foundImages = false;
        
        // Revisar todos los Item Groups en caché
        for (const [groupId, groupData] of itemGroupDataCache) {
          // Buscar si este Item Code está en este grupo
          const itemCodeInGroup = groupData.find(row => 
            (row.ID === itemCodeId || row.Id === itemCodeId) && 
            row['Object Type'] === 'Item Code'
          );
          
          if (itemCodeInGroup) {
            console.log(`✅ Item Code ${itemCode.Name} encontrado en grupo ${groupId}`);
            
            // Transformar los datos para obtener las columnas de imagen
            const transformedData = transformKeyValueData(groupData);
            const transformedItemCode = transformedData[itemCodeId];
            
            if (transformedItemCode) {
              // Extraer todas las imágenes de este Item Code
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
              
              imageColumns.forEach(column => {
                const imageName = transformedItemCode[column];
                if (imageName && imageName.trim() !== '') {
                  allResults.push({
                    Name: imageName.trim(),
                    ID: itemCodeId,
                    Source: 'ItemCodeCached',
                    ItemCodeName: itemCode.Name,
                    ItemGroupId: groupId,
                    ObjectType: 'Item Code Image'
                  });
                  foundImages = true;
                }
              });
            }
            break; // Salir del loop una vez encontrado
          }
        }
        
        if (!foundImages) {
          // Si no se encontraron imágenes en caché, agregar el Item Code como referencia
          allResults.push({
            Name: itemCode.Name,
            ID: itemCodeId,
            Source: 'ItemCodeMatch',
            ObjectType: 'Item Code',
            Note: 'Sin imágenes en caché - seleccionar Item Group para cargar'
          });
        }
      } else {
        // Si no hay caché, agregar el Item Code como referencia
        allResults.push({
          Name: itemCode.Name,
          ID: itemCodeId,
          Source: 'ItemCodeMatch',
          ObjectType: 'Item Code',
          Note: 'Cargar caché con "Optimizar" para ver imágenes'
        });
      }
    }
  }
  
  // C. BÚSQUEDA DIRECTA POR NOMBRE DE IMAGEN en datos transformados (currentWorkingData)
  if (currentWorkingData && currentWorkingData.length > 0) {
    console.log('🔍 Búsqueda directa por nombre de imagen en datos transformados...');
    
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
    
    currentWorkingData.forEach(item => {
      imageColumns.forEach(column => {
        const imageName = item[column];
        if (imageName && imageName.trim() !== '' && 
            imageName.toLowerCase().includes(searchTerm.toLowerCase())) {
          
          allResults.push({
            Name: imageName.trim(),
            ID: item.Id || item.ID,
            Source: 'TransformedData',
            ParentName: item.Name,
            ObjectType: item['Object Type']
          });
        }
      });
    });
  }
  
  // 3. DEDUPLICACIÓN - Eliminar imágenes repetidas por nombre
  const uniqueResults = [];
  const seenImages = new Set();
  
  allResults.forEach(result => {
    const identifier = result.Name.toLowerCase() + '_' + (result.Source || 'unknown');
    if (!seenImages.has(identifier)) {
      seenImages.add(identifier);
      uniqueResults.push(result);
    }
  });
  
  console.log('✨ Resultados finales después de deduplicación:', uniqueResults.length, 'elementos únicos');
  console.log('📊 Fuentes encontradas:', {
    Assets: allResults.filter(r => !r.Source).length,
    DirectImage: allResults.filter(r => r.Source === 'DirectImage').length,
    ItemCodeMatch: allResults.filter(r => r.Source === 'ItemCodeMatch').length,
    ItemCodeCached: allResults.filter(r => r.Source === 'ItemCodeCached').length,
    TransformedData: allResults.filter(r => r.Source === 'TransformedData').length
  });
  
  // Mostrar resultados
  showSearchResults(uniqueResults);
}

// Función para realizar búsqueda de imágenes (ORIGINAL - mantener como backup)
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
    
    console.log('� Elementos encontrados en Library:', libraryMatches.length);
    
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
  
  console.log('✨ Resultados finales después de deduplicación:', uniqueResults.length, 'imágenes únicas');
  console.log('🔍 Búsqueda completada - Assets + Library con deduplicación');
  
  // Mostrar resultados
  showSearchResults(uniqueResults);
}

// Función para mostrar resultados de búsqueda
function showSearchResults(results) {
  const galleryGrid = document.getElementById('galleryGrid');
  if (!galleryGrid) return;
  
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
  
  console.log('🔄 Poblando dropdown de galerías...');
  console.log('📊 Datos recibidos:', data ? data.length : 0, 'elementos');
  
  if (!data || data.length === 0) {
    console.warn('⚠️ No hay datos para poblar el dropdown de galerías');
    gallerySelect.innerHTML = '<option value="">Sin galerías disponibles</option>';
    return;
  }
  
  // Mostrar estructura de un elemento de ejemplo para debug
  if (data.length > 0) {
    console.log('📋 Estructura de elemento ejemplo:', data[0]);
    console.log('🔑 Claves disponibles:', Object.keys(data[0]));
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
  
  console.log('🎯 Galerías únicas encontradas:', galleries);
  
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
  
  console.log('✅ Dropdown poblado con', galleries.length, 'galerías');
}

// Función para cargar las imágenes de una galería específica
function loadGalleryImages(galleryName) {
  console.log('🔄 Cargando imágenes para la galería:', galleryName);
  
  // Filtrar las imágenes que pertenecen a esta galería
  const galleryImages = currentAssetGroups.filter(item => {
    const itemGallery = item.Galeria || item.galeria || item.GALERIA || item['Galeria'] || '';
    const itemImage = item.Imagen || item.imagen || item.IMAGEN || item['Imagen'] || '';
    
    return itemGallery === galleryName && itemImage && itemImage.trim();
  });
  
  console.log(`📸 Encontradas ${galleryImages.length} imágenes para la galería: ${galleryName}`);
  console.log('🔍 Imágenes encontradas:', galleryImages.map(img => img.Imagen || img.imagen || img.IMAGEN || img['Imagen']));
  
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
  
  console.log('🎨 Renderizando grid con', images.length, 'imágenes');
  
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
    galleryGrid.innerHTML = '<div class="gallery-placeholder">Selecciona una galería para ver las imágenes</div>';
  }
}

// Función para toggle de vista limpia
function toggleCleanView() {
  console.log('🎯 toggleCleanView ejecutado');
  console.log('🔍 Estado antes - isCleanViewActive:', isCleanViewActive);
  
  // GUARDAR ESTADO ANTES DE CAMBIAR VISTA
  saveInventoryViewState();
  
  isCleanViewActive = !isCleanViewActive;
  const toggleButton = document.getElementById('cleanViewToggle');
  
  console.log('🔍 Estado después - isCleanViewActive:', isCleanViewActive);
  console.log('🔍 ToggleButton encontrado:', !!toggleButton);
  
  if (isCleanViewActive) {
    // Activar vista limpia - limpiar todos los boxes
    console.log('🔄 Activando vista de datos...');
    clearAllBoxes();
    toggleButton.innerHTML = '<i class="fa-solid fa-eye"></i> Datos';
    toggleButton.className = 'btn btn-warning btn-compact';
    console.log('✅ Vista limpia activada');
  } else {
    // Restaurar vista normal - mostrar árbol/inventario
    console.log('🔄 Restaurando vista normal...');
    restoreNormalView();
    toggleButton.innerHTML = '<i class="fa-solid fa-eye"></i> Visualizador';
    toggleButton.className = 'btn btn-secondary btn-compact';
    console.log('✅ Vista normal restaurada');
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
    
    // PRIMERA OPCIÓN: Usar currentWorkingData si está cargado desde Excel
    if (currentWorkingData && currentWorkingData.length > 0) {
      console.log('🔄 Generando tabla de inventario desde currentWorkingData...');
      const inventoryHTML = generateImageInventoryTable();
      console.log('📊 Tabla de inventario generada, longitud HTML:', inventoryHTML.length);
      box4Content.innerHTML = inventoryHTML;
      // Restaurar estado después de generar la tabla
      setTimeout(() => {
        restoreInventoryViewState();
      }, 200);
    } 
    // SEGUNDA OPCIÓN: Usar datos del caché si está disponible (carga desde Google Sheets)
    else if (itemGroupDataCache && itemGroupDataCache.size > 0) {
      console.log('🔄 Generando tabla de inventario desde caché de Item Groups...');
      const inventoryHTML = generateImageInventoryTableFromCache();
      console.log('📊 Tabla de inventario generada desde caché, longitud HTML:', inventoryHTML.length);
      box4Content.innerHTML = inventoryHTML;
      // Restaurar estado después de generar la tabla
      setTimeout(() => {
        restoreInventoryViewState();
      }, 200);
    } else {
      box4Content.innerHTML = '<div class="empty-box-message">Box 4 - Cargar Excel o usar "Optimizar" para ver inventario de imágenes</div>';
    }
  }
}

// Función para restaurar la vista normal
function restoreNormalView() {
  // Restaurar el contenido de los boxes según el estado actual
  if (currentWorkingData && currentWorkingData.length > 0) {
    // Si hay datos cargados, regenerar el contenido
    
    // Restaurar Box 1 (Árbol)
    const treeContainer = document.getElementById('tree');
    if (treeContainer) {
      renderAssetLibraryTree(currentWorkingData, treeContainer);
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
    
    // Restaurar estado de inventario después de restaurar la vista
    setTimeout(() => {
      restoreInventoryViewState();
    }, 200);
    
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
function generateImageInventoryTable() {
  console.log('🚀 generateImageInventoryTable iniciada');
  console.log('📊 currentWorkingData disponible:', !!currentWorkingData);
  console.log('📊 currentWorkingData.length:', currentWorkingData ? currentWorkingData.length : 'N/A');
  
  if (!currentWorkingData || currentWorkingData.length === 0) {
    console.log('❌ No hay datos para generar tabla de inventario');
    return '<div class="empty-box-message">No hay datos para mostrar</div>';
  }

  // DEBUG: Verificar qué tipo de datos tenemos
  console.log('🔍 Analizando estructura de datos...');
  console.log('📊 Total de elementos en currentWorkingData:', currentWorkingData.length);
  
  // Mostrar algunos ejemplos de datos
  const firstFew = currentWorkingData.slice(0, 3);
  firstFew.forEach((item, index) => {
    console.log(`📋 Ejemplo ${index + 1}:`, {
      'Object Type': item['Object Type'],
      'Name': item['Name'],
      'Id': item['Id'],
      'WA_VIS_Comment': item['WA_VIS_Comment'] ? item['WA_VIS_Comment'].substring(0, 50) + '...' : 'SIN COMENTARIO',
      'hasWA_VIS_Comment': !!item['WA_VIS_Comment']
    });
  });
  
  // Contar cuántos tienen comentarios
  const withComments = currentWorkingData.filter(item => item['WA_VIS_Comment'] && item['WA_VIS_Comment'].trim() !== '');
  console.log(`📊 Elementos CON comentarios: ${withComments.length}/${currentWorkingData.length}`);
  
  // Si no hay comentarios, mostrar mensaje específico
  if (withComments.length === 0) {
    console.log('⚠️ NO SE ENCONTRARON ELEMENTOS CON COMENTARIOS');
    return `<div class="empty-box-message">
      <h3>No hay elementos con comentarios</h3>
      <p>Se encontraron ${currentWorkingData.length} elementos en total, pero ninguno tiene comentarios en WA_VIS_Comment.</p>
      <p>Los datos parecen estar cargados correctamente desde Google Sheets.</p>
    </div>`;
  }

  // Función para obtener el Item Group ID de una fila
  function getItemGroupId(row) {
    // CASO 1: Si la fila ES un Item Group, usar su propio ID
    if (row['Object Type'] === 'Item Group') {
      return row['Id'] || '';
    }
    
    // CASO 2: Si es un Item Code, buscar el ID del Item Group padre
    if (!row.NamePath) return '';
    
    // Obtener el path del Item Group padre (remover último nivel que es el Item Code)
    const pathParts = row.NamePath.split('/');
    if (pathParts.length <= 1) return '';
    
    const itemGroupPath = pathParts.slice(0, -1).join('/');
    
    // BUSCAR PRIMERO en allLibraryData (datos completos, no filtrados)
    if (allLibraryData && allLibraryData.length > 0) {
      const itemGroup = allLibraryData.find(item => 
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
    
    // Último fallback: extraer el ID del último componente del itemGroupPath
    // Si el path es algo como "Brand/Product/123-ItemGroup", el ID sería "123-ItemGroup"
    const lastPathComponent = pathParts[pathParts.length - 1];
    return lastPathComponent || '';
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
      console.log(`❌ getAssetId: No hay currentAssetComments o imageName vacío. imageName: "${imageName}"`);
      return '';
    }
    
    const searchName = imageName.trim();
    console.log(`🔍 getAssetId: Buscando imagen "${searchName}" en ${currentAssetComments.length} assets`);
    
    const asset = currentAssetComments.find(asset => 
      asset.Name === searchName
    );
    
    if (asset) {
      console.log(`✅ getAssetId: Encontrado asset para "${searchName}":`, {
        Name: asset.Name,
        ID: asset.ID,
        Id: asset.Id,
        NamePath: asset.NamePath,
        IdPath: asset.IdPath
      });
      
      // Usar el campo ID (mayúscula) que contiene el ID específico de la imagen
      const result = asset.ID;
      console.log(`📋 getAssetId: Retornando ID "${result}" para "${searchName}"`);
      return result ? result.toString().trim() : '';
    } else {
      console.log(`❌ getAssetId: No se encontró asset para "${searchName}"`);
      
      // Mostrar algunos ejemplos de los assets disponibles para debug
      if (currentAssetComments.length > 0) {
        console.log(`📋 Primeros 3 assets disponibles:`, currentAssetComments.slice(0, 3).map(a => ({
          Name: a.Name,
          ID: a.ID,
          Id: a.Id
        })));
      }
      
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
      // Lista de analistas conocidos (puedes expandir esta lista)
      const analistasConocidos = ['Victor', 'Carlos', 'Kalem', 'Diego'];
      // Lista de diseñadores conocidos (puedes expandir esta lista)  
      const diseñadoresConocidos = ['Veronica', 'Cinthya', 'Thanya', 'Grecia', 'Rossana', 'Carla', 'Gabriela'];
      
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

  currentWorkingData.forEach((row, originalIndex) => {
    // Extraer metadatos fijos
    const metadata = {
      name: row['Name'] || '',
      id: row['Id'] || '',
      itemGroup: row['NamePath'] || '', // El NamePath contiene la ruta del Item Group
      itemGroupId: getItemGroupId(row), // NUEVO: ID específico del Item Group
      objectType: row['Object Type'] || '',
      cms: row['CMS'] || '',
      marca: row['Marca'] || '',
      titulo: row['Título'] || '',
      importancia: row['WA Importancia'] || ''
    };

    // Debug: log algunos items para verificar datos (solo los primeros 3)
    if (originalIndex < 3) {
      // console.log para debug deshabilitado - demasiado verbose
    }

    // 1. PRIMERO: Verificar si la fila tiene comentario directo en WA_VIS_Comment
    const directComment = row['WA_VIS_Comment'];
    if (directComment && directComment.trim() !== '') {
      const parsedComment = parseComment(directComment.trim());
      rowIndex++;
      totalImagesWithComments++;
      
      // DEBUG: Detectar IDs problemáticos al agregarlos
      const problematicIds = ['42990', '23591'];
      if (problematicIds.includes(metadata.id)) {
        console.log(`🚨 DETECTADO ID PROBLEMÁTICO ${metadata.id} siendo agregado a tableRowsData:`);
        console.log(`   - Diseñador del comentario: "${parsedComment.diseñador}"`);
        console.log(`   - Status: "${parsedComment.ultimoStatus}"`);
        console.log(`   - Comentario original: "${directComment}"`);
      }

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
        imagen: '-',
        analista: parsedComment.analista,
        primeraFechaAnalista: parsedComment.primeraFechaAnalista,
        ultimaFechaAnalista: parsedComment.ultimaFechaAnalista,
        ultimoComentarioAnalista: parsedComment.ultimoComentarioAnalista,
        diseñador: parsedComment.diseñador,
        ultimaFechaDisenador: parsedComment.ultimaFechaDisenador,
        ultimoComentarioDisenador: parsedComment.ultimoComentarioDisenador,
        ultimoTipo: parsedComment.ultimoTipo,
        ultimoStatus: parsedComment.ultimoStatus,
        originalRowIndex: originalIndex,
        rowType: 'direct-comment',
        itemName: metadata.name,
        itemId: metadata.id,
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
            
            // DEBUG: Detectar IDs problemáticos para imágenes
            const problematicIds = ['42990', '23591'];
            if (problematicIds.includes(finalId)) {
              console.log(`🚨 DETECTADO ID PROBLEMÁTICO ${finalId} en imagen siendo agregado a tableRowsData:`);
              console.log(`   - Imagen: "${imageValue.trim()}"`);
              console.log(`   - Diseñador del comentario: "${parsedComment.diseñador}"`);
              console.log(`   - Status: "${parsedComment.ultimoStatus}"`);
              console.log(`   - Comentario original: "${comment}"`);
              console.log(`   - metadata.id original: "${metadata.id}"`);
            }
            
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
              ultimoComentarioAnalista: parsedComment.ultimoComentarioAnalista,
              diseñador: parsedComment.diseñador,
              ultimaFechaDisenador: parsedComment.ultimaFechaDisenador,
              ultimoComentarioDisenador: parsedComment.ultimoComentarioDisenador,
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
  const tableRows = tableRowsData.map(rowData => {
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
          <td class="inventory-cell-clean">${escapeHtml(rowData.primeraFechaAnalista || '')}</td>
          <td class="inventory-cell-clean">${escapeHtml(rowData.ultimaFechaAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="analista-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="diseñador-clean" title="Click para ver historial completo">${escapeHtml(rowData.diseñador || '')}</td>
          <td class="inventory-cell-clean">${escapeHtml(rowData.ultimaFechaDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="diseñador-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="tipo-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo || '')}</td>
          <td class="inventory-cell-clean clickable-status-clean" data-item-group-id="${escapeHtml(rowData.itemGroupId)}" title="Click para navegar al Item Group">${createStatusTag(rowData.ultimoStatus)}</td>
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
          <td class="inventory-cell-clean">${escapeHtml(rowData.primeraFechaAnalista || '')}</td>
          <td class="inventory-cell-clean">${escapeHtml(rowData.ultimaFechaAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="analista-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="diseñador-clean" title="Click para ver historial completo">${escapeHtml(rowData.diseñador || '')}</td>
          <td class="inventory-cell-clean">${escapeHtml(rowData.ultimaFechaDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="diseñador-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="tipo-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo || '')}</td>
          <td class="inventory-cell-clean clickable-status-clean" data-item-group-id="${escapeHtml(rowData.itemGroupId)}" title="Click para navegar al Item Group">${createStatusTag(rowData.ultimoStatus)}</td>
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
          <button id="assignDesignerBtn" class="btn btn-success btn-inventory-action">
            <i class="fas fa-user-plus"></i> Asignar Diseñadora
          </button>
          <button id="openInventoryFilters" class="btn btn-secondary btn-inventory-action">
            <i class="fas fa-filter"></i> Filtros
          </button>
          <button id="clearFiltersBtn" class="btn btn-secondary btn-inventory-action" onclick="clearInventoryFilter()">
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
              <th class="inventory-header-cell">Object Type</th>
              <th class="inventory-header-cell">CMS</th>
              <th class="inventory-header-cell">Marca</th>
              <th class="inventory-header-cell">Título</th>
              <th class="inventory-header-cell">Imp</th>
              <th class="inventory-header-cell">Imagen</th>
              <th class="inventory-header-cell">Analista</th>
              <th class="inventory-header-cell">1º Fecha</th>
              <th class="inventory-header-cell">Fecha Analista</th>
              <th class="inventory-header-cell">Comentario Analista</th>
              <th class="inventory-header-cell">Diseñador</th>
              <th class="inventory-header-cell">Fecha Diseño</th>
              <th class="inventory-header-cell">Comentario Diseñador</th>
              <th class="inventory-header-cell">Tipo</th>
              <th class="inventory-header-cell">Status</th>
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
    
    // Configurar el botón de asignar diseñadora
    const assignButton = document.getElementById('assignDesignerBtn');
    if (assignButton) {
      assignButton.onclick = openAssignDesignerModal;
    }
  }, 100);

  // Guardar datos originales para filtros SOLO si no existen ya (para preservar asignaciones)
  if (originalInventoryData.length === 0) {
    originalInventoryData = [...tableRowsData];
    console.log('🔄 Inicializando originalInventoryData por primera vez con', tableRowsData.length, 'elementos');
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
    
    if (hasRecentAssignments) {
      console.log('🔒 PRESERVANDO originalInventoryData - contiene asignaciones recientes no reflejadas en tableRowsData');
      // Solo actualizar comentarios en originalInventoryData sin perder asignaciones
      originalInventoryData.forEach(originalRow => {
        const matchingTableRow = tableRowsData.find(tableRow => {
          // Matching mejorado: usar commentType y múltiples criterios
          if (originalRow.commentType === 'item' && tableRow.commentType === 'item') {
            // Para elementos tipo "item": comparar IDs de forma flexible (id o itemId) y name
            const originalId = originalRow.itemId || originalRow.id;
            const tableId = tableRow.itemId || tableRow.id;
            const match = String(tableId) === String(originalId) && tableRow.name === originalRow.name;
            if (!match && originalRow.diseñador && originalRow.diseñador.trim() !== '') {
              console.log(`🔍 DEBUGGING itemId matching para ${originalRow.name}:`);
              console.log(`   - originalRow.itemId: "${originalRow.itemId}" (${typeof originalRow.itemId})`);
              console.log(`   - tableRow.itemId: "${tableRow.itemId}" (${typeof tableRow.itemId})`);
              console.log(`   - originalRow.id: "${originalRow.id}" (${typeof originalRow.id})`);
              console.log(`   - tableRow.id: "${tableRow.id}" (${typeof tableRow.id})`);
              console.log(`   - originalId: "${originalId}" tableId: "${tableId}"`);
              console.log(`   - String comparison: "${String(tableId)}" === "${String(originalId)}" = ${String(tableId) === String(originalId)}`);
              console.log(`   - Name comparison: "${tableRow.name}" === "${originalRow.name}" = ${tableRow.name === originalRow.name}`);
            }
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
          console.log(`🔄 Actualizando solo comentarios para ${originalRow.name}: preservando diseñador "${originalRow.diseñador}"`);
          originalRow['WA_VIS_Comment'] = matchingTableRow['WA_VIS_Comment'];
          originalRow.ultimoStatus = matchingTableRow.ultimoStatus;
          originalRow.ultimaFechaEstatus = matchingTableRow.ultimaFechaEstatus;
        }
      });
      
      // CRÍTICO: Sincronizar asignaciones desde originalInventoryData hacia tableRowsData
      console.log('🔄 SINCRONIZANDO asignaciones desde originalInventoryData hacia tableRowsData');
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
            console.log(`✅ Sincronizando ${originalRow.name}: "${matchingTableRow.diseñador}" → "${originalRow.diseñador}"`);
            matchingTableRow.diseñador = originalRow.diseñador;
            syncCount++;
          } else {
            console.log(`❌ No se pudo sincronizar ${originalRow.name} (${originalRow.commentType}) - ID original: ${originalRow.itemId || originalRow.id}`);
          }
        }
      });
      console.log(`🔄 Sincronización completada: ${syncCount} asignaciones transferidas a tableRowsData`);
      
      // CRÍTICO: Reaplicar filtros activos después de la sincronización
      // Esto es necesario porque si había un filtro de "sin diseñador" activo, 
      // después de asignar diseñadores estos elementos ya no deberían mostrarse
      const currentFilters = inventoryViewState?.activeFilters;
      if (currentFilters && Object.keys(currentFilters).length > 0) {
        console.log('🔄 Reaplicando filtros activos después de sincronización:', currentFilters);
        
        // Si hay un filtro de diseñador activo, simular el click para reaplicarlo
        if (currentFilters.disenador !== undefined) {
          const filterElement = document.querySelector(`[data-type="designer"][data-user="${currentFilters.disenador || ''}"]`);
          if (filterElement) {
            console.log('🎯 Reaplicando filtro de diseñador:', currentFilters.disenador || 'vacío');
            setTimeout(() => {
              filterElement.click();
            }, 100);
          }
        }
        // Si hay un filtro de analista activo, simular el click para reaplicarlo  
        else if (currentFilters.analista !== undefined) {
          const filterElement = document.querySelector(`[data-type="analyst"][data-user="${currentFilters.analista || ''}"]`);
          if (filterElement) {
            console.log('🎯 Reaplicando filtro de analista:', currentFilters.analista || 'vacío');
            setTimeout(() => {
              filterElement.click();
            }, 100);
          }
        }
      }
    } else {
      // Seguro actualizar originalInventoryData cuando no hay asignaciones pendientes
      originalInventoryData = [...tableRowsData];
      console.log('🔄 Actualizando originalInventoryData con', tableRowsData.length, 'elementos (sin asignaciones pendientes)');
    }
  }
  
  // DEBUGGING: Verificar IDs problemáticos en originalInventoryData
  const problematicIds = ['42990', '23591'];
  console.log('🔍 VERIFICANDO IDS PROBLEMÁTICOS EN originalInventoryData:');
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

  // Actualizar las tablas de estadísticas
  setTimeout(() => {
    updateStatsTablesOnDataChange();
  }, 200);

  return inventoryHTML;
}

// Función para generar tabla de inventario de imágenes desde el caché de Item Groups
function generateImageInventoryTableFromCache() {
  console.log('🚀 generateImageInventoryTableFromCache iniciada');
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

  // Usar la lógica existente pero con los datos del caché
  const originalCurrentWorkingData = currentWorkingData;
  
  // Temporalmente asignar los datos del caché a currentWorkingData
  currentWorkingData = allCachedData;
  
  try {
    // Generar la tabla usando la función existente
    const inventoryHTML = generateImageInventoryTable();
    
    // Restaurar currentWorkingData original
    currentWorkingData = originalCurrentWorkingData;
    
    console.log('✅ Tabla de inventario generada exitosamente desde caché');
    return inventoryHTML;
    
  } catch (error) {
    console.error('❌ Error generando tabla desde caché:', error);
    
    // Restaurar currentWorkingData original en caso de error
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
  
  console.log(`🔗 Configurando ${clickableComments.length} elementos clickeables de comentarios`);
  console.log(`� Configurando ${clickableStatuses.length} elementos clickeables de status`);
  console.log(`🧹 Configurando ${clickableCommentsClean.length} elementos clickeables de comentarios LIMPIOS`);
  console.log(`🧹 Configurando ${clickableStatusesClean.length} elementos clickeables de status LIMPIOS`);
  console.log(`�📊 Datos disponibles: currentWorkingData=${currentWorkingData?.length || 0}, allLibraryData=${allLibraryData?.length || 0}`);
  
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
        const modalTitle = `Historial de Comentarios - Imagen: ${imageName}`;
        
        console.log('📸 Abriendo modal de imagen:', { imageName, originalComment });
        openCommentModal(modalTitle, imageName, originalComment, 'image', imageName);
        
      } else if ((commentType === 'item' || commentType === 'diseñador' || commentType === 'analista' || commentType === 'tipo') && itemName && itemId) {
        // Guardar estado de scroll antes de abrir modal de historial
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
            ? `Historial de Comentarios - Item Group: ${itemData.Name}`
            : `Historial de Comentarios - Item Code: ${itemData.Name}`;
          
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
              ? `Historial de Comentarios - Item Group: ${itemDataById.Name}`
              : `Historial de Comentarios - Item Code: ${itemDataById.Name}`;
            
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
    cell.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const commentType = this.getAttribute('data-comment-type');
      const imageName = this.getAttribute('data-image-name');
      const itemName = this.getAttribute('data-item-name');
      const itemId = this.getAttribute('data-item-id');
      
      console.log(`🧹 Debug click LIMPIO ${index}:`, { commentType, imageName, itemName, itemId });
      
      // Lógica específica para comentarios limpios
      if (commentType && commentType.includes('-clean')) {
        // Para comentarios de imagen
        if (imageName && imageName !== '-') {
          const originalComment = getOriginalImageComment(imageName);
          const modalTitle = `Historial de Comentarios - Imagen: ${imageName}`;
          console.log('📸 Abriendo modal de imagen LIMPIO:', { imageName, originalComment });
          openCommentModal(modalTitle, imageName, originalComment, 'image', imageName);
        }
        // Para comentarios directos (item-based)
        else if (itemName && itemId) {
          console.log(`🔍 Buscando item LIMPIO en allLibraryData:`, { itemName, itemId });
          
          const itemData = allLibraryData.find(item => {
            const nameMatch = (item.Name && item.Name.trim()) === (itemName && itemName.trim());
            const idMatch = item.Id === itemId || String(item.Id) === String(itemId) || Number(item.Id) === Number(itemId);
            return nameMatch && idMatch;
          });
          
          if (itemData) {
            const originalComment = itemData['WA_VIS_Comment'] || '';
            const contextInfo = `${itemData.Name} (${itemData.Id})`;
            const modalTitle = itemData['Object Type'] === 'Item Group' 
              ? `Historial de Comentarios - Item Group: ${itemData.Name}`
              : `Historial de Comentarios - Item Code: ${itemData.Name}`;
            
            console.log('📝 Abriendo modal de item LIMPIO:', { 
              itemName, 
              itemId, 
              originalComment: originalComment ? originalComment.substring(0, 100) + '...' : 'VACÍO', 
              objectType: itemData['Object Type'],
              hasComment: !!originalComment,
              commentLength: originalComment.length
            });
            
            openCommentModal(modalTitle, contextInfo, originalComment, 'item', null);
          } else {
            console.warn('❌ No se encontró item LIMPIO:', { itemName, itemId });
            
            // Buscar solo por ID como fallback
            const itemDataById = allLibraryData.find(item => 
              item.Id === itemId || String(item.Id) === String(itemId) || Number(item.Id) === Number(itemId)
            );
            
            if (itemDataById) {
              console.log(`✅ Encontrado por ID solamente (LIMPIO):`, { Name: itemDataById.Name, Id: itemDataById.Id });
              const originalComment = itemDataById['WA_VIS_Comment'] || '';
              const contextInfo = `${itemDataById.Name} (${itemDataById.Id})`;
              const modalTitle = itemDataById['Object Type'] === 'Item Group' 
                ? `Historial de Comentarios - Item Group: ${itemDataById.Name}`
                : `Historial de Comentarios - Item Code: ${itemDataById.Name}`;
              
              openCommentModal(modalTitle, contextInfo, originalComment, 'item', null);
            }
          }
        }
      }
    });
    cell.style.cursor = 'pointer';
  });
  
  // Event listeners para status clickeables LIMPIOS
  clickableStatusesClean.forEach((cell, index) => {
    cell.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const itemGroupId = this.getAttribute('data-item-group-id');
      
      if (!itemGroupId || itemGroupId.trim() === '') {
        console.warn('❌ No se encontró Item Group ID en status LIMPIO');
        return;
      }
      
      console.log(`🧹 Click en status LIMPIO, navegando a Item Group:`, itemGroupId);
      navigateToItemGroup(itemGroupId);
    });
    cell.style.cursor = 'pointer';
  });
}

// Función auxiliar para obtener comentario original completo de imagen
function getOriginalImageComment(imageName) {
  if (!currentAssetComments || !imageName || imageName.trim() === '') {
    return '';
  }
  
  const asset = currentAssetComments.find(asset => 
    asset.Name === imageName.trim()
  );
  
  return asset && asset.WA_VIS_Comment ? asset.WA_VIS_Comment.trim() : '';
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
          <td class="inventory-cell-clean">${escapeHtml(rowData.primeraFechaAnalista || '')}</td>
          <td class="inventory-cell-clean">${escapeHtml(rowData.ultimaFechaAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="analista-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="diseñador-clean" title="Click para ver historial completo">${escapeHtml(rowData.diseñador || '')}</td>
          <td class="inventory-cell-clean">${escapeHtml(rowData.ultimaFechaDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="diseñador-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="tipo-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo || '')}</td>
          <td class="inventory-cell-clean clickable-status-clean" data-item-group-id="${escapeHtml(rowData.itemGroupId)}" title="Click para navegar al Item Group">${createStatusTag(rowData.ultimoStatus)}</td>
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
          <td class="inventory-cell-clean">${escapeHtml(rowData.primeraFechaAnalista || '')}</td>
          <td class="inventory-cell-clean">${escapeHtml(rowData.ultimaFechaAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="analista-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="diseñador-clean" title="Click para ver historial completo">${escapeHtml(rowData.diseñador || '')}</td>
          <td class="inventory-cell-clean">${escapeHtml(rowData.ultimaFechaDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="diseñador-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="tipo-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo || '')}</td>
          <td class="inventory-cell-clean clickable-status-clean" data-item-group-id="${escapeHtml(rowData.itemGroupId)}" title="Click para navegar al Item Group">${createStatusTag(rowData.ultimoStatus)}</td>
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

window.applyDesignerAssignments = function() {
  console.log('🔄 === INICIANDO PROCESO DE ASIGNACIONES ===');
  
  const designers = getActiveDesigners();
  console.log('👥 Diseñadores activos:', designers);
  
  const unassignedComments = originalInventoryData.filter(row => !row.diseñador || row.diseñador.trim() === '');
  console.log('📊 Comentarios sin asignar ANTES:', unassignedComments.length);
  console.log('📊 Total datos originalInventoryData:', originalInventoryData.length);
  
  // LOGGING DETALLADO DE ELEMENTOS SIN ASIGNAR
  console.log('🔍 === DETALLE DE ELEMENTOS SIN ASIGNAR ===');
  
  // CRÍTICO: Revisar si los IDs problemáticos están aquí
  const problematicIds = ['42990', '23591'];
  const expectedIds = ['119495', '193853', '23482', '53764', '23456'];
  
  console.log('🚨 VERIFICACIÓN DE IDS PROBLEMÁTICOS:');
  problematicIds.forEach(id => {
    const found = unassignedComments.find(row => row.id === id);
    if (found) {
      console.log(`❌ ERROR: ID ${id} NO DEBERÍA ESTAR SIN ASIGNAR - Diseñador actual: "${found.diseñador}"`);
    } else {
      console.log(`✅ OK: ID ${id} no está en la lista de sin asignar`);
    }
  });
  
  console.log('🎯 VERIFICACIÓN DE IDS ESPERADOS:');
  expectedIds.forEach(id => {
    const found = unassignedComments.find(row => row.id === id);
    if (found) {
      console.log(`✅ OK: ID ${id} SÍ está sin asignar - Diseñador: "${found.diseñador}"`);
    } else {
      console.log(`❌ FALTA: ID ${id} debería estar sin asignar pero no aparece`);
    }
  });
  
  unassignedComments.forEach((row, index) => {
    const isProblematic = problematicIds.includes(row.id);
    const prefix = isProblematic ? '🚨 PROBLEMA' : '📋';
    
    console.log(`${prefix} Elemento ${index + 1}:`);
    console.log(`   - Nombre: "${row.name}"`);
    console.log(`   - ID: "${row.id}"`);
    console.log(`   - Object Type: "${row.objectType}"`);
    console.log(`   - Comment Type: "${row.commentType}"`);
    console.log(`   - Analista: "${row.analista}"`);
    console.log(`   - Diseñador actual: "${row.diseñador}"`);
    console.log(`   - WA_VIS_Comment: "${row['WA_VIS_Comment'] || 'VACÍO'}"`);
    console.log(`   - Status actual: "${row.ultimoStatus}"`);
    if (isProblematic) {
      console.log(`   - 🚨 ESTE ID NO DEBERÍA PROCESARSE - YA TIENE DISEÑADOR`);
    }
    console.log('   ---');
  });
  
  // Validar que la suma de asignaciones no exceda los comentarios sin asignar
  let totalAssignments = 0;
  designers.forEach(designer => {
    const input = document.getElementById(`assignment-${designer}`);
    const assignmentValue = parseInt(input?.value) || 0;
    totalAssignments += assignmentValue;
    console.log(`👤 ${designer}: input="${input?.value}", parsed=${assignmentValue}`);
  });
  
  console.log('📊 Total asignaciones a hacer:', totalAssignments);
  
  if (totalAssignments > unassignedComments.length) {
    alert(`Error: Estás intentando asignar ${totalAssignments} comentarios pero solo hay ${unassignedComments.length} sin asignar.`);
    return;
  }
  
  // Realizar las asignaciones
  console.log('🔄 Aplicando asignaciones...');
  let commentIndex = 0;
  designers.forEach(designer => {
    const assignmentCount = parseInt(document.getElementById(`assignment-${designer}`).value) || 0;
    console.log(`🔄 Procesando ${assignmentCount} asignaciones para ${designer}`);
    
    for (let i = 0; i < assignmentCount && commentIndex < unassignedComments.length; i++) {
      const row = unassignedComments[commentIndex];
      console.log(`📝 ANTES Row ${commentIndex}: diseñador="${row.diseñador}", name="${row.name}"`);
      row.diseñador = designer;
      console.log(`📝 DESPUÉS Row ${commentIndex}: diseñador="${row.diseñador}"`);
      
      // Agregar comentario automático de asignación
      addAssignmentComment(row);
      
      commentIndex++;
    }
  });
  
  console.log(`✅ Total asignaciones procesadas: ${commentIndex}`);
  
  // CRÍTICO: Actualizar originalInventoryData debe reflejar las asignaciones hechas localmente
  console.log(' originalInventoryData después de asignaciones:', originalInventoryData.length);
  
  // Verificar que originalInventoryData mantenga las asignaciones que acabamos de hacer
  originalInventoryData.forEach((row, index) => {
    if (index < commentIndex) {
      // Buscar el diseñador asignado correspondiente
      let assignedDesigner = '';
      let currentAssignmentIndex = 0;
      
      designers.forEach(designer => {
        const input = document.getElementById(`assignment-${designer}`);
        const assignmentValue = parseInt(input?.value) || 0;
        
        for (let i = 0; i < assignmentValue; i++) {
          if (currentAssignmentIndex === index) {
            assignedDesigner = designer;
            break;
          }
          currentAssignmentIndex++;
        }
        if (assignedDesigner) return; // Break outer loop
      });
      
      if (assignedDesigner && row.diseñador !== assignedDesigner) {
// DESHABILITADO:         console.log(`� FORZANDO asignación en originalInventoryData[${index}]: "${row.diseñador}" -> "${assignedDesigner}" para ${row.name}`);
        // NO SOBREESCRIBIR - row.diseñador = assignedDesigner;
      }
    }
  });
  
  console.log('📊 originalInventoryData después de verificar:', originalInventoryData.length);
  
  // Verificar el estado después de las asignaciones
  const assignedAfter = originalInventoryData.filter(row => row.diseñador && row.diseñador.trim() !== '');
  const unassignedAfter = originalInventoryData.filter(row => !row.diseñador || row.diseñador.trim() === '');
  
  console.log('📊 Comentarios asignados DESPUÉS:', assignedAfter.length);
  console.log('📊 Comentarios sin asignar DESPUÉS:', unassignedAfter.length);
  
  // CRÍTICO: Regenerar tabla completa para mostrar asignaciones de tipo "item"
  console.log('🔄 Regenerando tabla completa después de asignaciones...');
  
  // IMPORTANTE: Actualizar currentWorkingData con las asignaciones más recientes de allLibraryData
  if (allLibraryData && allLibraryData.length > 0) {
    console.log('🔄 Actualizando currentWorkingData con asignaciones de allLibraryData...');
    currentWorkingData = [...allLibraryData];
    console.log(`✅ currentWorkingData actualizado: ${currentWorkingData.length} elementos`);
  }
  
  // Forzar regeneración completa del inventario para que se vean los cambios de "item"
  const inventoryContainer = document.querySelector('.image-inventory-container');
  if (inventoryContainer) {
    console.log('📊 Regenerando inventario completo usando generateInventoryData...');
    
    // Regenerar HTML completo del inventario usando datos actualizados
    const updatedInventoryHTML = generateImageInventoryTable(currentWorkingData);
    inventoryContainer.outerHTML = updatedInventoryHTML;
    
    console.log('✅ Inventario regenerado completamente - elementos tipo "item" ahora visibles');
    
    // Re-configurar event listeners y actualizar datos después de regenerar
    setTimeout(() => {
      // Reconfigurar originalInventoryData con los datos actualizados
      originalInventoryData = [...originalInventoryData];
      setupClickableElements();
      setupInventoryClickListeners();
      console.log('🔗 Event listeners reconfigurados después de regeneración');
      console.log('📊 originalInventoryData sincronizado con', originalInventoryData.length, 'elementos');
    }, 100);
  } else {
    console.log('❌ No se encontró el contenedor del inventario');
  }
  
  console.log('🔄 Actualizando estadísticas...');
  const box1 = document.getElementById('tree');
  const box3 = document.getElementById('box3-content');
  
  // Solo actualizar estadísticas si estamos en vista de datos (no en visualizador)
  if (isCleanViewActive) {
    // Forzar regeneración múltiple para asegurar que toma los nuevos datos
    setTimeout(() => {
      console.log('🔄 Primera actualización de estadísticas (10ms)...');
      if (box1) {
        box1.innerHTML = generateDesignerStatsTable();
      }
      
      if (box3) {
        box3.innerHTML = generateAnalystStatsTable();
      }
      
      setupStatsTableListeners();
    }, 10);
    
    setTimeout(() => {
      console.log('🔄 Segunda actualización de estadísticas (300ms)...');
      if (box1) {
        box1.innerHTML = generateDesignerStatsTable();
      }
      
      if (box3) {
        box3.innerHTML = generateAnalystStatsTable();
      }
      
      setupStatsTableListeners();
    }, 300);
    
    // CRÍTICO: Regenerar originalInventoryData con los nuevos comentarios
    setTimeout(() => {
      console.log('🔄 Regenerando datos de inventario con comentarios actualizados...');
      
      // PASO 1: Forzar limpieza completa de originalInventoryData
      originalInventoryData = [];
      
      // PASO 2: Regenerar tabla completa para forzar procesamiento de comentarios nuevos
      const box4Content = document.getElementById('box4-content');
      if (box4Content && currentWorkingData && currentWorkingData.length > 0) {
        console.log('📊 Regenerando tabla completa para reflejar comentarios de asignación...');
        
        // IMPORTANTE: Asegurar que currentWorkingData tenga los datos más recientes
        if (allLibraryData && allLibraryData.length > 0) {
          console.log('🔄 Actualizando currentWorkingData antes de regenerar tabla...');
          currentWorkingData = [...allLibraryData];
        }
        
        // Forzar regeneración completa de los datos procesados
        box4Content.innerHTML = generateImageInventoryTable(currentWorkingData, true);
        
        // Asegurar que los event listeners se configuren correctamente
        setTimeout(() => {
          setupClickableElements();
          setupStatsTableListeners();
          
          // Aplicar el filtro si había uno activo
          const currentFilters = getActiveTableFilters();
          if (currentFilters && Object.keys(currentFilters).length > 0) {
            console.log('🔄 Reaplicando filtros después de regeneración:', currentFilters);
            // Reaplicar filtros activos
            Object.entries(currentFilters).forEach(([filterType, filterValue]) => {
              if (filterType === 'diseñador' && filterValue) {
                // Simular click en la estadística de diseñador
                const designerStats = document.querySelectorAll('[data-user-type="designer"]');
                designerStats.forEach(stat => {
                  if (stat.textContent.trim() === filterValue || stat.getAttribute('data-user') === filterValue) {
                    setTimeout(() => stat.click(), 100);
                  }
                });
              }
            });
          }
        }, 100);
        
      } else {
        console.log('❌ No se pudo regenerar tabla: elementos no encontrados');
      }
    }, 500);
  } else {
    console.log('🚫 No actualizando estadísticas - estamos en visualizador');
  }
  
  // VERIFICACIÓN FINAL COMPLETA
  console.log('🔍 === VERIFICACIÓN FINAL DE ASIGNACIONES ===');
  
  const finalUnassigned = originalInventoryData.filter(row => !row.diseñador || row.diseñador === '');
  const finalAssigned = originalInventoryData.filter(row => row.diseñador && row.diseñador !== '');
  
  console.log('� Comentarios sin asignar después de todo:', finalUnassigned.length);
  console.log('📊 Comentarios asignados después de todo:', finalAssigned.length);
  
  // Mostrar detalles de elementos asignados EN ESTA SESIÓN SOLAMENTE
  console.log('🎯 === ELEMENTOS ASIGNADOS EN ESTA SESIÓN ===');
  
  // Crear lista de elementos procesados en esta sesión basándose en comentIndex
  const elementsAssignedThisSession = [];
  let currentIndex = 0;
  
  designers.forEach(designer => {
    const input = document.getElementById(`assignment-${designer}`);
    const assignmentValue = parseInt(input?.value) || 0;
    
    for (let i = 0; i < assignmentValue; i++) {
      if (currentIndex < unassignedComments.length) {
        const assignedElement = unassignedComments[currentIndex];
        // Obtener el elemento actualizado de originalInventoryData
        const updatedElement = originalInventoryData.find(row => 
          row.id === assignedElement.id && row.name === assignedElement.name
        );
        
        if (updatedElement) {
          elementsAssignedThisSession.push({
            ...updatedElement,
            assignedTo: designer
          });
        }
        currentIndex++;
      }
    }
  });
  
  // Mostrar solo los elementos asignados en esta sesión
  elementsAssignedThisSession.forEach((row, index) => {
    console.log(`📋 Asignación ${index + 1}:`);
    console.log(`   - Nombre: "${row.name}"`);
    console.log(`   - ID: "${row.id}"`);
    console.log(`   - Object Type: "${row.objectType}"`);
    console.log(`   - Comment Type: "${row.commentType}"`);
    console.log(`   - Diseñador asignado: "${row.assignedTo}" (ahora: "${row.diseñador}")`);
    console.log(`   - Comentario completo FINAL: "${row['WA_VIS_Comment'] || 'No disponible'}"`);
    console.log('   ---');
  });
  
  console.log('🔄 === PROCESO DE ASIGNACIONES COMPLETADO ===');
  
  // Mostrar notificación de éxito
  showAutoSaveNotification(`Asignaciones completadas con comentarios automáticos`);
  
  // Cerrar el modal
  closeAssignDesignerModal();
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
  
  // Crear el nuevo comentario de asignación
  const assignmentComment = {
    usuario: row.diseñador,
    fechaHora: getLocalDateTime(),
    tipoComentario: 'General',
    textoComentario: `Se asignó diseñador a "${row.diseñador}"`,
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
  
  if (row.commentType === 'item') {
    // Para Item Codes e Item Groups, crear payload directamente con ID conocido
    console.log('🎯 Auto-guardando', row.objectType, 'ID:', row.id, 'Nombre:', row.name, 'CommentType:', row.commentType);
    
    const record = {
      id: parseInt(row.id),
      objectType: row.objectType,
      attribute: 'WA_VIS_Comment',
      value: updatedComments, // Usar los comentarios combinados
      date: currentDate,
      user: currentUser
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
    addToAutoSaveQueue(record, currentUser, currentDate);
    
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

function generateDesignerStatsTable() {
  const designers = Object.keys(USERS).filter(user => USERS[user].group === 'Diseño').sort();
  
  // Debug: Ver qué status únicos existen en los datos
  const uniqueStatuses = [...new Set(originalInventoryData.map(row => row.ultimoStatus).filter(status => status))];
  console.log('Status únicos encontrados:', uniqueStatuses);
  
  let tableHTML = `
    <div class="stats-table-container">
      <h4>Resumen Diseño</h4>
      <table class="stats-table">
        <thead>
          <tr>
            <th>Diseño</th>
            <th>Total</th>
            <th>Act</th>
            <th>Rev</th>
            <th>Dis</th>
            <th>Can</th>
            <th>Com</th>
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
    const assignedItems = originalInventoryData.filter(row => row.diseñador === designer);
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
        <td class="clickable-stat" data-user="${designer}" data-status="cancelado" data-type="designer">${cancelado}</td>
        <td class="clickable-stat" data-user="${designer}" data-status="completado" data-type="designer">${completado}</td>
      </tr>
    `;
  });
  
  // Agregar la fila "Vacío" para elementos sin diseñador
  const emptyItems = originalInventoryData.filter(row => !row.diseñador || row.diseñador === '');
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
      <td class="clickable-stat" data-user="" data-status="cancelado" data-type="designer">${emptyCancelado}</td>
      <td class="clickable-stat" data-user="" data-status="completado" data-type="designer">${emptyCompletado}</td>
    </tr>
    <tr class="total-row">
      <td>Total</td>
      <td class="clickable-stat" data-user="all" data-status="" data-type="designer">${totalGeneral}</td>
      <td class="clickable-stat" data-user="all" data-status="activos" data-type="designer">${totalActivos}</td>
      <td class="clickable-stat" data-user="all" data-status="revisión" data-type="designer">${totalRevision}</td>
      <td class="clickable-stat" data-user="all" data-status="diseño" data-type="designer">${totalDiseño}</td>
      <td class="clickable-stat" data-user="all" data-status="cancelado" data-type="designer">${totalCancelado}</td>
      <td class="clickable-stat" data-user="all" data-status="completado" data-type="designer">${totalCompletado}</td>
    </tr>
  `;
  
  tableHTML += `
        </tbody>
      </table>
    </div>
  `;
  
  return tableHTML;
}

function generateAnalystStatsTable() {
  const analysts = Object.keys(USERS).filter(user => USERS[user].group === 'Analistas').sort();
  
  let tableHTML = `
    <div class="stats-table-container">
      <h4>Resumen Analistas</h4>
      <table class="stats-table">
        <thead>
          <tr>
            <th>Analista</th>
            <th>Total</th>
            <th>Act</th>
            <th>Rev</th>
            <th>Dis</th>
            <th>Can</th>
            <th>Com</th>
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
    const assignedItems = originalInventoryData.filter(row => row.analista === analyst);
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
        <td class="clickable-name" data-user="${analyst}" data-type="analyst">${USERS[analyst].name}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="" data-type="analyst">${total}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="activos" data-type="analyst">${activos}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="revisión" data-type="analyst">${revision}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="diseño" data-type="analyst">${diseño}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="cancelado" data-type="analyst">${cancelado}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="completado" data-type="analyst">${completado}</td>
      </tr>
    `;
  });
  
  // Calcular totales sin incluir vacíos para analistas
  totalGeneral = analysts.reduce((sum, analyst) => {
    return sum + originalInventoryData.filter(row => row.analista === analyst).length;
  }, 0);
  
  totalRevision = analysts.reduce((sum, analyst) => {
    const items = originalInventoryData.filter(row => row.analista === analyst);
    return sum + items.filter(row => {
      if (!row.ultimoStatus) return false;
      const status = row.ultimoStatus.toLowerCase();
      return status.includes('revision') || status.includes('revisión') || status.includes('review');
    }).length;
  }, 0);
  
  totalDiseño = analysts.reduce((sum, analyst) => {
    const items = originalInventoryData.filter(row => row.analista === analyst);
    return sum + items.filter(row => {
      if (!row.ultimoStatus) return false;
      const status = row.ultimoStatus.toLowerCase();
      return status.includes('diseño') || status.includes('diseno') || status.includes('design');
    }).length;
  }, 0);
  
  totalCancelado = analysts.reduce((sum, analyst) => {
    const items = originalInventoryData.filter(row => row.analista === analyst);
    return sum + items.filter(row => {
      if (!row.ultimoStatus) return false;
      const status = row.ultimoStatus.toLowerCase();
      return status.includes('cancelado') || status.includes('cancelled') || status.includes('cancel');
    }).length;
  }, 0);
  
  totalCompletado = analysts.reduce((sum, analyst) => {
    const items = originalInventoryData.filter(row => row.analista === analyst);
    return sum + items.filter(row => {
      if (!row.ultimoStatus) return false;
      const status = row.ultimoStatus.toLowerCase();
      return status.includes('completado') || status.includes('completed') || status.includes('complete');
    }).length;
  }, 0);
  
  totalActivos = analysts.reduce((sum, analyst) => {
    const items = originalInventoryData.filter(row => row.analista === analyst);
    return sum + items.filter(row => {
      if (!row.ultimoStatus) return false;
      const status = row.ultimoStatus.toLowerCase();
      return (status.includes('revision') || status.includes('revisión') || status.includes('review')) ||
             (status.includes('diseño') || status.includes('diseno') || status.includes('design'));
    }).length;
  }, 0);
  
  tableHTML += `
    <tr class="total-row">
      <td>Total</td>
      <td class="clickable-stat" data-user="all" data-status="" data-type="analyst">${totalGeneral}</td>
      <td class="clickable-stat" data-user="all" data-status="activos" data-type="analyst">${totalActivos}</td>
      <td class="clickable-stat" data-user="all" data-status="revisión" data-type="analyst">${totalRevision}</td>
      <td class="clickable-stat" data-user="all" data-status="diseño" data-type="analyst">${totalDiseño}</td>
      <td class="clickable-stat" data-user="all" data-status="cancelado" data-type="analyst">${totalCancelado}</td>
      <td class="clickable-stat" data-user="all" data-status="completado" data-type="analyst">${totalCompletado}</td>
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
  console.log('🔧 Configurando event listeners para elementos clicables...');
  
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
      console.log('📊 Click en tabla de stats - Nombre:', { user: this.dataset.user, type: this.dataset.type, id: this.id });
      
      // Limpiar selecciones anteriores
      clearStatsTableSelections();
      
      // Marcar como seleccionado
      this.classList.add('selected');
      
      const user = this.dataset.user;
      const type = this.dataset.type;
      filterInventoryByUser(user, type);
    });
  });
  
  // Event listeners para estadísticas clickeables
  document.querySelectorAll('.clickable-stat').forEach(element => {
    element.addEventListener('click', function() {
      console.log('📊 Click en tabla de stats - Stat:', { user: this.dataset.user, status: this.dataset.status, type: this.dataset.type, id: this.id });
      
      // Limpiar selecciones anteriores
      clearStatsTableSelections();
      
      // Marcar como seleccionado
      this.classList.add('selected');
      
      const user = this.dataset.user;
      const status = this.dataset.status;
      const type = this.dataset.type;
      filterInventoryByUserAndStatus(user, status, type);
    });
  });
}

function clearStatsTableSelections() {
  // Limpiar todas las selecciones anteriores
  document.querySelectorAll('.clickable-name.selected, .clickable-stat.selected').forEach(element => {
    element.classList.remove('selected');
  });
}

function filterInventoryByUser(user, type) {
  console.log('🔍 Filtrando por usuario:', { user, type });
  
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
      filteredData = originalInventoryData.filter(row => row.diseñador === user);
    }
  } else if (type === 'analyst') {
    // Filtrar por analista específico o vacío
    if (user === '') {
      filteredData = originalInventoryData.filter(row => !row.analista || row.analista === '');
    } else {
      filteredData = originalInventoryData.filter(row => row.analista === user);
    }
  }
  
  updateInventoryDisplay(filteredData);
  saveInventoryViewState(); // Guardar estado después del filtro
}

function filterInventoryByUserAndStatus(user, status, type) {
  console.log('🔍 Filtrando por:', { user, status, type, originalDataLength: originalInventoryData.length });
  
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
      filteredData = originalInventoryData.filter(row => row.diseñador === user);
    } else if (type === 'analyst') {
      filteredData = originalInventoryData.filter(row => row.analista === user);
    }
  }
  
  console.log('📊 Datos después de filtrar por usuario:', filteredData.length);
  
  // Si hay un status específico, filtrar también por status usando la misma lógica que las tablas
  if (status && status !== '') {
    console.log('🎯 Filtrando por status:', status);
    
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
  
  console.log('✅ Datos finales filtrados:', filteredData.length);
  updateInventoryDisplay(filteredData);
  saveInventoryViewState(); // Guardar estado después del filtro
}

function clearInventoryFilter() {
  console.log('🔄 Limpiando filtros, restaurando datos originales:', originalInventoryData.length);
  
  // Limpiar también los filtros del modal
  document.getElementById('filterAnalyst').value = '';
  document.getElementById('filterDesigner').value = '';
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterItemGroup').value = '';
  
  // Limpiar selecciones de las tablas de stats
  clearStatsTableSelections();
  
  // Mostrar todos los datos originales
  updateInventoryDisplay(originalInventoryData);
}

function updateInventoryDisplay(filteredData) {
  console.log('🔄 Actualizando display con datos:', filteredData ? filteredData.length : 0);
  
  // En lugar de reemplazar todo el box4, vamos a actualizar solo la tabla de inventario
  // manteniendo la estructura y funcionalidad original
  
  // Si no hay datos, mostrar mensaje
  if (!filteredData || filteredData.length === 0) {
    const inventoryTable = document.querySelector('.image-inventory-table tbody');
    if (inventoryTable) {
      inventoryTable.innerHTML = '<tr><td colspan="17" style="text-align: center; color: #666;">No hay datos que coincidan con el filtro actual</td></tr>';
    }
    console.log('❌ Sin datos para mostrar');
    return;
  }
  
  // NO modificar originalInventoryData, solo usar los datos filtrados para mostrar
  console.log('✅ Actualizando tabla con', filteredData.length, 'filas');
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

function updateInventoryTableDirectly(filteredData) {
  console.log('🔄 === INICIO updateInventoryTableDirectly ===');
  console.log('📊 Datos recibidos:', filteredData.length, 'elementos');
  
  // Mostrar algunos ejemplos de los datos para verificar que están actualizados
  if (filteredData.length > 0) {
    console.log('📋 Primer elemento de datos:', {
      id: filteredData[0].id,
      nombre: filteredData[0].name,
      analista: filteredData[0].analista,
      diseñador: filteredData[0].diseñador,
      ultimoStatus: filteredData[0].ultimoStatus,
      ultimoTipo: filteredData[0].ultimoTipo,
      primeraFechaAnalista: filteredData[0].primeraFechaAnalista,
      ultimaFechaAnalista: filteredData[0].ultimaFechaAnalista,
      ultimaFechaDisenador: filteredData[0].ultimaFechaDisenador
    });
  }
  
  // Función para obtener el ID del asset basado en el nombre de la imagen
  function getAssetId(imageName) {
    if (!currentAssetComments || !imageName || imageName.trim() === '') {
      console.log(`❌ updateInventory getAssetId: No hay currentAssetComments o imageName vacío. imageName: "${imageName}"`);
      return '';
    }
    
    const searchName = imageName.trim();
    console.log(`🔍 updateInventory getAssetId: Buscando imagen "${searchName}" en ${currentAssetComments.length} assets`);
    
    const asset = currentAssetComments.find(asset => 
      asset.Name === searchName
    );
    
    if (asset) {
      console.log(`✅ updateInventory getAssetId: Encontrado asset para "${searchName}":`, {
        Name: asset.Name,
        ID: asset.ID,
        Id: asset.Id,
        NamePath: asset.NamePath,
        IdPath: asset.IdPath
      });
      
      // Usar el campo ID (mayúscula) que contiene el ID específico de la imagen
      const result = asset.ID;
      console.log(`📋 updateInventory getAssetId: Retornando ID "${result}" para "${searchName}"`);
      return result ? result.toString().trim() : '';
    } else {
      console.log(`❌ updateInventory getAssetId: No se encontró asset para "${searchName}"`);
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
    // Log detallado para cada fila (solo las primeras 3 para no saturar)
    if (index < 3) {
      console.log(`📋 Fila ${index + 1} datos:`, {
        nombre: rowData.name,
        id: rowData.id,
        analista: rowData.analista,
        primeraFechaAnalista: rowData.primeraFechaAnalista,
        ultimaFechaAnalista: rowData.ultimaFechaAnalista,
        ultimoComentarioAnalista: rowData.ultimoComentarioAnalista,
        diseñador: rowData.diseñador,
        ultimaFechaDisenador: rowData.ultimaFechaDisenador,
        ultimoComentarioDisenador: rowData.ultimoComentarioDisenador,
        ultimoStatus: rowData.ultimoStatus,
        ultimoTipo: rowData.ultimoTipo
      });
    }
    
    const row = document.createElement('tr');
    row.className = 'inventory-row';
    row.setAttribute('data-original-row', rowData.originalRowIndex || index);
    
    // Determinar el ID correcto: solo si Object Type será 'Image'
    const objectTypeValue = getObjectTypeValue(rowData);
    const displayId = (objectTypeValue === 'Image') 
      ? (getAssetId(rowData.imageName) || rowData.id || rowData.itemGroupId || '')
      : (rowData.id || rowData.itemGroupId || '');

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
      <td class="inventory-cell-clean">${escapeHtml(rowData.primeraFechaAnalista || '')}</td>
      <td class="inventory-cell-clean">${escapeHtml(rowData.ultimaFechaAnalista || '')}</td>
      <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName || ''}" data-item-name="${rowData.itemName || ''}" data-item-id="${rowData.itemId || ''}" data-comment-type="analista-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista || '')}</td>
      <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName || ''}" data-item-name="${rowData.itemName || ''}" data-item-id="${rowData.itemId || ''}" data-comment-type="diseñador-clean" title="Click para ver historial completo">${escapeHtml(rowData.diseñador || '')}</td>
      <td class="inventory-cell-clean">${escapeHtml(rowData.ultimaFechaDisenador || '')}</td>
      <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName || ''}" data-item-name="${rowData.itemName || ''}" data-item-id="${rowData.itemId || ''}" data-comment-type="diseñador-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador || '')}</td>
      <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName || ''}" data-item-name="${rowData.itemName || ''}" data-item-id="${rowData.itemId || ''}" data-comment-type="tipo-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo || '')}</td>
      <td class="inventory-cell-clean clickable-status-clean" data-item-group-id="${escapeHtml(rowData.itemGroupId || '')}" title="Click para navegar al Item Group">${createStatusTag(rowData.ultimoStatus)}</td>
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
  }, 100);
  
  console.log('✅ === FIN updateInventoryTableDirectly - Tabla actualizada con', filteredData.length, 'filas ===');
}

window.clearInventoryFilter = function() {
  // Limpiar selecciones de las tablas de stats
  clearStatsTableSelections();
  
  // Restaurar la vista original del inventario regenerando la tabla completa
  // Buscar la tabla de inventario
  const inventoryTable = document.querySelector('.image-inventory-table tbody');
  if (!inventoryTable) {
    console.log('No se encontró la tabla de inventario para restaurar');
    return;
  }
  
  // Restaurar todos los datos originales
  updateInventoryTableDirectly(originalInventoryData);
  
  // Restaurar estadísticas originales
  const statsElement = document.querySelector('.inventory-stats');
  if (statsElement) {
    statsElement.innerHTML = `Comentarios visibles: <strong>${originalInventoryData.length}</strong>`;
  }
  
  // ✅ GUARDAR ESTADO SIN FILTROS - Limpiar filtros activos
  console.log('🧹 Guardando estado SIN filtros');
  if (inventoryViewState) {
    inventoryViewState.activeFilters = null;
    inventoryViewState.dropdownFilters = null;
    // Mantener posición de scroll pero limpiar filtros
    inventoryViewState.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    inventoryViewState.scrollPositionX = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Guardar estado limpio en localStorage
    saveInventoryViewState();
    console.log('✅ Estado sin filtros guardado:', inventoryViewState);
  }
};

function updateStatsTablesOnDataChange() {
  // Verificar que originalInventoryData esté disponible
  if (!originalInventoryData || originalInventoryData.length === 0) {
    return;
  }
  
  // Solo actualizar si estamos en vista de datos (no en visualizador)
  if (!isCleanViewActive) {
    console.log('🚫 No actualizando stats - estamos en visualizador');
    return;
  }
  
  // Actualizar las tablas de estadísticas cuando cambien los datos
  const box1 = document.getElementById('tree');
  const box3 = document.getElementById('box3-content');
  
  if (box1) {
    box1.innerHTML = generateDesignerStatsTable();
  }
  
  if (box3) {
    box3.innerHTML = generateAnalystStatsTable();
  }
  
  // Configurar event listeners
  setTimeout(() => {
    setupStatsTableListeners();
    
    // Restaurar filtros DESPUÉS de que las tablas y event listeners estén configurados
    setTimeout(() => {
      restoreStatsTableFilters();
    }, 200);
  }, 100);
}

function restoreStatsTableFilters() {
  try {
    const savedState = localStorage.getItem('inventoryViewState');
    if (!savedState) return;
    
    const inventoryViewState = JSON.parse(savedState);
    
    if (inventoryViewState.activeFilters && Object.keys(inventoryViewState.activeFilters).length > 0) {
      console.log('🔧 RESTAURANDO filtros de tablas de stats:', inventoryViewState.activeFilters);
      
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
      user: 'Sandra',
      records: [{
        id: 'TEST001',
        objectType: 'Test',
        attribute: 'WA_Test',
        value: 'test-value',
        date: getLocalDateTime(),
        user: 'Sandra'
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
    const saveBtn = document.getElementById('saveChangesBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
    saveBtn.disabled = true;
    
    // Dividir en lotes de 100 registros
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < visibleData.length; i += batchSize) {
      batches.push(visibleData.slice(i, i + batchSize));
    }
    
    let totalSaved = 0;
    
    // Enviar cada lote
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;
      
      try {
        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user: currentUser,
            records: batch
          })
        });
        
        totalSaved += batch.length;
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
          console.log(`� Intentando método alternativo para lote ${i + 1}...`);
          
          // Crear formulario para este lote
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = GOOGLE_APPS_SCRIPT_URL;
          form.target = '_blank';
          form.style.display = 'none';
          
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = 'postData';
          input.value = JSON.stringify({
            user: currentUser,
            records: batch
          });
          
          form.appendChild(input);
          document.body.appendChild(form);
          form.submit();
          document.body.removeChild(form);
          
          totalSaved += batch.length;
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw new Error(`Error en lote ${i + 1}: ${error.message}`);
        }
      }
    }
    
    // Guardado exitoso - sin alerta popup
    
    console.log(`� Datos del visualizador guardados exitosamente: ${totalSaved} registros`);
    
  } catch (error) {
    alert(`❌ Error al guardar: ${error.message}`);
  } finally {
    // Restaurar botón
    const saveBtn = document.getElementById('saveChangesBtn');
    saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Guardar cambios';
    saveBtn.disabled = false;
  }
}

function getCurrentUser() {
  const userSelect = document.getElementById('userSelect');
  const selectedValue = userSelect?.value;
  
  // Mapeo de valores del select a nombres de usuario
  const userMap = {
    'Sandra': 'Sandra',
    'Victor': 'Victor',
    'Ximena': 'Ximena',
    'Carlos': 'Carlos',
    'Kalem': 'Kalem',
    'Veronica': 'Veronica',
    'Rossana': 'Rossana',
    'Carla': 'Carla',
    'Gabriela': 'Gabriela',
    'Thanya': 'Thanya',
    'Grecia': 'Grecia',
    'Cinthya': 'Cinthya'
  };
  
  return userMap[selectedValue] || null;
}

// Función para auto-guardar un comentario individual inmediatamente después de crearlo
function autoSaveComment(newComment, type, imageName = null, context = null) {
  console.log('💾 === INICIO AUTO-GUARDADO DE COMENTARIO ===');
  console.log('💬 Comentario a guardar:', newComment);
  console.log('🏷️ Tipo:', type);
  console.log('🖼️ Imagen:', imageName);
  console.log('📝 Contexto:', context);
  
  const currentDate = getLocalDateTime();
  const currentUser = getCurrentUser();
  
  // Obtener comentarios actualizados (que ya incluyen el nuevo comentario)
  let completeCommentHistory = '';
  
  if (type === 'image' && imageName) {
    // Para imágenes, obtener comentarios actualizados (ya incluyen el nuevo)
    completeCommentHistory = getImageComments(imageName) || '';
    console.log('📜 Historial completo de comentarios (ya actualizado):', completeCommentHistory);
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
          console.log('🔍 Contexto de Item Code detectado, buscando por nombre:', itemCodeName);
          
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
    user: currentUser
  };
  
  if (type === 'image' && imageName) {
    // Comentario de imagen - encontrar el asset ID
    const asset = currentAssetComments.find(asset => asset.Name === imageName);
    console.log('🔍 Buscando asset para imagen:', imageName);
    console.log('📋 Asset encontrado:', asset);
    
    if (asset && asset.ID) {
      record.id = asset.ID;
      record.objectType = 'Image';
      console.log('✅ Asset válido con ID:', asset.ID);
    } else {
      console.warn('❌ No se pudo encontrar ID para imagen:', imageName);
      console.warn('📊 currentAssetComments tiene', currentAssetComments.length, 'assets');
      console.warn('🔍 Primeros 3 assets:', currentAssetComments.slice(0, 3));
      showAutoSaveNotification('Error: No se encontró ID de imagen', 'error');
      return;
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
    user: currentUser,
    date: currentDate,
    type: 'comment_autosave'
  };
  
  console.log('🚀 Agregando auto-guardado de imagen a cola...');
  console.log('📦 Payload completo:', JSON.stringify(payload, null, 2));
  
  // Usar el sistema de cola para evitar rate limiting
  addToAutoSaveQueue(record, currentUser, currentDate);
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
    background: ${type === 'success' ? '#6c757d' : '#dc3545'};
    color: white;
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
  
  // Ocultar y remover después de 2 segundos (más rápido)
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 2000);
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

function collectVisibleData() {
  const records = [];
  const currentDate = getLocalDateTime();
  const currentUser = getCurrentUser();
  
  console.log('=== INICIANDO RECOPILACIÓN DE DATOS VISIBLES ===');
  
  // PASO 1: Recopilar datos del Item Group actual
  if (currentItemGroup) {
    const itemGroupId = currentItemGroup['Id'];
    const itemGroupName = currentItemGroup['Name'];
    
    console.log(`\n🏷️ Procesando Item Group: ${itemGroupName} (ID: ${itemGroupId})`);
    
    let groupRecordCount = 0;
    
    // Recopilar campos WA del Item Group (EXCLUYENDO comentarios que se auto-guardan)
    WA_ATTRIBUTES.forEach(attribute => {
      // Saltar WA_VIS_Comment porque se auto-guarda cuando se crean comentarios
      if (attribute === 'WA_VIS_Comment') {
        return;
      }
      
      if (currentItemGroup[attribute] !== undefined && currentItemGroup[attribute] !== null) {
        const value = currentItemGroup[attribute].toString().trim();
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
            user: currentUser
          });
        }
      }
    });
    
    console.log(`✅ Item Group ${itemGroupName}: ${groupRecordCount} registros recopilados`);
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
      
      // Recopilar TODOS los campos WA que tengan cualquier valor (EXCLUYENDO comentarios que se auto-guardan)
      WA_ATTRIBUTES.forEach(attribute => {
        // Saltar WA_VIS_Comment porque se auto-guarda cuando se crean comentarios
        if (attribute === 'WA_VIS_Comment') {
          return;
        }
        
        if (itemData[attribute] !== undefined && itemData[attribute] !== null) {
          const value = itemData[attribute].toString().trim();
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
              user: currentUser
            });
          }
        }
      });
      
      console.log(`✅ ${itemCodeName}: ${itemRecordCount} registros recopilados`);
    }
  });
  
  // NOTA: Los comentarios de imágenes se auto-guardan cuando se crean,
  // por lo que no necesitamos recopilarlos aquí en el guardado principal.
  console.log('\n💬 PASO 3 OMITIDO: Los comentarios se auto-guardan cuando se crean');
  
  console.log(`\n=== RESUMEN FINAL ===`);
  console.log(`� Total de registros recopilados: ${records.length}`);
  console.log(`�️ Solo datos del visualizador (imágenes de galerías, covers, etc.)`);
  console.log(`💬 Los comentarios se manejan por auto-guardado separado`);
  
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
  let c = "revision";
  
  // Manejar tanto "diseño" como "diseno" (con y sin tilde)
  if (s.includes("diseño") || s.includes("diseno")) c = "diseno";
  else if (s.includes("cancelado")) c = "cancelado";
  else if (s.includes("completado")) c = "completado";
  
  console.log(`🏷️ createStatusTag: "${status}" → clase "${c}"`);
  return `<span class="status-tag ${c}">${status}</span>`;
}

// Funciones para guardar y restaurar estado de scroll y filtros
function saveInventoryViewState() {
  try {
    console.log('💾 Guardando estado del inventario...');
    
    const inventoryWrapper = document.querySelector('.inventory-table-wrapper');
    if (inventoryWrapper) {
      inventoryViewState.scrollPosition = inventoryWrapper.scrollTop;
      inventoryViewState.scrollPositionX = inventoryWrapper.scrollLeft;
      console.log('📍 Scroll guardado:', inventoryViewState.scrollPosition, inventoryViewState.scrollPositionX);
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
    let activeFilters = {};
    
    // Buscar elementos seleccionados usando las clases
    const selectedElements = document.querySelectorAll('.clickable-name.selected, .clickable-stat.selected');
    console.log('🔍 Elementos seleccionados encontrados:', selectedElements.length);
    
    if (selectedElements.length > 0) {
      // Si hay elementos seleccionados actualmente, usar esos
      selectedElements.forEach(element => {
        const user = element.dataset.user;
        const status = element.dataset.status;
        const type = element.dataset.type;
        
        console.log('💾 Guardando filtro activo actual:', { user, status, type, element: element.textContent });
        
        if (type === 'analyst') {
          activeFilters.analista = user;
          if (status) activeFilters.analistaStatus = status;
        } else if (type === 'designer') {
          activeFilters.diseñador = user;
          if (status) activeFilters.diseñadorStatus = status;
        }
      });
    } else if (inventoryViewState.activeFilters && Object.keys(inventoryViewState.activeFilters).length > 0) {
      // Si no hay elementos seleccionados pero había filtros previos, preservarlos
      activeFilters = { ...inventoryViewState.activeFilters };
      console.log('💾 Preservando filtros activos previos:', activeFilters);
    }
    
    inventoryViewState.activeFilters = activeFilters;
    console.log('📊 Filtros de tablas guardados:', activeFilters);
    
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
  try {
    const savedState = localStorage.getItem('inventoryViewState');
    if (savedState) {
      inventoryViewState = JSON.parse(savedState);
      
      // Restaurar scroll positions
      setTimeout(() => {
        const inventoryWrapper = document.querySelector('.inventory-table-wrapper');
        if (inventoryWrapper && inventoryViewState.scrollPosition > 0) {
          inventoryWrapper.scrollTop = inventoryViewState.scrollPosition;
        }
        if (inventoryWrapper && inventoryViewState.scrollPositionX > 0) {
          inventoryWrapper.scrollLeft = inventoryViewState.scrollPositionX;
        }
      }, 100);
      
      // Restaurar filtros dropdown
      setTimeout(() => {
        if (inventoryViewState.dropdownFilters) {
          console.log('🔧 Restaurando filtros dropdown:', inventoryViewState.dropdownFilters);
          
          const analistaFilter = document.getElementById('filterAnalista');
          const disenadorFilter = document.getElementById('filterDisenador');
          const statusFilter = document.getElementById('filterStatus');
          const tipoFilter = document.getElementById('filterTipo');
          
          if (analistaFilter && inventoryViewState.dropdownFilters.analista) {
            analistaFilter.value = inventoryViewState.dropdownFilters.analista;
            console.log('✅ Filtro Analista restaurado:', analistaFilter.value);
          }
          if (disenadorFilter && inventoryViewState.dropdownFilters.disenador) {
            disenadorFilter.value = inventoryViewState.dropdownFilters.disenador;
            console.log('✅ Filtro Diseñador restaurado:', disenadorFilter.value);
          }
          if (statusFilter && inventoryViewState.dropdownFilters.status) {
            statusFilter.value = inventoryViewState.dropdownFilters.status;
            console.log('✅ Filtro Status restaurado:', statusFilter.value);
          }
          if (tipoFilter && inventoryViewState.dropdownFilters.tipo) {
            tipoFilter.value = inventoryViewState.dropdownFilters.tipo;
            console.log('✅ Filtro Tipo restaurado:', tipoFilter.value);
          }
          
          // Aplicar los filtros después de restaurarlos SOLO SI HAY FILTROS
          const hasFilters = inventoryViewState.dropdownFilters.analista || 
                           inventoryViewState.dropdownFilters.disenador || 
                           inventoryViewState.dropdownFilters.status || 
                           inventoryViewState.dropdownFilters.tipo;
          
          if (hasFilters) {
            console.log('🔄 Aplicando filtros restaurados...');
            applyInventoryFilters();
          } else {
            console.log('ℹ️ No hay filtros activos, manteniendo tabla original');
          }
        } else if (inventoryViewState.dropdownFilters === null) {
          // Caso especial: filtros fueron limpiados explícitamente
          console.log('🧹 Los filtros fueron limpiados, asegurando que la tabla esté sin filtrar');
          // Limpiar cualquier filtro en los dropdowns
          const analistaFilter = document.getElementById('filterAnalista');
          const disenadorFilter = document.getElementById('filterDisenador');
          const statusFilter = document.getElementById('filterStatus');
          const tipoFilter = document.getElementById('filterTipo');
          
          if (analistaFilter) analistaFilter.value = '';
          if (disenadorFilter) disenadorFilter.value = '';
          if (statusFilter) statusFilter.value = '';
          if (tipoFilter) tipoFilter.value = '';
          
          // Asegurar que se muestre la tabla completa
          updateInventoryTableDirectly(originalInventoryData);
        } else {
          console.log('❌ No hay filtros dropdown para restaurar');
        }
      }, 150);
    }
  } catch (error) {
    console.error('Error restaurando estado:', error);
  }
}
