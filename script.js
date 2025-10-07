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

// Variable global para mantener el zoom persistente
let globalZoomScale = 1; // Zoom persistente entre cambios de Item Group

// Variables globales para el sistema de selección y asignación de imágenes
let workingImage = null; // {imageName: string, itemCode: string, section: string, originalPosition: {row, col}}
let imageGridData = {}; // Cache de datos del grid actual para operaciones rápidas

// Event Listeners (sección limpia)
document.addEventListener('DOMContentLoaded', function() {
  setupDragAndDrop();
  
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
        "NamePath", "Name", "IdPath", "Id", "Object Type", "CMS", "Marca", "Página de Catálogo", "Título", "WA Importancia", "WA_VIS_Comment",
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

      // Filtra SOLO los campos necesarios
      const assetRows = allRows.map(row => {
        const filtered = {};
        columnsToRead.forEach(col => {
          filtered[col] = row[col] ?? "";
        });
        return filtered;
      });

      // Guarda los datos para trabajar y el orden de las columnas
      currentWorkingData = [...assetRows];
      currentColumnsOrder = [...columnsToRead];

      // Renderiza el árbol usando solo las columnas filtradas
      renderAssetLibraryTree(assetRows, document.getElementById('tree'));
      
      // Limpiar el contenido de box3 y box4
      clearBoxContents();
    } catch (error) {
      console.error("Error procesando archivo combinado:", error);
      alert("Ocurrió un error procesando el archivo combinado: " + error.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// Función para limpiar el contenido de box3 y box4
function clearBoxContents() {
  const box3Content = document.getElementById('box3-content');
  const box4Content = document.getElementById('box4-content');
  
  if (box3Content) {
    box3Content.innerHTML = '<p>Box 3 - Contenido limpio. Aquí puedes agregar tu nueva lógica.</p>';
  }
  
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

  // Header sticky con el botón
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

      // Activa la selección solo en Item Group
      if (info['Object Type'] === 'Item Group') {
        label.classList.add('selectable');
        label.addEventListener('click', function(e) {
          e.stopPropagation();
          treeList.querySelectorAll('.category-tree-label.selected').forEach(el => el.classList.remove('selected'));
          label.classList.add('selected');
          cargarBtn.disabled = false;
        });
      }

      // Estructura visual
      li.appendChild(cmsSpan);
      li.appendChild(label);

      // Triángulo colapsable si hay hijos
      const childrenKeys = Object.keys(node.__children).filter(k => k !== '__children' && k !== '__info');
      if (childrenKeys.length > 0) {
        const expandBtn = document.createElement('span');
        expandBtn.textContent = '⏵';
        expandBtn.className = 'category-tree-expand-btn';
        expandBtn.setAttribute('aria-expanded', 'false');
        li.insertBefore(expandBtn, cmsSpan);

        const childrenUl = createTreeHTML(node.__children);
        childrenUl.style.display = 'none';
        expandBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          const expanded = expandBtn.getAttribute('aria-expanded') === 'true';
          expandBtn.setAttribute('aria-expanded', !expanded);
          childrenUl.style.display = expanded ? 'none' : 'block';
          expandBtn.textContent = expanded ? '⏵' : '⏷';
        });
        li.appendChild(childrenUl);
      } else {
        // Sin hijos: espacio invisible para alinear
        const emptySpan = document.createElement('span');
        emptySpan.className = 'category-tree-expand-btn empty';
        emptySpan.textContent = '⏷';
        emptySpan.style.visibility = 'hidden';
        li.insertBefore(emptySpan, cmsSpan);
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
}

// Función para cargar la retícula de imágenes en box4
function loadImageGridInBox4(itemGroupPath) {
  // Buscar el Item Group actual
  const itemGroup = currentWorkingData.find(item => {
    return item['Object Type'] === 'Item Group' && item.NamePath === itemGroupPath;
  });

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
            </div>
            <div class="item-group-details">
              <div class="group-title">${itemGroup ? (itemGroup['Título'] || itemGroup['Title'] || 'Sin título') : 'Información no disponible'}</div>
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
                <div class="table-cell item-code-cell" data-item-code="${row.itemCode.Name}">
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
  return `
    <div class="image-thumbnail-container">
      <img src="https://www.travers.com.mx/media/catalog/product/agility/img/${imageName}" 
           alt="${imageName}" class="image-thumbnail" 
           onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ci8+CjxwYXRoIGQ9Ik0xMiAxNkwyOCAyNE0yOCAxNkwxMiAyNCIgc3Ryb2tlPSIjOUM5Qzk5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K'; this.title='Imagen no encontrada: ${imageName}';">
      <div class="image-controls">
        <button class="btn-copy" title="Copiar imagen">📋</button>
        <button class="btn-remove" title="Quitar imagen">🗑️</button>
      </div>
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
let currentItemGroup = null;

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

  container.addEventListener('click', function(event) {
    const imageCell = event.target.closest('.image-cell');
    const imageThumbnail = event.target.closest('.image-thumbnail');
    
    // Shift+Click: Seleccionar imagen de trabajo
    if (event.shiftKey && !event.metaKey) {
      handleImageSelection(event, imageCell, imageThumbnail);
    }
    
    // Cmd+Click (Mac) / Ctrl+Click (Windows): Asignar imagen de trabajo
    else if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
      handleImageAssignment(event, imageCell);
    }
  });
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
