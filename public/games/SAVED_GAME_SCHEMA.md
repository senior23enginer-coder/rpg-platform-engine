# Saved game storage

Cada juego guarda sus partidas dentro de su propia carpeta:

```text
public/games/<gameId>/saves/<userId>/<saveId>/save.game.json
```

El archivo principal de la partida es `save.game.json`. Debe incluir:

```json
{
  "schemaVersion": 1,
  "save": {
    "saveId": "fallout4_178111414964",
    "gameId": "fallout4",
    "campaignId": "sanctuary_commonwealth",
    "userId": "invitado-local",
    "storagePath": "/games/fallout4/saves/invitado-local/fallout4_178111414964/save.game.json",
    "playerName": "Superviviente",
    "name": "Superviviente - Fallout 4",
    "currentMission": "Sanctuary -> Commonwealth",
    "currentZone": "Sanctuary",
    "level": 1,
    "sessions": 0,
    "createdAt": "2026-06-10T00:00:00.000Z",
    "updatedAt": "2026-06-10T00:00:00.000Z"
  },
  "user": {
    "id": "invitado-local",
    "name": "Invitado local",
    "username": "invitado-local"
  },
  "game": {
    "id": "fallout4",
    "name": "Fallout 4",
    "configPath": "/games/fallout4/game.config.json"
  },
  "state": {
    "characterName": "Superviviente",
    "attributes": {},
    "contentEnabled": {
      "dlc": [],
      "features": [],
      "extras": []
    }
  }
}
```

La plataforma usa el guardado mas reciente por `updatedAt` para el boton `Continuar`.
