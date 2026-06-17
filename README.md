# Correlation ID API Example

This service generates a correlation ID for every API request and includes it in:

- response headers (`x-correlation-id`)
- success payloads
- error payloads (including 404 and server errors)
- logs (with user context, when provided)

## Run

```bash
npm install
npm start
```

Server starts at `http://localhost:3000`.

## Test with curl

Success:

```bash
curl -i \
  -H "x-user-id: 123" \
  -H "x-user-email: user@example.com" \
  http://localhost:3000/api/health
```

Error:

```bash
curl -i \
  -H "x-user-id: 123" \
  http://localhost:3000/api/demo-error
```

Log frontend error:

```bash
curl -i -X POST http://localhost:3000/api/client-errors \
  -H "Content-Type: application/json" \
  -H "x-user-id: 123" \
  -d '{
    "correlationId": "frontend-corr-id-123",
    "errorDetails": {
      "type": "JS_EXCEPTION",
      "message": "Cannot read properties of undefined",
      "page": "/checkout",
      "stack": "TypeError: ...",
      "apiPath": "/api/orders/1"
    }
  }'
```

## Response shape

Success and error responses include:

- `correlationId`
- `timestamp`
- `user`

Example success payload:

```json
{
  "ok": true,
  "message": "Service is healthy",
  "data": { "status": "up" },
  "correlationId": "7a89f922-bfcb-4c3f-8b44-7be2367fcc3f",
  "timestamp": "2026-06-17T09:00:00.000Z",
  "user": { "id": "123", "email": "user@example.com" }
}
```

## Frontend error log files

- Endpoint: `POST /api/client-errors`
- Required body fields: `correlationId` (string), `errorDetails` (object)
- Log path format: `logs/frontend-errors/client-errors-YYYY-MM-DD.jsonl`
- A new file is created automatically each day and entries are appended as JSON lines
