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
let currentColumnsOrder = []; // Para mantener el orden original de las columnas
let currentAssetComments = []; // Para guardar los comentarios de las imágenes
let currentAssetGroups = []; // Para guardar los datos de galerías

// Variable global para mantener el zoom persistente
let globalZoomScale = 1; // Zoom persistente entre cambios de Item Group

// Variables globales para el sistema de selección y asignación de imágenes
let workingImage = null; // {imageName: string, itemCode: string, section: string, originalPosition: {row, col}}
let imageGridData = {}; // Cache de datos del grid actual para operaciones rápidas

// Variable global para el Item Group actual
let currentItemGroup = null; // Para mantener referencia al Item Group cargado

// Event Listeners (sección limpia)
document.addEventListener('DOMContentLoaded', function() {
  setupDragAndDrop();
  
  // Inicializar Box 3 con el sistema de galerías
  initializeGallerySystem();
  
  // Event listener para cargar archivo Excel
  combinedFileInput.addEventListener('change', handleCombinedExcel);
  
  // Event listeners para los botones del header
  const saveChangesBtn = document.getElementById('saveChangesBtn');
  const exportBtn = document.getElementById('exportBtn');
  
  if (saveChangesBtn) {
    saveChangesBtn.addEventListener('click', saveToLocalStorage);
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
        // Crear un mapa de nombre de imagen -> comentario
        assetCommentsData = assetCommentsRows.filter(row => row.Name && row.WA_VIS_Comment);
        console.log("Comentarios de assets cargados:", assetCommentsData.length);
      } else {
        console.warn("No se encontró la hoja VIS_AG_Asset_Structure para comentarios de imágenes.");
      }

      // Leer la hoja asset_groups del mismo archivo
      const assetGroupsSheet = workbook.Sheets["asset_groups"];
      let assetGroupsData = [];
      if (assetGroupsSheet) {
        assetGroupsData = XLSX.utils.sheet_to_json(assetGroupsSheet, { defval: "" });
        console.log("📊 Datos de galerías cargados:", assetGroupsData.length, "registros");
        console.log("🔍 Primer registro de galerías:", assetGroupsData[0]);
        
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
    box4Content.innerHTML = '<p>Box 4 - Contenido limpio. Aquí puedes agregar tu nueva lógica.</p>';
  }
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

  // --- Renderiza el árbol en el DOM ---
  treeDiv.innerHTML = '';

  // Barra de controles superior
  const controlsHeader = document.createElement('div');
  controlsHeader.className = 'category-tree-header';
  treeDiv.appendChild(controlsHeader);

  // Toggle para vista de aprobación (3 estados)
  const approvalToggleContainer = document.createElement('div');
  approvalToggleContainer.className = 'approval-toggle-container';
  approvalToggleContainer.innerHTML = `
    <div class="form-group">
      <select class="form-select" id="approvalViewSelect">
        <option value="normal">Normal</option>
        <option value="approval-full">Aprobación Completa</option>
        <option value="approval-filtered">Aprobación Filtrada</option>
      </select>
    </div>
  `;
  controlsHeader.appendChild(approvalToggleContainer);

  // Header sticky con el botón de cargar
  const header = document.createElement('div');
  header.className = 'category-tree-header';
  treeDiv.appendChild(header);

  const cargarBtn = document.createElement('button');
  cargarBtn.id = 'btn-cargar-categoria';
  cargarBtn.className = 'btn btn-secondary';
  cargarBtn.textContent = 'Cargar Item Group';
  cargarBtn.disabled = true;
  header.appendChild(cargarBtn);

  // Contenedor para el árbol (hace scroll, no el header)
  const treeList = document.createElement('div');
  treeList.className = 'category-tree-list';
  treeDiv.appendChild(treeList);

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
          treeList.querySelectorAll('.category-tree-label.selected').forEach(el => el.classList.remove('selected'));
          label.classList.add('selected');
          cargarBtn.disabled = false;
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

  // Botón cargar categoría: solo selecciona el Item Group activo
  cargarBtn.addEventListener('click', function() {
    const selected = treeList.querySelector('.category-tree-label.selected');
    if (!selected) {
      alert("Selecciona un grupo de productos en el árbol");
      return;
    }
    const infoPath = selected.getAttribute('data-path');
    
    // Cargar la retícula de imágenes en box4
    loadImageGridInBox4(infoPath);
  });

  // Select para vista de aprobación (3 estados)
  const approvalSelect = document.getElementById('approvalViewSelect');
  approvalSelect.addEventListener('change', function() {
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
  });
}

// Función para cargar la retícula de imágenes en box4
function loadImageGridInBox4(itemGroupPath) {
  // Buscar el Item Group actual
  const itemGroup = currentWorkingData.find(item => {
    return item['Object Type'] === 'Item Group' && item.NamePath === itemGroupPath;
  });

  // IMPORTANTE: Guardar el Item Group actual globalmente para otras funciones
  currentItemGroup = itemGroup;

  // Buscar todos los Item Codes que pertenecen a este Item Group
  const itemCodes = currentWorkingData.filter(item => {
    return item['Object Type'] === 'Item Code' && item.NamePath.startsWith(itemGroupPath + '/');
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
    const indicators = document.querySelectorAll('.approval-indicator');
    const box4 = document.getElementById('box4');
    console.log('Indicadores de aprobación encontrados:', indicators.length);
    console.log('Box4 tiene clase approval-view-active:', box4 ? box4.classList.contains('approval-view-active') : 'Box4 no encontrado');
    
    indicators.forEach((indicator, index) => {
      if (index < 5) { // Solo mostrar los primeros 5
        const visColor = indicator.getAttribute('data-vis-color');
        const cell = indicator.closest('.item-code-cell');
        const itemCode = cell ? cell.getAttribute('data-item-code') : 'N/A';
        const computedStyle = window.getComputedStyle(indicator);
        const backgroundColor = computedStyle.backgroundColor;
        const opacity = computedStyle.opacity;
        console.log(`Indicador ${index}: ItemCode="${itemCode}", vis_color="${visColor}", background="${backgroundColor}", opacity="${opacity}"`);
      }
    });
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
                     onerror="this.style.display='none';">` : 
                '<div class="no-image">📷</div>'
              }
              ${itemGroup && itemGroup['WA_VIS_Comment'] && itemGroup['WA_VIS_Comment'].trim() ? 
                `<div class="comment-indicator group-comment" data-comment="${itemGroup['WA_VIS_Comment']}">💬</div>` : 
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
                    `<div class="comment-indicator" data-comment="${row.itemCode['WA_VIS_Comment']}">💬</div>` : 
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
        <button class="btn-copy" title="Copiar imagen">📋</button>
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
  
  // Reconfigurar controles de zoom y sincronización
  setTimeout(() => {
    setupZoomControls();
    setupScrollSynchronization();
  }, 100);
  
  console.log('Grilla regenerada exitosamente');
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
  console.log('=== DEBUG EXTRACT ITEM CODE ===');
  console.log('Input imageName:', imageName);
  
  if (!imageName) {
    console.log('imageName is null/undefined');
    return null;
  }
  
  // Método 1: Buscar patrón con guión bajo (ej: 71-352-401_wg1.jpg)
  const matchWithUnderscore = imageName.match(/^([^_]+)_/);
  if (matchWithUnderscore) {
    const result = matchWithUnderscore[1];
    console.log('Found with underscore pattern:', result);
    console.log('===============================');
    return result;
  }
  
  // Método 2: Si no hay guión bajo, tomar los primeros 10 caracteres (ej: 71-352-401.jpg)
  const withoutExtension = imageName.replace(/\.[^.]+$/, ''); // Quitar extensión
  if (withoutExtension.length >= 10) {
    const result = withoutExtension.substring(0, 10);
    console.log('Using first 10 characters:', result);
    console.log('===============================');
    return result;
  }
  
  console.log('No valid pattern found');
  console.log('===============================');
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
      
      // Determinar qué tipo de elemento se clickeó
      const imageCell = event.target.closest('.image-cell');
      const itemCodeCell = event.target.closest('.item-code-cell');
      const itemGroupImage = event.target.closest('.item-group-image');
      const imageThumbnail = event.target.closest('.image-thumbnail');
      const emptyImageCell = event.target.closest('.empty-image-cell');
      
      if (imageThumbnail && imageCell) {
        // Click en imagen del grid
        const imageName = imageThumbnail.alt;
        const commentText = getImageComments(imageName);
        openCommentModal('Comentario de la Imagen', imageName, commentText || '', 'image', imageName);
      } else if ((emptyImageCell || imageCell) && !imageThumbnail) {
        // Click en celda de imagen vacía - buscar item code desde la celda
        const cell = imageCell || emptyImageCell.closest('.image-cell');
        if (cell) {
          const itemCode = cell.getAttribute('data-item-code');
          if (itemCode) {
            const itemCodeData = currentWorkingData.find(item => 
              item['Object Type'] === 'Item Code' && item.Name === itemCode
            );
            const commentText = itemCodeData ? (itemCodeData['WA_VIS_Comment'] || '') : '';
            openCommentModal('Comentario del Item Code', itemCode, commentText);
          }
        }
      } else if (itemCodeCell) {
        // Click en celda de item code
        const itemCode = itemCodeCell.getAttribute('data-item-code');
        const itemCodeData = currentWorkingData.find(item => 
          item['Object Type'] === 'Item Code' && item.Name === itemCode
        );
        const commentText = itemCodeData ? (itemCodeData['WA_VIS_Comment'] || '') : '';
        openCommentModal('Comentario del Item Code', itemCode, commentText);
      } else if (itemGroupImage && currentItemGroup) {
        // Click en imagen/espacio del item group
        const commentText = currentItemGroup['WA_VIS_Comment'] || '';
        const contextInfo = currentItemGroup['Name'] || 'Item Group';
        openCommentModal('Comentario del Item Group', contextInfo, commentText);
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
    
    // Shift+Click: Seleccionar imagen de trabajo
    else if (event.shiftKey && !event.metaKey && !event.altKey) {
      handleImageSelection(event, imageCell, imageThumbnail);
    }
    
    // Cmd+Click (Mac) / Ctrl+Click (Windows): Asignar imagen de trabajo
    else if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
      handleImageAssignment(event, imageCell);
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
    contextInfo = currentItemGroup ? (currentItemGroup['Name'] || 'Item Group') : 'Item Group';
  } else {
    modalTitle = 'Comentario del Item Code';
    const itemCodeCell = commentIndicator.closest('.item-code-cell');
    contextInfo = itemCodeCell ? itemCodeCell.getAttribute('data-item-code') : 'Item Code';
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
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Ayer ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return diffDays + ' días - ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
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
          <div class="modal-context">${context}</div>
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
              <div class="form-group form-group-half">
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
              <div class="form-group form-group-half">
                <select class="form-select status-select" id="statusSelect">
                  <option value="">Status...</option>
                  <option value="Diseño">Diseño</option>
                  <option value="Analista">Analista</option>
                  <option value="Revision">Revision</option>
                  <option value="Cambios">Cambios</option>
                  <option value="Completado">Completado</option>
                  <option value="Cancelado">Cancelado</option>
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
  const statusSelect = modal.querySelector('#statusSelect');
  
  // Verificar si existen comentarios previos
  const parsedComments = parseCommentsFromExcel(commentText);
  const hasExistingComments = parsedComments.length > 0;
  
  // Si hay comentarios existentes, preseleccionar valores del último comentario
  if (hasExistingComments) {
    const lastComment = parsedComments[parsedComments.length - 1];
    
    // Preseleccionar tipo y status del último comentario
    if (lastComment.tipoComentario) {
      commentTypeSelect.value = lastComment.tipoComentario;
    }
    if (lastComment.status) {
      statusSelect.value = lastComment.status;
    }
  }
  
  // Función para limpiar el formulario
  function clearForm() {
    commentTypeSelect.value = '';
    commentTextInput.value = '';
    statusSelect.value = '';
  }
  
  // Función para validar el formulario
  function validateForm() {
    const errors = [];
    
    // Verificar si existen comentarios previos
    const parsedComments = parseCommentsFromExcel(commentText);
    const hasExistingComments = parsedComments.length > 0;
    
    // El texto del comentario siempre es obligatorio
    if (!commentTextInput.value.trim()) {
      errors.push('Debe escribir un comentario');
    }
    
    // Si NO hay comentarios previos, tipo y status son obligatorios
    if (!hasExistingComments) {
      if (!commentTypeSelect.value.trim()) {
        errors.push('Debe seleccionar un tipo de comentario');
      }
      
      if (!statusSelect.value.trim()) {
        errors.push('Debe seleccionar un status');
      }
    }
    
    return errors;
  }
  
  // Event listener para el botón Aceptar
  addCommentBtn.addEventListener('click', function() {
    const errors = validateForm();
    
    if (errors.length > 0) {
      // Poner el botón rojo en lugar de mostrar alert
      addCommentBtn.style.backgroundColor = '#ff4444';
      addCommentBtn.style.color = 'white';
      addCommentBtn.textContent = 'Campos faltantes';
      
      setTimeout(() => {
        addCommentBtn.style.backgroundColor = '';
        addCommentBtn.style.color = '';
        addCommentBtn.textContent = '✓';
      }, 2000);
      return;
    }
    
    // Verificar si existen comentarios previos para usar sus valores
    const parsedComments = parseCommentsFromExcel(commentText);
    const hasExistingComments = parsedComments.length > 0;
    let finalTipoComentario = commentTypeSelect.value.trim();
    let finalStatus = statusSelect.value.trim();
    
    console.log('Valores originales:', {
      tipoSeleccionado: finalTipoComentario,
      statusSeleccionado: finalStatus,
      hasExistingComments
    });
    
    // Si hay comentarios previos y no se seleccionó tipo/status, usar los del último comentario
    if (hasExistingComments) {
      const lastComment = parsedComments[parsedComments.length - 1];
      
      if (!finalTipoComentario && lastComment.tipoComentario) {
        finalTipoComentario = lastComment.tipoComentario;
      }
      
      if (!finalStatus && lastComment.status) {
        finalStatus = lastComment.status;
      }
    }
    
    console.log('Valores finales:', {
      finalTipoComentario,
      finalStatus
    });
    
    // Crear el nuevo comentario
    const newComment = {
      usuario: 'Usuario Actual', // Por ahora estático como solicitaste
      fechaHora: new Date().toISOString().slice(0, 19).replace('T', ' '),
      tipoComentario: finalTipoComentario,
      textoComentario: commentTextInput.value.trim(),
      status: finalStatus
    };
    
    // Agregar el comentario a los datos
    addNewCommentToData(context, newComment, type, imageName);
    
    // Actualizar la vista de comentarios
    updateCommentsDisplay(modal);
    
    // Limpiar el formulario
    clearForm();
    
    // Feedback visual
    addCommentBtn.textContent = 'Agregado!';
    addCommentBtn.disabled = true;
    setTimeout(() => {
      addCommentBtn.textContent = '✓';
      addCommentBtn.disabled = false;
    }, 1500);
  });
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
    
    console.log('Nuevo comentario de imagen agregado:', newComment, 'para:', imageName);
    
    // Actualizar burbujas visualmente para imágenes
    updateCommentBubbles('image', context, imageName);
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
      item.Name === context
    );
    
    if (itemCodeData) {
      const existingComments = itemCodeData['WA_VIS_Comment'] || '';
      itemCodeData['WA_VIS_Comment'] = existingComments ? existingComments + '¶' + newCommentString : newCommentString;
    }
  }
  
  console.log('Nuevo comentario agregado:', newComment);
  
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
  
  if (type === 'image' && imageName) {
    // Buscar la imagen en el grid y actualizar/agregar burbuja
    const imageThumbnails = document.querySelectorAll('.image-thumbnail');
    imageThumbnails.forEach(img => {
      if (img.alt === imageName) {
        const container = img.closest('.image-thumbnail-container');
        if (container) {
          let bubble = container.querySelector('.comment-bubble.image-comment');
          if (bubble) {
            // Ya tenía burbuja, ponerla verde
            bubble.classList.add('new-comment');
          } else {
            // No tenía burbuja, crear nueva verde
            const newBubble = document.createElement('div');
            newBubble.className = 'comment-bubble image-comment new-comment';
            newBubble.setAttribute('data-image', imageName);
            newBubble.setAttribute('onclick', `handleImageCommentClick(event, '${imageName}')`);
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
      const groupBubble = document.querySelector('.comment-indicator.group-comment');
      if (groupBubble) {
        console.log('Burbuja de grupo encontrada, agregando clase verde');
        groupBubble.classList.add('new-comment');
        // Actualizar el atributo data-comment
        groupBubble.setAttribute('data-comment', currentItemGroup['WA_VIS_Comment'] || '');
      } else {
        // Crear nueva burbuja para Item Group si no existía
        console.log('Creando nueva burbuja para Item Group');
        const itemGroupImage = document.querySelector('.item-group-image');
        if (itemGroupImage && currentItemGroup) {
          const newBubble = document.createElement('div');
          newBubble.className = 'comment-indicator group-comment new-comment';
          newBubble.setAttribute('data-comment', currentItemGroup['WA_VIS_Comment'] || '');
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
          let bubble = cell.querySelector('.comment-indicator');
          if (bubble) {
            // Ya tenía burbuja, ponerla verde
            bubble.classList.add('new-comment');
            // Actualizar el atributo data-comment
            const item = currentWorkingData.find(item => item['Item Code'] === itemCode);
            bubble.setAttribute('data-comment', item?.['WA_VIS_Comment'] || '');
          } else {
            // No tenía burbuja, crear nueva verde
            const newBubble = document.createElement('div');
            newBubble.className = 'comment-indicator new-comment';
            newBubble.textContent = '💬';
            // Agregar el atributo data-comment
            const item = currentWorkingData.find(item => item['Item Code'] === itemCode);
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
  
  let commentText = '';
  
  if (modalTitle.includes('Item Group') && currentItemGroup) {
    commentText = currentItemGroup['WA_VIS_Comment'] || '';
  } else if (modalTitle.includes('Imagen')) {
    // Es un comentario de imagen
    const context = modal.querySelector('.modal-context').textContent;
    commentText = getImageComments(context);
  } else {
    // Es un comentario de Item Code
    const context = modal.querySelector('.modal-context').textContent;
    const itemCodeData = currentWorkingData.find(item => 
      item['Object Type'] === 'Item Code' && 
      item.Name === context
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
    // Solo mostrar meta si hay tipo o status
    const showMeta = comment.tipoComentario || comment.status;
    
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
            ${comment.tipoComentario ? `
              <div class="comment-type" style="background-color: ${getCommentTypeColor(comment.tipoComentario)};">
                <span class="type-text">${comment.tipoComentario}</span>
              </div>
            ` : ''}
            ${comment.status ? `
              <div class="comment-status" style="background-color: ${getStatusColor(comment.status)};">
                <span class="status-text">${comment.status}</span>
              </div>
            ` : ''}
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
  
  // Cerrar al hacer click fuera de la modal (pero no si está dragging)
  modal.addEventListener('click', function(e) {
    if (e.target === modal && !isDragging) {
      closeModal();
    }
  });
  
  // Funcionalidad de arrastrar (mover ventana)
  header.addEventListener('mousedown', function(e) {
    if (e.target === closeBtn) return;
    
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
  
  console.log('=== ASIGNANDO IMAGEN PRINCIPAL DEL ITEM GROUP ===');
  console.log('Imagen:', imageName);
  console.log('Item Code origen:', itemCode);
  
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
    `;
  } else {
    groupImageContainer.innerHTML = '<div class="no-image">📷</div>';
  }
  
  console.log('Header del Item Group actualizado con nueva imagen');
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
  } else {
    // Si es de diferente Item Code, solo quitar
    console.log('Quitando imagen de diferente Item Code');
    removeImageFromGrid(targetRowIndex, targetColIndex, targetSection);
  }
  
  // Recorrer imágenes hacia la izquierda para llenar el espacio vacío
  shiftImagesLeft(targetRowIndex, targetColIndex, targetSection);
}

// Función para asignar la imagen de trabajo
function handleAssignImage(imageCell, targetItemCode, targetSection, targetRowIndex, targetColIndex) {
  // SIEMPRE verificar si la imagen ya existe en este Item Code (misma fila)
  // No importa si el nombre tiene el mismo Item Code, importa que no haya duplicados en la fila
  const existingPosition = findImageInItemCode(workingImage.imageName, targetItemCode);
  if (existingPosition) {
    console.log('Imagen duplicada encontrada, quitando de posición original...');
    // Quitar de posición original y recorrer hacia la izquierda
    removeImageFromGrid(existingPosition.row, existingPosition.col, existingPosition.section);
    shiftImagesLeft(existingPosition.row, existingPosition.col, existingPosition.section);
  }
  
  // Insertar imagen en la nueva posición
  insertImageInGrid(workingImage.imageName, targetRowIndex, targetColIndex, targetSection);
  
  console.log('Imagen asignada exitosamente');
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
function removeImageFromGrid(rowIndex, colIndex, section) {
  const cell = document.querySelector(`[data-row-index="${rowIndex}"][data-col-index="${colIndex}"][data-section="${section}"].image-cell`);
  if (!cell) return;
  
  // Reemplazar con celda vacía
  cell.innerHTML = `
    <div class="empty-image-cell">
      <div class="drop-zone" title="Arrastrar imagen aquí">
        <span class="add-icon">+</span>
      </div>
    </div>
  `;
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
    // Solo guardar los datos esenciales para evitar exceder el límite de localStorage
    const dataToSave = {
      currentWorkingData: currentWorkingData,
      currentColumnsOrder: currentColumnsOrder,
      timestamp: new Date().toISOString()
      // NO guardamos originalExcelSheets para evitar exceder el límite
    };
    
    localStorage.setItem('vis-web-data', JSON.stringify(dataToSave));
    
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
    
    console.log('Datos guardados en localStorage:', dataToSave.timestamp);
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
    const savedData = localStorage.getItem('vis-web-data');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      // Solo cargar los datos esenciales
      currentWorkingData = parsedData.currentWorkingData || [];
      currentColumnsOrder = parsedData.currentColumnsOrder || [];
      
      // Si hay datos, renderizar el árbol
      if (currentWorkingData.length > 0) {
        renderAssetLibraryTree(currentWorkingData, document.getElementById('tree'));
      }
      
      console.log('Datos cargados desde localStorage:', parsedData.timestamp);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error cargando desde localStorage:', error);
    return false;
  }
}

// Función para exportar a Excel
function exportToExcel() {
  try {
    if (currentWorkingData.length === 0) {
      alert('No hay datos para exportar. Primero carga un archivo Excel.');
      return;
    }
    
    // Crear un nuevo workbook
    const wb = XLSX.utils.book_new();
    
    // Preparar los datos manteniendo el orden original de las columnas
    const dataForExport = currentWorkingData.map(row => {
      const orderedRow = {};
      currentColumnsOrder.forEach(col => {
        orderedRow[col] = row[col] || "";
      });
      return orderedRow;
    });
    
    // Crear la hoja principal con los datos trabajados
    const ws = XLSX.utils.json_to_sheet(dataForExport, { 
      header: currentColumnsOrder 
    });
    
    // Solo agregar la hoja principal
    XLSX.utils.book_append_sheet(wb, ws, "VIS_AG_Library_Structure");
    
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
    
    console.log('Archivo exportado:', filename);
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
    console.log('No se encontró el contenedor master de scroll');
    return;
  }

  console.log('Configurando scroll master unificado con sincronización horizontal');
  
  // El scroll vertical ya es naturalmente sincronizado porque todas las secciones
  // están en el mismo contenedor
  
  // Ahora configuramos la sincronización horizontal por sección
  setupHorizontalScrollSynchronization();
  
  console.log('Scroll master configurado exitosamente - estructura unificada');
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

// Función para sincronizar scroll horizontal por sección
function setupHorizontalScrollSynchronization() {
  // NUEVA SINCRONIZACIÓN: headers scrollable-headers con contenido horizontal-scrollable
  const sections = ['cov', 'gallery', 'rest'];
  
  sections.forEach(sectionName => {
    const contentContainer = document.querySelector(`.horizontal-scrollable[data-section="${sectionName}"]`);
    const headerContainer = document.querySelector(`.scrollable-headers[data-section="${sectionName}"]`);
    
    if (contentContainer && headerContainer) {
      console.log(`Configurando sincronización scroll para sección: ${sectionName}`);
      
      // Cuando el contenido hace scroll horizontal, mover el header
      contentContainer.addEventListener('scroll', () => {
        headerContainer.scrollLeft = contentContainer.scrollLeft;
      });
      
      // Cuando el header hace scroll horizontal, mover el contenido  
      headerContainer.addEventListener('scroll', () => {
        contentContainer.scrollLeft = headerContainer.scrollLeft;
      });
      
      console.log(`Scroll horizontal sincronizado para sección: ${sectionName}`);
    } else {
      console.log(`No se encontraron contenedores para sección: ${sectionName}`);
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

  // Crear la estructura HTML del sistema de galerías
  box3Content.innerHTML = `
    <div class="gallery-system">
      <div class="gallery-dropdown-container">
        <select class="gallery-select" id="gallerySelect">
          <option value="">Galerías...</option>
        </select>
      </div>
      <div class="gallery-grid-container">
        <div class="gallery-grid" id="galleryGrid">
          <div class="gallery-placeholder">
            Selecciona una galería para ver las imágenes
          </div>
        </div>
      </div>
    </div>
  `;

  // Si ya hay datos de galerías cargados, poblar el dropdown
  if (currentAssetGroups && currentAssetGroups.length > 0) {
    populateGalleryDropdown(currentAssetGroups);
  }

  // Event listener para el dropdown
  const gallerySelect = document.getElementById('gallerySelect');
  gallerySelect.addEventListener('change', function() {
    const selectedGallery = this.value;
    if (selectedGallery) {
      loadGalleryImages(selectedGallery);
    } else {
      clearGalleryGrid();
    }
  });
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

// Función para configurar la selección de imágenes con Shift+Click
function setupGalleryImageSelection() {
  const galleryImages = document.querySelectorAll('.gallery-image-item');
  
  galleryImages.forEach(item => {
    item.addEventListener('click', function(event) {
      if (event.shiftKey) {
        event.preventDefault();
        const imageName = this.getAttribute('data-image-name');
        loadImageAsWorkingImage(imageName);
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
