# Payment Gateway Dashboard

A robust and scalable payment gateway dashboard built with Node.js, Express, and MongoDB. This application provides a comprehensive solution for managing payments, payouts, and transactions with advanced features like real-time monitoring, role-based access control, and detailed logging.

## 🌟 Features

### Core Features
- **Payment Processing**: Handle both payin and payout transactions
- **Real-time Transaction Monitoring**: Track transaction status and history
- **Multi-role Support**: Different access levels for Admin, Agent, and Users
- **Secure Authentication**: JWT-based authentication with role-based authorization
- **Comprehensive Logging**: Detailed API and transaction logging
- **Rate Limiting**: Protect against abuse with configurable rate limits
- **Error Handling**: Centralized error handling with environment-specific responses
- **Background Job Processing**: Queue-based processing for payments and payouts

### Technical Features
- **MongoDB Integration**: Scalable document-based database
- **Redis Queue**: Background job processing with Bull
- **Winston Logging**: Structured logging with multiple transports
- **API Validation**: Request validation using Joi
- **Security Best Practices**: 
  - Environment-based configuration
  - Secure error handling
  - Rate limiting
  - Input validation
  - Role-based access control

## 🏗️ Architecture

### Directory Structure
```
payment-gateway-dashboard/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Custom middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── workers/         # Background job processors
│   └── app.js           # Application entry point
├── logs/                # Application logs
├── .env                 # Environment variables
└── package.json         # Project dependencies
```

### Key Components

1. **Models**
   - `Transaction`: Handles payment and payout records
   - `ApiLog`: Tracks API requests and responses
   - `User/Agent`: Manages user data and roles

2. **Middleware**
   - `auth.js`: JWT authentication and authorization
   - `errorHandler.js`: Centralized error handling
   - `logger.js`: Request and response logging
   - `rateLimiter.js`: API rate limiting
   - `validator.js`: Request validation

3. **Services**
   - `payment.service.js`: Core payment processing logic
   - Queue configuration for background jobs

4. **Workers**
   - Background job processors for payments and payouts
   - Retry mechanism for failed transactions

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Redis
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd payment-gateway-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/payment-gateway

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Payment Gateway Configuration
PAYMENT_GATEWAY_URL=https://api.paymentgateway.com
PAYMENT_GATEWAY_API_KEY=your-api-key
PAYMENT_GATEWAY_API_SECRET=your-api-secret

# Logging Configuration
LOG_LEVEL=info
```

4. Start the application:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/login`: User login
- `POST /api/auth/register`: User registration
- `POST /api/auth/refresh-token`: Refresh access token

### Payments
- `POST /api/payments/payment`: Initiate a payment
- `POST /api/payments/payout`: Initiate a payout
- `GET /api/payments/transaction/:transaction_id`: Get transaction status

### Users
- `GET /api/users/profile`: Get user profile
- `PUT /api/users/profile`: Update user profile
- `GET /api/users/transactions`: Get user transactions

### Agents
- `GET /api/agents/dashboard`: Get agent dashboard data
- `GET /api/agents/transactions`: Get agent transactions

## 🔒 Security Features

1. **Authentication & Authorization**
   - JWT-based authentication
   - Role-based access control
   - Token refresh mechanism

2. **Data Protection**
   - Input validation
   - Request sanitization
   - Secure error handling
   - Environment-based configuration

3. **API Security**
   - Rate limiting
   - Request validation
   - Secure headers
   - CORS configuration

## 📊 Logging System

The application uses a comprehensive logging system with Winston:

1. **Log Levels**
   - Error: Application errors
   - Warn: Warning messages
   - Info: General information
   - Debug: Debug information (development only)

2. **Log Transports**
   - Console: Colored logs for development
   - File: Separate files for errors and combined logs
   - Custom format with timestamps and metadata

3. **API Logging**
   - Request details
   - Response data
   - Processing time
   - User information
   - Error tracking

## 🔄 Background Processing

The application uses Bull queue for background job processing:

1. **Payment Processing**
   - Asynchronous payment processing
   - Retry mechanism for failed transactions
   - Job status tracking
   - Error handling

2. **Queue Configuration**
   - Redis-based queue
   - Configurable retry attempts
   - Job prioritization
   - Event handling

## 🛠️ Development

### Code Style
- ESLint configuration
- Prettier formatting
- Consistent naming conventions
- JSDoc documentation

### Testing
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Scripts
- `npm run dev`: Start development server
- `npm start`: Start production server
- `npm test`: Run tests
- `npm run lint`: Run linter
- `npm run format`: Format code

## 📈 Monitoring

The application includes several monitoring features:

1. **Transaction Monitoring**
   - Real-time status updates
   - Transaction history
   - Error tracking
   - Performance metrics

2. **API Monitoring**
   - Request/response logging
   - Performance tracking
   - Error monitoring
   - Usage statistics

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Express.js team
- MongoDB team
- Redis team
- All contributors and supporters 