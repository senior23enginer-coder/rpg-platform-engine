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

