# BharatBill — GST-ready invoicing in INR

An India-first invoicing and client payments system for freelancers and small businesses. Create invoices, track payments (incl. UPI/UTR), share PDFs with GSTIN, and give clients a portal to view and update payment status.

## Features

### 🎯 Core Functionality
- **User Management**: Separate dashboards for freelancers and businesses
- **Invoice Creation**: Professional invoice generation with customizable templates
- **Client Management**: Complete client database with contact information
- **Payment Tracking**: Monitor payments, due dates, and outstanding amounts
- **Dashboard Analytics**: Revenue insights, charts, and performance metrics
- **PDF Generation**: Export invoices to PDF format
- **Email Integration**: Send invoices directly to clients
- **Recurring Invoices**: Set up automatic recurring billing

### 💼 For Freelancers
- Personal branding with logo upload
- Hourly rate tracking
- Skills and profession management
- Simple client management
- Quick invoice generation

### 🏢 For Businesses
- Company information management
- Multiple user roles
- Advanced client management
- Business analytics
- Tax management
- Bank details integration

### 📊 Analytics & Reports
- Monthly/quarterly revenue charts
- Invoice status breakdown
- Client analytics
- Overdue tracking
- Payment history
- Export capabilities

## Tech Stack

### Frontend
- **React 18** - Modern UI library
- **React Router** - Navigation and routing
- **React Hook Form** - Form management
- **TanStack Query** - Server state management
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Data visualization
- **React Icons** - Icon library
- **React Hot Toast** - Notifications
- **Date-fns** - Date manipulation
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File upload handling
- **Nodemailer** - Email functionality
- **PDF-lib** - PDF generation
- **Puppeteer** - Web scraping and PDF generation

## Project Structure

```
invoice/
├── backend/                 # Node.js backend
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   └── server.js           # Entry point
├── src/                    # React frontend
│   ├── components/         # Reusable components
│   ├── pages/              # Page components
│   ├── context/            # React context
│   ├── utils/              # Utility functions
│   └── App.js              # Main app component
└── public/                 # Static assets
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn package manager

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the backend directory with your MongoDB connection and other settings.

4. **Start the backend server**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Start the development server**
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Clients
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `POST /api/invoices/:id/payment` - Record payment

### Dashboard
- `GET /api/dashboard/overview` - Dashboard overview data
- `GET /api/dashboard/analytics/revenue` - Revenue analytics

## Getting Started

1. Clone the repository
2. Install dependencies for both frontend and backend
3. Set up MongoDB database
4. Configure environment variables
5. Start both servers
6. Register as either a freelancer or business user
7. Start creating invoices!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

Built with ❤️ for freelancers and small businesses worldwide.

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
