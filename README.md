# Admin Management Backend

This is the backend for a comprehensive Admin Management System built with Node.js, Express, and MongoDB. It provides a robust set of features for managing users, roles, tasks, memos, and real-time communication within an organization.

## Features

- **User Management:**
  - User signup and login with JWT-based authentication.
  - Create, Read, Update, and Delete (CRUD) operations for users.
  - Activate/deactivate user accounts.
  - Reset user passwords to a default.
  - User profile updates with profile picture uploads to Cloudinary.
- **Role-Based Access Control (RBAC):**
  - Define roles with specific permissions (e.g., 'admin', 'employee').
  - Middleware to protect routes based on user roles and permissions.
- **Real-time Messaging:**
  - One-to-one real-time messaging using Socket.IO.
  - Get conversation history with pagination.
  - Image attachments in messages, uploaded to Cloudinary.
  - Message status tracking (sent, delivered, read).
- **Memo Management:**
  - Create and send memos to specific users or broadcast to all.
  - Memos with different severity levels (low, medium, high, critical).
  - Acknowledge, snooze, and mark memos as read.
  - Real-time notifications for new memos.
- **Task Management:**
  - Create, assign, and update tasks.
  - Tasks with priorities, due dates, and categories.
  - Add comments and attachments to tasks.
  - Link memos to tasks.
  - Delegate tasks to other users.
- **Reporting:**
  - Upload report data from CSV or Excel files.
  - View and filter report data with pagination.
  - Export reports in CSV or Excel format.
- **Dashboard:**
  - Get key statistics for the application (e.g., user count, task count).
  - View a feed of recent activities.
- **Audit Trail:**
  - Log important user actions (e.g., login, user creation, task deletion).
  - View audit logs with filtering and pagination.
- **Team Management:**
  - Create and manage teams.
  - Add/remove members and assign team leaders.
- **Notifications:**
  - Real-time notifications via Socket.IO.
  - Email and SMS notifications for important events (new memos, task assignments, new messages).
- **Settings:**
  - Users can manage their notification and privacy settings.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- An account with Cloudinary for image uploads.
- An account with Twilio for SMS notifications.
- A Gmail account for email notifications.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd "Admin management Backend/backend"
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the `backend` directory and add the following variables:

    ```env
    PORT=5000
    MONGO_URI=<your_mongodb_connection_string>
    JWT_SECRET=<your_jwt_secret>
    FRONTEND_URL=http://localhost:3000

    # Cloudinary
    CLOUDINARY_CLOUD_NAME=<your_cloudinary_cloud_name>
    CLOUDINARY_API_KEY=<your_cloudinary_api_key>
    CLOUDINARY_API_SECRET=<your_cloudinary_api_secret>

    # Email (Gmail)
    EMAIL_HOST=smtp.gmail.com
    EMAIL_PORT=587
    EMAIL_SECURE=false
    EMAIL_USER=<your_gmail_address>
    EMAIL_PASS=<your_gmail_app_password>
    EMAIL_FROM_NAME="Admin Management"
    EMAIL_FROM_EMAIL=<your_gmail_address>

    # Twilio
    TWILIO_ACCOUNT_SID=<your_twilio_account_sid>
    TWILIO_AUTH_TOKEN=<your_twilio_auth_token>
    TWILIO_PHONE_NUMBER=<your_twilio_phone_number>
    ```

### Running the Server

```bash
npm run server
```

The server will start on `http://localhost:5000`.

### Running Tests

Create a `.env.test` file in the `backend` directory for the test database:

```env
MONGO_URI_TEST=<your_test_mongodb_connection_string>
JWT_SECRET=test-secret
```

Then run the tests:

```bash
npm test
```

## API Documentation

### Authentication (`/api/auth`)

| Method | Endpoint              | Permissions | Description                               |
| :----- | :-------------------- | :---------- | :---------------------------------------- |
| `POST` | `/signup`             | Public      | Register a new user.                      |
| `POST` | `/login`              | Public      | Log in an existing user.                  |
| `POST` | `/logout`             | User        | Log out the current user.                 |
| `PUT`  | `/updateProfile`      | User        | Update the user's profile picture.       |
| `GET`  | `/check`              | User        | Check the authentication status.          |
| `POST` | `/create`             | Admin       | Create a new user.                        |
| `DELETE`| `/deleteUser/:id`    | Admin       | Delete a user by ID.                      |

### Admin (`/api/admin`)

| Method   | Endpoint                   | Permissions | Description                                      |
| :------- | :------------------------- | :---------- | :----------------------------------------------- |
| `GET`    | `/suggested-actions`       | User        | Get a list of suggested actions for the user.    |
| `PATCH`  | `/users/:id/toggle-active` | Admin       | Activate or deactivate a user account.           |
| `POST`   | `/users/:id/reset-password`| Admin       | Reset a user's password to the default.         |
| `DELETE` | `/users/:id`               | Admin       | Delete a user by their ID.                       |
| `GET`    | `/users/:id/stats`         | Admin       | Get statistics for a specific user.              |

### Audit (`/api/audit`)

| Method | Endpoint | Permissions | Description                               |
| :----- | :------- | :---------- | :---------------------------------------- |
| `GET`  | `/`      | Admin       | Get all audit logs with pagination.       |

### Dashboard (`/api/dashboard`)

| Method | Endpoint          | Permissions | Description                               |
| :----- | :---------------- | :---------- | :---------------------------------------- |
| `GET`  | `/stats`          | User        | Get key statistics for the dashboard.     |
| `GET`  | `/recent-activity`| User        | Get a feed of recent activities.          |

### Memos (`/api/memos`)

| Method   | Endpoint              | Permissions | Description                                      |
| :------- | :-------------------- | :---------- | :----------------------------------------------- |
| `POST`   | `/`                   | User        | Create a new memo.                               |
| `GET`    | `/`                   | User        | Get memos for the current user.                  |
| `GET`    | `/all`                | Admin       | Get all memos in the system.                     |
| `POST`   | `/broadcast`          | Admin       | Create a memo and send it to all users.          |
| `GET`    | `/user/:userId`       | Admin       | Get all memos for a specific user.               |
| `GET`    | `/count`              | Admin       | Get the total number of memos.                   |
| `GET`    | `/analytics/read`     | Admin       | Get analytics on memos read over time.           |
| `PATCH`  | `/:memoId/read`       | User        | Mark a memo as read.                             |
| `PATCH`  | `/:memoId/acknowledge`| User        | Acknowledge a memo.                              |
| `PATCH`  | `/:memoId/snooze`     | User        | Snooze a memo notification.                      |
| `PUT`    | `/:memoId`            | User (Owner)| Update a memo.                                   |
| `DELETE` | `/:memoId`            | User (Owner)| Delete a memo.                                   |

### Messages (`/api/messages`)

| Method | Endpoint          | Permissions | Description                               |
| :----- | :---------------- | :---------- | :---------------------------------------- |
| `GET`  | `/users`          | User        | Get a list of all users to message.       |
| `GET`  | `/userMessage/:id`| User        | Get the conversation with a specific user.|
| `POST` | `/user/:id`       | User        | Send a message to a specific user.        |
| `GET`  | `/employees/count`| Public      | Get the total number of employees.        |
| `GET`  | `/recent`         | User        | Get recent messages for the current user. |
| `GET`  | `/today`          | Public      | Get the number of messages sent today.    |

### Reports (`/api/reports`)

| Method | Endpoint              | Permissions | Description                               |
| :----- | :-------------------- | :---------- | :---------------------------------------- |
| `POST` | `/upload`             | Admin       | Upload a report file (CSV or Excel).      |
| `GET`  | `/uploaded-reports`   | Admin       | Get a list of all uploaded reports.       |
| `GET`  | `/uploaded-reports/:reportId` | Admin | Get the data from a specific report.      |
| `GET`  | `/export`             | Admin       | Export a report as a CSV or Excel file.   |

### Roles (`/api/roles`)

| Method   | Endpoint             | Permissions | Description                               |
| :------- | :------------------- | :---------- | :---------------------------------------- |
| `POST`   | `/`                  | Admin       | Create a new role.                        |
| `GET`    | `/`                  | Admin       | Get all roles.                            |
| `GET`    | `/:roleId`           | Admin       | Get a role by its ID.                     |
| `PUT`    | `/:roleId`           | Admin       | Update a role.                            |
| `DELETE` | `/:roleId`           | Admin       | Delete a role.                            |
| `POST`   | `/:roleId/permissions`| Admin      | Assign a permission to a role.            |
| `DELETE` | `/:roleId/permissions`| Admin      | Remove a permission from a role.          |

### Settings (`/api/users/settings`)

| Method | Endpoint | Permissions | Description                       |
| :----- | :------- | :---------- | :-------------------------------- |
| `GET`  | `/`      | User        | Get the current user's settings. |
| `PUT`  | `/`      | User        | Update the current user's settings.|

### Tasks (`/api/tasks`)

| Method   | Endpoint                   | Permissions | Description                                      |
| :------- | :------------------------- | :---------- | :----------------------------------------------- |
| `POST`   | `/`                        | User        | Create a new task.                               |
| `GET`    | `/`                        | User        | Get all tasks (admin) or assigned tasks (user).  |
| `GET`    | `/count`                   | User        | Get the total number of tasks.                   |
| `GET`    | `/getUserTasks/:userId`    | User        | Get all tasks for a specific user.               |
| `PATCH`  | `/:taskId`                 | User        | Update a task.                                   |
| `DELETE` | `/:taskId`                 | User (Owner)| Delete a task.                                   |
| `POST`   | `/:taskId/comments`        | User        | Add a comment to a task.                         |
| `GET`    | `/:taskId/comments`        | User        | Get all comments for a task.                     |
| `POST`   | `/:taskId/attachments`     | User        | Upload an attachment to a task.                  |
| `GET`    | `/:taskId/attachments`     | User        | Get all attachments for a task.                  |
| `DELETE` | `/:taskId/attachments/:attachmentId` | User | Delete an attachment from a task.              |
| `POST`   | `/:taskId/memos/:memoId`   | User        | Link a memo to a task.                           |
| `DELETE` | `/:taskId/memos/:memoId`   | User        | Unlink a memo from a task.                       |
| `PATCH`  | `/:taskId/delegate`        | User        | Delegate a task to another user.                 |
| `GET`    | `/search/advanced`         | User        | Perform an advanced search for tasks.            |
| `GET`    | `/:taskId/audit`           | User        | Get the audit log for a task.                    |
| `GET`    | `/analytics/completed`     | Admin       | Get analytics on tasks completed over time.      |

### Teams (`/api/teams`)

| Method   | Endpoint             | Permissions | Description                               |
| :------- | :------------------- | :---------- | :---------------------------------------- |
| `POST`   | `/`                  | Admin       | Create a new team.                        |
| `GET`    | `/`                  | Admin       | Get all teams.                            |
| `GET`    | `/:teamId`           | Admin       | Get a team by its ID.                     |
| `PUT`    | `/:teamId`           | Admin       | Update a team.                            |
| `DELETE` | `/:teamId`           | Admin       | Delete a team.                            |
| `POST`   | `/:teamId/members`   | Admin       | Add a member to a team.                   |
| `DELETE` | `/:teamId/members`   | Admin       | Remove a member from a team.              |
| `POST`   | `/:teamId/leader`    | Admin       | Assign a leader to a team.                |