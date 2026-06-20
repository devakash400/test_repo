# Correlation ID Tracking — Node/Express API

Every API call generates a unique **correlation ID** on the server. This ID travels with the request through its entire lifecycle — success, failure, logs — so you can always trace exactly what happened, when, and for which user.

---

## Project Structure

```
src/
├── app.js                        # Express app setup, middleware wiring
├── server.js                     # HTTP server bootstrap, graceful shutdown
├── middleware/
│   ├── correlation-id.js         # Generates UUID per request, sets x-correlation-id header
│   ├── user-context.js           # Reads x-user-id / x-user-email from headers
│   ├── logger.js                 # Structured HTTP logger (pino), includes correlationId + user
│   └── error-handler.js          # Global error handler — always returns correlationId on errors
├── routes/
│   └── api.js                    # All API routes (health, orders, client-errors logger)
├── services/
│   └── orders.js                 # Mock order data, throws 404 for unknown orders
└── utils/
    ├── response.js               # sendSuccess / sendError — always embed correlationId in body
    └── error-log-writer.js       # Appends to daily JSONL log file under logs/frontend-errors/
```

---

## How Correlation ID Works

```
Incoming request
      │
      ▼
correlationIdMiddleware
  • Reads x-correlation-id header (if frontend sent one)
  • Otherwise generates a new UUID
  • Attaches to req.correlationId
  • Sets x-correlation-id on the response header immediately
      │
      ▼
Route handler runs
  • On success  → sendSuccess() embeds correlationId in response body
  • On error    → error is passed to errorHandler via next(err)
                  errorHandler calls sendError() which embeds correlationId in response body
      │
      ▼
Response sent to frontend
  • Header:  x-correlation-id: <uuid>
  • Body:    { ..., "correlationId": "<uuid>", "timestamp": "...", "user": {...} }
```

The correlation ID is present in **every** response — `200`, `404`, `500`, everything.

---

## End-to-End Frontend Flow

```
1. Frontend calls  GET /api/orders/:orderId
         │
         ├── Success (200)
         │     Response header: x-correlation-id: abc-123
         │     Response body:   { ok: true, data: {...}, correlationId: "abc-123", ... }
         │     → Frontend uses the data, no further action needed
         │
         └── Failure (404 / 500 / network error)
               Response header: x-correlation-id: abc-123
               Response body:   { ok: false, error: {...}, correlationId: "abc-123", ... }
               │
               ▼
         Frontend reads x-correlation-id from response header
               │
               ▼
         Frontend calls  POST /api/client-errors
         {
           "correlationId": "abc-123",        ← taken from the failed API's response header
           "errorDetails": {
             "type": "API_ERROR",
             "httpStatus": 404,
             "apiPath": "/api/orders/ORD-999",
             "message": "Order ORD-999 not found",
             "page": "/orders"
           }
         }
               │
               ▼
         Server appends to: logs/frontend-errors/client-errors-YYYY-MM-DD.jsonl
         (new file every day)
```

---

## Setup and Run

```bash
npm install
npm run dev       # development — auto-restarts on file change
# or
npm start         # production
```

Server starts at `http://localhost:3000`.

---

## API Reference

### GET /api/health
Health check. Always returns `200`.

```bash
curl -i http://localhost:3000/api/health
```

**Response (200)**
```json
{
  "ok": true,
  "message": "Service is healthy",
  "data": { "status": "up" },
  "correlationId": "88ea5af7-d453-454e-a95f-793ff7cddb3d",
  "timestamp": "2026-06-20T12:00:00.000Z",
  "user": { "id": null, "email": null }
}
```

---

### GET /api/orders/:orderId
Fetch an order by ID. Returns `correlationId` in both the response header and body on **success and failure**.

Valid IDs: `ORD-001`, `ORD-002`, `ORD-003`

**Success (200)**
```bash
curl -i \
  -H "x-user-id: 42" \
  -H "x-user-email: user@example.com" \
  http://localhost:3000/api/orders/ORD-001
```

```json
{
  "ok": true,
  "message": "Order fetched",
  "data": { "orderId": "ORD-001", "product": "Widget A", "quantity": 2, "status": "delivered" },
  "correlationId": "88ea5af7-d453-454e-a95f-793ff7cddb3d",
  "timestamp": "2026-06-20T12:00:00.000Z",
  "user": { "id": "42", "email": "user@example.com" }
}
```

Header: `x-correlation-id: 88ea5af7-d453-454e-a95f-793ff7cddb3d`

**Failure — order not found (404)**
```bash
curl -i \
  -H "x-user-id: 42" \
  http://localhost:3000/api/orders/ORD-999
```

```json
{
  "ok": false,
  "error": { "code": "ORDER_NOT_FOUND", "message": "Order ORD-999 not found", "details": null },
  "correlationId": "e1aa1492-ddd0-4ecb-ae9b-38816198dad4",
  "timestamp": "2026-06-20T12:00:00.000Z",
  "user": { "id": "42", "email": null }
}
```

Header: `x-correlation-id: e1aa1492-ddd0-4ecb-ae9b-38816198dad4`

> Frontend should read the `x-correlation-id` header from this response and pass it to `POST /api/client-errors`.

---

### POST /api/client-errors
Frontend calls this to log any JS exception or API failure. Creates a new log file per day.

**Required headers:**
| Header | Description |
|---|---|
| `Content-Type` | `application/json` |
| `x-user-id` | (optional) User ID for traceability |
| `x-user-email` | (optional) User email for traceability |

**Required body fields:**
| Field | Type | Description |
|---|---|---|
| `correlationId` | string | The `x-correlation-id` from the failed API's response header |
| `errorDetails` | object | Any error details: type, message, page, stack, httpStatus, etc. |

```bash
curl -i -X POST http://localhost:3000/api/client-errors \
  -H "Content-Type: application/json" \
  -H "x-user-id: 42" \
  -H "x-user-email: user@example.com" \
  -d '{
    "correlationId": "e1aa1492-ddd0-4ecb-ae9b-38816198dad4",
    "errorDetails": {
      "type": "API_ERROR",
      "httpStatus": 404,
      "apiPath": "/api/orders/ORD-999",
      "message": "Order ORD-999 not found",
      "page": "/orders"
    }
  }'
```

**Response (201)**
```json
{
  "ok": true,
  "message": "Client error logged",
  "data": {
    "logged": true,
    "file": "/path/to/logs/frontend-errors/client-errors-2026-06-20.jsonl"
  },
  "correlationId": "6d6c4693-7805-46f7-8d64-918d9ab14b7c",
  "timestamp": "2026-06-20T12:00:00.000Z",
  "user": { "id": "42", "email": "user@example.com" }
}
```

> Note: The `correlationId` in the response body here is the server's own correlation ID for the logger call itself. The `correlationId` you sent in the body (from the failed API) is what gets written to the log file.

**Validation errors (400)**

Missing or wrong `correlationId`:
```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "correlationId is required and must be a string" }, ... }
```

Missing or wrong `errorDetails`:
```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "errorDetails is required and must be an object" }, ... }
```

---

## Daily Log Files

Frontend error entries are appended to:

```
logs/frontend-errors/client-errors-YYYY-MM-DD.jsonl
```

- A new file is created automatically each day
- Each line is one JSON object (JSONL format)
- The directory is created automatically if it does not exist

**Example log entry:**
```json
{
  "timestamp": "2026-06-20T12:00:00.000Z",
  "correlationId": "e1aa1492-ddd0-4ecb-ae9b-38816198dad4",
  "requestCorrelationId": "6d6c4693-7805-46f7-8d64-918d9ab14b7c",
  "user": { "id": "42", "email": "user@example.com" },
  "source": "frontend",
  "request": { "method": "POST", "path": "/api/client-errors", "userAgent": "Mozilla/5.0 ..." },
  "errorDetails": {
    "type": "API_ERROR",
    "httpStatus": 404,
    "apiPath": "/api/orders/ORD-999",
    "message": "Order ORD-999 not found",
    "page": "/orders"
  }
}
```

| Field | Meaning |
|---|---|
| `correlationId` | ID from the original failed API call — links this log entry back to the exact request |
| `requestCorrelationId` | Server's own ID for the `/api/client-errors` call itself |
| `user` | Who experienced the error (from request headers) |
| `source` | Always `"frontend"` for client-logged errors |
| `errorDetails` | Free-form object — whatever the frontend sends |

---

## Passing User Context

To include user details in every response and log, pass these headers with every request:

```
x-user-id: 42
x-user-email: user@example.com
```

These are read by `userContextMiddleware` and embedded in all responses and log entries automatically.
