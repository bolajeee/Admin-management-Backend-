# Task Management API Endpoints

## 📋 Complete Task Management Documentation

All task management endpoints are now fully documented with Swagger/OpenAPI 3.0 and include comprehensive validation, error handling, and examples.

### 🔗 Access the Documentation
Visit `http://localhost:5000/api-docs` and look for the **Tasks** section to see all endpoints with interactive examples.

## 📝 Available Task Endpoints

### Core Task Operations
- **POST /api/tasks** - Create a new task
- **GET /api/tasks** - Get all tasks (admin) or assigned tasks (user)
- **PATCH /api/tasks/{taskId}** - Update a task
- **DELETE /api/tasks/{taskId}** - Delete a task

### Task Information
- **GET /api/tasks/count** - Get total task count
- **GET /api/tasks/getUserTasks/{userId}** - Get tasks for a specific user

### Task Comments
- **POST /api/tasks/{taskId}/comments** - Add a comment to a task
- **GET /api/tasks/{taskId}/comments** - Get all comments for a task

### Task Attachments
- **POST /api/tasks/{taskId}/attachments** - Upload an attachment to a task
- **GET /api/tasks/{taskId}/attachments** - Get all attachments for a task
- **DELETE /api/tasks/{taskId}/attachments/{attachmentId}** - Delete an attachment
- **GET /api/tasks/{taskId}/attachments/{attachmentId}/download** - Download an attachment

### Task-Memo Integration
- **POST /api/tasks/{taskId}/memos/{memoId}** - Link a memo to a task
- **DELETE /api/tasks/{taskId}/memos/{memoId}** - Unlink a memo from a task

### Task Management Features
- **PATCH /api/tasks/{taskId}/delegate** - Delegate a task to another user
- **GET /api/tasks/search/advanced** - Advanced task search with filters

### Task Monitoring & Analytics
- **GET /api/tasks/{taskId}/audit** - Get audit log for a task
- **GET /api/tasks/analytics/completed** - Get tasks completed over time (Admin only)

### Development & Debug
- **GET /api/tasks/debug** - Debug task schema (Admin only)

## 🔍 Key Features Documented

### Request Validation
- **Input validation** for all parameters and request bodies
- **File upload validation** for attachments (10MB limit, specific file types)
- **MongoDB ObjectId validation** for all ID parameters
- **Pagination validation** for list endpoints

### Response Formats
- **Consistent success responses** with data and metadata
- **Detailed error responses** with validation details
- **Pagination metadata** for list endpoints
- **File download responses** for attachment endpoints

### Security & Authentication
- **JWT authentication** required for all endpoints
- **Role-based access control** for admin-only endpoints
- **Input sanitization** for all user inputs
- **File upload security** with type and size restrictions

### Search & Filtering
- **Advanced search** with multiple filter criteria:
  - Text search in title and description
  - Filter by status, priority, assigned user
  - Date range filtering for due dates
  - Category-based filtering

### File Management
- **Secure file uploads** with validation
- **File type restrictions**: png, jpg, jpeg, gif, pdf, doc, docx, txt, xls, xlsx, csv
- **File size limits**: 10MB maximum
- **Secure file downloads** with authentication

## 🎯 Example Usage

### Creating a Task
```bash
POST /api/tasks
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Complete project documentation",
  "description": "Write comprehensive documentation for the project",
  "assignedTo": "507f1f77bcf86cd799439011",
  "priority": "high",
  "dueDate": "2024-12-31T23:59:59.000Z",
  "category": "Documentation"
}
```

### Advanced Task Search
```bash
GET /api/tasks/search/advanced?q=documentation&status=pending&priority=high&dueDateFrom=2024-01-01&dueDateTo=2024-12-31
Authorization: Bearer <token>
```

### Adding a Comment
```bash
POST /api/tasks/507f1f77bcf86cd799439011/comments
Content-Type: application/json
Authorization: Bearer <token>

{
  "comment": "Task is progressing well, should be completed by tomorrow"
}
```

### Uploading an Attachment
```bash
POST /api/tasks/507f1f77bcf86cd799439011/attachments
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: [binary file data]
```

## 🛡️ Error Handling

All endpoints include comprehensive error handling:
- **400 Bad Request** - Validation errors with detailed field information
- **401 Unauthorized** - Authentication required
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Task or resource not found
- **500 Internal Server Error** - Server errors with logging

## 📊 Response Examples

### Success Response
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Complete project documentation",
    "description": "Write comprehensive documentation",
    "assignedTo": {...},
    "assignedBy": {...},
    "priority": "high",
    "status": "pending",
    "dueDate": "2024-12-31T23:59:59.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "title",
        "message": "Task title must be between 3 and 100 characters",
        "value": "ab"
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/tasks",
  "method": "POST"
}
```

## 🚀 Next Steps

The task management endpoints are now fully documented and ready for use. You can:

1. **Explore the interactive documentation** at `/api-docs`
2. **Test endpoints** using the Swagger UI
3. **Integrate with your frontend** using the documented schemas
4. **Monitor API usage** through the logging system
5. **Extend functionality** by adding more endpoints following the same patterns

All endpoints follow the same consistent patterns for authentication, validation, error handling, and response formatting, making the API predictable and easy to use.