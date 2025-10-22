// 🔧 PARCHE PARA CORREGIR ERRORES CRÍTICOS

// Función principal de carga desde Google Sheets (reemplazo limpio)
async function loadFromGoogleSheets() {
  const loadButton = document.getElementById('loadExcelBtn');
  const originalText = loadButton.innerHTML;
  
  try {
    loadButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cargando desde Google Sheets';
    loadButton.disabled = true;
    
    console.log('🔄 Cargando datos ligeros desde Google Sheets...');
    
    // Limpiar datos existentes
    allItems = [];
    treeData = {};
    
    // FASE 1: Cargar categorías
    const categoryData = await loadGoogleSheetAsCSV(
      GOOGLE_SHEETS_CONFIG.CATEGORY_SHEET.CSV_URL, 
      'category'
    );
    
    console.log(`✅ Categorías cargadas: ${categoryData.length} elementos`);
    
    // Procesar datos para el árbol
    currentWorkingData = categoryData;
    treeData = processCategoryDataForTree(categoryData);
    updateTreeView(treeData);
    
    // FASE 2: Cargar asset_groups
    try {
      const assetGroupsData = await loadGoogleSheetAsCSV(
        GOOGLE_SHEETS_CONFIG.DATA_SHEET.CSV_URL, 
        'asset_groups'
      );
      
      if (assetGroupsData && assetGroupsData.length > 0) {
        currentAssetGroups = assetGroupsData;
        console.log(`✅ asset_groups cargado: ${assetGroupsData.length} registros`);
      }
    } catch (assetGroupsError) {
      console.warn('⚠️ No se pudo cargar asset_groups:', assetGroupsError.message);
    }
    
    loadButton.innerHTML = originalText;
    loadButton.disabled = false;
    
    console.log('✅ Carga inicial desde Google Sheets completada');
    
  } catch (error) {
    console.error('❌ Error en loadFromGoogleSheets:', error);
    loadButton.innerHTML = originalText;
    loadButton.disabled = false;
    alert('Error cargando datos: ' + error.message);
  }
}

// Variable global para almacenar asset groups
let currentAssetGroups = [];

// Función de galería simplificada (limpia)
function createSimpleImageGallery(images, itemGroupName) {
  if (!images || images.length === 0) {
    return '<div class="p-3"><h5>📂 ' + itemGroupName + '</h5><p>No hay imágenes disponibles.</p></div>';
  }

  let html = '<div class="simple-gallery-container p-3">';
  html += '<h5>📂 ' + itemGroupName + '</h5>';
  html += '<p class="text-muted">Total: ' + images.length + ' imágenes</p>';
  html += '<div class="image-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;">';
  
  images.forEach(function(asset) {
    const imageName = asset.Imagen || 'imagen-no-disponible.jpg';
    const imageUrl = 'assets/images/' + imageName;
    
    html += '<div class="image-item" style="text-align: center;">';
    html += '<img src="' + imageUrl + '" alt="' + imageName + '" ';
    html += 'style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;" ';
    html += 'onerror="this.src=\'assets/images/placeholder.jpg\'; this.style.opacity=\'0.5\';" ';
    html += 'onclick="showImageModal(\'' + imageUrl + '\', \'' + imageName + '\')" />';
    html += '<div class="image-name" style="font-size: 0.8em; margin-top: 5px;">' + imageName + '</div>';
    html += '</div>';
  });
  
  html += '</div></div>';
  return html;
}

// Modal para imágenes
function showImageModal(imageUrl, imageName) {
  let modal = document.getElementById('imageModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'imageModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: none; justify-content: center; align-items: center; cursor: pointer;';
    modal.onclick = function() { modal.style.display = 'none'; };
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = '<div style="max-width: 90%; max-height: 90%; text-align: center;"><img src="' + imageUrl + '" style="max-width: 100%; max-height: 80vh; object-fit: contain;" /><div style="color: white; margin-top: 10px; font-size: 14px;">' + imageName + '</div></div>';
  modal.style.display = 'flex';
}