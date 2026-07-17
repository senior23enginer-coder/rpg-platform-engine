# RPG Platform Engine - Roadmap de cierre

Este documento convierte la lista total de pendientes en criterios de entrega verificables. El objetivo es que cada modulo quede completo, consistente en UI/UX, preparado para mobile y listo para migrar de persistencia local a cloud sin reescribir la plataforma.

## Principios de cierre

- Cada pantalla debe funcionar en desktop, laptop, TV, tablet y mobile.
- Cada modulo admin debe tener tabla, filtros, accion de ver, pantalla/formulario de detalle, validaciones y persistencia.
- Cada modulo de usuario debe mostrar solo opciones permitidas por rol.
- Todo dato operativo debe pasar por contratos de almacenamiento/API, no quedar escondido en componentes.
- Ninguna pantalla se considera lista si genera overflow horizontal global, corta acciones principales o mezcla configuracion admin con configuracion de usuario.

## Fases

1. Base visual y navegacion: responsive, topbar, menu, scroll interno y limpieza CSS.
2. Persistencia, backend y seguridad: API, cloud/local/hibrido, hash, sesiones, permisos y auditoria.
3. Administrador de juegos: tabla, filtros, ver/editar, assets, reglas, campanas, DLC y validacion.
4. Editor tactico de mapas: pantalla aparte, capas, zoom, pan, snap, grilla, paletas, import/export y tiles desde imagen.
5. Noticias y actualizaciones: tabla, filtros, borrador, programacion, publicacion, archivo, galeria y bloqueo de publicadas.
6. Notificaciones: tabla, segmentacion, programacion, envio, archivo, preview Android/iPhone e historial.
7. Usuarios y accesos: detalle aparte, perfil, avatar, genero, sesiones, permisos, bloqueo y reinicio seguro.
8. Soporte tecnico: tickets, detalle aparte, prioridad, estado, categoria, asignacion, chat y soporte desde login.
9. Chat en linea cloud: canales, grupos, amigos, presencia, voz, ubicacion mundial y persistencia.
10. Configuracion de plataforma: nombre, version, canal, iconos, textos, audios, temas, menus por rol y cloud.
11. Configuracion de usuario: idioma, audio, tema, accesibilidad y preferencias por usuario.
12. Fallout 4 y tomos: reglas jugables, misiones, ubicaciones, enemigos, objetos, clima, facciones y economia.
13. Juegos nuevos: Dungeons & Dragons y Warhammer 40K con reglas, assets, campanas, mapas y modulos propios.
14. Partidas y guardados: guardados por usuario/juego, continuar, progreso, sync cloud, backup/export/import.
15. Dashboards: metricas reales admin y resumen util para usuario.
16. Mobile/app: iconos Android/iOS/PWA, layout tactil y validacion de instalacion.
17. Pruebas: login, sesion, roles, CRUD, visual, mapas, noticias, notificaciones y tickets.
18. Limpieza tecnica: CSS por componentes, pantallas separadas, tipos fuertes y estructura mantenible.

## Criterio de listo

Un area solo pasa a `done` cuando:

- Tiene UI estable en mobile/tablet/desktop/TV.
- Persiste por el adaptador de datos correspondiente.
- Respeta permisos.
- Tiene validacion basica y estado de error.
- Tiene al menos una prueba o auditoria automatizada.
