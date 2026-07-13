# DeploySphere REST API Documentation

This document defines the backend routes, authorization guards, request bodies, and JSON responses.

---

## 1. Authentication Service (`/api/auth`)

Endpoints for registering accounts, logins, email verification, and password resets.

### Register Account
- **Route**: `POST /api/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "user@company.com",
    "password": "password123"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Registration successful! Please check your email to verify your account.",
    "userId": "4c6de42e-9eef-4bbd-b687-2bbf5c4039b8"
  }
  ```

### User Login
- **Route**: `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "user@company.com",
    "password": "password123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "4c6de42e-9eef-4bbd-b687-2bbf5c4039b8",
    "email": "user@company.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

## 2. Project Manager (`/api/projects`)

Endpoints managing application configurations. Secure all requests with a `Bearer <token>` Authorization Header.

### Create Project
- **Route**: `POST /api/projects`
- **Access**: Protected
- **Request Body**:
  ```json
  {
    "name": "my-express-app",
    "repositoryUrl": "https://github.com/company/express-app.git",
    "branch": "main",
    "framework": "node",
    "useJenkins": false
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "project-uuid-1234",
    "name": "my-express-app",
    "repositoryUrl": "https://github.com/company/express-app.git",
    "branch": "main",
    "framework": "node",
    "useJenkins": false
  }
  ```

### List Projects
- **Route**: `GET /api/projects`
- **Access**: Protected
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "project-uuid-1234",
      "name": "my-express-app",
      "repositoryUrl": "https://github.com/company/express-app.git",
      "branch": "main",
      "framework": "node"
    }
  ]
  ```

---

## 3. Reverse Proxy & SSL Manager (`/api/proxy` & `/api/ssl`)

Endpoints managing routing domains and Let's Encrypt certificates.

### Set Custom Domain
- **Route**: `POST /api/proxy/custom-domain`
- **Access**: Protected
- **Request Body**:
  ```json
  {
    "projectId": "project-uuid-1234",
    "domain": "app.mybrand.com"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Custom domain mapping saved successfully."
  }
  ```

### Request SSL Certificate
- **Route**: `POST /api/ssl/generate`
- **Access**: Protected
- **Request Body**:
  ```json
  {
    "projectId": "project-uuid-1234",
    "domain": "app.mybrand.com",
    "method": "selfsigned"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "SSL configuration processed successfully.",
    "logs": "[INFO] Generating self-signed certificate... \n[SUCCESS] Write key/cert files to disk.",
    "status": {
      "active": true,
      "type": "SELF_SIGNED"
    }
  }
  ```

---

## 4. Platform Monitoring (`/api/monitoring`)

Endpoints routing telemetry statistics.

### Get Metrics
- **Route**: `GET /api/monitoring/metrics`
- **Access**: Protected
- **Response (200 OK)**:
  ```json
  {
    "host": {
      "cpu": 12.5,
      "memory": 68.2,
      "disk": 45.1
    },
    "containers": [
      {
        "id": "deploysphere-proj-123",
        "name": "project-app",
        "cpu": 2.1,
        "memory": 128.4
      }
    ]
  }
  ```

---

## 5. System Analytics (`/api/analytics`)

Endpoints calculating build performance distributions.

### Get Analytics Summary
- **Route**: `GET /api/analytics/summary`
- **Access**: Protected
- **Query Parameters**:
  - `projectId` (Optional) - Filter timelines and averages specifically to one project.
- **Response (200 OK)**:
  ```json
  {
    "totalProjects": 3,
    "totalDeployments": 14,
    "successRate": 85.7,
    "avgDuration": 18.5,
    "activeRuntimes": 3,
    "mostActiveProject": "express-app",
    "timeline": [
      { "date": "2026-07-01", "success": 3, "failed": 1 }
    ],
    "durationTrends": [
      { "id": "build-1", "projectName": "express-app", "status": "SUCCESS", "duration": 18, "date": "7/1/2026" }
    ],
    "frameworkStats": [
      { "name": "node", "value": 2 }
    ],
    "projectStats": [
      { "id": "proj-1", "name": "express-app", "framework": "node", "totalBuilds": 8, "successRate": 87.5, "avgDuration": 15 }
    ]
  }
  ```
