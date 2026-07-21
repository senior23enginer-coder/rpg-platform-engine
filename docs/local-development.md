# Ambiente local

## Levantar servicios

```bash
npm run backend:local
npm run dev
```

Backend local: `http://127.0.0.1:8787/api`

Frontend local: el puerto lo asigna Vite, normalmente `http://127.0.0.1:5173`.

## Persistencia

Los datos locales se guardan en:

```text
data/local-backend/database.json
```

Ese archivo esta ignorado por Git para no subir sesiones, usuarios editados, guardados ni datos de prueba.

## Seguridad local

El login devuelve una sesion local. El frontend envia esa sesion como:

```text
Authorization: Bearer <session-id>
```

Reglas actuales:

- Lectura de juegos, mapas, noticias y metadata: publica para la plataforma.
- Escritura de juegos, mapas, noticias, notificaciones, metadata y backups: solo admin.
- Perfil y guardados: usuario propio o admin.
- Tickets publicos: permitidos desde login sin sesion.
- Auditoria: lectura solo admin.

## Backups

Exportar:

```http
GET /api/backup/export
Authorization: Bearer <admin-session-id>
```

Importar:

```http
POST /api/backup/import
Authorization: Bearer <admin-session-id>
```

## Validacion

```bash
npm run test:backend
npm run test:security
npm run test:critical
npm run build
```
## Validacion local completa

Para cerrar una tanda de cambios local sin simular cloud, ejecuta:

```powershell
npm.cmd run test:release-local
```

Ese comando valida:

- ambiente local y backend HTTP/JSON en disco;
- seguridad, sesiones, roles y permisos;
- CRUD critico de usuarios, juegos, mapas, noticias, notificaciones, tickets, chat y guardados;
- Fallout 4 con TOMO 01-10, 216 misiones, 558 mapas/ubicaciones y fichas jugables;
- flujo de nueva partida, crear personaje, modo libre, campana, cargar partida y guardado;
- responsive base;
- build de produccion y presupuesto de bundles.

Si solo necesitas revisar el peso de la salida ya compilada:

```powershell
npm.cmd run build
npm.cmd run test:build-budget
```

El presupuesto actual mantiene el chunk inicial por debajo de 3.8 MB sin comprimir, Fallout 4 diferido por debajo de 10 MB y CSS por debajo de 400 KB. Si Fallout 4 crece por encima de ese limite, hay que dividir mas pantalla, inspector, atlas o paneles de combate en imports diferidos.

