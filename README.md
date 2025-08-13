# Admin Management System Backend

A robust Node.js backend server built with Express.js to power the Admin Management System. This backend provides secure API endpoints, authentication, real-time communication, and data management capabilities.

## 🚀 Features

### Authentication & Security
- JWT-based authentication system
- Role-based access control (RBAC)
- Password encryption with bcrypt
- Secure session management
- Request rate limiting
- CORS protection

### Database & Data Management
- MongoDB integration with Mongoose ODM
- Structured data models
- Data validation and sanitization
- Efficient querying and indexing
- Automated backup system

### API Endpoints
- RESTful API architecture
- Versioned API endpoints
- Comprehensive documentation
- Input validation
- Error handling middleware

### File Management
- File upload handling with Cloudinary
- Multiple file format support
- Secure file storage
- File access control
- Automatic file cleanup

### Communication Services
- Email service integration
- SMS notification system
- Real-time updates with WebSocket
- Push notifications
- Message queuing

### Monitoring & Logging
- Activity logging system
- Error tracking and reporting
- Performance monitoring
- Request/Response logging
- Audit trail maintenance

### Task Management
- Task creation and assignment
- Status tracking and updates
- Due date management
- Task notifications
- Comment system

### Report Generation
- Dynamic report creation
- PDF generation
- Data export capabilities
- Report templates
- Custom filters

## 🛠️ Technical Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT, bcrypt
- **File Storage:** Cloudinary
- **Communications:** Nodemailer, Twilio
- **Validation:** Joi
- **Documentation:** Swagger/OpenAPI

## 📦 Project Structure

```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   │   ├── admin.controller.js
│   │   ├── auth.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── memo.controller.js
│   │   ├── message.controller.js
│   │   ├── report.controller.js
│   │   ├── settings.controller.js
│   │   └── task.controller.js
│   ├── models/         # Database models
│   │   ├── memo.model.js
│   │   ├── message.model.js
│   │   ├── report.model.js
│   │   └── user.model.js
│   ├── middleware/     # Custom middleware
│   │   ├── auth.middleware.js
│   │   └── activity.middleware.js
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   ├── utils/         # Utility functions
│   ├── lib/          # Third-party integrations
│   │   ├── cloudinary.js
│   │   ├── db.js
│   │   ├── email.js
│   │   └── sms.js
│   └── index.js      # Application entry point
├── uploads/          # Temporary file storage
└── scripts/         # Utility scripts
```

## 🚀 Getting Started

1. **Clone the repository**
```bash
git clone <repository-url>
cd admin-management-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file in the root directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
EMAIL_SERVICE=your_email_service
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
SMS_API_KEY=your_sms_api_key
```

4. **Start the server**
```bash
# Development
npm run dev

# Production
npm start
```

## 🔧 API Documentation

The API documentation is available at `/api-docs` when running the server. It includes:

- Detailed endpoint descriptions
- Request/Response examples
- Authentication requirements
- Schema definitions

## ⚙️ Environment Variables

| Variable | Description |
|----------|-------------|
| PORT | Server port number |
| MONGODB_URI | MongoDB connection string |
| JWT_SECRET | Secret for JWT signing |
| CLOUDINARY_* | Cloudinary credentials |
| EMAIL_* | Email service configuration |
| SMS_API_KEY | SMS service API key |

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- Initial work - [bolajeee](https://github.com/bolajeee)

## 🙏 Acknowledgments

- Thanks to all contributors who have helped shape this project
- Open source community for the amazing tools and libraries
- MongoDB and Node.js communities for excellent documentation
