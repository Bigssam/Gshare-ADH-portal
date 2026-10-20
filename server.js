const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize PostgreSQL connection pool using DATABASE_URL from Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(express.static(__dirname));

// Live API endpoint fetching order status counts directly from the database
app.get('/api/metrics', async (req, res) => {
  try {
    const query = `
      SELECT LOWER(status) AS status, COUNT(*) AS count 
      FROM orders 
      GROUP BY LOWER(status);
    `;
    const result = await pool.query(query);

    const metrics = {
      pending: 0,
      processing: 0,
      processed: 0,
      failed: 0,
      cancelled: 0,
      totalBeneficiaries: 0
    };

    let total = 0;
    result.rows.forEach(row => {
      const statusKey = row.status;
      const count = parseInt(row.count, 10) || 0;

      if (metrics.hasOwnProperty(statusKey)) {
        metrics[statusKey] = count;
      }
      total += count;
    });

    metrics.totalBeneficiaries = total;
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
// Temporary seed route to test live dashboard counts
app.get('/api/seed', async (req, res) => {
  try {
    await pool.query("INSERT INTO orders (status) VALUES ('pending'), ('processing'), ('processed'), ('failed');");
    res.send('Success! Test orders added. Go back and refresh your dashboard.');
  } catch (err) {
    res.status(500).send('Error adding test data: ' + err.message);
  }
});

app.listen(PORT, () => {



