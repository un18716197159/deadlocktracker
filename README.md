30.10 – Fagdag

Eg byrja med å leite etter informasjon og referansar til nettsida mi. Målet med nettsida er å vise statistikk frå spelet Deadlock.

Eg brukte https://statlocker.gg som ein referanse for design og funksjonar.

For å finne informasjon om spelarar og statistikk undersøkte eg dei opne kjeldene til Deadlock API.

## Deadlock API

Приложение обращается к API через серверные маршруты и не отправляет ключ в браузер.
Если задана переменная окружения `DEADLOCK_API_KEY`, ключ передаётся в каждом запросе
заголовком `X-API-KEY`. Параметр `api_key` в URL не используется, чтобы ключ не
попадал в логи и кеши.

```env
DEADLOCK_API_KEY=your-key
```

Ключ необязателен: без него API применяет лимиты по IP. Точные лимиты зависят от
endpoint. Для аналитических endpoint официальная документация указывает:

- без ключа: 200 запросов в минуту на IP;
- с ключом: 400 запросов в минуту и 2500 запросов в час;
- общий лимит: 2000 запросов в минуту.

Источник: [официальная OpenAPI-документация Deadlock API](https://api.deadlock-api.com/openapi.json).
