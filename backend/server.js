const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const invoiceRoutes = require('./routes/invoices');
const clientRoutes = require('./routes/clients');
const dashboardRoutes = require('./routes/dashboard');
const templateRoutes = require('./routes/templates');
const clientPortalRoutes = require('./routes/clientPortal');
const productRoutes = require('./routes/products');
const clientSignupRoutes = require('./routes/clientSignup');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
const allowedOrigins = [process.env.FRONTEND_ORIGIN || 'http://localhost:3000'];
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin like mobile apps or curl
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice-tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/client-portal', clientPortalRoutes);
app.use('/api/products', productRoutes);
app.use('/api', clientSignupRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle server errors (e.g. EADDRINUSE)
server.on('error', (err) => {
  console.error('Server error:', err);
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    // Exit so a process manager (or developer) can restart it cleanly
    process.exit(1);
  }
});

// Graceful shutdown helper
const gracefulShutdown = async (signal) => {
  try {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      try {
        console.log('HTTP server closed');
        // mongoose v6+ close returns a Promise and no longer accepts a callback
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
      } catch (err) {
        console.error('Error closing MongoDB connection', err);
        process.exit(1);
      }
    });
    // Force exit if not closed in time
    setTimeout(() => {
      console.error('Could not close connections in time, forcing shutdown');
      process.exit(1);
    }, 10000).unref();
  } catch (e) {
    console.error('Error during graceful shutdown', e);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Recommended: log and exit. A process manager should restart the process.
  // Give a short delay to flush logs then exit.
  setTimeout(() => process.exit(1), 1000).unref();
});

// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  // Attempt graceful shutdown
  try {
    server.close(() => {
      mongoose.connection.close(false, () => process.exit(1));
    });
    setTimeout(() => process.exit(1), 1000).unref();
  } catch (e) {
    console.error('Error during uncaughtException shutdown', e);
    process.exit(1);
  }
});

module.exports = app;