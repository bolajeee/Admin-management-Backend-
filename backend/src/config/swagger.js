import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Admin Management System API',
            version: '1.0.0',
            description: 'A comprehensive admin management system with user management, real-time messaging, task management, and reporting capabilities.',
            contact: {
                name: 'Admin Management Team',
                email: 'Ibrahimomoblaji1999@gmail.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production'
                    ? 'https://admin-management-backend.onrender.com/api'
                    : 'http://localhost:5000/api',
                description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                },
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'jwt'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        error: {
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string',
                                    example: 'Error message'
                                },
                                details: {
                                    type: 'string',
                                    example: 'Detailed error information (development only)'
                                }
                            }
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-01T00:00:00.000Z'
                        }
                    }
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Operation successful'
                        },
                        data: {
                            type: 'object',
                            description: 'Response data'
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-01T00:00:00.000Z'
                        }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            example: '507f1f77bcf86cd799439011'
                        },
                        fullName: {
                            type: 'string',
                            example: 'John Doe'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'john.doe@example.com'
                        },
                        role: {
                            type: 'string',
                            enum: ['admin', 'employee'],
                            example: 'employee'
                        },
                        profilePic: {
                            type: 'string',
                            example: 'https://example.com/profile.jpg'
                        },
                        isActive: {
                            type: 'boolean',
                            example: true
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                Task: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            example: '507f1f77bcf86cd799439011'
                        },
                        title: {
                            type: 'string',
                            example: 'Complete project documentation'
                        },
                        description: {
                            type: 'string',
                            example: 'Write comprehensive documentation for the project'
                        },
                        assignedTo: {
                            $ref: '#/components/schemas/User'
                        },
                        assignedBy: {
                            $ref: '#/components/schemas/User'
                        },
                        priority: {
                            type: 'string',
                            enum: ['low', 'medium', 'high', 'critical'],
                            example: 'high'
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'in-progress', 'completed', 'cancelled'],
                            example: 'pending'
                        },
                        dueDate: {
                            type: 'string',
                            format: 'date-time'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                Memo: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            example: '507f1f77bcf86cd799439011'
                        },
                        title: {
                            type: 'string',
                            example: 'Important Meeting Tomorrow'
                        },
                        content: {
                            type: 'string',
                            example: 'Please attend the team meeting tomorrow at 10 AM'
                        },
                        sender: {
                            $ref: '#/components/schemas/User'
                        },
                        recipients: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/User'
                            }
                        },
                        severity: {
                            type: 'string',
                            enum: ['low', 'medium', 'high', 'critical'],
                            example: 'medium'
                        },
                        isRead: {
                            type: 'boolean',
                            example: false
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        page: {
                            type: 'integer',
                            example: 1
                        },
                        limit: {
                            type: 'integer',
                            example: 10
                        },
                        total: {
                            type: 'integer',
                            example: 100
                        },
                        totalPages: {
                            type: 'integer',
                            example: 10
                        },
                        hasNext: {
                            type: 'boolean',
                            example: true
                        },
                        hasPrev: {
                            type: 'boolean',
                            example: false
                        }
                    }
                }
            },
            responses: {
                BadRequest: {
                    description: 'Bad Request',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            }
                        }
                    }
                },
                Unauthorized: {
                    description: 'Unauthorized',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            }
                        }
                    }
                },
                Forbidden: {
                    description: 'Forbidden',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            }
                        }
                    }
                },
                NotFound: {
                    description: 'Not Found',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            }
                        }
                    }
                },
                InternalServerError: {
                    description: 'Internal Server Error',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            },
            {
                cookieAuth: []
            }
        ]
    },
    apis: [
        './src/routes/*.js',
        './src/controllers/*.js',
        './src/models/*.js'
    ]
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };