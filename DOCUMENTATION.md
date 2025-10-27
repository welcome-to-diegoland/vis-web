# VIS-Web - Documentación Técnica y Log del Sistema

**Última actualización:** 27 de Octubre, 2025  
**Versión:** 1.0  
**Estado:** Producción

---

## 📋 Resumen Ejecutivo

**REVIW** es un sistema de gestión de galerías web para productos que facilita el trabajo rápido, fácil y seguro con imágenes y productos. 

### **Funcionalidades Principales:**
- **Gestión de Galerías**: Cargar y visualizar imágenes asignadas a productos con galerías cover optimizadas
- **Búsqueda Avanzada**: Buscador de Item Groups e imágenes para localización rápida de contenido
- **Sistema de Aprobaciones**: Workflow de aprobación de galerías con estados visuales y filtrado
- **Estructura Organizacional**: Filtrado de estructura jerárquica para navegación eficiente
- **Galerías Prearmadas**: Templates de galerías para asignación rápida según tipo de producto
- **Colaboración Multiusuario**: Sistema de comentarios asignados a imágenes, Item Codes e Item Groups
- **Workflow Optimizado**: Herramientas diseñadas para maximizar eficiencia en gestión de contenido visual

---

## 🏗️ Arquitectura General del Sistema

### Fuentes de Datos
- **Google Sheets Principal**: Conexión directa con 2 pestañas
  - **Pestaña "category"**: Datos de categorías y estructura organizacional
  - **Pestaña "asset_groups"**: Grupos de assets y configuraciones
- **Archivo de Optimización**: Carga mediante botón "Optimizar"
  - **Pestaña "data"**: Dataset completo (380,237 registros)
  - **Formato**: Attribute-Value (cada fila tiene campos Attribute y value)
- **Campos Clave**: Name, NamePath, WA_VIS_Cover, WA_VIS_Gallery, WA_VIS_Rest, filtro_color, vis_color

### Variables Globales de Datos
- `window.allItemGroupsData`: Dataset completo cargado desde Excel
- `currentAssetGroups`: Subset filtrado para dropdown de galería
- `window.globalData`: Cache para operaciones de búsqueda

### Flujo de Datos Principal
1. **Carga** → `loadExcelData()` → Parse Excel → `window.allItemGroupsData`
2. **Filtrado** → `populateGalleryDropdown()` → `currentAssetGroups`
3. **Búsqueda** → `performImageSearchNew()` → Extracción de imágenes
4. **Visualización** → `createImageGrid()` → Renderizado en DOM

### Funciones de Procesamiento de Datos

#### parseItemCodeData(concatenatedData)
- **Propósito**: Analiza datos concatenados y extrae información estructurada de objetos tipo "Item Code"
- **Parámetros**: `concatenatedData` - cadena de datos en formato Attribute¬Value§Attribute¬Value
- **Retorna**: Objeto con atributos parseados (Name, Marca, Título, CMS, etc.)
- **Formato de entrada**: `"Name¬Valor1§Marca¬Valor2§WA_VIS_Comment¬Comentario§..."`

#### parseImageData(concatenatedData)
- **Propósito**: Analiza datos concatenados y extrae información estructurada de objetos tipo "Image"
- **Parámetros**: `concatenatedData` - cadena de datos en formato Attribute¬Value§Attribute¬Value
- **Retorna**: Objeto con atributos parseados incluyendo todos los campos necesarios para la tabla
- **Formato de entrada**: `"Name¬Valor1§Marca¬Valor2§WA_VIS_Comment¬Comentario§..."`
- **Cambios recientes**: Expandido para incluir 7 atributos completos (Name, Marca, Título, CMS, Página de Catálogo, WA Importancia, WA_VIS_Comment)
- **Manejo de errores**: Incluye lógica para limpiar valores duplicados en atributos (ej: WA_VIS_Comment¬WA_VIS_Comment¬)

#### extractItemCodeCommentsFromProcessedData(data)
- **Propósito**: Filtra y extrae comentarios válidos de objetos "Item Code" 
- **Parámetros**: `data` - array de objetos procesados
- **Retorna**: Array de objetos con comentarios válidos para mostrar en tabla

#### extractImageCommentsFromProcessedData(data)
- **Propósito**: Filtra y extrae comentarios válidos de objetos "Image"
- **Parámetros**: `data` - array de objetos procesados  
- **Retorna**: Array de objetos con comentarios válidos para mostrar en tabla
- **Validación**: Requiere Object Type = 'Image', comentarios válidos (strings >3 caracteres, no solo nombre de atributo)
- **Cambios recientes**: Mejorada validación para filtrar comentarios vacíos o inválidos

---

## 🎯 Funcionalidades por Sección UX

## 1. Header y Navegación

### **Elementos UX:**
- Logo corporativo
- Título del sistema
- Botones de navegación principales

### **Funciones Técnicas:**
- **Archivos**: `index.html` (estructura), `styles.css` (estilos)
- **Datos**: Estáticos, no hay conexiones dinámicas
- **Estado**: Siempre visible, no cambia

---

## 2. Panel de Carga de Datos

### **Elementos UX:**
- Input file para seleccionar Excel
- Botón "Cargar Datos"
- Indicador de progreso/estado

### **Flujo de Usuario:**
1. Usuario selecciona archivo Excel
2. Click en "Cargar Datos"
3. Sistema procesa y muestra confirmación

### **Funciones Técnicas:**

#### `loadExcelData()`
- **Propósito**: Cargar y procesar archivo Excel
- **Input**: File object desde input[type="file"]
- **Output**: Populate `window.allItemGroupsData`
- **Conexiones**: 
  - → `populateGalleryDropdown()`
  - → Actualiza contadores en UI
- **Datos**: Convierte Excel a JSON, filtra registros válidos

```javascript
// Flujo de datos:
File → SheetJS → Raw JSON → Filter/Clean → window.allItemGroupsData
```

---

## 3. Sistema de Filtros y Búsqueda

### **Elementos UX:**
- Dropdown "Galería" (Asset Groups)
- Dropdown "Vista de Aprobación"
- Barra de búsqueda por texto
- Contadores de elementos

### **Flujo de Usuario:**
1. Seleccionar galería → Filtra dataset
2. Cambiar vista aprobación → Aplica reglas de color/visibilidad
3. Escribir búsqueda → Filtra en tiempo real

### **Funciones Técnicas:**

#### `populateGalleryDropdown()`
- **Propósito**: Llenar dropdown con Asset Groups únicos
- **Input**: `window.allItemGroupsData`
- **Output**: Options en select, `currentAssetGroups`
- **Datos**: Extrae valores únicos de campo AssetGroup

#### `applyFilterAndColors()`
- **Propósito**: Aplicar reglas de aprobación filtrada
- **Input**: Selección de dropdown aprobación
- **Trigger**: Change event en `approvalViewSelect`
- **Lógica**:
  - `normal`: Sin filtros
  - `approval-full`: Muestra todos con colores
  - `approval-filtered`: Solo muestra `filtro_color=0`
- **Conexiones**: → `applyApprovalColorsToGrid()`

#### `applyApprovalColorsToGrid()`
- **Propósito**: Aplicar colores de aprobación al grid
- **Input**: `window.allItemGroupsData`
- **Mapeo**: Busca por campo `Name` (no `NamePath` porque está vacío)
- **Colores**:
  - `vis_color=0` → `approval-green` (aprobado)
  - `vis_color=1` → `approval-orange` (pendiente)
- **CSS**: Border-left de 4px sólido

---

## 4. Grid Principal de Inventario

### **Elementos UX:**
- Tabla responsiva con columnas: Item Code, Description, Tags, etc.
- Cells expandibles (hasta 100 caracteres)
- Indicadores de color de aprobación
- Botones de acción por fila

### **Flujo de Usuario:**
1. Datos se cargan automáticamente después de procesar Excel
2. Usuario puede expandir celdas largas
3. Colores indican estado de aprobación
4. Click en acciones navega a otras vistas

### **Funciones Técnicas:**

#### `createDataTable()`
- **Propósito**: Renderizar tabla principal de inventario
- **Input**: Array de datos filtrados
- **Output**: HTML table en DOM
- **Características**:
  - Truncado inteligente a 100 caracteres
  - Botones "Ver más/menos"
  - Links a visualizador
- **Conexiones**: Recibe datos de filtros aplicados

#### `truncateTextForTable(text, maxLength=100)`
- **Propósito**: Manejar texto largo en celdas
- **Input**: String, longitud máxima
- **Output**: String truncado + botón expandir
- **UX**: Mejora legibilidad sin comprometer información

---

## 5. Box 3 - Sistema de Búsqueda de Imágenes

### **Elementos UX:**
- Input de búsqueda de Item Codes
- Botón "Buscar Imágenes"
- Grid de imágenes resultantes
- Contador de resultados

### **Flujo de Usuario:**
1. Usuario ingresa Item Code (ej: "01-001-001")
2. Click "Buscar Imágenes"
3. Sistema encuentra Item Codes relacionados
4. Extrae y muestra imágenes disponibles

### **Funciones Técnicas:**

#### `performImageSearchNew()`
- **Propósito**: Buscar imágenes por Item Code
- **Input**: String de búsqueda desde input
- **Dataset**: `window.allItemGroupsData` (380,237 registros)
- **Lógica de Búsqueda**:
  1. Buscar registros donde `Attribute="Item Code"` y `value` contiene búsqueda
  2. Extraer `Name` de registros encontrados
  3. Buscar imágenes en `WA_VIS_Cover`, `WA_VIS_Gallery`, `WA_VIS_Rest`
  4. Convertir paths a URLs válidas
- **Output**: Array de objetos `{itemCode, imageUrl}`
- **Conexiones**: → `createImageGrid()`

#### `createImageGrid(imageData)`
- **Propósito**: Renderizar grid de imágenes
- **Input**: Array de `{itemCode, imageUrl}`
- **Output**: HTML grid con imágenes
- **Características**:
  - Lazy loading de imágenes
  - Fallback para imágenes rotas
  - Responsive grid layout
- **Manejo de Errores**: Placeholder para imágenes no encontradas

### **Datos y Conexiones:**
```javascript
// Flujo de búsqueda:
User Input → performImageSearchNew() → Filter by Item Code → 
Extract Names → Find Image Fields → Convert to URLs → 
createImageGrid() → Render DOM
```

---

## 6. Tabla de Comentarios de Inventario

### **Elementos UX:**
- Tabla especializada para mostrar elementos con comentarios
- Columnas: #, ID, Object Type, CMS, Marca, Título, Imp, Imagen, Analista, 1º Fecha, Fecha Analista, Comentario Analista, Diseñador, Fecha Diseño, Comentario Diseñador, Tipo, Status
- **Celdas Clickables**: Todas las celdas de información (analista, fechas, comentarios, diseñador) abren modal de historial
- Botones de filtros y asignación de diseñadoras
- Estados visuales con colores de aprobación

### **Flujo de Usuario:**
1. Activar "Vista de datos" para mostrar tabla de comentarios
2. **Click en cualquier celda clickable** para ver historial completo de comentarios
3. Usar filtros para refinar vista
4. Asignar diseñadoras a elementos específicos

### **Funciones Técnicas:**

#### `generateImageInventoryTable()`
- **Propósito**: Generar tabla completa de inventario con comentarios
- **Input**: Array de datos procesados
- **Output**: HTML table con elementos clickables
- **Características**:
  - Extrae comentarios de Item Codes e Images
  - Parsea información detallada (analista, diseñador, fechas, estados)
  - Configura event listeners para interactividad

#### `setupInventoryClickListeners()`
- **Propósito**: Configurar interactividad de celdas en tabla
- **Funcionalidad**: 
  - **Celdas de analista**: Abren modal de historial
  - **Fechas (1º Fecha, Fecha Analista, Fecha Diseño)**: Abren modal de historial completo
  - **Comentarios**: Abren modal de historial
  - **Diseñador**: Abren modal de historial
  - **Status**: Navegación a Item Group
- **Tipos soportados**: `analista-clean`, `fecha-analista`, `fecha-diseñador`, `diseñador-clean`, `analista-comment-clean`, `diseñador-comment-clean`, `tipo-clean`

#### Interactividad de Fechas
- **Fechas de Item Codes**: Usan `data-item-name` y `data-item-id` para buscar en `allLibraryData`
- **Fechas de Images**: Usan `data-image-name` para buscar comentarios de imagen
- **Modal resultante**: Muestra historial completo parseado con `parseCommentsFromExcel()`

### **Datos y Conexiones:**
```javascript
// Flujo de clicks en fechas:
Click en fecha → setupInventoryClickListeners() → 
Detectar tipo (fecha-analista/fecha-diseñador) → 
Buscar datos (Item/Image) → openCommentModal() → 
Mostrar historial completo
```

---

## 7. Sistema de Estados de Aprobación

### **Elementos UX:**
- Dropdown con opciones: Normal, Aprobación Completa, Aprobación Filtrada
- Colores en grid (verde/naranja)
- Filtrado automático en vista filtrada

### **Flujo de Usuario:**
1. Cambiar dropdown de aprobación
2. Sistema aplica filtros y colores automáticamente
3. Grid se actualiza visualmente

### **Funciones Técnicas:**

#### Estados de Aprobación:
- **Normal**: Sin filtros ni colores especiales
- **Approval-Full**: Muestra todos los elementos con colores de estado
- **Approval-Filtered**: Solo muestra elementos con `filtro_color=0`

#### Lógica de Colores:
- **Verde** (`approval-green`): `vis_color=0` - Aprobado
- **Naranja** (`approval-orange`): `vis_color=1` - Pendiente de aprobación

#### `removeApprovalColorsFromGrid()`
- **Propósito**: Limpiar colores de aprobación
- **Acción**: Remover clases CSS de grid
- **Trigger**: Cambio a vista "Normal"

---

## 🔄 Log de Cambios y Evolución

### **27 de Octubre, 2025 - Tablas de Resumen Optimizadas**

#### 📊 **Reorganización de Columnas en Tablas de Resumen**
- **Cambio**: Intercambiadas columnas Com y Can en ambas tablas (Diseñadores y Analistas)
- **Antes**: `Diseño | Total | Act | Rev | Dis | Can | Com`
- **Después**: `Diseño | Total | Act | Rev | Dis | Com | Can`
- **Motivo**: Mejor flujo visual al priorizar elementos completados antes que cancelados
- **Impacto**: Headers y datos reordenados consistentemente, colores CSS actualizados

#### 🎨 **Corrección de Colores de Headers**
- **Problema**: Headers Com y Can tenían colores intercambiados tras reorganización
- **Solución**: Actualizado CSS para reflejar nueva posición de columnas:
  - **Com** (6ª columna): Verde (#4ba76f)
  - **Can** (7ª columna): Gris (#8a8a8a)
- **Archivos**: Modificado `styles.css` líneas 6673-6680

#### 🔧 **Corrección de Funcionalidad de Filtros para Verónica**
- **Problema**: Click en fila "Verónica" mostraba números correctos pero filtrado fallaba
- **Causa**: Inconsistencia en normalización de nombres con acentos entre generación y filtrado
- **Solución**: 
  - Movida función `normalizeDesignerName()` al scope global
  - Aplicada normalización en `filterInventoryByUser()` y `filterInventoryByUserAndStatus()`
  - Mapeo: 'Verónica' ↔ 'Veronica' para compatibilidad con datos
- **Impacto**: Todos los filtros funcionan correctamente independiente de acentos

#### 🧹 **Limpieza de Logs de Producción**
- **Acción**: Removidos console.log de funciones de filtrado y estadísticas:
  - `setupStatsTableListeners()`
  - `filterInventoryByUser()`, `filterInventoryByUserAndStatus()`
  - `clearInventoryFilter()`, `updateInventoryDisplay()`
  - `generateDesignerStatsTable()`, `setupClickableElements()`
- **Beneficio**: Código limpio sin logs de debug en producción

### **Noviembre, 2025 - Mejoras en Procesamiento de Objetos Image**

#### ⚡ **Expansión de parseImageData() para Tabla Completa**
- **Problema**: Los objetos Image solo mostraban Name y WA_VIS_Comment en la tabla, faltaban CMS, Marca, Título
- **Solución**: Expandido parseImageData() de 2 a 7 atributos:
  - Name, Marca, Título, CMS, Página de Catálogo, WA Importancia, WA_VIS_Comment
- **Impacto**: Tabla de comentarios ahora muestra información completa para objetos Image

#### 🛠️ **Corrección de Parsing con Atributos Duplicados**
- **Problema**: Datos con formato `WA_VIS_Comment¬WA_VIS_Comment¬` causaban errores de parsing
- **Solución**: Agregada lógica de limpieza de valores duplicados en parseImageData()
- **Comportamiento**: Si un valor contiene el nombre del atributo duplicado, se limpia automáticamente

#### 🔍 **Optimización de Filtrado de Comentarios Image**
- **Mejoras en extractImageCommentsFromProcessedData()**:
  - Validación estricta: strings >3 caracteres
  - Filtrado de comentarios vacíos o que solo contengan el nombre del atributo
  - Mejor manejo de datos inconsistentes
- **Resultado**: Tabla más limpia con solo comentarios válidos

#### 🧹 **Limpieza de Logs de Debug**
- **Acción**: Removidos console.log de funciones de procesamiento Image:
  - hasItemGroupImageComments()
  - getItemGroupImageComments() 
  - extractImageCommentsFromProcessedData()
  - getImageComments()
- **Beneficio**: Código de producción sin logs innecesarios

#### 🖱️ **Fechas Clickables en Tabla de Comentarios**
- **Funcionalidad**: Todas las celdas de fecha ahora son clickables y abren modal de historial
- **Celdas afectadas**: 
  - 1º Fecha (primera fecha analista)
  - Fecha Analista (última fecha analista)
  - Fecha Diseño (fecha diseñador)
- **Implementación**:
  - Agregada clase `clickable-comment-clean` a celdas de fecha
  - Tipos de comentario: `fecha-analista`, `fecha-diseñador`
  - Lógica actualizada en `setupInventoryClickListeners()`
- **UX**: Consistencia total - cualquier celda relevante abre el historial completo

### **27 de Octubre, 2025 - Versión Estable**

#### **Problemas Resueltos:**
1. **Box 3 Búsqueda de Imágenes** - CRÍTICO
   - **Problema**: Búsqueda retornaba resultados vacíos
   - **Causa**: Uso incorrecto de `currentAssetGroups` en lugar de `window.allItemGroupsData`
   - **Solución**: Cambiar fuente de datos y adaptar lógica para formato Attribute-Value
   - **Impacto**: Sistema de búsqueda completamente funcional

2. **Sistema de Aprobación Filtrada** - FUNCIONAL
   - **Problema**: "Aprobación Filtrada" ocultaba todos los elementos
   - **Causa**: Campos vacíos (`""`) se convertían en `NaN` en lugar de `0`
   - **Solución**: Tratar campos vacíos como `0` en lógica de filtrado
   - **Impacto**: Filtrado funcional según reglas de negocio

3. **Colores de Aprobación en Grid** - VISUAL
   - **Problema**: No había indicación visual de estados de aprobación
   - **Implementación**: Sistema de colores con border-left
   - **Mapeo**: Por campo `Name` (no `NamePath` por datos vacíos)
   - **Impacto**: UX mejorada con feedback visual claro

4. **Limpieza de Código** - MANTENIMIENTO
   - **Acción**: Remoción de todos los console.log de debug
   - **Beneficio**: Código listo para producción

#### **Arquitectura Final:**
- **Búsqueda**: `performImageSearchNew()` con dataset completo
- **Filtrado**: `applyFilterAndColors()` con manejo robusto de campos vacíos
- **Visualización**: Sistema de colores CSS con especificidad correcta
- **Datos**: Mapeo por `Name` field para compatibilidad con dataset

---

## 🔧 Guía de Mantenimiento

### **Para Desarrolladores:**

#### **Añadir Nueva Funcionalidad:**
1. Identificar fuente de datos requerida
2. Crear función específica siguiendo patrón existente
3. Conectar con sistema de eventos del DOM
4. Actualizar esta documentación

#### **Debugging:**
- Verificar `window.allItemGroupsData` está cargado
- Confirmar formato Attribute-Value en datos
- Revisar mapeo por campo `Name` vs `NamePath`
- Validar estados de aprobación (`filtro_color`, `vis_color`)

#### **Extensiones Futuras:**
- Sistema de filtros avanzados
- Export a diferentes formatos
- Gestión de usuarios y permisos
- API backend para persistencia

### **Para Usuarios:**
1. **Cargar Datos**: Seleccionar archivo Excel válido
2. **Filtrar**: Usar dropdown de galería para subset específico
3. **Buscar Imágenes**: Ingresar Item Code en Box 3
4. **Ver Aprobaciones**: Cambiar vista en dropdown de aprobación
5. **Navegar**: Usar botones de acción para visualizador

---

## 📚 Referencias Técnicas

### **Dependencias:**
- **SheetJS**: Para procesamiento de archivos Excel
- **Vanilla JavaScript**: No frameworks externos
- **CSS Grid/Flexbox**: Para layouts responsivos

### **Archivos Principales:**
- `index.html`: Estructura principal
- `script.js`: Lógica de aplicación (1,500+ líneas)
- `styles.css`: Estilos y layouts
- `data/vis-data.xlsx`: Dataset principal

### **Browser Compatibility:**
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

---

## 🤖 Guía para Agente AI - Actualización de Documentación

### **Trigger para Actualizar:**
Cuando el usuario escriba: **"📝 DOCS: Ya está listo, agrega a documentación"**

### **Proceso Automático:**
1. **🔍 Analizar** el cambio descrito por el usuario
2. **📍 Identificar** la sección UX correcta (Box 3, Grid, Filtros, etc.)
3. **🔧 Detectar** qué funciones se modificaron basado en el contexto de trabajo
4. **📝 Crear** subsección "Log de Cambios" en la sección apropiada con formato:

```markdown
### **📝 Log de Cambios - [Nombre Sección]**
- **[Fecha]** - **[TIPO]**: Descripción del cambio
  - **Problema**: Qué estaba fallando
  - **Solución**: Cómo se solucionó  
  - **Impacto**: Qué mejoró
  - **Funciones**: Lista de funciones modificadas
```

5. **🔄 Actualizar** descripciones de sección si es necesario
6. **📅 Cambiar** fecha de "Última actualización" en header

### **Tipos de Cambio:**
- **CRÍTICO**: Funcionalidad rota que se arregló
- **FUNCIONAL**: Nueva funcionalidad o mejora
- **VISUAL**: Cambios de UI/UX
- **PERFORMANCE**: Optimizaciones
- **MANTENIMIENTO**: Limpieza de código, refactoring

### **Ubicación de Logs:**
- Agregar en la sección UX específica donde ocurrió el cambio
- Mantener también log general al final si afecta múltiples secciones

---

*Este documento será actualizado con cada cambio significativo al sistema.*