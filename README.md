# Mapale

Sitio de Mapale, constructora y desarrolladora con más de 50 años de trayectoria. La estructura visual parte del sitio de Navychem, pero este proyecto tiene archivos, imágenes y repositorio propios.

## Páginas

- `index.html`: portada, servicios, desarrollos y contacto.
- `historia.html`: trayectoria y forma de trabajo.
- `proyectos.html`: listado de todos los desarrollos.
- `desarrollo.html?id=...`: ficha individual de cada desarrollo.
- `admin.html`: panel de edición de contenidos.

## Arquitectura

- El sitio público se sirve como HTML, CSS y JavaScript estático.
- `server/` contiene la API Express, autenticación del panel, carga de archivos y persistencia con Prisma/PostgreSQL.
- `content/site.json` se usa para inicializar la base y como respaldo de lectura en entornos sin API.
- En producción nginx sirve el sitio y deriva `/api/` y `/health` al servicio privado de Node.

## Desarrollo local

```bash
npm install
npm run db:generate
npm start
```

La API requiere las variables de `server/.env.example` y una base PostgreSQL. El sitio público puede revisarse sin API con `python3 -m http.server 8788`; en ese caso usa el respaldo `content/site.json`.

## Contenido y recursos

- `content/site.json` guarda los datos de contacto, categorías, desarrollos y la historia. Las páginas públicas lo cargan al abrirse.
- Logotipo extraído de `assets/logo-original.pdf`, proporcionado por el cliente.
- Imágenes de arquitectura y obra generadas para este proyecto. Son ilustrativas y no representan fotografías documentales de los desarrollos de Mapale.
- Ubicaciones, trayectoria y correo comercial proporcionados por el cliente.
- El formulario prepara un mensaje en la aplicación de correo del visitante; el envío se completa desde esa aplicación.

## Panel autoadministrable

Abrir `/admin.html` en el mismo dominio del sitio. El panel autentica contra la API privada y guarda el contenido en PostgreSQL. El token de sesión permanece únicamente en memoria durante la pestaña actual. El usuario inicial se configura con `ADMIN_USERNAME` y `ADMIN_PASSWORD`; las contraseñas se almacenan con hash bcrypt y nunca se incluyen en el repositorio.

Se pueden crear, editar, quitar y ordenar desarrollos desde un editor modal; elegir una categoría; modificar título, ubicación, barrio, estado, año, unidades, descripciones, conectividad, mapa, características, imágenes, brochure y presencia en portada. La galería visual permite subir varias imágenes, verlas como miniaturas, elegir la portada y quitar archivos de la ficha sin editar URLs. La historia permite editar cabecera, relato, principios y resumen de portada. La sección Datos de contacto administra teléfono, WhatsApp, email y dirección de oficina. Las imágenes se almacenan en el directorio persistente de uploads del servidor (PNG, JPG o WebP, máximo 12 MB por archivo) y los brochures se admiten en PDF hasta 12 MB. Tras guardar una ficha hay que pulsar **Publicar cambios** para incluirla en el sitio.

Los identificadores de las fichas existentes no cambian al editar el título. Una ficha nueva recibe una URL basada en su nombre cuando se publica por primera vez. Si dos editores modifican el contenido al mismo tiempo, el panel evita sobreescribir el cambio ajeno y solicita recargar.

## Producción

El despliegue productivo vive aislado en `/var/www/sites/mapale`, con servicio systemd, base PostgreSQL y configuración nginx propios. Los archivos subidos se conservan fuera del checkout en `shared/uploads` para que una actualización de código no los elimine.
