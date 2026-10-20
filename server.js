const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 1. Serve static files (index.html, CSS, JS) from root folder
app.use(express.static(__dirname));

// 2. Metrics API route
app.get('/api/metrics', (req, res) => {
  res.json({
    pending: 70,
    processing: 253,
    processed: 5834,
    failed: 1,
    cancelled: 0,
    totalBeneficiaries: 5955
  });
});

// 3. Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

