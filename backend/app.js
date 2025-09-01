var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var path = require('path');
require('dotenv').config();

var apiRouter = require('./routes/api');
var adminRouter = require('./routes/admin');

var app = express();

const allowedOrigins = [
  'http://localhost:4200', // Angular dev server
  process.env.WEBSITE_URL || 'https://wevote.evennode.com' // Production URL, not setup
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// API routes
app.use('/api', apiRouter);
app.use('/admin', adminRouter);

// Serve static files from Angular build
app.use(express.static(path.join(__dirname, '../frontend/dist/frontend')));

// Catch all handler, sends back Angular's index.html file for any non-API routes
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.url.startsWith('/api') || req.url.startsWith('/admin')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  res.sendFile(path.join(__dirname, '../frontend/dist/frontend/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;