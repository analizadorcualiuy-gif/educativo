# AnalizadorCualiUY Beta

Edición web de evaluación. Procesa todos los documentos dentro del navegador y
no requiere servidor, base de datos ni cuenta de usuario.

## Límites

- 1 documento por proyecto.
- 10.000 palabras totales.
- 4 categorías en total, incluidas las subcategorías.
- Guardado y apertura de proyectos JSON.
- Exportación únicamente a PDF, identificada como versión Beta.

## Componentes locales

- Mammoth.js 1.12.0 para DOCX (BSD-2-Clause).
- Mozilla PDF.js 6.2.108 para PDF (Apache-2.0), con worker, CMaps, fuentes y
  WASM servidos desde `public/vendor`; no utiliza CDN.

Las copias vendorizadas se comparan por SHA-256 con las dependencias fijadas en
`package-lock.json`. La licencia íntegra de PDF.js está en
`public/vendor/pdfjs-LICENSE.txt`.

## Contacto

El botón para solicitar la versión completa abre un mensaje dirigido a
`analizadorcualiuy@gmail.com`, con asunto y texto inicial preparados. Si cambia el
canal comercial, actualice `data-contact-url` en `index.html`.

Genere la carpeta publicable desde el directorio Pro:

```powershell
.\build-beta.ps1
```

Publique solamente el contenido de `dist-beta`. No publique `web-beta`, el
repositorio Pro, los instaladores ni los archivos fuente de desarrollo.
