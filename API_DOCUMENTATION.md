# SCIC/EJP-13 Backend API Documentation

REST API built with Node.js, Express, TypeScript, and Prisma ORM.

---

## General Information

### Base URL

```
http://localhost:3000
```

API endpoints are prefixed with `/api`. The health check is at the root.

### Authentication

JWT (JSON Web Token) Bearer authentication.

After login or registration you receive a JWT token. Send it in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

### Roles

| Role       | Description                               |
|------------|-------------------------------------------|
| `ADMIN`    | Full access, including admin-only routes  |
| `SELLER`   | Authenticated user, no admin rights       |
| `CUSTOMER` | Default role on registration              |

### Common Success Response Format

All successful responses use this JSON structure:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {}
}
```

- `data` contains the payload. Delete endpoints return `data: null`.
- Monetary fields are returned as strings (e.g. `"299.99"`).

### Common Error Response Format

```json
{
  "success": false,
  "message": "Error message"
}
```

### Common HTTP Status Codes

| Code | Meaning                                                 |
|------|---------------------------------------------------------|
| 200  | Success                                                 |
| 201  | Created                                                 |
| 400  | Validation error / bad request                          |
| 401  | Missing, invalid, or expired token / bad credentials    |
| 403  | Authenticated but insufficient permissions              |
| 404  | Resource not found                                      |
| 409  | Conflict (duplicate, insufficient stock, bad transition) |
| 500  | Internal server error                                   |

### Pagination

List endpoints support `?page=` and `?limit=` (defaults `1` and `10`, max `100`). Paginated responses include:

```json
"pagination": {
  "page": 1,
  "limit": 10,
  "total": 0,
  "totalPages": 0
}
```

---

## 1. Authentication

### POST /api/auth/register

| Field       | Required | Constraints      |
|-------------|----------|------------------|
| `name`      | Yes      | 1–100 chars      |
| `email`     | Yes      | Valid email      |
| `password`  | Yes      | 8–72 chars       |
| `phone`     | No       | Max 20 chars     |

- **Authentication:** No
- **Role:** Public
- **Description:** Creates a new `CUSTOMER` account and returns the user plus a JWT token.

**Request body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password@123",
  "phone": "+1234567890"
}
```

**Successful response (201):**

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "avatarUrl": null,
      "role": "CUSTOMER",
      "status": "ACTIVE",
      "isDeleted": false,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    },
    "token": "<JWT_TOKEN>"
  }
}
```

**Status codes:** `201` Created, `400` Validation error, `409` Email already registered

### POST /api/auth/login

| Field      | Required | Constraints |
|------------|----------|-------------|
| `email`    | Yes      | Valid email |
| `password` | Yes      | Any         |

- **Authentication:** No
- **Role:** Public
- **Description:** Authenticates a user and returns the user plus a JWT token.

**Request body:**

```json
{
  "email": "john@example.com",
  "password": "Password@123"
}
```

**Successful response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "avatarUrl": null,
      "role": "CUSTOMER",
      "status": "ACTIVE",
      "isDeleted": false,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    },
    "token": "<JWT_TOKEN>"
  }
}
```

**Status codes:** `200` Success, `400` Validation error, `401` Invalid email or password

### GET /api/auth/me

- **Authentication:** Yes
- **Role:** Any authenticated user
- **Description:** Returns the currently authenticated user's profile.

**Successful response (200):**

```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "avatarUrl": null,
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "isDeleted": false,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Status codes:** `200` Success, `401` Missing/invalid token, `404` User not found

---

## 2. Users

All user routes require authentication.

### GET /api/users

- **Authentication:** Yes
- **Role:** `ADMIN`
- **Description:** Returns a paginated list of non-deleted users.
- **Query parameters:** `page` (int, ≥1), `limit` (int, 1–100), `search` (name or email), `role` (`ADMIN`/`SELLER`/`CUSTOMER`), `status` (`ACTIVE`/`INACTIVE`/`BANNED`)

**Successful response (200):**

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "avatarUrl": null,
        "role": "CUSTOMER",
        "status": "ACTIVE",
        "isDeleted": false,
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
  }
}
```

**Status codes:** `200`, `400` Invalid query, `401`, `403` Insufficient permissions

### GET /api/users/:id

- **Authentication:** Yes
- **Role:** Any authenticated user (non-admin can only access own profile)
- **Description:** Returns a single user.
- **Path parameter:** `id` (int)

**Successful response (200):** Same user object as `/api/auth/me`.

**Status codes:** `200`, `401`, `403` You can only access your own profile, `404` User not found

### PATCH /api/users/:id

- **Authentication:** Yes
- **Role:** Any authenticated user (non-admin can only update own profile)
- **Description:** Partially updates a user.
- **Path parameter:** `id` (int)

**Request body (all optional, at least one field):**

Admin may send `name`, `phone`, `avatarUrl`, `role`, `status`.
Self may send `name`, `phone`, `avatarUrl`.

```json
{
  "name": "Jane Doe",
  "phone": "+1987654321"
}
```

**Successful response (200):** Updated user object.

**Status codes:** `200`, `400` No update fields provided / validation error, `401`, `403`, `404`

### DELETE /api/users/:id

- **Authentication:** Yes
- **Role:** `ADMIN`
- **Description:** Soft-deletes a user (`isDeleted = true`, `status = INACTIVE`).
- **Path parameter:** `id` (int)

**Successful response (200):**

```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": null
}
```

**Status codes:** `200`, `401`, `403`, `404`

---

## 3. Categories

### POST /api/categories

- **Authentication:** Yes
- **Role:** `ADMIN`
- **Description:** Creates a new category.

**Request body:**

| Field         | Required | Constraints                          |
|---------------|----------|--------------------------------------|
| `name`        | Yes      | 2–100 chars                          |
| `slug`        | Yes      | Lowercase letters, numbers, hyphens  |
| `description` | No       | Max 1000 chars, or `null`            |
| `imageUrl`    | No       | Valid URL, or `null`                 |

```json
{
  "name": "Electronics",
  "slug": "electronics",
  "description": "Electronic devices and accessories",
  "imageUrl": "https://example.com/electronics.png"
}
```

**Successful response (201):**

```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": 1,
    "name": "Electronics",
    "slug": "electronics",
    "description": "Electronic devices and accessories",
    "imageUrl": "https://example.com/electronics.png",
    "isDeleted": false,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Status codes:** `201`, `400`, `401`, `403`, `409` Slug already exists

### GET /api/categories

- **Authentication:** No
- **Role:** Public
- **Description:** Returns a paginated list of non-deleted categories.
- **Query parameters:** `page`, `limit`, `search` (matches name or slug)

**Successful response (200):** `{ categories: [...], pagination: {...} }` with category objects as above.

**Status codes:** `200`, `400`

### GET /api/categories/:id

- **Authentication:** No
- **Role:** Public
- **Description:** Returns a single category plus `productCount` (active non-deleted products assigned to it).
- **Path parameter:** `id` (int)

**Successful response (200):**

```json
{
  "success": true,
  "message": "Category retrieved successfully",
  "data": {
    "id": 1,
    "name": "Electronics",
    "slug": "electronics",
    "description": "Electronic devices and accessories",
    "imageUrl": null,
    "isDeleted": false,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "productCount": 5
  }
}
```

**Status codes:** `200`, `400` Invalid category id, `404`

### PATCH /api/categories/:id

- **Authentication:** Yes
- **Role:** `ADMIN`
- **Description:** Partially updates a category.
- **Path parameter:** `id` (int)
- **Request body:** Any subset of `name`, `slug`, `description`, `imageUrl`.

```json
{
  "name": "Consumer Electronics"
}
```

**Successful response (200):** Updated category object.

**Status codes:** `200`, `400`, `401`, `403`, `404`, `409` Slug already exists

### DELETE /api/categories/:id

- **Authentication:** Yes
- **Role:** `ADMIN`
- **Description:** Soft-deletes a category. Fails if active products are assigned to it.
- **Path parameter:** `id` (int)

**Successful response (200):** `{ "success": true, "message": "Category deleted successfully", "data": null }`

**Status codes:** `200`, `401`, `403`, `404`, `409` Category has active products

---

## 4. Products

### POST /api/products

- **Authentication:** Yes
- **Role:** `ADMIN`
- **Description:** Creates a new product. `categoryId` must reference an existing category.

**Request body:**

| Field            | Required | Constraints                                       |
|------------------|----------|---------------------------------------------------|
| `name`           | Yes      | 2–100 chars                                       |
| `slug`           | Yes      | Lowercase letters, numbers, hyphens               |
| `sku`            | Yes      | Uppercase letters, numbers, hyphens               |
| `price`          | Yes      | Positive, max 2 decimal places                    |
| `categoryId`     | Yes      | Positive integer (existing category)              |
| `description`    | No       | Max 1000 chars, or `null`                         |
| `compareAtPrice` | No       | Number, or `null`                                 |
| `stockQuantity`  | No       | Int 0–1000000 (default 0)                         |
| `images`         | No       | Array of valid URLs, max 10                       |
| `isFeatured`     | No       | Boolean (default false)                           |
| `status`         | No       | `DRAFT` / `ACTIVE` / `INACTIVE` (default ACTIVE)  |

```json
{
  "name": "Wireless Headphones",
  "slug": "wireless-headphones",
  "sku": "WH-1000XM5",
  "description": "Noise cancelling wireless headphones",
  "price": 299.99,
  "compareAtPrice": 349.99,
  "stockQuantity": 50,
  "images": ["https://example.com/headphones.png"],
  "isFeatured": true,
  "categoryId": 1,
  "status": "ACTIVE"
}
```

**Successful response (201):**

```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": 1,
    "name": "Wireless Headphones",
    "slug": "wireless-headphones",
    "sku": "WH-1000XM5",
    "description": "Noise cancelling wireless headphones",
    "price": "299.99",
    "compareAtPrice": "349.99",
    "stockQuantity": 50,
    "images": ["https://example.com/headphones.png"],
    "isFeatured": true,
    "categoryId": 1,
    "category": { "id": 1, "name": "Electronics", "slug": "electronics" },
    "status": "ACTIVE",
    "isDeleted": false,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Status codes:** `201`, `400` Validation / category not found, `401`, `403`, `409` Slug or SKU already exists

### GET /api/products

- **Authentication:** No
- **Role:** Public
- **Description:** Returns a paginated list of non-deleted products.
- **Query parameters:** `page`, `limit`, `search` (name/slug/sku), `categoryId` (int), `status` (`DRAFT`/`ACTIVE`/`INACTIVE`)

**Successful response (200):** `{ products: [...], pagination: {...} }` with product objects as above.

**Status codes:** `200`, `400`

### GET /api/products/:id

- **Authentication:** No
- **Role:** Public
- **Description:** Returns a single product.
- **Path parameter:** `id` (int)

**Successful response (200):** Product object as above.

**Status codes:** `200`, `400` Invalid product id, `404`

### PATCH /api/products/:id

- **Authentication:** Yes
- **Role:** `ADMIN`
- **Description:** Partially updates a product.
- **Path parameter:** `id` (int)
- **Request body:** Any subset of the create fields.

```json
{
  "price": 249.99,
  "stockQuantity": 40
}
```

**Successful response (200):** Updated product object.

**Status codes:** `200`, `400`, `401`, `403`, `404`, `409` Slug or SKU already exists

### DELETE /api/products/:id

- **Authentication:** Yes
- **Role:** `ADMIN`
- **Description:** Soft-deletes a product.
- **Path parameter:** `id` (int)

**Successful response (200):** `{ "success": true, "message": "Product deleted successfully", "data": null }`

**Status codes:** `200`, `401`, `403`, `404`

---

## 5. Orders

### POST /api/orders

- **Authentication:** Yes
- **Role:** Any authenticated user
- **Description:** Creates an order for the authenticated user. Validates products, checks stock, deducts stock in a transaction, and computes totals.

**Request body:**

| Field                  | Required | Constraints                          |
|------------------------|----------|--------------------------------------|
| `items`                | Yes      | 1–50 items, no duplicate product ids |
| `items[].productId`    | Yes      | Positive integer                     |
| `items[].quantity`     | Yes      | Int 1–100                            |
| `shippingAddress`      | No       | 1–200 chars                          |
| `shippingCity`         | No       | 1–100 chars                          |
| `shippingState`        | No       | 1–100 chars                          |
| `shippingZip`          | No       | 1–20 chars                           |
| `shippingCountry`      | No       | 1–100 chars                          |

```json
{
  "items": [{ "productId": 1, "quantity": 2 }],
  "shippingAddress": "123 Main St",
  "shippingCity": "Springfield",
  "shippingState": "IL",
  "shippingZip": "62701",
  "shippingCountry": "US"
}
```

**Successful response (201):**

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 1,
    "orderNumber": "ORD-XXXXXXXXXX",
    "userId": 2,
    "user": { "id": 2, "name": "John Doe" },
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "subtotal": "599.98",
    "tax": "0.00",
    "shippingFee": "0.00",
    "total": "599.98",
    "shippingAddress": "123 Main St",
    "shippingCity": "Springfield",
    "shippingState": "IL",
    "shippingZip": "62701",
    "shippingCountry": "US",
    "isDeleted": false,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "items": [
      {
        "id": 1,
        "quantity": 2,
        "unitPrice": "299.99",
        "totalPrice": "599.98",
        "status": "ACTIVE",
        "isDeleted": false,
        "productId": 1,
        "product": { "id": 1, "name": "Wireless Headphones", "slug": "wireless-headphones", "images": [] }
      }
    ]
  }
}
```

**Status codes:** `201`, `400` Validation / product not found, `401`, `409` Insufficient stock

### GET /api/orders

- **Authentication:** Yes
- **Role:** Any authenticated user (non-admin sees only own orders)
- **Description:** Returns a paginated list of orders.
- **Query parameters:** `page`, `limit`, `status` (`PENDING`/`PROCESSING`/`SHIPPED`/`DELIVERED`/`CANCELLED`/`REFUNDED`), `paymentStatus` (`PENDING`/`PAID`/`FAILED`/`REFUNDED`), `userId` (admin only)

**Successful response (200):** `{ orders: [...], pagination: {...} }` with order objects as above.

**Status codes:** `200`, `400`, `401`

### GET /api/orders/:id

- **Authentication:** Yes
- **Role:** Any authenticated user (non-admin can only access own orders)
- **Description:** Returns a single order.
- **Path parameter:** `id` (int)

**Successful response (200):** Order object as above.

**Status codes:** `200`, `400` Invalid order id, `401`, `403` You can only access your own order, `404`

### PATCH /api/orders/:id/status

- **Authentication:** Yes
- **Role:** `ADMIN`
- **Description:** Updates the order status. Allowed transitions: `PENDING → PROCESSING → SHIPPED → DELIVERED → REFUNDED`. `CANCELLED` and `REFUNDED` cannot transition.
- **Path parameter:** `id` (int)

**Request body:**

```json
{
  "status": "PROCESSING"
}
```

**Successful response (200):** Updated order object, `message: "Order status updated successfully"`.

**Status codes:** `200`, `400` Validation / invalid transition, `401`, `403`, `404`

### PATCH /api/orders/:id/payment-status

- **Authentication:** Yes
- **Role:** `ADMIN`
- **Description:** Updates the order payment status.
- **Path parameter:** `id` (int)

**Request body:**

```json
{
  "paymentStatus": "PAID"
}
```

**Successful response (200):** Updated order object, `message: "Payment status updated successfully"`.

**Status codes:** `200`, `400`, `401`, `403`, `404`

### POST /api/orders/:id/cancel

- **Authentication:** Yes
- **Role:** Any authenticated user (non-admin can only cancel own orders)
- **Description:** Cancels a `PENDING` or `PROCESSING` order, restores product stock, and marks order items cancelled.
- **Path parameter:** `id` (int)
- **Request body:** None

**Successful response (200):** Updated order object with `status: "CANCELLED"`, `message: "Order cancelled successfully"`.

**Status codes:** `200`, `400` Only pending or processing orders can be cancelled, `401`, `403`, `404`

### DELETE /api/orders/:id

- **Authentication:** Yes
- **Role:** `ADMIN`
- **Description:** Soft-deletes an order.
- **Path parameter:** `id` (int)

**Successful response (200):** `{ "success": true, "message": "Order deleted successfully", "data": null }`

**Status codes:** `200`, `401`, `403`, `404`

---

## 6. Reviews

### POST /api/reviews

- **Authentication:** Yes
- **Role:** Any authenticated user
- **Description:** Creates a review for a product (created with status `PENDING`). A user can review the same product only once.

**Request body:**

| Field       | Required | Constraints          |
|-------------|----------|----------------------|
| `rating`    | Yes      | Int 1–5              |
| `productId` | Yes      | Positive integer     |
| `title`     | No       | 1–120 chars, or `null` |
| `comment`   | No       | 1–2000 chars, or `null` |

```json
{
  "rating": 5,
  "title": "Great product",
  "comment": "Excellent quality and fast shipping.",
  "productId": 1
}
```

**Successful response (201):**

```json
{
  "success": true,
  "message": "Review created successfully",
  "data": {
    "id": 1,
    "rating": 5,
    "title": "Great product",
    "comment": "Excellent quality and fast shipping.",
    "userId": 2,
    "user": { "id": 2, "name": "John Doe" },
    "productId": 1,
    "product": { "id": 1, "name": "Wireless Headphones", "slug": "wireless-headphones" },
    "status": "PENDING",
    "isDeleted": false,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Status codes:** `201`, `400` Validation / product not found, `401`, `409` Already reviewed this product

### GET /api/reviews

- **Authentication:** No
- **Role:** Public
- **Description:** Returns a paginated list of non-deleted reviews.
- **Query parameters:** `page`, `limit`, `productId` (int), `status` (`PENDING`/`APPROVED`/`HIDDEN`)

**Successful response (200):** `{ reviews: [...], pagination: {...} }` with review objects as above.

**Status codes:** `200`, `400`

### GET /api/reviews/:id

- **Authentication:** No
- **Role:** Public
- **Description:** Returns a single review.
- **Path parameter:** `id` (int)

**Successful response (200):** Review object as above.

**Status codes:** `200`, `400` Invalid review id, `404`

### PATCH /api/reviews/:id

- **Authentication:** Yes
- **Role:** Any authenticated user (non-admin can only update own reviews)
- **Description:** Updates the rating, title, and/or comment of a review.
- **Path parameter:** `id` (int)

**Request body (at least one field):**

```json
{
  "rating": 4,
  "comment": "Updated after more use."
}
```

**Successful response (200):** Updated review object.

**Status codes:** `200`, `400`, `401`, `403`, `404`

### PATCH /api/reviews/:id/status

- **Authentication:** Yes
- **Role:** `ADMIN`
- **Description:** Updates the moderation status of a review.
- **Path parameter:** `id` (int)

**Request body:**

```json
{
  "status": "APPROVED"
}
```

**Successful response (200):** Updated review object, `message: "Review status updated successfully"`.

**Status codes:** `200`, `400`, `401`, `403`, `404`

### DELETE /api/reviews/:id

- **Authentication:** Yes
- **Role:** Any authenticated user (non-admin can only delete own reviews)
- **Description:** Soft-deletes a review.
- **Path parameter:** `id` (int)

**Successful response (200):** `{ "success": true, "message": "Review deleted successfully", "data": null }`

**Status codes:** `200`, `401`, `403`, `404`

---

## 7. Health Check

### GET /health

- **Authentication:** No
- **Role:** Public
- **Description:** Verifies the server is running. No database access.

**Successful response (200):**

```json
{
  "success": true,
  "message": "Server is healthy"
}
```

**Status codes:** `200`, `500`

---

## Appendix: Enum Values

| Enum              | Values                                                        |
|-------------------|---------------------------------------------------------------|
| `UserRole`        | `ADMIN`, `SELLER`, `CUSTOMER`                                 |
| `UserStatus`      | `ACTIVE`, `INACTIVE`, `BANNED`                                |
| `ProductStatus`   | `DRAFT`, `ACTIVE`, `INACTIVE`                                 |
| `ReviewStatus`    | `PENDING`, `APPROVED`, `HIDDEN`                               |
| `OrderStatus`     | `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED` |
| `PaymentStatus`   | `PENDING`, `PAID`, `FAILED`, `REFUNDED`                       |

---

## Authentication Flow

1. **Register** — `POST /api/auth/register` with `name`, `email`, `password` to create an account.
2. **Login** — `POST /api/auth/login` with `email` and `password`.
3. **Receive JWT** — The login (and register) response returns a token:
   ```json
   {
     "success": true,
     "message": "Login successful",
     "data": { "user": {}, "token": "<JWT_TOKEN>" }
   }
   ```
4. **Send JWT in Authorization header** — Include the token on every protected request:
   ```
   Authorization: Bearer <JWT_TOKEN>
   ```
5. **Access protected endpoints** — For example:
   - `GET /api/auth/me` (any authenticated user)
   - `GET /api/users` (requires `ADMIN` role)
   - `POST /api/orders` (any authenticated user)

If the token is missing, invalid, or expired, the API returns `401 Unauthorized`. If the user's role is not sufficient, the API returns `403 Forbidden`.
