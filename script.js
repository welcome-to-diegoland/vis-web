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

// Función para cargar archivo desde SharePoint público
async function loadFromSharePoint() {
  const loadButton = document.getElementById('loadExcelBtn');
  const originalText = loadButton.innerHTML;
  
  try {
    // Mostrar estado de carga
    loadButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cargando';
    loadButton.disabled = true;
    
    console.log('🔄 Cargando archivo público desde SharePoint...');
    
    // URLs públicas de SharePoint para el archivo con permisos de "cualquiera con el enlace"
    const publicSharePointUrls = [
      // URL principal con download=1
      'https://traversmexico-my.sharepoint.com/:x:/g/personal/diego_medel_travers_com_mx/EROdt2NwWp5CvlNKmw8FiAwB_Dgag44EnFb5MDOriRXHNw?e=UFkZ25&download=1',
      // URL sin parámetros adicionales
      'https://traversmexico-my.sharepoint.com/:x:/g/personal/diego_medel_travers_com_mx/EROdt2NwWp5CvlNKmw8FiAwB_Dgag44EnFb5MDOriRXHNw?download=1',
      // URL directa de descarga
      'https://traversmexico-my.sharepoint.com/personal/diego_medel_travers_com_mx/_layouts/15/download.aspx?share=EROdt2NwWp5CvlNKmw8FiAwB_Dgag44EnFb5MDOriRXHNw'
    ];
    
    for (let i = 0; i < publicSharePointUrls.length; i++) {
      const url = publicSharePointUrls[i];
      console.log(`🔄 Intentando URL pública ${i + 1}/${publicSharePointUrls.length}...`);
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
          headers: {
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, */*'
          }
        });
        
        console.log(`📊 Respuesta URL ${i + 1}: Status ${response.status}, Content-Type: ${response.headers.get('content-type')}`);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          
          if (contentType && (
            contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
            contentType.includes('application/vnd.ms-excel') ||
            contentType.includes('application/octet-stream')
          )) {
            console.log('✅ Archivo Excel válido encontrado, descargando...');
            
            const arrayBuffer = await response.arrayBuffer();
            
            if (arrayBuffer.byteLength > 0) {
              console.log(`📁 Archivo descargado: ${arrayBuffer.byteLength} bytes`);
              
              // Usar la misma lógica que handleCombinedExcel
              const data = new Uint8Array(arrayBuffer);
              const workbook = XLSX.read(data, { type: "array" });
              
              // Procesar como si fuera un archivo cargado localmente
              processWorkbook(workbook);
              
              console.log('✅ Archivo cargado exitosamente desde SharePoint público');
              return;
            } else {
              console.log(`❌ URL ${i + 1}: Archivo vacío`);
            }
          } else {
            console.log(`❌ URL ${i + 1}: Tipo de contenido incorrecto: ${contentType}`);
          }
        } else {
          console.log(`❌ URL ${i + 1} falló: ${response.status} ${response.statusText}`);
        }
      } catch (urlError) {
        console.log(`❌ Error con URL ${i + 1}:`, urlError.message);
      }
    }
    
    throw new Error('No se pudo acceder al archivo público de SharePoint con ninguna de las URLs probadas');
    
  } catch (error) {
    console.error('❌ Error cargando desde SharePoint público:', error);
    
    const helpMessage = `❌ No se pudo cargar automáticamente desde SharePoint.

🔧 VERIFICACIONES NECESARIAS:

1️⃣ PERMISOS DEL ARCHIVO:
   • Abre el archivo en SharePoint
   • Clic en "Compartir" → "Cualquiera con el enlace puede ver"
   • Copia el enlace público generado

2️⃣ URL CORRECTA:
   • El enlace debe terminar con ?download=1
   • Ejemplo: ...archivo.xlsx?download=1

3️⃣ PRUEBA MANUAL:
   • Abre el enlace en una pestaña privada
   • Debe descargar automáticamente sin login

Error técnico: ${error.message}

¿Quieres cargar un archivo local mientras verificas los permisos?`;
    
    const useLocalFile = confirm(helpMessage);
    
    if (useLocalFile) {
      document.getElementById('combinedFile')?.click();
    }
  } finally {
    loadButton.innerHTML = originalText;
    loadButton.disabled = false;
  }
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
        alert("No se encontró la hoja VIS_AG_Library_Structure.");
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
      alert("Ocurrió un error procesando el archivo combinado: " + error.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// Función para reinicializar el contenido de los boxes después de cargar Excel
function reinitializeBoxContents() {
  // Reinicializar Box 3 con el sistema de galerías
  initializeGallerySystem();
  
  // Si hay datos de galerías, poblar el dropdown
  if (currentAssetGroups && currentAssetGroups.length > 0) {
    setTimeout(() => {
      populateGalleryDropdown(currentAssetGroups);
    }, 100);
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
      Carga un archivo Excel para ver el árbol de categorías
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

// Función para cargar la retícula de imágenes en box4
function loadImageGridInBox4(itemGroupPath) {
  // Buscar el Item Group actual
  const itemGroup = currentWorkingData.find(item => {
    return item['Object Type'] === 'Item Group' && item.NamePath === itemGroupPath;
  });

  // IMPORTANTE: Guardar el Item Group actual globalmente para otras funciones
  currentItemGroup = itemGroup;
  
  console.log(`🎯 ITEM GROUP SELECCIONADO: ${itemGroup ? itemGroup['Name'] : 'null'}`);
  console.log(`📝 Item Group ID: ${itemGroup ? itemGroup['Id'] : 'null'}`);

  // Buscar todos los Item Codes que pertenecen a este Item Group
  const itemCodes = currentWorkingData.filter(item => {
    return item['Object Type'] === 'Item Code' && item.NamePath.startsWith(itemGroupPath + '/');
  });
  
  console.log(`📦 ITEM CODES ENCONTRADOS: ${itemCodes.length} items`);
  itemCodes.forEach(code => {
    console.log(`   - ${code['Id']} (${code['Name']})`);
  });

  if (itemCodes.length === 0) {
    addContentToBox4('<div class="p-3"><p>No se encontraron Item Codes para este grupo.</p></div>');
    return;
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
  const gridHtml = createImageGrid(itemCodes, imageColumns, itemGroup);
  
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
  
  // Debug: verificar los indicadores de aprobación en el grid
  setTimeout(() => {
    // Lógica sin debug logs
  }, 100);
  
  // INICIALIZAR VARIABLES CSS INMEDIATAMENTE para evitar glitch visual
  const container = document.querySelector('.main-container');
  if (container) {
    // Calcular valores usando el zoom persistente global
    const imageSize = Math.round(80 * globalZoomScale);
    container.style.setProperty('--image-size', imageSize + 'px');  // Usar zoom persistente
    
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
    container.style.setProperty('--font-scale', fontScale);  // Usar zoom persistente
  }
  
  // Configurar controles de zoom y sincronización después de que se agregue al DOM
  // Usar un setTimeout más largo para asegurar que el DOM esté listo
  setTimeout(() => {
    setupZoomControls();
    setupScrollSynchronization();
    setupImageSystemEventListeners(); // Agregar sistema de imágenes
    setupItemGroupDeleteButton(); // Configurar botón de basura del Item Group
  setupItemGroupImageClick(); // Configurar click en imagen del Item Group
  }, 500);
  
  // Intentar de nuevo la sincronización después de un delay más largo
  setTimeout(() => {
    setupScrollSynchronization();
  }, 1500);
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
                <span class="group-id">${itemGroup ? (itemGroup['Id'] || itemGroup['ID'] || 'Sin ID') : ''}</span>
                <span class="group-cms">${itemGroup ? (itemGroup['CMS'] || 'Sin CMS') : ''}</span>
                <span class="group-items">${itemCodes.length} items</span>
              </div>
            </div>
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
          ${imageName ? generateImageCell(imageName, row.itemCode.Name) : generateEmptyImageCell()}
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
function generateImageCell(imageName, itemCode) {
  const hasComments = hasImageComments(imageName);
  
  return `
    <div class="image-thumbnail-container">
      <img src="https://www.travers.com.mx/media/catalog/product/agility/img/${imageName}" 
           alt="${imageName}" class="image-thumbnail" 
           onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ci8+CjxwYXRoIGQ9Ik0xMiAxNkwyOCAyNE0yOCAxNkwxMiAyNCIgc3Ryb2tlPSIjOUM5Qzk5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K'; this.title='Imagen no encontrada: ${imageName}';">
      <div class="image-controls">
        <button class="btn-remove" title="Quitar imagen">🗑️</button>
      </div>
      ${hasComments ? `<div class="comment-bubble image-comment" data-image="${imageName}" onclick="handleImageCommentClick(event, '${imageName}')" title="Ver comentarios">💬</div>` : ''}
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

  // Event listener para detectar teclas presionadas (modo visual)
  document.addEventListener('keydown', function(event) {
    // Cerrar modal con tecla Escape
    if (event.key === 'Escape') {
      const modal = document.getElementById('commentModal');
      if (modal && modal.classList.contains('show')) {
        closeCommentModal();
      }
    }
    
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
      fechaHora: new Date().toISOString().slice(0, 19).replace('T', ' '),
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
    updateCommentBubbles(type, contextForData, imageName);
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
      fechaHora: new Date().toISOString().slice(0, 19).replace('T', ' '),
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
    
    // Resetear el dropdown
    this.value = '';
    
    // Actualizar burbujas de comentarios en la UI
    updateCommentBubbles(type, contextForData, imageName);
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
  // Crear el string del nuevo comentario en formato Excel
  const newCommentString = `${newComment.usuario}¦${newComment.fechaHora}¦${newComment.tipoComentario}¦${newComment.textoComentario}¦${newComment.status}`;
  
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
    updateCommentBubbles('image', imageName, null);
    return;
  }
  
  // Encontrar el elemento correspondiente en los datos
  // Esto depende del contexto (Item Code o Item Group)
  const modal = document.getElementById('commentModal');
  const isGroupComment = modal.querySelector('.modal-title').textContent.includes('Item Group');
  
  if (isGroupComment && currentItemGroup) {
    // Es un comentario de Item Group
    const existingComments = currentItemGroup['WA_VIS_Comment'] || '';
    currentItemGroup['WA_VIS_Comment'] = existingComments ? existingComments + '¶' + newCommentString : newCommentString;
    
    // Actualizar también en currentWorkingData
    const itemGroupIndex = currentWorkingData.findIndex(item => 
      item['Object Type'] === 'Item Group' && 
      item.NamePath === currentItemGroup.NamePath
    );
    
    if (itemGroupIndex !== -1) {
      currentWorkingData[itemGroupIndex]['WA_VIS_Comment'] = currentItemGroup['WA_VIS_Comment'];
    }
  } else {
    // Es un comentario de Item Code
    const itemCodeData = currentWorkingData.find(item => 
      item['Object Type'] === 'Item Code' && 
      (item.Name === context || item['Item Code'] === context)
    );
    
    if (itemCodeData) {
      const existingComments = itemCodeData['WA_VIS_Comment'] || '';
      itemCodeData['WA_VIS_Comment'] = existingComments ? existingComments + '¶' + newCommentString : newCommentString;
    }
  }
  
  console.log('Comentario agregado:', newComment);
  
  // Marcar Item Group como modificado automáticamente
  markItemGroupAsModified();
  
  // Actualizar burbujas visualmente después de agregar comentario
  if (isGroupComment) {
    updateCommentBubbles('group', context, imageName);
  } else {
    updateCommentBubbles('item', context, imageName);
  }
}

// Función para actualizar las burbujas después de agregar un comentario
function updateCommentBubbles(type, context, imageName = null) {
  console.log('updateCommentBubbles llamada con:', { type, context, imageName });
  
  if (type === 'image') {
    // Para imágenes, el context es realmente el imageName
    const realImageName = context;
    
    // Obtener el status actual de la imagen
    const imageComments = getImageComments(realImageName);
    const currentStatus = getCurrentStatus(imageComments);
    
    // Buscar la imagen en el grid y actualizar/agregar burbuja
    const imageThumbnails = document.querySelectorAll('.image-thumbnail');
    imageThumbnails.forEach(img => {
      if (img.alt === realImageName) {
        const container = img.closest('.image-thumbnail-container');
        if (container) {
          let bubble = container.querySelector('.comment-bubble.image-comment');
          if (bubble) {
            // Ya tenía burbuja, actualizar color según status
            bubble.setAttribute('data-status', currentStatus);
          } else {
            // No tenía burbuja, crear nueva
            const newBubble = document.createElement('div');
            newBubble.className = 'comment-bubble image-comment';
            newBubble.setAttribute('data-image', realImageName);
            newBubble.setAttribute('data-status', currentStatus);
            newBubble.setAttribute('onclick', `handleImageCommentClick(event, '${realImageName}')`);
            newBubble.setAttribute('title', 'Ver comentarios');
            newBubble.textContent = '💬';
            container.appendChild(newBubble);
          }
        }
      }
    });
  } else {
    // Para Item Codes e Item Groups
    if (type === 'group') {
      // Actualizar burbuja del Item Group
      console.log('Actualizando burbuja de Item Group');
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
  
  // Agregar listener para cerrar con Escape
  const escapeHandler = function(event) {
    if (event.key === 'Escape') {
      closeImagePreviewModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
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

// Función para manejar la asignación de imagen (Cmd+Click en Mac / Ctrl+Click en Windows)
function handleImageAssignment(event, imageCell) {
  event.preventDefault();
  
  if (!imageCell) return;
  
  const targetItemCode = imageCell.getAttribute('data-item-code');
  const targetSection = imageCell.getAttribute('data-section');
  const targetRowIndex = parseInt(imageCell.getAttribute('data-row-index'));
  const targetColIndex = parseInt(imageCell.getAttribute('data-col-index'));
  
  console.log('Cmd+Click en celda:', {targetItemCode, targetSection, targetRowIndex, targetColIndex});
  console.log('Imagen de trabajo actual:', workingImage);
  
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
  
  // Actualizar sincronización
  updateCurrentWorkingDataWithGridState();
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
    // Actualizar currentWorkingData
    updateCurrentWorkingDataWithGridState();
  } else {
    // Si es de diferente Item Code, solo quitar
    console.log('Quitando imagen de diferente Item Code');
    removeImageFromGrid(targetRowIndex, targetColIndex, targetSection);
    // Marcar Item Group como modificado automáticamente
    markItemGroupAsModified();
    // Actualizar currentWorkingData
    updateCurrentWorkingDataWithGridState();
  }
  
  // Recorrer imágenes hacia la izquierda para llenar el espacio vacío
  shiftImagesLeft(targetRowIndex, targetColIndex, targetSection);
}

// Función para asignar la imagen de trabajo
function handleAssignImage(imageCell, targetItemCode, targetSection, targetRowIndex, targetColIndex) {
  // Verificar si la imagen ya existe en este Item Code (misma fila)
  const existingPosition = findImageInItemCode(workingImage.imageName, targetItemCode);
  
  // Solo quitar de posición original si NO es la misma posición donde se está asignando
  if (existingPosition && 
      !(existingPosition.row === targetRowIndex && 
        existingPosition.col === targetColIndex && 
        existingPosition.section === targetSection)) {
    
    console.log('Imagen duplicada encontrada en diferente posición, quitando de posición original...');
    // Quitar de posición original con compactación automática
    const itemCode = imageCell.getAttribute('data-item-code');
    removeImageFromGrid(existingPosition.row, existingPosition.col, existingPosition.section, true);
  } else if (existingPosition && 
             existingPosition.row === targetRowIndex && 
             existingPosition.col === targetColIndex && 
             existingPosition.section === targetSection) {
    
    console.log('🔄 Imagen ya está en esta posición, no se hace nada');
    return; // No hacer nada si es la misma posición
  }
  
  // Insertar imagen en la nueva posición
  insertImageInGrid(workingImage.imageName, targetRowIndex, targetColIndex, targetSection);
  
  // Marcar Item Group como modificado automáticamente
  markItemGroupAsModified();
  
  console.log('Imagen asignada exitosamente');
  
  // Actualizar currentWorkingData con el nuevo estado
  updateCurrentWorkingDataWithGridState();
}

// Función para actualizar currentWorkingData con el estado actual de las imágenes
function updateCurrentWorkingDataWithGridState() {
  console.log('🔄 DEBUG updateCurrentWorkingDataWithGridState iniciando...');
  
  if (!currentWorkingData) {
    console.log('❌ currentWorkingData no existe');
    return;
  }
  
  if (!currentItemGroup) {
    console.log('❌ currentItemGroup no existe');
    return;
  }
  
  console.log('🔄 Actualizando currentWorkingData con cambios de imágenes...');
  console.log('📋 currentItemGroup:', currentItemGroup.Name, 'NamePath:', currentItemGroup.NamePath);
  
  // Encontrar todos los Item Codes del Item Group actual
  const itemCodesInGroup = currentWorkingData.filter(row => 
    row['Object Type'] === 'Item Code' && 
    row.NamePath && 
    row.NamePath.startsWith(currentItemGroup.NamePath + '/')
  );
  
  console.log(`📋 Item Codes en el grupo: ${itemCodesInGroup.length}`, itemCodesInGroup.map(r => r.Name));
  
  // Para cada Item Code, leer las imágenes de la grilla y actualizar currentWorkingData
  itemCodesInGroup.forEach(itemCodeRow => {
    const itemCode = itemCodeRow['Item Code'] || itemCodeRow.Name;
    console.log(`🔍 Procesando Item Code: ${itemCode}`);
    
    // DEBUG: Mostrar qué datos tiene actualmente este Item Code
    const imageColumns = Object.keys(itemCodeRow).filter(key => 
      key.includes('WA_Cover') || key.includes('WA_Gallery') || key.includes('WA_Rest')
    ).filter(key => itemCodeRow[key]);
    console.log(`🔍 DEBUG: ${itemCode} tiene imágenes en:`, imageColumns);
    imageColumns.forEach(col => {
      console.log(`🔍 DEBUG: ${itemCode}.${col} = "${itemCodeRow[col]}"`);
    });
    
    // Buscar la fila del Item Code en la grilla (la fila completa, no solo la celda del nombre)
    let itemCodeGridRow = document.querySelector(`.table-row:has([data-item-code="${itemCode}"])`);
    
    // Fallback si :has() no está soportado
    if (!itemCodeGridRow) {
      const allRows = document.querySelectorAll('.table-row');
      itemCodeGridRow = Array.from(allRows).find(row => 
        row.querySelector(`[data-item-code="${itemCode}"]`)
      );
    }
    
    if (itemCodeGridRow) {
      console.log(`✅ Fila encontrada en grilla para: ${itemCode}`);
      console.log(`🔍 DEBUG: HTML de la fila:`, itemCodeGridRow.outerHTML.substring(0, 200) + '...');
      
      // CORRECCIÓN: Buscar las celdas de imagen por data-item-code, no dentro de la fila del item code
      const allImageCellsForItem = document.querySelectorAll(`.image-cell[data-item-code="${itemCode}"]`);
      console.log(`🔍 DEBUG: Total celdas de imagen para ${itemCode}:`, allImageCellsForItem.length);
      
      // Leer las imágenes de cada sección con los nombres correctos de columnas
      const sections = {
        'cov': { prefix: 'WA_Cover_Image_', count: 5 },
        'gallery': { prefix: 'WA_Gallery_', count: 22 },
        'rest': { prefix: 'WA_Rest_', count: 25 }
      };
      
      console.log(`🔍 DEBUG: Sections a procesar para ${itemCode}:`, Object.keys(sections));
      
      Object.keys(sections).forEach(section => {
        // Buscar las celdas de imagen para esta sección y este item code
        const selector = `.image-cell[data-item-code="${itemCode}"][data-section="${section}"]`;
        console.log(`🔍 DEBUG: Buscando con selector: "${selector}"`);
        const imageCells = document.querySelectorAll(selector);
        console.log(`🔍 DEBUG: Section ${section} encontrada: ${imageCells.length} celdas`);
        
        if (imageCells.length > 0) {
          imageCells.forEach((cell, index) => {
            const img = cell.querySelector('.image-thumbnail');
            const imageName = img && !img.src.includes('data:image/svg+xml') 
              ? img.alt || '' 
              : '';
            
            // Actualizar en currentWorkingData usando los nombres correctos
            const columnName = `${sections[section].prefix}${String(index + 1).padStart(2, '0')}`;
            const oldValue = itemCodeRow[columnName];
            
            // Log detallado para debug
            console.log(`🔍 ${itemCode}.${columnName}: Grilla="${imageName}" | CurrentData="${oldValue}"`);
            
            if (itemCodeRow[columnName] !== undefined) {
              itemCodeRow[columnName] = imageName;
              
              if (oldValue !== imageName) {
                console.log(`📝 CAMBIO DETECTADO ${itemCode}.${columnName}: "${oldValue}" → "${imageName}"`);
              }
            } else {
              console.log(`⚠️ Columna no encontrada: ${columnName} en ${itemCode}`);
              if (index === 0) {
                console.log(`📋 Columnas disponibles en ${itemCode}:`, Object.keys(itemCodeRow).filter(key => key.includes('WA_')));
              }
            }
          });
        } else {
          console.log(`❌ No se encontraron celdas para sección ${section} en ${itemCode}`);
        }
      });
      
      console.log(`✅ Actualizado Item Code: ${itemCode} con imágenes actuales`);
    } else {
      console.log(`❌ No se encontró fila en grilla para: ${itemCode}`);
    }
  });
  
  console.log('✅ updateCurrentWorkingDataWithGridState completado');
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
  const box3Content = document.getElementById('box3-content');
  if (!box3Content) return;

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
        <option value="">Galerías...</option>
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
      Selecciona una galería para ver las imágenes
    </div>
  `;
  galleryList.appendChild(galleryGrid);

  // Si ya hay datos de galerías cargados, poblar el dropdown
  if (currentAssetGroups && currentAssetGroups.length > 0) {
    populateGalleryDropdown(currentAssetGroups);
  }

  // Event listener para el dropdown
  const gallerySelect = document.getElementById('gallerySelect');
  gallerySelect.addEventListener('change', function() {
    const selectedGallery = this.value;
    if (selectedGallery) {
      // Limpiar búsqueda cuando se selecciona una galería
      const searchInput = document.getElementById('imageSearchInput');
      if (searchInput) searchInput.value = '';
      
      loadGalleryImages(selectedGallery);
    } else {
      clearGalleryGrid();
    }
  });

  // Event listeners para la búsqueda
  const searchInput = document.getElementById('imageSearchInput');
  const searchButton = document.getElementById('imageSearchButton');
  
  if (searchButton) {
    searchButton.addEventListener('click', performImageSearch);
  }
  
  if (searchInput) {
    searchInput.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        performImageSearch();
      }
    });
  }
}

// Función para realizar búsqueda de imágenes
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
  
  // Buscar en currentAssetComments (VIS_AG_Asset_Structure completo)
  if (!currentAssetComments || currentAssetComments.length === 0) {
    console.log('❌ No hay datos de VIS_AG_Asset_Structure cargados para buscar');
    showSearchResults([]);
    return;
  }
  
  console.log('🔍 Buscando:', searchTerm, 'en', currentAssetComments.length, 'registros de VIS_AG_Asset_Structure');
  
  // Filtrar imágenes que contengan el término de búsqueda en el nombre
  const searchResults = currentAssetComments.filter(asset => {
    const imageName = asset.Name || '';
    return imageName.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  console.log('📸 Resultados de búsqueda:', searchResults.length, 'imágenes encontradas');
  
  // Mostrar resultados
  showSearchResults(searchResults);
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
  const formattedResults = results.map(asset => ({
    Imagen: asset.Name
  }));
  
  console.log('🎨 Renderizando', formattedResults.length, 'resultados de búsqueda');
  renderGalleryGrid(formattedResults);
}

// Función para poblar el dropdown con las galerías
function populateGalleryDropdown(data) {
  const gallerySelect = document.getElementById('gallerySelect');
  if (!gallerySelect) {
    console.error('❌ No se encontró el elemento gallerySelect');
    return;
  }
  
  console.log('🔄 Poblando dropdown de galerías...');
  
  // Obtener galerías únicas - probando diferentes variaciones de nombre de columna
  const galleries = [];
  
  data.forEach(item => {
    const galleryName = item.Galeria || item.galeria || item.GALERIA || item['Galeria'] || '';
    if (galleryName && galleryName.trim() && !galleries.includes(galleryName)) {
      galleries.push(galleryName.trim());
    }
  });
  
  console.log('🎯 Galerías únicas encontradas:', galleries);
  
  // Limpiar opciones existentes (excepto la primera)
  gallerySelect.innerHTML = '<option value="">Galerías...</option>';
  
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
  // GUARDAR ESTADO ANTES DE CAMBIAR VISTA
  saveInventoryViewState();
  
  isCleanViewActive = !isCleanViewActive;
  const toggleButton = document.getElementById('cleanViewToggle');
  
  if (isCleanViewActive) {
    // Activar vista limpia - limpiar todos los boxes
    clearAllBoxes();
    toggleButton.innerHTML = '<i class="fa-solid fa-eye"></i> Datos';
    toggleButton.className = 'btn btn-warning btn-compact';
    console.log('Vista limpia activada');
  } else {
    // Restaurar vista normal - mostrar árbol/inventario
    restoreNormalView();
    toggleButton.innerHTML = '<i class="fa-solid fa-eye"></i> Visualizador';
    toggleButton.className = 'btn btn-secondary btn-compact';
    console.log('Vista normal restaurada');
  }
}

// Función para limpiar todos los boxes
function clearAllBoxes() {
  // Limpiar Box 1 (Árbol)
  const treeContainer = document.getElementById('tree');
  if (treeContainer) {
    treeContainer.innerHTML = '<div class="empty-box-message">Box 1 - Árbol (Vacío)</div>';
  }
  
  // Limpiar Box 3 (Galerías)
  const box3Content = document.getElementById('box3-content');
  if (box3Content) {
    box3Content.innerHTML = '<div class="empty-box-message">Box 3 - Galerías (Vacío)</div>';
  }
  
  // Crear tabla de inventario de imágenes en Box 4
  const box4Content = document.getElementById('box4-content');
  if (box4Content) {
    if (currentWorkingData && currentWorkingData.length > 0) {
      box4Content.innerHTML = generateImageInventoryTable();
      // Restaurar estado después de generar la tabla
      setTimeout(() => {
        restoreInventoryViewState();
      }, 200);
    } else {
      box4Content.innerHTML = '<div class="empty-box-message">Box 4 - Cargar Excel para ver inventario de imágenes</div>';
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
  if (!currentWorkingData || currentWorkingData.length === 0) {
    return '<div class="empty-box-message">No hay datos para mostrar</div>';
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

  // Función para parsear comentarios estructurados
  function parseComment(commentText) {
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
      // Dividir por ¶ para separar analista y diseñador
      const sections = commentText.split('¶');
      
      let allEntries = [];
      
      // Procesar cada sección (analista y diseñador)
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
              status: fields[4].trim()
            };
            allEntries.push(entry);
          }
        }
      });

      if (allEntries.length === 0) {
        return result;
      }

      // Separar analistas y diseñadores basado en las secciones originales
      let analistas = [];
      let diseñadores = [];
      
      if (sections.length >= 1 && sections[0].trim()) {
        // Primera sección es analista
        const fields = sections[0].split('¦');
        if (fields.length >= 5) {
          analistas.push({
            usuario: fields[0].trim(),
            fecha: fields[1].trim(),
            tipo: fields[2].trim(),
            comentario: fields[3].trim(),
            status: fields[4].trim()
          });
        }
      }
      
      if (sections.length >= 2 && sections[1].trim()) {
        // Segunda sección es diseñador
        const fields = sections[1].split('¦');
        if (fields.length >= 5) {
          diseñadores.push({
            usuario: fields[0].trim(),
            fecha: fields[1].trim(),
            tipo: fields[2].trim(),
            comentario: fields[3].trim(),
            status: fields[4].trim()
          });
        }
      }

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

      // Determinar último tipo y status (del más reciente entre todos)
      if (allEntries.length > 0) {
        // Ordenar por fecha para encontrar el más reciente
        const sortedEntries = allEntries.sort((a, b) => {
          const dateA = new Date(a.fecha);
          const dateB = new Date(b.fecha);
          return dateB - dateA; // Más reciente primero
        });
        
        result.ultimoTipo = sortedEntries[0].tipo;
        result.ultimoStatus = sortedEntries[0].status;
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
              campo: column,
              imagen: imageValue.trim(),
              analista: parsedComment.analista,
              primeraFechaAnalista: parsedComment.primeraFechaAnalista,
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
          <td class="inventory-cell">${escapeHtml(rowData.name)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.id)}</td>
          <td class="inventory-cell inventory-item-group">${escapeHtml(rowData.itemGroupId)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.objectType)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.cms)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.marca)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.titulo)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.importancia)}</td>
          <td class="inventory-cell inventory-field">${escapeHtml(rowData.campo)}</td>
          <td class="inventory-cell inventory-image-empty">${escapeHtml(rowData.imagen)}</td>
          <td class="inventory-cell inventory-analyst">${escapeHtml(rowData.analista)}</td>
          <td class="inventory-cell inventory-date">${escapeHtml(rowData.primeraFechaAnalista)}</td>
          <td class="inventory-cell inventory-comment-text clickable-comment" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="${rowData.commentType}" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista)}</td>
          <td class="inventory-cell inventory-designer">${escapeHtml(rowData.diseñador)}</td>
          <td class="inventory-cell inventory-date">${escapeHtml(rowData.ultimaFechaDisenador)}</td>
          <td class="inventory-cell inventory-comment-text clickable-comment" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="${rowData.commentType}" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador)}</td>
          <td class="inventory-cell inventory-type clickable-comment" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="${rowData.commentType}" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo)}</td>
          <td class="inventory-cell inventory-status clickable-status" data-item-group-id="${escapeHtml(rowData.itemGroupId)}" title="Click para navegar al Item Group">${createStatusTag(rowData.ultimoStatus)}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="analista-clean" title="Click para ver historial completo">${escapeHtml(rowData.analista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="analista-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="diseñador-clean" title="Click para ver historial completo">${escapeHtml(rowData.diseñador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="diseñador-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="tipo-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo || '')}</td>
          <td class="inventory-cell-clean clickable-status-clean" data-item-group-id="${escapeHtml(rowData.itemGroupId)}" title="Click para navegar al Item Group">${createStatusTag(rowData.ultimoStatus)}</td>
        </tr>
      `;
    } else {
      return `
        <tr class="inventory-row inventory-image-comment" data-original-row="${rowData.originalRowIndex}">
          <td class="inventory-cell">${rowData.rowNumber}</td>
          <td class="inventory-cell">${escapeHtml(rowData.name)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.id)}</td>
          <td class="inventory-cell inventory-item-group">${escapeHtml(rowData.itemGroupId)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.objectType)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.cms)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.marca)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.titulo)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.importancia)}</td>
          <td class="inventory-cell inventory-field">${escapeHtml(rowData.campo)}</td>
          <td class="inventory-cell inventory-image">${escapeHtml(rowData.imagen)}</td>
          <td class="inventory-cell inventory-analyst">${escapeHtml(rowData.analista)}</td>
          <td class="inventory-cell inventory-date">${escapeHtml(rowData.primeraFechaAnalista)}</td>
          <td class="inventory-cell inventory-comment-text clickable-comment" data-image-name="${rowData.imageName}" data-comment-type="${rowData.commentType}" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista)}</td>
          <td class="inventory-cell inventory-designer">${escapeHtml(rowData.diseñador)}</td>
          <td class="inventory-cell inventory-date">${escapeHtml(rowData.ultimaFechaDisenador)}</td>
          <td class="inventory-cell inventory-comment-text clickable-comment" data-image-name="${rowData.imageName}" data-comment-type="${rowData.commentType}" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador)}</td>
          <td class="inventory-cell inventory-type clickable-comment" data-image-name="${rowData.imageName}" data-comment-type="${rowData.commentType}" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo)}</td>
          <td class="inventory-cell inventory-status clickable-status" data-item-group-id="${escapeHtml(rowData.itemGroupId)}" title="Click para navegar al Item Group">${createStatusTag(rowData.ultimoStatus)}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="analista-clean" title="Click para ver historial completo">${escapeHtml(rowData.analista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="analista-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="diseñador-clean" title="Click para ver historial completo">${escapeHtml(rowData.diseñador || '')}</td>
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
              <th class="inventory-header-cell">Nombre</th>
              <th class="inventory-header-cell">Id</th>
              <th class="inventory-header-cell">Item Group</th>
              <th class="inventory-header-cell">Object Type</th>
              <th class="inventory-header-cell">CMS</th>
              <th class="inventory-header-cell">Marca</th>
              <th class="inventory-header-cell">Título</th>
              <th class="inventory-header-cell">Imp</th>
              <th class="inventory-header-cell">Campo</th>
              <th class="inventory-header-cell">Imagen</th>
              <th class="inventory-header-cell">Analista</th>
              <th class="inventory-header-cell">Primera Fecha</th>
              <th class="inventory-header-cell">Último Comentario Analista</th>
              <th class="inventory-header-cell">Diseñador</th>
              <th class="inventory-header-cell">Fecha Diseñador</th>
              <th class="inventory-header-cell">Último Comentario Diseñador</th>
              <th class="inventory-header-cell">Tipo</th>
              <th class="inventory-header-cell">Status</th>
              <!-- NUEVAS COLUMNAS SIN ESTILOS PROBLEMÁTICOS -->
              <th class="inventory-header-cell">Analista Clean</th>
              <th class="inventory-header-cell">Comentario Analista Clean</th>
              <th class="inventory-header-cell">Diseñador Clean</th>
              <th class="inventory-header-cell">Comentario Diseñador Clean</th>
              <th class="inventory-header-cell">Tipo Clean</th>
              <th class="inventory-header-cell">Status Clean</th>
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

  // Guardar datos originales para filtros
  originalInventoryData = [...tableRowsData];

  // Actualizar las tablas de estadísticas
  setTimeout(() => {
    updateStatsTablesOnDataChange();
  }, 200);

  return inventoryHTML;
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
        // Para comentarios de imagen - usar el comentario original completo
        const originalComment = getOriginalImageComment(imageName);
        const modalTitle = `Historial de Comentarios - Imagen: ${imageName}`;
        
        console.log('📸 Abriendo modal de imagen:', { imageName, originalComment });
        openCommentModal(modalTitle, imageName, originalComment, 'image', imageName);
        
      } else if ((commentType === 'item' || commentType === 'diseñador' || commentType === 'analista' || commentType === 'tipo') && itemName && itemId) {
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
          <td class="inventory-cell">${escapeHtml(rowData.name)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.id)}</td>
          <td class="inventory-cell inventory-item-group">${escapeHtml(rowData.itemGroupId)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.objectType)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.cms)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.marca)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.titulo)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.importancia)}</td>
          <td class="inventory-cell inventory-field">${escapeHtml(rowData.campo)}</td>
          <td class="inventory-cell inventory-image-empty">${escapeHtml(rowData.imagen)}</td>
          <td class="inventory-cell inventory-analyst">${escapeHtml(rowData.analista)}</td>
          <td class="inventory-cell inventory-date">${escapeHtml(rowData.primeraFechaAnalista)}</td>
          <td class="inventory-cell inventory-comment-text clickable-comment" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="${rowData.commentType}" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista)}</td>
          <td class="inventory-cell inventory-designer">${escapeHtml(rowData.diseñador)}</td>
          <td class="inventory-cell inventory-date">${escapeHtml(rowData.ultimaFechaDisenador)}</td>
          <td class="inventory-cell inventory-comment-text clickable-comment" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="${rowData.commentType}" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador)}</td>
          <td class="inventory-cell inventory-type clickable-comment" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="${rowData.commentType}" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo)}</td>
          <td class="inventory-cell inventory-status clickable-status" data-item-group-id="${escapeHtml(rowData.itemGroupId)}" title="Click para navegar al Item Group">${createStatusTag(rowData.ultimoStatus)}</td>
          <!-- NUEVAS CELDAS SIN ESTILOS PROBLEMÁTICOS - CASO 1 REGENERATE -->
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="analista-clean" title="Click para ver historial completo">${escapeHtml(rowData.analista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="analista-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="diseñador-clean" title="Click para ver historial completo">${escapeHtml(rowData.diseñador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="diseñador-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-item-name="${rowData.itemName}" data-item-id="${rowData.itemId}" data-comment-type="tipo-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo || '')}</td>
          <td class="inventory-cell-clean clickable-status-clean" data-item-group-id="${escapeHtml(rowData.itemGroupId)}" title="Click para navegar al Item Group">${createStatusTag(rowData.ultimoStatus)}</td>
        </tr>
      `;
    } else {
      return `
        <tr class="inventory-row inventory-image-comment" data-original-row="${rowData.originalRowIndex}">
          <td class="inventory-cell">${rowData.rowNumber}</td>
          <td class="inventory-cell">${escapeHtml(rowData.name)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.id)}</td>
          <td class="inventory-cell inventory-item-group">${escapeHtml(rowData.itemGroupId)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.objectType)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.cms)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.marca)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.titulo)}</td>
          <td class="inventory-cell">${escapeHtml(rowData.importancia)}</td>
          <td class="inventory-cell inventory-field">${escapeHtml(rowData.campo)}</td>
          <td class="inventory-cell inventory-image">${escapeHtml(rowData.imagen)}</td>
          <td class="inventory-cell inventory-analyst">${escapeHtml(rowData.analista)}</td>
          <td class="inventory-cell inventory-date">${escapeHtml(rowData.primeraFechaAnalista)}</td>
          <td class="inventory-cell inventory-comment-text clickable-comment" data-image-name="${rowData.imageName}" data-comment-type="${rowData.commentType}" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista)}</td>
          <td class="inventory-cell inventory-designer">${escapeHtml(rowData.diseñador)}</td>
          <td class="inventory-cell inventory-date">${escapeHtml(rowData.ultimaFechaDisenador)}</td>
          <td class="inventory-cell inventory-comment-text clickable-comment" data-image-name="${rowData.imageName}" data-comment-type="${rowData.commentType}" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador)}</td>
          <td class="inventory-cell inventory-type clickable-comment" data-image-name="${rowData.imageName}" data-comment-type="${rowData.commentType}" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo)}</td>
          <td class="inventory-cell inventory-status">SIMPLE_STATUS_TEST</td>
          <td class="inventory-cell inventory-status">SIMPLE_STATUS_TEST</td>
          <!-- NUEVAS CELDAS SIN ESTILOS PROBLEMÁTICOS - CASO 2 REGENERATE -->
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="analista-clean" title="Click para ver historial completo">${escapeHtml(rowData.analista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="analista-comment-clean" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista || '')}</td>
          <td class="inventory-cell-clean clickable-comment-clean" data-image-name="${rowData.imageName}" data-comment-type="diseñador-clean" title="Click para ver historial completo">${escapeHtml(rowData.diseñador || '')}</td>
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
  const totalComments = originalInventoryData.length;
  const unassignedComments = originalInventoryData.filter(row => !row.diseñador || row.diseñador.trim() === '').length;
  
  const unassignedCountElement = document.getElementById('unassignedCount');
  unassignedCountElement.innerHTML = `Total de comentarios: <strong>${totalComments}</strong> | Sin asignar: <strong>${unassignedComments}</strong>`;
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
          <input type="checkbox" checked onchange="toggleDesignerExclusion('${designer}', this.checked)">
          Incluir
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
               onchange="updateAssignmentInput('${designer}', this.value)">
      </div>
    `;
    
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
};

window.updateAssignmentInput = function(designer, value) {
  // Validación básica del input
  if (value < 0) {
    document.getElementById(`assignment-${designer}`).value = 0;
  }
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

window.distributeRemaining = function() {
  const designers = getActiveDesigners();
  const unassignedComments = originalInventoryData.filter(row => !row.diseñador || row.diseñador.trim() === '');
  
  if (designers.length === 0) {
    alert('No hay diseñadoras activas seleccionadas para la distribución.');
    return;
  }
  
  // Calcular cuántos comentarios ya están planificados para asignar
  let plannedAssignments = 0;
  designers.forEach(designer => {
    const inputValue = parseInt(document.getElementById(`assignment-${designer}`).value) || 0;
    plannedAssignments += inputValue;
  });
  
  const remainingToDistribute = unassignedComments.length - plannedAssignments;
  
  if (remainingToDistribute <= 0) {
    alert('No hay comentarios restantes para distribuir.');
    return;
  }
  
  const additionalPerDesigner = Math.floor(remainingToDistribute / designers.length);
  const finalRemainder = remainingToDistribute % designers.length;
  
  // Agregar comentarios adicionales
  designers.forEach(designer => {
    const currentValue = parseInt(document.getElementById(`assignment-${designer}`).value) || 0;
    document.getElementById(`assignment-${designer}`).value = currentValue + additionalPerDesigner;
  });
  
  // Distribuir el resto final
  for (let i = 0; i < finalRemainder; i++) {
    const currentValue = parseInt(document.getElementById(`assignment-${designers[i]}`).value);
    document.getElementById(`assignment-${designers[i]}`).value = currentValue + 1;
  }
  
  updateAssignmentSummary();
};

window.applyDesignerAssignments = function() {
  const designers = getActiveDesigners();
  const unassignedComments = originalInventoryData.filter(row => !row.diseñador || row.diseñador.trim() === '');
  
  // Validar que la suma de asignaciones no exceda los comentarios sin asignar
  let totalAssignments = 0;
  designers.forEach(designer => {
    const assignmentValue = parseInt(document.getElementById(`assignment-${designer}`).value) || 0;
    totalAssignments += assignmentValue;
  });
  
  if (totalAssignments > unassignedComments.length) {
    alert(`Error: Estás intentando asignar ${totalAssignments} comentarios pero solo hay ${unassignedComments.length} sin asignar.`);
    return;
  }
  
  // Realizar las asignaciones
  let commentIndex = 0;
  designers.forEach(designer => {
    const assignmentCount = parseInt(document.getElementById(`assignment-${designer}`).value) || 0;
    
    for (let i = 0; i < assignmentCount && commentIndex < unassignedComments.length; i++) {
      const row = unassignedComments[commentIndex];
      row.diseñador = designer; // Mantener el nombre original
      commentIndex++;
    }
  });
  
  // Actualizar la tabla
  populateInventoryTable();
  populateFilterDropdowns();
  
  // Actualizar las tablas de estadísticas
  setTimeout(() => {
    updateStatsTablesOnDataChange();
  }, 200);
  
  // Cerrar modal
  closeAssignDesignerModal();
  
  alert(`Se asignaron ${commentIndex} comentarios exitosamente.`);
};

function getActiveDesigners() {
  const designers = Object.keys(USERS).filter(user => USERS[user].group === 'Diseño');
  return designers.filter(designer => {
    const checkbox = document.querySelector(`input[onchange*="${designer}"]`);
    return checkbox && checkbox.checked; // Incluidos (checked = true)
  });
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
      <h4>Estadísticas Diseño</h4>
      <table class="stats-table">
        <thead>
          <tr>
            <th>Diseño</th>
            <th>Total</th>
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
    
    tableHTML += `
      <tr>
        <td class="clickable-name" data-user="${designer}" data-type="designer">${USERS[designer].name}</td>
        <td class="clickable-stat" data-user="${designer}" data-status="" data-type="designer">${total}</td>
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
  
  // Acumular totales incluyendo vacíos
  totalGeneral += emptyTotal;
  totalRevision += emptyRevision;
  totalDiseño += emptyDiseño;
  totalCancelado += emptyCancelado;
  totalCompletado += emptyCompletado;
  
  tableHTML += `
    <tr>
      <td class="clickable-name" data-user="" data-type="designer">Vacío</td>
      <td class="clickable-stat" data-user="" data-status="" data-type="designer">${emptyTotal}</td>
      <td class="clickable-stat" data-user="" data-status="revisión" data-type="designer">${emptyRevision}</td>
      <td class="clickable-stat" data-user="" data-status="diseño" data-type="designer">${emptyDiseño}</td>
      <td class="clickable-stat" data-user="" data-status="cancelado" data-type="designer">${emptyCancelado}</td>
      <td class="clickable-stat" data-user="" data-status="completado" data-type="designer">${emptyCompletado}</td>
    </tr>
    <tr class="total-row">
      <td>Total</td>
      <td class="clickable-stat" data-user="all" data-status="" data-type="designer">${totalGeneral}</td>
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
      <h4>Estadísticas Analistas</h4>
      <table class="stats-table">
        <thead>
          <tr>
            <th>Analista</th>
            <th>Total</th>
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
    
    tableHTML += `
      <tr>
        <td class="clickable-name" data-user="${analyst}" data-type="analyst">${USERS[analyst].name}</td>
        <td class="clickable-stat" data-user="${analyst}" data-status="" data-type="analyst">${total}</td>
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
  
  tableHTML += `
    <tr class="total-row">
      <td>Total</td>
      <td class="clickable-stat" data-user="all" data-status="" data-type="analyst">${totalGeneral}</td>
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
      inventoryTable.innerHTML = '<tr><td colspan="25" style="text-align: center; color: #666;">No hay datos que coincidan con el filtro actual</td></tr>';
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
  // Buscar la tabla de inventario existente
  const inventoryTable = document.querySelector('.image-inventory-table tbody');
  
  if (!inventoryTable) {
    console.log('No se encontró la tabla de inventario');
    return;
  }
  
  // Limpiar contenido actual
  inventoryTable.innerHTML = '';
  
  if (!filteredData || filteredData.length === 0) {
    inventoryTable.innerHTML = '<tr><td colspan="25" class="no-data">No hay datos que coincidan con el filtro seleccionado.</td></tr>';
    return;
  }
  
  // Regenerar filas usando la misma lógica que la tabla original
  filteredData.forEach((rowData, index) => {
    const row = document.createElement('tr');
    row.className = 'inventory-row';
    row.setAttribute('data-original-row', rowData.originalRowIndex || index);
    
    row.innerHTML = `
      <td class="inventory-cell">${index + 1}</td>
      <td class="inventory-cell">${escapeHtml(rowData.name || '')}</td>
      <td class="inventory-cell">${escapeHtml(rowData.id || '')}</td>
      <td class="inventory-cell inventory-item-group clickable-status" data-item-group-id="${escapeHtml(rowData.itemGroupId || '')}">${escapeHtml(rowData.itemGroupId || '')}</td>
      <td class="inventory-cell">${escapeHtml(rowData.objectType || '')}</td>
      <td class="inventory-cell">${escapeHtml(rowData.cms || '')}</td>
      <td class="inventory-cell">${escapeHtml(rowData.marca || '')}</td>
      <td class="inventory-cell">${escapeHtml(rowData.titulo || '')}</td>
      <td class="inventory-cell">${escapeHtml(rowData.importancia || '')}</td>
      <td class="inventory-cell inventory-field">${escapeHtml(rowData.campo || '')}</td>
      <td class="inventory-cell inventory-image">${escapeHtml(rowData.imagen || '')}</td>
      <td class="inventory-cell inventory-analyst">${escapeHtml(rowData.analista || '')}</td>
      <td class="inventory-cell inventory-date">${escapeHtml(rowData.primeraFechaAnalista || '')}</td>
      <td class="inventory-cell inventory-comment-text clickable-comment" 
          data-comment-type="analista" 
          data-image-name="${escapeHtml(rowData.imagen || '')}" 
          data-item-name="${escapeHtml(rowData.name || '')}" 
          data-item-id="${escapeHtml(rowData.id || '')}" 
          title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista || '')}</td>
      <td class="inventory-cell inventory-designer">${escapeHtml(rowData.diseñador || '')}</td>
      <td class="inventory-cell inventory-date">${escapeHtml(rowData.ultimaFechaDisenador || '')}</td>
      <td class="inventory-cell inventory-comment-text clickable-comment" 
          data-comment-type="diseñador" 
          data-image-name="${escapeHtml(rowData.imagen || '')}" 
          data-item-name="${escapeHtml(rowData.name || '')}" 
          data-item-id="${escapeHtml(rowData.id || '')}" 
          title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador || '')}</td>
      <td class="inventory-cell inventory-type clickable-comment" 
          data-comment-type="tipo" 
          data-image-name="${escapeHtml(rowData.imagen || '')}" 
          data-item-name="${escapeHtml(rowData.name || '')}" 
          data-item-id="${escapeHtml(rowData.id || '')}" 
          title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo || '')}</td>
      <td class="inventory-cell inventory-status clickable-status" data-item-group-id="${escapeHtml(rowData.itemGroupId || '')}" title="Click para navegar al Item Group">${createStatusTag(rowData.ultimoStatus)}</td>
      <!-- NUEVAS CELDAS SIN ESTILOS PROBLEMÁTICOS -->
      <td class="inventory-cell-clean clickable-comment-clean" data-comment-type="analista-clean" data-image-name="${escapeHtml(rowData.imagen || '')}" data-item-name="${escapeHtml(rowData.name || '')}" data-item-id="${escapeHtml(rowData.id || '')}" title="Click para ver historial completo">${escapeHtml(rowData.analista || '')}</td>
      <td class="inventory-cell-clean clickable-comment-clean" data-comment-type="analista-comment-clean" data-image-name="${escapeHtml(rowData.imagen || '')}" data-item-name="${escapeHtml(rowData.name || '')}" data-item-id="${escapeHtml(rowData.id || '')}" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioAnalista || '')}</td>
      <td class="inventory-cell-clean clickable-comment-clean" data-comment-type="diseñador-clean" data-image-name="${escapeHtml(rowData.imagen || '')}" data-item-name="${escapeHtml(rowData.name || '')}" data-item-id="${escapeHtml(rowData.id || '')}" title="Click para ver historial completo">${escapeHtml(rowData.diseñador || '')}</td>
      <td class="inventory-cell-clean clickable-comment-clean" data-comment-type="diseñador-comment-clean" data-image-name="${escapeHtml(rowData.imagen || '')}" data-item-name="${escapeHtml(rowData.name || '')}" data-item-id="${escapeHtml(rowData.id || '')}" title="Click para ver historial completo">${escapeHtml(rowData.ultimoComentarioDisenador || '')}</td>
      <td class="inventory-cell-clean clickable-comment-clean" data-comment-type="tipo-clean" data-image-name="${escapeHtml(rowData.imagen || '')}" data-item-name="${escapeHtml(rowData.name || '')}" data-item-id="${escapeHtml(rowData.id || '')}" title="Click para ver historial completo">${escapeHtml(rowData.ultimoTipo || '')}</td>
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
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
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
    
    // Recopilar datos visibles
    const visibleData = collectVisibleData();
    
    if (visibleData.length === 0) {
      alert('No hay datos para guardar');
      return;
    }
    
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
      
      saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando lote ${i + 1}/${batches.length}...`;
      
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
    
    alert(`✅ ¡Todos los datos guardados exitosamente!\n${totalSaved} registros guardados en ${batches.length} lotes`);
    
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

function collectVisibleData() {
  const records = [];
  const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const currentUser = getCurrentUser();
  
  console.log('=== INICIANDO RECOPILACIÓN DE DATOS VISIBLES ===');
  
  // PASO 1: Recopilar datos del Item Group actual
  if (currentItemGroup) {
    const itemGroupId = currentItemGroup['Id'];
    const itemGroupName = currentItemGroup['Name'];
    
    console.log(`\n🏷️ Procesando Item Group: ${itemGroupName} (ID: ${itemGroupId})`);
    
    let groupRecordCount = 0;
    
    // Recopilar campos WA del Item Group
    WA_ATTRIBUTES.forEach(attribute => {
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
  
  // PASO 2: Recopilar datos de Item Codes visibles
  if (!currentItemCodes || currentItemCodes.length === 0) {
    console.log('❌ No hay currentItemCodes disponibles');
    return records;
  }
  
  console.log(`\n🔍 Item Codes a procesar: ${currentItemCodes.length}`);
  
  // Procesar cada Item Code visible
  currentItemCodes.forEach(itemData => {
    const itemId = itemData['Id'];
    const itemCodeName = itemData['Name']; // Ej: "61-251-105"
    const objectType = itemData['Object Type'] || 'Unknown';
    
    console.log(`\n📋 Procesando Item Code: ${itemCodeName} (ID: ${itemId})`);
    
    if (itemId) {
      let itemRecordCount = 0;
      
      // Recopilar TODOS los campos WA que tengan cualquier valor
      WA_ATTRIBUTES.forEach(attribute => {
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
  
  // PASO 3: Recopilar comentarios de imágenes desde currentAssetComments
  if (currentAssetComments && currentAssetComments.length > 0) {
    console.log(`\n💬 Procesando comentarios de imágenes: ${currentAssetComments.length} assets con comentarios`);
    
    let commentRecordCount = 0;
    let assetsWithComments = 0;
    
    // Primero, buscar assets que tengan la imagen específica que sabemos que tiene comentarios
    const targetImage = '61-251-105.jpg';
    const targetAsset = currentAssetComments.find(asset => asset.Name === targetImage);
    
    if (targetAsset) {
      console.log(`🎯 Asset objetivo encontrado (${targetImage}):`, targetAsset);
      console.log(`   ID del asset: ${targetAsset.ID}`);
      console.log(`   Tiene comentarios?:`, !!targetAsset.comentarios);
      console.log(`   Tipo de comentarios:`, typeof targetAsset.comentarios);
      console.log(`   Comentarios:`, targetAsset.comentarios);
      
      // Buscar comentarios usando el ID del asset
      const assetId = targetAsset.ID.toString();
      console.log(`🔍 Buscando comentarios para asset ID: ${assetId}`);
      
      // Buscar en currentAssetComments por ID
      const assetWithComments = currentAssetComments.find(asset => asset.ID.toString() === assetId);
      if (assetWithComments && assetWithComments.comentarios) {
        console.log(`✅ Encontrado asset con comentarios por ID:`, assetWithComments.comentarios);
      }
    } else {
      console.log(`❌ No se encontró asset para ${targetImage}`);
      // Mostrar algunos nombres de assets para debug
      console.log(`🔍 Primeros 10 assets:`, currentAssetComments.slice(0, 10).map(a => a.Name));
    }
    
    // Buscar específicamente imágenes visibles en el grid actual
    const visibleImageNames = [];
    
    // Agregar imágenes del Item Group
    if (currentItemGroup) {
      WA_ATTRIBUTES.forEach(attr => {
        if (currentItemGroup[attr] && 
            !currentItemGroup[attr].includes('logo_img_blank') &&
            !currentItemGroup[attr].includes('¦') && // No incluir comentarios
            currentItemGroup[attr].includes('.')) { // Solo archivos con extensión
          visibleImageNames.push(currentItemGroup[attr]);
        }
      });
    }
    
    // Agregar imágenes de Item Codes visibles
    if (currentItemCodes) {
      currentItemCodes.forEach(itemCode => {
        WA_ATTRIBUTES.forEach(attr => {
          if (itemCode[attr] && 
              !itemCode[attr].includes('logo_img_blank') &&
              !itemCode[attr].includes('¦') && // No incluir comentarios
              itemCode[attr].includes('.')) { // Solo archivos con extensión
            visibleImageNames.push(itemCode[attr]);
          }
        });
      });
    }
    
    console.log(`🔍 Imágenes visibles a buscar comentarios:`, [...new Set(visibleImageNames)]); // Eliminar duplicados
    
    // Eliminar duplicados de la lista de imágenes
    const uniqueImageNames = [...new Set(visibleImageNames)];
    
    // Buscar comentarios solo para imágenes visibles
    uniqueImageNames.forEach(imageName => {
      // Filtrar solo nombres de imágenes válidos (no comentarios que se filtraron por error)
      if (!imageName.includes('¦') && imageName.includes('.')) {
        // Buscar el asset por nombre
        const asset = currentAssetComments.find(a => a.Name === imageName);
        
        if (asset) {
          console.log(`📸 Procesando imagen visible: ${imageName} (ID: ${asset.ID})`);
          
          // Los comentarios están en WA_VIS_Comment como string, no en asset.comentarios como array
          if (asset.WA_VIS_Comment && asset.WA_VIS_Comment.trim() !== '') {
            assetsWithComments++;
            console.log(`💬 Asset con comentarios: ${imageName} - Comentario: "${asset.WA_VIS_Comment}"`);
            
            commentRecordCount++;
            
            console.log(`   ✅ Comentario válido: "${asset.WA_VIS_Comment}"`);
            
            // Crear un registro con el formato correcto
            records.push({
              id: asset.ID, // Usar el ID del asset, no el nombre
              objectType: asset.ObjectTypeName || 'Image', // Usar el tipo real del asset
              attribute: 'WA_VIS_Comment', // Usar el atributo correcto
              value: asset.WA_VIS_Comment, // Usar el valor original sin reformatear
              date: currentDate,
              user: currentUser
            });
          } else {
            console.log(`   ❌ Asset ${imageName} no tiene comentarios válidos`);
          }
        } else {
          console.log(`   ❌ No se encontró asset para imagen: ${imageName}`);
        }
      } else {
        console.log(`   ⚠️ Ignorando elemento que no es imagen: ${imageName}`);
      }
    });
    
    console.log(`✅ Comentarios de imágenes: ${commentRecordCount} registros recopilados de ${assetsWithComments} assets`);
  } else {
    console.log(`💬 No hay currentAssetComments disponibles o está vacío`);
    console.log(`   currentAssetComments:`, currentAssetComments ? `array con ${currentAssetComments.length} items` : 'null/undefined');
  }
  
  console.log(`\n📊 RESUMEN FINAL: ${records.length} registros totales para guardar`);
  console.log('=== FIN RECOPILACIÓN ===\n');
  
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
  
  if (s.includes("diseño")) c = "diseno";
  else if (s.includes("cancelado")) c = "cancelado";
  else if (s.includes("completado")) c = "completado";
  
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
