const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cors());

// High-speed memory queues for balanced processing
const gshareQueue = [];
const adpQueue = [];
let processedCount = 0;

// Security Middleware to restrict routes to Admin only
function verifyAdmin(req, res, next) {
    const userRole = req.headers['x-user-role'];
    if (userRole === 'ADMIN') {
        next(); // Allow admin access
    } else {
        res.status(403).json({ success: false, error: "Access Denied: Admin privileges required." });
    }
}

// 1. ADMIN ONLY METRICS ROUTE
app.get('/api/admin/metrics', verifyAdmin, (req, res) => {
    res.json({
        success: true,
        data: {
            totalFiles: 352,
            deliveredTB: "120.66 TB",
            mtnProcessed: 32327,
            processedQueueCount: processedCount
        }
    });
});

// 2. API ENDPOINTS FOR QUEUED ORDERS
app.post('/api/gshare/order', (req, res) => {
    gshareQueue.push(req.body);
    res.json({ success: true, message: "GShare order received." });
});

app.post('/api/adp/order', (req, res) => {
    adpQueue.push(req.body);
    res.json({ success: true, message: "ADH data order received." });
});

// 3. FAST-PROCESSING WORKER (Runs both queues simultaneously at equal speeds)
async function runHighSpeedProcessor() {
    if (gshareQueue.length > 0 && adpQueue.length > 0) {
        const gshareItem = gshareQueue.shift();
        const adpItem = adpQueue.shift();

        await Promise.all([
            processTask(gshareItem),
            processTask(adpItem)
        ]);

        processedCount++;
    }
}

async function processTask(item) {
    return new Promise(resolve => setTimeout(resolve, 100)); 
}

// Loop runs every 200ms to keep processing fast and synchronized
setInterval(runHighSpeedProcessor, 200);

app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
// Example unified metrics route
app.get('/api/metrics', async (req, res) => {
  try {
    const { startDate, endDate, network } = req.query;

    // Build your database query filters dynamically
    let filter = {};
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate),$lte: new Date(endDate) };
    }
    if (network) {
      filter.network = network; // e.g., 'MTN', 'Telecel', 'AirtelTigo'
    }

    // Fetch counts using the same filter logic for both ADH and GShare data
    const pendingCount = await Order.countDocuments({ ...filter, status: 'pending' });
    const processingCount = await Order.countDocuments({ ...filter, status: 'processing' });
    const processedCount = await Order.countDocuments({ ...filter, status: 'processed' });
    const failedCount = await Order.countDocuments({ ...filter, status: 'failed' });

    res.json({
      pending: pendingCount,
      processing: processingCount,
      processed: processedCount,
      failed: failedCount,
      totalBeneficiaries: processedCount // Aligning ranges where applicable
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
