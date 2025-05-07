const fs = require('fs');
const pool = require('../config/database');
const express = require('express');
const router = express.Router();


  router.get('/api/company-share', async (req, res) => {
    const { month = 'all' } = req.query;
    const monthInt = month === 'all' ? 'all' : parseInt(month);
    console.log(monthInt);
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];
  
    try {
      const result = [];
  
      for (const year of years) {
        let query = '';
        let params = [];
  
        if (monthInt === 'all') {
          query = `
            SELECT Company, COUNT(*) AS count
            FROM dashboard
            WHERE YEAR(Auction_date) = ?
            GROUP BY Company
            ORDER BY Company
          `;
          params = [year];
        } else {
          query = `
            SELECT Company, COUNT(*) AS count
            FROM dashboard
            WHERE YEAR(Auction_date) = ? AND MONTH(Auction_date) = ?
            GROUP BY Company
            ORDER BY Company
          `;
          params = [year, monthInt];
        }
  
        const [rows] = await pool.execute(query, params);
        const total = rows.reduce((sum, row) => sum + row.count, 0);
  
        result.push({
          year,
          total,
          data: rows
        });
      }
      res.json(result);
    } catch (err) {
      console.error('Company share error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  
  // API to fetch data with caching
  router.get('/api/data', async (req, res) => {
    const { company = 'all', period } = req.query;
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];
  
    try {
      const data = [];
  
      for (const year of years) {
        const params = company === 'all' ? [year] : [company, year];
        let query = '';
  
        if (period === 'quarter') {
          query = company === 'all'
            ? 'SELECT QUARTER(Auction_date) AS period, COUNT(*) AS count FROM dashboard WHERE YEAR(Auction_date) = ? GROUP BY QUARTER(Auction_date) ORDER BY period'
            : 'SELECT QUARTER(Auction_date) AS period, COUNT(*) AS count FROM dashboard WHERE Company = ? AND YEAR(Auction_date) = ? GROUP BY QUARTER(Auction_date) ORDER BY period';
        } else if (period === 'month') {
          query = company === 'all'
            ? 'SELECT MONTH(Auction_date) AS period, COUNT(*) AS count FROM dashboard WHERE YEAR(Auction_date) = ? GROUP BY MONTH(Auction_date) ORDER BY period'
            : 'SELECT MONTH(Auction_date) AS period, COUNT(*) AS count FROM dashboard WHERE Company = ? AND YEAR(Auction_date) = ? GROUP BY MONTH(Auction_date) ORDER BY period';
        }
  
        if (!query) {
          return res.status(400).json({ error: 'Invalid period parameter' });
        }
  
        const [rows] = await pool.execute(query, params);
        data.push({ year, data: rows });
      }
  
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


// Mockup Data Page
router.get('/', async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login"); // ถ้าไม่ได้ล็อกอินให้ไปที่หน้า Login
    }
    const userRole = req.session.user.role;
    const roleMap = req.app.locals.roleMap || {}; // ถ้า roleMap ยังไม่มี ให้ใช้ object ว่างแทน

    const [companies] = await pool.query('SELECT DISTINCT Company FROM dashboard ORDER BY Company');
    // ส่งข้อมูลที่แปลงแล้วไปแสดงผล
    res.render('data', {
        title: 'Dashboard',
        page_title: 'Dashboard',
        folder: 'Dashboards',
        layout: 'layouts/layout-horizontal',
        session: req.session,
        roleMap: roleMap,
        companies: companies.map(row => row.Company)
    });
});

router.get('/api/export-company-share', async (req, res) => {
  const { start_date, end_date } = req.query;
  console.log(start_date, end_date);

  try {
    const query = `
      SELECT 
        Seller_name AS "ชื่อผู้ขาย",
        COUNT(CASE WHEN Company = 'Apple_Auction' THEN 1 END) AS "APPLE",
        COUNT(CASE WHEN Company = 'Auction_express' THEN 1 END) AS "AUCT",
        COUNT(CASE WHEN Company = 'Motto_Auction' THEN 1 END) AS "Motto",
        COUNT(CASE WHEN Company = 'SiamInter_Auction' THEN 1 END) AS "SIA",
        COUNT(CASE WHEN Company = 'Sahakrane_Auction' THEN 1 END) AS "สหเครน",
        COUNT(CASE WHEN Company = 'Inter_auction' THEN 1 END) AS "สากล",
        COUNT(CASE WHEN Company = 'Premium_Inter_Auction' THEN 1 END) AS "PIA",
        COUNT(CASE WHEN Company = 'Auction_express' THEN 1 END) AS "AX",
        COUNT(DISTINCT CASE WHEN Company = 'Apple_Auction' THEN Company END) AS "APPLE(ไม่นับซ้ำ)",
        COUNT(DISTINCT CASE WHEN Company = 'Auction_express' THEN Company END) AS "AUCT(ไม่นับซ้ำ)",
        COUNT(DISTINCT CASE WHEN Company = 'Motto_Auction' THEN Company END) AS "Motto(ไม่นับซ้ำ)",
        COUNT(DISTINCT CASE WHEN Company = 'SiamInter_Auction' THEN Company END) AS "SIA(ไม่นับซ้ำ)",
        COUNT(DISTINCT CASE WHEN Company = 'Sahakrane_Auction' THEN Company END) AS "สหเครน(ไม่นับซ้ำ)",
        COUNT(DISTINCT CASE WHEN Company = 'Inter_auction' THEN Company END) AS "สากล(ไม่นับซ้ำ)",
        COUNT(DISTINCT CASE WHEN Company = 'Premium_Inter_Auction' THEN Company END) AS "PIA(ไม่นับซ้ำ)",
        COUNT(DISTINCT CASE WHEN Company = 'Auction_express' THEN Company END) AS "AX(ไม่นับซ้ำ)"
      FROM dashboard
      WHERE 
        (Auction_date BETWEEN ? AND ? OR ? IS NULL OR ? IS NULL)
      GROUP BY Seller_name
    `;

    const params = [start_date, end_date, start_date, end_date];
    
    const [rows] = await pool.query(query, params);

    let csv = '';
    if (rows.length > 0) {
      csv += Object.keys(rows[0]).join(',') + '\n';
      rows.forEach(row => {
        csv += Object.values(row).map(val => `"${val}"`).join(',') + '\n';
      });
    }

    const BOM = '\uFEFF';
    const csvWithBom = BOM + csv;

    const filename = `summary_${start_date}_${end_date}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvWithBom);

  } catch (error) {
    console.error('Export company share error:', error);
    res.status(500).send('Internal Server Error');
  }
});






module.exports = router;
