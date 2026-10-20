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
      SELECT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status;
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
      const status = row.status ? row.status.toLowerCase() : '';
      const count = parseInt(row.count, 10);
      if (metrics.hasOwnProperty(status)) {
        metrics[status] = count;
      }
      total += count;
    });

    metrics.totalBeneficiaries = total;
    res.json(metrics);
  } catch (err) {
    console.error('Database query error:', err.message);
    res.status(500).json({ error: 'Failed to fetch live database metrics' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

