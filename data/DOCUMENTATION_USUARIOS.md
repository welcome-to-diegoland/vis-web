# REVIW - Gestión de Usuarios y Configuración

**Última actualización:** 3 de Marzo, 2026  
**Documento Complementario a:** DOCUMENTATION.md

---

## 👥 ¿Qué es REVIW? - Descripción General

REVIW es una plataforma web de gestión de galerías y productos que funciona como intermediaria entre **Google Sheets** (datos) y un equipo de trabajo distribuido. Su propósito es:

- **Facilitar la colaboración**: Analistas y diseñadores trabajan en paralelo en el mismo contenido
- **Organizar el trabajo**: Sistema de asignación de comentarios y tareas a usuarios específicos
- **Mantener registro**: Historial completo de comentarios con auditoría de quién hizo qué y cuándo
- **Mejorar eficiencia**: Workflow visual y búsqueda avanzada para localización rápida

---

## 📊 Estructura de Grupos de Usuarios

El sistema tiene **tres niveles jerárquicos** de usuarios:

| Grupo | Función | Permisos | Usuarios |
|-------|---------|----------|----------|
| **Admin** | Control total del sistema | Acceso completo, cambio de datos | Diego, Rafael, Daniela, Esteban |
| **Analista** | Revisión y asignación de trabajo | Analizar contenido, asignar a diseñadores | Sandra, Victor, Ximena, Carlos, Kalem, Arturo |
| **Diseño** | Ejecución de trabajos gráficos | Recibir asignaciones, agregar comentarios | Veronica, Rossana, Carla, Grecia, Thanya, Cinthya, Karen |

---

## 🐛 El Problema de Karen - Caso de Estudio Completo

### **Descripción del Bug**

Cuando se le asignaba un comentario a Karen, aparecía en la columna de **Analista** en lugar de **Diseño**, aunque:
- Karen estaba correctamente definida como grupo "Diseño" en la configuración
- Otros diseñadores funcionaban correctamente
- El problema solo afectaba la visualización, no los datos subyacentes

### **Causa Raíz - Análisis Técnico**

El sistema tiene **DOS listas hardcodeadas** de diseñadores utilizadas para clasificar comentarios:

**Lista 1 - Línea 6738:**
```javascript
const diseñadoresConocidos = ['Veronica', 'Verónica', 'Cinthya', 'Thanya', 'Grecia', 'Rossana', 'Carla', 'Gabriela', 'Karen'];
```
✅ **Karen ESTÁ incluida**

**Lista 2 - Línea 11870:**
```javascript
const diseñadoresConocidos = ['Veronica', 'Verónica', 'Rossana', 'Carla', 'Gabriela', 'Thanya', 'Grecia', 'Cinthya'];
```
❌ **Karen NO ESTÁ incluida** ← AQUÍ ESTÁ EL PROBLEMA

### **Cómo Funcionaba la Clasificación**

La función `getLatestDesignerComment()` (línea 5054) clasifica comentarios así:

```javascript
function getLatestDesignerComment(parsedComments) {
  for (let i = parsedComments.length - 1; i >= 0; i--) {
    const comment = parsedComments[i];
    if (comment && comment.usuario) {
      const userName = comment.usuario.toLowerCase().trim();
      const userConfig = VALID_USERS[userName];
      // BÚSQUEDA: ¿está el usuario en la lista de diseñadores?
      if (userConfig && userConfig.group === 'Diseño') {
        return comment.textoComentario || '-'; // Lo clasifica como "Diseño"
      }
    }
  }
  return '-'; // Si no encuentra, lo declasifica
}
```

El problema: si Karen no estaba en la lista `diseñadoresConocidos` en una de las ubicaciones, la lógica fallaba en ese punto del código.

### **Solución Implementada - 3 Pasos**

**Paso 1: Identificar el problema**
- Se realizó búsqueda de "Karen" en todo el script.js
- Se encontró que estaba en una lista pero no en la otra

**Paso 2: Restaurar integridad**
- Se agregó `'Karen'` a la lista de línea 11870

**Paso 3: Verificar**
- Probar que Karen ahora aparece correctamente en columna "Diseño"

**Código Antes:**
```javascript
// Línea 11870 - ANTES (INCORRECTO)
const diseñadoresConocidos = ['Veronica', 'Verónica', 'Rossana', 'Carla', 'Gabriela', 'Thanya', 'Grecia', 'Cinthya'];
```

**Código Después:**
```javascript
// Línea 11870 - DESPUÉS (CORRECTO)
const diseñadoresConocidos = ['Veronica', 'Verónica', 'Rossana', 'Carla', 'Gabriela', 'Thanya', 'Grecia', 'Cinthya', 'Karen'];
```

**Cambios Realizados:**
- Archivo: `script.js`
- Líneas afectadas: 11870
- Commit: `95be146`
- Mensaje: "Corregido: Karen aparecía en columna de Analista y sanitización de saltos de línea en comentarios"

### **Resultado Final**

✅ Karen ahora aparece correctamente en la columna **Diseño**  
✅ Sus comentarios se clasifican como "comentarios de diseño"  
✅ No se perdió historial o datos

---

## ⚙️ Cómo Agregar/Quitar Usuarios del Modal de Asignación

### **Concepto Clave: Tres Niveles de Control**

Estos son tres lugares diferentes donde aparecen los usuarios en el código, con efectos distintos:

| Concepto | Ubicación | Efecto | Cuándo se usa |
|----------|-----------|--------|---------------|
| **Definición de Usuario** | `VALID_USERS` (línea 8-27) y `USERS` (línea 632-730) | Usuario puede hacer login y acceder al sistema | Cuando alguien necesita acceso inicial |
| **Clasificación de Comentarios** | `diseñadoresConocidos` (línea 6748, 11870) y `analistasConocidos` | Comentarios se clasifican correctamente en columnas | Cuando necesitas que comentarios viejos aparezcan bien |
| **Opción de Asignación** | `renderDesignersList()` (línea 13260) | Usuario aparece en modal para asignar | Cuando alguien puede recibir nuevas asignaciones |

### **Ejemplo Práctico: Caso Gabriela**

**Objetivo:** Gabriela sigue siendo usuario del sistema y sus comentarios antiguos siguen viéndose, pero NO puede recibir nuevas asignaciones.

**Implementación:**

**Mantener estos 2 lugares (permitir login y clasificación):**
```javascript
// Línea 24 - MANTENER en VALID_USERS
'gabriela': { password: '4321', group: 'Diseño' },

// Línea 688-691 - MANTENER en USERS
gabriela: {
  name: 'Gabriela',
  group: 'Diseño',
  displayName: 'Gabriela (Diseño)'
},

// Línea 6748 - MANTENER en primera lista
const diseñadoresConocidos = [..., 'Gabriela', ...];

// Línea 11870 - MANTENER en segunda lista
const diseñadoresConocidos = [..., 'Gabriela', ...];
```

**Modificar este 1 lugar (excluir del modal):**
```javascript
// Línea 13260 - MODIFICAR renderDesignersList()
function renderDesignersList() {
  const designersContainer = document.getElementById('designersList');
  // ← Agregar "&& user !== 'gabriela'" al filtro
  const designers = Object.keys(USERS).filter(user => 
    USERS[user].group === 'Diseño' && user !== 'gabriela'
  );
  // ... resto del código
}
```

**Resultado:**
- ✓ Gabriela puede hacer login
- ✓ Sus comentarios antiguos aparecen en columna Diseño
- ✗ NO aparece en modal para asignar nuevos comentarios

---

## 🔧 Guía Completa: Cómo Agregar un Usuario Nuevo al Sistema

### **Requisitos Previos**

Cuando agregas un usuario nuevo, **SIEMPRE debes modificar 4 lugares** en el código:

1. Sistema de autenticación (`VALID_USERS`)
2. Sistema de información del usuario (`USERS`)
3. Clasificación de comentarios (`diseñadoresConocidos` o `analistasConocidos`)
4. Modal de asignación (exclusiones en `renderDesignersList()`)

### **Paso 1️⃣: Agregar a VALID_USERS (Línea 8-27)**

Este objeto valida las credenciales de login.

```javascript
const VALID_USERS = {
  'sandra': { password: '1234', group: 'Analista' },
  'victor': { password: '1234', group: 'Analista' },
  // ... más usuarios ...
  'sofia': { password: 'Tu_Contraseña_Segura', group: 'Diseño' }, // ← AGREGAR AQUÍ
};
```

**Notas importantes:**
- La clave (`'sofia'`) debe estar en minúsculas y sin acentos
- El `group` debe ser exactamente: `'Analista'`, `'Diseño'` o `'Admin'`
- La contraseña es solo para login inicial (después se usa en el sistema)

### **Paso 2️⃣: Agregar a USERS (Línea 632-730)**

Este objeto almacena información legible del usuario para mostrar en la UI.

```javascript
const USERS = {
  sandra: {
    name: 'Sandra',                   // Sin acentos (para comparaciones técnicas)
    group: 'Analistas',               // NOTA: Plural en USERS
    displayName: 'Sandra (Analistas)' // Con acentos (para mostrar)
  },
  // ... más usuarios ...
  sofia: {                            // ← AGREGAR AQUÍ (minúsculas como clave)
    name: 'Sofía',                    // Con acento (como lo mostraremos)
    group: 'Diseño',                  // Grupo exacto
    displayName: 'Sofía (Diseño)'     // Mostrar en UI
  },
};
```

**Notas importantes:**
- En `VALID_USERS` los grupos son: `'Analista'`, `'Diseño'`, `'Admin'` (sin plural excepto Admin)
- En `USERS` los grupos son: `'Analistas'`, `'Diseño'`, `'Admin'` (algunos son plural)
- El `name` debe coincidir con cómo aparece en comentarios

### **Paso 3️⃣: Agregar a Listas de Clasificación (Línea 6748 y 11870)**

Estos arrays determinan de qué grupo es cada usuario para clasificar comentarios.

```javascript
// Línea 6748 - Primera ubicación
const diseñadoresConocidos = [
  'Veronica', 'Verónica', 'Cinthya', 'Thanya', 
  'Grecia', 'Rossana', 'Carla', 'Gabriela', 'Karen',
  'Sofía'  // ← AGREGAR AQUÍ
];

// Línea 11870 - Segunda ubicación
const diseñadoresConocidos = [
  'Veronica', 'Verónica', 'Rossana', 'Carla', 
  'Gabriela', 'Thanya', 'Grecia', 'Cinthya', 'Karen',
  'Sofía'  // ← AGREGAR AQUÍ
];

// Si es Analista, agregar a analistasConocidos en lugar de diseñadoresConocidos:
const analistasConocidos = [
  'Victor', 'Carlos', 'Kalem', 'Diego', 'Sandra', 'Ximena',
  'Juan'  // ← Si Juan es Analista, aquí va
];
```

**Regla de Oro:**
- Si el usuario es **'Diseño'** → agregar a `diseñadoresConocidos`
- Si el usuario es **'Analista'** → agregar a `analistasConocidos`

### **Paso 4️⃣: (Futuro) Exclusiones en renderDesignersList() (Línea 13260)**

Este paso solo es necesario SI en el futuro QUIERES EXCLUIR al usuario.

```javascript
function renderDesignersList() {
  const designersContainer = document.getElementById('designersList');
  const designers = Object.keys(USERS).filter(user => 
    USERS[user].group === 'Diseño' && 
    user !== 'gabriela' &&        // Ya excluida
    user !== 'sofia'              // ← Agregar si quieres excluir a Sofía
  );
  // ... resto del código
}
```

---

## 📋 Checklist: Verificar que el Usuario fue Agregado Correctamente

Después de hacer los 4 cambios, verifica:

- [ ] ¿El usuario puede hacer login? (verificar en VALID_USERS)
- [ ] ¿El nombre aparece correcto en el sistema? (verificar en USERS)
- [ ] ¿Los comentarios se clasifican en la columna correcta? (verificar en diseñadoresConocidos/analistasConocidos)
- [ ] ¿El usuario aparece en el modal de asignación? (verificar que NO está excluido en renderDesignersList)
- [ ] ¿Si es Diseño, aparece el checkbox en el modal? (debe estar en diseñadoresConocidos)

---

## 📝 Resumen de Cambios Recientes (Marzo 2026)

### **Corrección 1: Karen en Columna de Analista**
- **Fecha**: 3 de Marzo, 2026
- **Problema**: Karen aparecía como Analista en lugar de Diseño cuando recibía asignaciones
- **Causa Raíz**: Faltaba en lista `diseñadoresConocidos` en línea 11870 (desincronización entre dos listas)
- **Solución**: Agregar `'Karen'` a la lista de línea 11870 para sincronizar
- **Archivo Afectado**: `script.js` línea 11870
- **Commit**: `95be146`
- **Lecciones Aprendidas**: 
  - Las dos listas `diseñadoresConocidos` deben estar sincronizadas
  - Un usuario excluido de una lista fallará la clasificación de comentarios

### **Corrección 2: Sanitización de Saltos de Línea en Comentarios**
- **Fecha**: 3 de Marzo, 2026
- **Problema**: Comentarios con Enter (\n) se guardaban mal en Excel, creando celdas multi-línea
- **Causa Raíz**: No había procesamiento del texto antes de guardarlo
- **Solución**: Función `sanitizeCommentText()` que reemplaza todos los saltos de línea por ". "
  ```javascript
  function sanitizeCommentText(text) {
    if (!text) return '';
    // Reemplazar \r\n (Windows), \r (Mac antiguo) y \n (Unix/Mac)
    return text.replace(/\r\n|\r|\n/g, '. ').trim();
  }
  ```
- **Ubicación**: Función creada en línea 5654-5660, usada en línea 5833-5835
- **Archivo Afectado**: `script.js`
- **Commit**: `95be146`
- **Lecciones Aprendidas**: 
  - Excel no maneja bien saltos de línea en campos de datos
  - Normalizar entrada del usuario antes de guardar

### **Corrección 3: Gabriela Excluida de Asignaciones Nuevas**
- **Fecha**: 3 de Marzo, 2026
- **Problema**: Se necesitaba que Gabriela no reciba nuevas asignaciones, pero sus comentarios antiguos sigan siendo visibles
- **Causa Raíz**: Sistema no permitía "ocultar" un usuario sin perder su historial
- **Solución**: Filtro en `renderDesignersList()` que excluye a Gabriela solo del modal de asignación
  ```javascript
  const designers = Object.keys(USERS).filter(user => 
    USERS[user].group === 'Diseño' && user !== 'gabriela'
  );
  ```
- **Archivo Afectado**: `script.js` línea 13260
- **Commit**: `a776659`
- **Lecciones Aprendidas**: 
  - Hay diferencia entre "usuario del sistema" y "opción de asignación"
  - Mantener datos históricos pero excluir de operaciones futuras requiere filtros específicos

---

## 🔗 Referencias Relacionadas

- **Archivo de Documentación Principal**: `data/DOCUMENTATION.md`
- **Script Principal**: `script.js`
- **Archivo de Configuración**: `index.html` (credenciales de login y estructura HTML)

---

**Documento Actualizado:** 3 de Marzo, 2026  
**Autor**: Sistema de Documentación Técnica REVIW  
**Versión**: 1.0
