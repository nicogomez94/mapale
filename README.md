# Mapale

Sitio de Mapale, desarrolladora y constructora. La estructura visual parte del sitio de Navychem, pero este proyecto tiene archivos, imágenes y repositorio propios.

## Páginas

- `index.html`: portada, servicios, desarrollos y contacto.
- `historia.html`: trayectoria y forma de trabajo.
- `proyectos.html`: listado de todos los desarrollos.
- `desarrollo.html?id=...`: ficha individual de cada desarrollo.
- `admin.html`: panel de edición de contenidos.

## Desarrollo local

```bash
python3 -m http.server 8788
```

Abrir `http://localhost:8788/`.

## Contenido y recursos

- `content/site.json` guarda los desarrollos y la historia. Las páginas públicas lo cargan al abrirse.
- Logotipo extraído de `assets/logo-original.pdf`, proporcionado por el cliente.
- Imágenes de arquitectura y obra generadas para este proyecto. Son ilustrativas y no representan fotografías documentales de los desarrollos de Mapale.
- Ubicaciones, trayectoria y correo comercial proporcionados por el cliente.
- El formulario prepara un mensaje en la aplicación de correo del visitante; el envío se completa desde esa aplicación.

## Panel autoadministrable

Abrir `https://mapale.onrender.com/admin.html`. El panel usa la API de GitHub para guardar `content/site.json` y las imágenes nuevas en este repositorio. Cada guardado crea un commit en `main`; el despliegue automático de Render publica la nueva versión. No hay base de datos ni servidor de administración adicional.

Para acceder, crear un **fine-grained personal access token** en GitHub con estas opciones:

1. Resource owner: `nicogomez94`.
2. Repository access: **Only select repositories** → `mapale`.
3. Repository permissions: **Contents → Read and write**. Metadata se concede automáticamente para lectura.

Pegar el token en el panel. Se conserva solo en la memoria de esa pestaña; al recargar se vuelve a pedir. No agregarlo al repositorio, a una URL ni a capturas de pantalla. Si otra persona debe editar, darle acceso de escritura al repositorio y pedirle que cree su propio token limitado a Mapale.

Se pueden crear, editar, quitar y ordenar desarrollos; modificar título, ubicación, estado, descripciones, características, imagen principal, fondo, galería y presencia en portada. La historia permite editar cabecera, relato, principios y resumen de portada. Las imágenes se suben al repositorio en `assets/uploads/` (PNG, JPG o WebP, máximo 5 MB por archivo). Tras subir imágenes hay que pulsar **Publicar cambios** para incluirlas en la ficha.

Los identificadores de las fichas existentes no cambian al editar el título. Una ficha nueva recibe una URL basada en su nombre cuando se publica por primera vez. Si dos editores modifican el contenido al mismo tiempo, el panel evita sobreescribir el cambio ajeno y solicita recargar.
