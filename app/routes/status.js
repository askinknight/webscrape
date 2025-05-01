const express = require('express');
const db = require('../config/database'); // Import the database connection
const router = express.Router();
const path = require('path');
const fs = require('fs');
const statusPath = path.join(__dirname, '../../public/status.json'); // Use absolute path

// Helper function to parse date and time into MySQL DATETIME format
function parseDateTime(date, time) {
    const [day, month, year] = date.split('/');
    const formattedTime = time.length === 4 ? `0${time}` : time; // Add leading zero if time is in format '9:29'
    return `${year}-${month}-${day} ${formattedTime}:00`;
}

// Helper function to update status in status.json
async function updateStatus(actionNames, newStatus, date, time, num_row) {
    try {
        const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
        const newDatetime = date && time ? parseDateTime(date, time) : ""; // Format date and time into DATETIME format3

        actionNames.forEach(actionName => {
            const statusItem = statusData.find(item => 
                item.action_name.toLowerCase() === actionName.toLowerCase()
            );
            if (statusItem) {
                statusItem.status = newStatus;
                statusItem.datetime = newDatetime || statusItem.datetime;
                statusItem.num_row = num_row;
            } else {
                console.log(`Not found: ${actionName}`);
            }
        });
        
        fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2), 'utf-8');
        console.log(`Status updated to '${newStatus}' and datetime updated for action_names: ${actionNames.join(', ')}`);
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

// ✅ แก้ไข GET `/insert` ให้ดึงค่า `file_scrape` อย่างถูกต้อง
router.get('/insert', async (req, res) => {
    const { name_status, num_row, status, message, date, time, csv_name, total_img } = req.query;

    if (!name_status || !status || !date || !time) {
        return res.status(400).send('Missing required fields');
    }

    try {
        const timestamp = parseDateTime(date, time);

        // ✅ ดึงค่า file_name จาก scrape_configs
        const [rows] = await db.query('SELECT file_scrape FROM scrape_configs WHERE action_name = ?', [name_status]);

        if (rows.length === 0) {
            return res.status(404).send('action_name not found in scrape_configs');
        }

        const file_name = rows[0].file_scrape;

        // ✅ Insert ลงใน status และดึงค่า id ที่พึ่ง insert ไป
        const sqlStatus = 'INSERT INTO status (name_status, num_row, status, message, timestamp, file_name) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.query(sqlStatus, [name_status, num_row || 0, status, message || '', timestamp, file_name]);

        const statusId = result.insertId; // ดึงค่า ID ที่เพิ่ง Insert

        // ✅ ถ้ามี csv_name และ total_img ให้ insert ลง load_image_status
        if (csv_name && total_img) {
            const sqlLoadImage = 'INSERT INTO load_image_status (status_id, csv_name, total_img, finish_img, log_file, errcode) VALUES (?, ?, ?, 0, NULL, NULL)';
            await db.query(sqlLoadImage, [statusId, csv_name, total_img]);
        }

        res.status(200).send('Status record inserted successfully');
    } catch (err) {
        console.error('Error inserting status:', err.message);
        res.status(500).send('Error inserting status');
    }
});


// ✅ แก้ไข GET `/update` ให้รองรับ `file_name`
router.get('/update', async (req, res) => {
    const { name_status, num_row, status, message, date, time, csv_name, total_img } = req.query;

    if (!name_status || !status || !date || !time) {
        return res.status(400).send('Missing required fields');
    }

    try {
        const timestamp = parseDateTime(date, time);

        // ✅ ดึงค่า file_name จาก scrape_configs
        const [rows] = await db.query('SELECT file_scrape FROM scrape_configs WHERE action_name = ?', [name_status]);

        if (rows.length === 0) {
            return res.status(404).send('action_name not found in scrape_configs');
        }

        const file_name = rows[0].file_scrape;

        // ✅ อัปเดต status
        const sqlUpdate = `
            UPDATE status 
            SET num_row = ?, status = ?, message = ?, timestamp = ?, file_name = ?
            WHERE name_status = ? AND status = 'process'`;

        const [result] = await db.query(sqlUpdate, [
            num_row || 0,
            status,
            message || '',
            timestamp,
            file_name,
            name_status
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).send('Status record not found or not in process state');
        }

        // ✅ ดึง ID ของ status ที่พึ่งอัปเดตไป
        const [statusRows] = await db.query('SELECT id FROM status WHERE name_status = ? ORDER BY timestamp DESC LIMIT 1', [name_status]);
        if (statusRows.length === 0) {
            return res.status(404).send('Updated status record not found');
        }

        const statusId = statusRows[0].id;

        // ✅ ถ้ามี csv_name และ total_img และ status เป็น 'success' ให้ insert ลง load_image_status
        if (status === 'success' && csv_name && total_img) {
            const sqlLoadImage = 'INSERT INTO load_image_status (status_id, csv_name, total_img, finish_img, log_file, errcode) VALUES (?, ?, ?, 0, NULL, NULL)';
            await db.query(sqlLoadImage, [statusId, csv_name, total_img]);
        }

        await updateStatus([name_status], status, date, time, num_row);
        res.status(200).send('Status record updated successfully');

    } catch (err) {
        console.error('Error updating status:', err.message);
        await updateStatus([name_status], 'error', date, time, num_row);
        res.status(500).send('Error updating status');
    }
});


// GET route to delete a status record
router.get('/delete', async (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).send('Missing required ID');
    }

    try {
        const sql = 'DELETE FROM status WHERE id = ?';
        const [result] = await db.query(sql, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).send('No status record found with the provided ID');
        }

        res.status(200).send('Status record deleted successfully');
    } catch (err) {
        console.error('Error deleting status:', err.message);
        res.status(500).send('Error deleting status');
    }
});

// Route สำหรับการกรองข้อมูล
router.get('/api', async (req, res) => {
    try {
        const { date, nameStatus } = req.query;

        let query = `
            SELECT 
                s.id AS status_id,
                s.name_status,
                s.num_row,
                s.status,
                s.message,
                s.timestamp,
                s.file_name,
                lis.id AS load_image_status_id,
                lis.csv_name,
                lis.total_img,
                lis.finish_img,
                lis.log_file,
                lis.errcode,
                (SELECT 
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM dashboard WHERE csv = lis.csv_name) 
                        THEN TRUE 
                        ELSE FALSE 
                    END
                ) AS "Checkinsert"

            FROM status s
            LEFT JOIN load_image_status lis ON s.id = lis.status_id
        `;

        // Adding filters to query based on the received parameters
        const filters = [];
        if (date) {
            const [startDate, endDate] = date.split(" - ");
            if(startDate == endDate){
            filters.push(`DATE(s.timestamp) = '${startDate}'`);
            }else{
                filters.push(`DATE(s.timestamp) BETWEEN '${startDate}' AND '${endDate}'`);
            }
        }
        if (nameStatus && nameStatus !== 'All') {
            filters.push(`s.name_status = '${nameStatus}'`);
        }

        if (filters.length > 0) {
            query += ' WHERE ' + filters.join(' AND ');
        }

        // Ensure the ordering is by timestamp in descending order (newest first)
        query += ' ORDER BY s.timestamp DESC';  // <-- add DESC here for newest first

        const [rows] = await db.query(query);
        res.json(rows);

    } catch (err) {
        console.error('Error fetching status records:', err.message);
        res.status(500).json({ error: 'Error fetching status records' });
    }
});

// Route สำหรับเรนเดอร์หน้า Status
router.get('/', async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login"); // ถ้าไม่ได้ล็อกอินให้ไปที่หน้า Login
    }
    const roleMap = req.app.locals.roleMap || {}; // ถ้า roleMap ยังไม่มี ให้ใช้ object ว่างแทน
    try {
        const [rows] = await db.query(`
            SELECT s.id AS status_id, s.name_status, s.num_row, s.status, s.message, s.timestamp, s.file_name, lis.id AS load_image_status_id, lis.csv_name, lis.total_img, lis.finish_img, lis.log_file, lis.errcode FROM status s LEFT JOIN load_image_status lis ON s.id = lis.status_id ORDER BY s.timestamp DESC;
        `);
        res.render('status', {
            records: rows,
            title: 'Status',
            page_title: 'Status',
            folder: 'Status',
            layout: 'layouts/layout-horizontal',            session: req.session,
            roleMap: roleMap
        });
    } catch (err) {
        console.error('Error fetching status records:', err.message);
        res.status(500).send('Error fetching status records');
    }
});

module.exports = router;