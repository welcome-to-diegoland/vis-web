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
    container.style.setProperty('--font-scale', '8px');   // Valor inicial igual que CSS
    container.style.setProperty('--image-size', '80px');  // Valor inicial
  }
  
  // Configurar controles de zoom y sincronización después de que se agregue al DOM
  // Usar un setTimeout más largo para asegurar que el DOM esté listo
  setTimeout(() => {
    setupZoomControls();
    setupScrollSynchronization();
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
              </div>
            </div>
          </div>
          <div class="item-codes-count">
            <span class="count-badge">${itemCodes.length} items</span>
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
                    <span class="item-importance">${row.itemCode['WA Importancia'] || row.itemCode['Importancia'] || row.itemCode['Importance'] || ''}</span>
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
  
  const container = document.getElementById('imageGridContainer');
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
  
  let currentScale = 1;
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
      updateScale();
      
      // Remover clase después de la transición
      setTimeout(() => {
        container.classList.remove('zoom-active');
      }, 300);
    }
  });  // Inicializar
  updateScale();
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
