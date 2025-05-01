# PayGate Dashboard

A modern, feature-rich payment gateway dashboard built with React, TypeScript, and Tailwind CSS. This application provides comprehensive payment management capabilities for administrators, agents, and users.

## Features

### Multi-Role Authentication
- Support for three user roles:
  - Admin: Full system management capabilities
  - Agent: Client management and transaction oversight
  - User: Basic payment and account management

### Admin Features
- User Management
  - Add/Edit users and staff
  - Manage user permissions
  - Configure user charges and callbacks
- Transaction Management
  - Process payouts
  - Handle bulk payouts
  - Manage fund requests
  - Track wallet transactions
- Financial Reports
  - Wallet reports
  - Payout reports
  - Chargeback management
  - Settlement tracking

### Agent Features
- Client Management Dashboard
- Transaction Monitoring
- Wallet Reports
- Payout Management
- Developer Tools and Documentation

### User Features
- Transaction Dashboard
- Fund Request Management
- Wallet Reports
- Payout Reports
- Developer Settings
- API Documentation

## Technology Stack

- **Frontend Framework**: React 18
- **Type System**: TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Development Environment**: Node.js

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```bash
   cd payment-gateway-dashboard
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

### Build for Production

To create a production build:

```bash
npm run build
```

The built files will be available in the `dist` directory.

## Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── auth/          # Authentication related components
│   ├── dashboard/     # Dashboard specific components
│   ├── layout/        # Layout components
│   └── ui/            # Generic UI components
├── context/           # React context providers
├── data/             # Mock data and constants
├── pages/            # Page components
│   ├── admin/        # Admin specific pages
│   ├── agent/        # Agent specific pages
│   ├── auth/         # Authentication pages
│   └── user/         # User specific pages
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## Demo Credentials

For testing purposes, use the following credentials:

- **Admin Account**
  - Email: admin@example.com
  - Password: password

- **Agent Account**
  - Email: agent@example.com
  - Password: password

- **User Account**
  - Email: user@example.com
  - Password: password

## Features in Detail

### Dashboard
- Real-time transaction monitoring
- Statistical charts and analytics
- Quick action buttons
- Recent activity logs

### User Management
- User creation and editing
- Role assignment
- Permission management
- Activity tracking

### Transaction Management
- Real-time transaction processing
- Multi-currency support
- Transaction status tracking
- Detailed transaction history

### Reporting
- Comprehensive financial reports
- Export capabilities
- Custom date range filtering
- Transaction categorization

### Security Features
- Role-based access control
- Secure authentication
- Activity logging
- Session management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
