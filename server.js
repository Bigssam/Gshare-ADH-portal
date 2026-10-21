const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Auto-create orders table if it doesn't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`)
.then(() => console.log('Database table "orders" is ready.'))
.catch(err => console.error('Error creating orders table:', err));

// Route: Fetch Live Dashboard Metrics
app.get('/api/metrics', async (req, res) => {
  try {
    const result = await pool.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status;');
    
    const metrics = {
      pending: 0,
      processing: 0,
      processed: 0,
      failed: 0,
      cancelled: 0,
      totalBeneficiaries: 0
    };

    result.rows.forEach(row => {
      const status = row.status.toLowerCase();
      if (metrics.hasOwnProperty(status)) {
        metrics[status] = parseInt(row.count, 10);
      }
    });

    const totalResult = await pool.query('SELECT COUNT(*) as total FROM orders;');
    metrics.totalBeneficiaries = parseInt(totalResult.rows[0].total, 10);

    res.json(metrics);
  } catch (err) {
    console.error('Database query error:', err.message);
    res.status(500).json({
      pending: 0,
      processing: 0,
      processed: 0,
      failed: 0,
      cancelled: 0,
      totalBeneficiaries: 0,
      error: 'Failed to fetch live database metrics'
    });
  }
});

// Route: Temporary seed route to insert test data
app.get('/api/seed', async (req, res) => {
  try {
    await pool.query("INSERT INTO orders (status) VALUES ('pending'), ('processing'), ('processed'), ('failed');");
    res.send('Success! Test orders added. Go back and refresh your dashboard.');
  } catch (err) {
    res.status(500).send('Error adding test data: ' + err.message);
  }
});

// Serve frontend index.html for root route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});




