const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Home page route
router.get('/', async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login"); // ถ้าไม่ได้ล็อกอินให้ไปที่หน้า Login
    }
    const userRole = req.session.user.role;
    const roleMap = req.app.locals.roleMap || {}; // ถ้า roleMap ยังไม่มี ให้ใช้ object ว่างแทน
    if (!req.session.user) {
        return res.redirect("/auth/login"); // ถ้าไม่ได้ล็อกอินให้ไปที่หน้า Login
    }
    // Query for status count (using DATE_FORMAT to get dd/mm/yyyy)
    const statusQuery = `
        SELECT DATE_FORMAT(\`timestamp\`, '%d/%m/%Y') AS \`date\`, COUNT(\`status\`) AS count, \`status\` 
        FROM \`status\` 
        GROUP BY \`date\`, \`status\`
    `;
    
    // Query for car auction counts (using DATE_FORMAT to get dd/mm/yyyy)
    const auctionQuery = `
        SELECT SUM(\`num_row\`) AS total, \`name_status\`, DATE_FORMAT(\`timestamp\`, '%d/%m/%Y') AS \`date\` 
        FROM \`status\` 
        GROUP BY \`date\`, \`name_status\`
    `;

    try {
        const [statusResults] = await db.query(statusQuery);
        const [auctionResults] = await db.query(auctionQuery);

        const dates = [...new Set(statusResults.map(row => row.date))];

        const successData = dates.map(date => {
            const success = statusResults.find(r => r.date === date && r.status === 'success');
            return success ? success.count : 0;
        });
        const warnData = dates.map(date => {
            const warn = statusResults.find(r => r.date === date && r.status === 'warn');
            return warn ? warn.count : 0;
        });
        const errorData = dates.map(date => {
            const error = statusResults.find(r => r.date === date && r.status === 'error');
            return error ? error.count : 0;
        });

        const auctionNames = [...new Set(auctionResults.map(row => row.name_status))];
        const auctionData = auctionNames.map(name => {
            return dates.map(date => {
                const auction = auctionResults.find(r => r.date === date && r.name_status === name);
                return auction ? auction.total : 0;
            });
        });

        res.render('index', { 
            title: 'Home', 
            dates: JSON.stringify(dates), 
            successData: JSON.stringify(successData), 
            warnData: JSON.stringify(warnData), 
            errorData: JSON.stringify(errorData),
            auctionNames: JSON.stringify(auctionNames),
            auctionData: JSON.stringify(auctionData), 
            page_title: 'Home', 
            folder: 'Home', 
            layout: 'layouts/layout-horizontal',            session: req.session,
            roleMap: roleMap
        });
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Database error');
    }
});

module.exports = router;
