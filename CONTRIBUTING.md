# Desarrollo y contribuciones

Gracias por contribuir a Persistent Markdown Preview. Puedes proponer cambios o reportar errores en https://github.com/j4vs/persistent-markdown-preview/issues.

## Preparar el entorno

Necesitas Node.js 22 o posterior, npm y Visual Studio Code 1.95 o posterior.

```sh
git clone https://github.com/j4vs/persistent-markdown-preview.git
cd persistent-markdown-preview
npm ci
npm run compile
```

Abre la carpeta raíz en VS Code y pulsa **F5**. La configuración **Persistent Markdown Preview** compila la extensión y abre un Extension Development Host. Prueba los comandos en esa ventana. Reinicia la sesión de depuración después de modificar el código para cargar los cambios.

## Pruebas

```sh
npm test
npm run test:host
```

Las pruebas de navegador usan Edge si está instalado en su ubicación estándar de Windows. En otros entornos instala Chromium con `npx playwright install chromium` o define `PREVIEW_TEST_BROWSER` con la ruta de un navegador compatible.

La prueba `test:host` utiliza una instancia aislada de VS Code. El ejecutor detecta la instalación estándar por usuario en Windows; en otras ubicaciones o sistemas, define `VS_CODE_EXECUTABLE` con la ruta al ejecutable. El perfil temporal se guarda en `.test-host/`.

Antes de enviar cambios, comprueba las funciones afectadas. Para cambios visuales, revisa también el resultado en una preview real o una captura del navegador.

## Verificación manual

1. Abre dos documentos Markdown sin guardar y crea una preview de cada uno.
2. Desplaza cada preview a una sección distinta y cambia entre editores. Ambas deben conservar su contenido y su scroll.
3. Edita el primer documento. Solo sus previews deben actualizarse, sin volver al inicio.
4. Abre otra preview del primer documento y verifica que conserve un scroll independiente.
5. Prueba el índice en paneles anchos y estrechos, el plegado de secciones y las preferencias de tipografía.
6. Comprueba tablas, copia de Markdown, código resaltado, copia de código, Mermaid e imágenes relativas en un archivo guardado.
7. Recorre una tabla y un bloque largos: sus encabezados deben permanecer visibles sin saltos ni contenido asomando por encima.
8. Ejecuta **Developer: Reload Window** y comprueba la restauración de las previews que VS Code recupere.

## Empaquetado

```sh
npm run package
```

Genera `persistent-markdown-preview-<versión>.vsix` en la raíz. Este comando compila y empaqueta; no publica en GitHub ni en el Marketplace.

`dist/`, `media/mermaid.js` y los avisos de terceros se generan durante la compilación. No edites los archivos compilados. Las dependencias, paquetes VSIX, perfiles de prueba y capturas temporales están excluidos de Git.

## Estructura

- `src/extension.ts`: activación y comandos.
- `src/PreviewManager.ts`: instancias, actualizaciones y restauración de paneles.
- `src/PreviewInstance.ts`: webview, recursos y comunicación con VS Code.
- `src/markdownRenderer.ts`: Markdown, tablas y resaltado de sintaxis.
- `media/preview.js` y `media/preview.css`: interacción, estado visual y estilos.
- `media/mermaid-entry.js`: integración local de Mermaid.
- `test/`: pruebas de lógica, navegador y Extension Host.

Al enviar un pull request, describe el problema, el comportamiento resultante y cómo lo verificaste. Mantén los cambios enfocados y actualiza la documentación si cambia el uso de la extensión.
