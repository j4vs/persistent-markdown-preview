# Persistent Markdown Preview

Extensión de VS Code para mantener múltiples vistas previas Markdown independientes, incluso de documentos sin guardar. Cada panel conserva su documento y su posición de scroll.

## Instalar el VSIX

En VS Code abre **Extensiones → … → Instalar desde VSIX…** y selecciona `persistent-markdown-preview-1.5.2.vsix`. También puedes ejecutar:

```powershell
code --install-extension ./persistent-markdown-preview-1.5.2.vsix
```

No necesitas Node.js ni instalar dependencias para utilizar el VSIX. Requiere VS Code 1.95 o posterior. El identificador es `smartsys-mx.persistent-markdown-preview`, de [Smartsys](https://smartsys.mx/). Instalar el VSIX no requiere una cuenta de Marketplace.

Si tenías instalada la versión con publisher `jdt-local`, desinstálala antes de instalar esta: el cambio de publisher crea una identidad distinta y ambas podrían aparecer como extensiones separadas.

## Uso

1. Abre un archivo Markdown o crea un documento con Ctrl+N y selecciona el lenguaje **Markdown**.
2. Ejecuta **Persistent Markdown Preview: Open Preview**, pulsa el icono de preview del editor o **Ctrl+Shift+Alt+V** (macOS: Cmd+Shift+Alt+V).
3. Vuelve al documento y repite el comando para crear otra preview, con scroll independiente.

Cada preview nueva inicia en el bloque Markdown correspondiente a la línea del cursor (o el bloque anterior más cercano). Esta posición se toma solo al abrir: mover el cursor después no desplaza la preview. Las previews existentes y restauradas conservan su propio scroll.

**Open Preview siempre crea un panel nuevo.** **Open or Reveal Preview** enfoca el primero que ya exista para el documento. El atajo se puede cambiar en los métodos abreviados de teclado de VS Code.

El contenido cambia tras una pausa de 150 ms al escribir. Cambiar de editor no cambia la asociación de ningún panel. Se conserva el scroll absoluto en píxeles: si se elimina suficiente contenido para que el documento sea más corto, el navegador limita la posición al final disponible.

## Desarrollo y F5

Abre esta carpeta raíz en VS Code. Requiere Node.js 22 o posterior y npm.

```powershell
npm install
npm run compile
```

Pulsa **F5** y selecciona **Persistent Markdown Preview** si VS Code solicita una configuración. La tarea previa compila automáticamente y abre un **Extension Development Host**. Prueba los comandos en esa nueva ventana. Tras editar el código, vuelve a iniciar F5 para cargar la compilación nueva.

```powershell
npm test
npm run test:host
npm run package
```

El comando `package` genera el VSIX en la raíz, con el renderer incluido y sin dependencias externas de ejecución. `npm ci` permite reconstruir usando el lockfile. Las pruebas de navegador usan Edge en Windows; en otros entornos instala Chromium con `npx playwright install chromium` o define `PREVIEW_TEST_BROWSER` con la ruta del navegador. `test:host` abre una instalación aislada de VS Code para verificar los comandos reales; usa la instalación estándar de Windows o `VS_CODE_EXECUTABLE`.

## Persistencia y límites

- Estilo oscuro fijo inspirado en AnuPpuccin Mocha antiguo: fondo `#1e1e2e`, texto `#d9e0ee`, títulos por color, tamaño base de 14 px, interlineado 1.6 y ancho máximo de 980 px. Por defecto, el texto usa la fuente de interfaz de VS Code y el código usa la fuente del editor.
- Cada tabla tiene un ícono de copia centrado verticalmente a la derecha de su encabezado, visible al pasar el cursor sobre el encabezado o enfocar el botón con teclado. Copia el Markdown original, incluidos enlaces, negritas y alineación. Muestra un check durante dos segundos y luego vuelve a copiar. En dispositivos táctiles permanece visible.
- Los bloques delimitados por tres comillas inversas muestran su lenguaje (`php`, `md`, `txt`, `bash`, etc.) y un botón de copia siempre visible. Sin lenguaje muestran **Código**. La copia contiene solo el código, sin los delimitadores, y confirma con el mismo check de dos segundos.
- Resaltado de sintaxis local con Highlight.js según el lenguaje declarado. El texto sin lenguaje, `txt` y los lenguajes desconocidos se mantienen como texto plano. Mermaid conserva el diagrama y permite copiar su definición desde el encabezado.
- Tablas y bloques tienen esquinas redondeadas y encabezados que permanecen visibles durante el scroll, hasta alcanzar el final del elemento. Las tablas conservan la alineación entre encabezado y columnas al desplazarlas horizontalmente.
- La flecha junto a cada encabezado permite contraer o expandir su contenido hasta el siguiente encabezado del mismo nivel o superior. Los subapartados conservan su propio estado.
- Desde 1380 px de ancho, el índice se muestra automáticamente a la derecha sin superponer el contenido. Su botón de cierre permite ocultarlo; **Mostrar índice** permite recuperarlo. En ventanas estrechas se usa un menú que se cierra automáticamente al seleccionar una sección. Al navegar se expanden los antecesores necesarios.
- El índice y las secciones plegadas se guardan por preview y se conservan al actualizar contenido o restaurar la pestaña. Cambiar el texto de un encabezado puede reiniciar su estado de plegado.
- Los colores y la paleta Mermaid permanecen iguales aunque cambies el tema de VS Code. No se distribuyen fuentes ni se requiere Obsidian para usar la extensión.

En **Ajustes → Persistent Markdown Preview** puedes cambiar las siguientes opciones. Se aplican inmediatamente a las previews abiertas:

| Opción | Valor predeterminado | Uso |
| --- | --- | --- |
| `persistentMarkdownPreview.fontSize` | `14` | Tamaño base en píxeles, de 8 a 48. |
| `persistentMarkdownPreview.textFontFamily` | Vacío | Fuente de interfaz de VS Code; puedes escribir `Inter, sans-serif`. |
| `persistentMarkdownPreview.codeFontFamily` | Vacío | Fuente del editor; puedes escribir `Cascadia Code, monospace`. Se aplica a código inline y bloques. |

- Cada panel usa `retainContextWhenHidden`, `getState/setState` y un serializador para recuperar el estado cuando VS Code restaura sus pestañas.
- El estado guarda una instantánea Markdown local, además del scroll. Si el documento original no está disponible al restaurar, se muestra esa instantánea; no se recrea ni se sobrescribe el archivo fuente.
- La asociación es por URI. Guardar un Untitled por primera vez, usar Guardar como o renombrar el archivo puede cambiar su URI: abre una preview desde el nuevo documento para seguir editándolo. El panel anterior conserva la última instantánea de la URI original. Cerrar o descartar el editor tampoco cierra sus previews.
- Imágenes relativas: se resuelven respecto a la carpeta del documento guardado, dentro del espacio de trabajo (o su carpeta si no pertenece a uno). Untitled no tiene directorio base. Las imágenes remotas requieren conexión.
- Enlaces a encabezados funcionan dentro del panel. Los enlaces web se abren externamente; los enlaces a archivos se abren como documentos. No se ejecutan enlaces `command:` ni JavaScript.
- Markdown estándar, tablas, enlaces automáticos, bloques de código con resaltado y diagramas Mermaid. HTML embebido deshabilitado. No incluye KaTeX ni checkboxes interactivos.
- Mantener el contexto de varios paneles consume memoria; al cerrar cada uno se liberan sus recursos.

## Prueba de aceptación en VS Code

Los bloques con lenguaje `mermaid` se convierten automáticamente en diagramas. Mermaid está incluido en el VSIX y funciona sin conexión, con modo de seguridad estricto y paleta Mocha fija. Al editar se regenera el diagrama conservando el scroll; si la sintaxis es inválida, se muestra un aviso y el código original. Los demás bloques de código mantienen su presentación habitual. Puedes probar el ejemplo completo en `test/fixtures/entrega.md`.

La integración usa la [API oficial de Mermaid](https://mermaid.js.org/config/usage).

1. Crea Untitled-1 en Markdown con contenido largo y abre Preview A. Baja a la mitad.
2. Crea Untitled-2, abre Preview B y baja a otra sección.
3. Cambia entre documentos y previews: ambas deben mantener contenido y scroll.
4. Edita Untitled-1: A se actualiza sin volver al inicio; B no cambia.
5. Abre otra preview de Untitled-1: debe llamarse `(2)` y tener scroll independiente.
6. Repite con archivos guardados, tablas, bloques de código e imágenes relativas.
7. Cambia el tema del editor y verifica que la preview mantiene su estilo fijo; cierra una preview y sigue editando las restantes.
8. Ejecuta **Developer: Reload Window**: las previews restauradas deben recuperar su estado cuando VS Code restaure esas pestañas.

Arquitectura: `PreviewManager` administra instancias y un único listener de cambios; `PreviewInstance` maneja el panel y sus recursos; `markdownRenderer` procesa Markdown; `media/preview.js` conserva el estado visual sin reemplazar la página completa.

Referencia de implementación: [API oficial de webviews de VS Code](https://code.visualstudio.com/api/extension-guides/webview).
