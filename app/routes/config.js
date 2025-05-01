const express = require('express');
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Utility function to read scrape code from file
function getScrapeCode(fileName) {
    const filePath = path.join(__dirname, '../../uploads/scrape_code', fileName);
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
}

function getloadCode(fileName) {
    const filePath = path.join(__dirname, '../../uploads/load_image', fileName);
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
}

function getdbCode(fileName) {
    const filePath = path.join(__dirname, '../../uploads/InsertDBcode', fileName);
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
}

// GET route to fetch and display all scrape configurations
router.get('/', async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login"); // ถ้าไม่ได้ล็อกอินให้ไปที่หน้า Login
    }

    const userRole = req.session.user.role;
    const roleMap = req.app.locals.roleMap || {}; // ถ้า roleMap ยังไม่มี ให้ใช้ object ว่างแทน

    if (roleMap[userRole] && Array.isArray(roleMap[userRole]) && roleMap[userRole].includes("config")) {
        try {
            const [rows] = await db.query('SELECT * FROM scrape_configs ORDER BY action_name');
            return res.render('config', {
                configs: rows,
                getScrapeCode,
                getloadCode,
                getdbCode,
                title: 'Config',
                page_title: 'config',
                folder: 'Config',
                layout: 'layouts/layout-horizontal',
                session: req.session,
                roleMap: roleMap
            });
        } catch (err) {
            console.error("Error fetching data:", err.message);
            return res.status(500).send("Error fetching data");
        }
    }

    return res.redirect("/auth/login"); // 🔹 เพิ่ม `return` เพื่อป้องกันการรันซ้ำ
});


// POST route to add a new scrape configuration
router.post('/add', upload.none(), async (req, res) => {
    console.log(req.body);
    const { action_name, url, scrape_file, scrape_code, load_code, DB_code } = req.body;

    if (!action_name || !url || !scrape_file || !scrape_code) {
        return res.status(400).send('Missing required fields');
    }

    const fileScrape = `${scrape_file}.js`;
    const fileload = `${scrape_file}.py`;
    const fileDB = `${scrape_file}.js`;
    const filePath = path.join(__dirname, '../../uploads/scrape_code', fileScrape);
    const filePathload = path.join(__dirname, '../../uploads/load_image', fileload);
    const filePathDB = path.join(__dirname, '../../uploads/InsertDBcode', fileDB);

    try {
        fs.writeFileSync(filePath, scrape_code);
        fs.writeFileSync(filePathload, load_code);
        fs.writeFileSync(filePathDB, DB_code);
    } catch (err) {
        console.error("Error writing file:", err.message);
        return res.status(500).send('Error saving scrape code');
    }

    try {
        const sql = 'INSERT INTO scrape_configs (action_name, url, file_scrape, file_loadimg, file_insertdb) VALUES (?, ?, ?, ?, ?)';
        await db.query(sql, [action_name, url, fileScrape, fileload, fileDB]);
        res.redirect('/config');
    } catch (err) {
        console.error("Error inserting data:", err.message);
        res.status(500).send('Error adding configuration');
    }
});

// POST route to update a scrape configuration
router.post('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { u_action_name, u_url, u_scrape_file, u_scrape_code, u_load_code, u_db_code } = req.body;

    const newFileScrape = `${u_scrape_file}.js`;
    const newFileload = `${u_scrape_file}.py`;
    const newFilePath = path.join(__dirname, '../../uploads/scrape_code', newFileScrape);
    const newFilePathload = path.join(__dirname, '../../uploads/load_image', newFileload);
    const newFilePathdb = path.join(__dirname, '../../uploads/InsertDBcode', newFileScrape);

    try {
        const [row] = await db.query('SELECT file_scrape FROM scrape_configs WHERE id = ?', [id]);
        if (row.length === 0) {
            return res.status(404).send('Configuration not found');
        }

        const oldFileName = row[0].file_scrape;
        const oldFilePath = path.join(__dirname, '../../uploads/scrape_code', oldFileName);
        const oldFilePathload = path.join(__dirname, '../../uploads/load_image', `${oldFileName.split('.')[0]}.py`);
        const oldFilePathdb = path.join(__dirname, '../../uploads/InsertDBcode', oldFileName);

        // Delete old scrape code file if the file name has changed
        if (oldFileName !== newFileScrape) {
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
            if (fs.existsSync(oldFilePathload)) {
                fs.unlinkSync(oldFilePathload);
            }
            if (fs.existsSync(oldFilePathdb)) {
                fs.unlinkSync(oldFilePathdb);
            }
        }

        // Write the updated scrape and load codes to their respective files
        fs.writeFileSync(newFilePath, u_scrape_code);
        fs.writeFileSync(newFilePathload, u_load_code);
        fs.writeFileSync(newFilePathdb, u_db_code);

        const sqlUpdate = 'UPDATE scrape_configs SET action_name = ?, url = ?, file_scrape = ? , file_loadimg = ? , file_insertdb = ? WHERE id = ?';
        await db.query(sqlUpdate, [u_action_name, u_url, newFileScrape, newFileload, newFileScrape, id]);

        res.redirect('/config');
    } catch (err) {
        console.error("Error updating data:", err.message);
        res.status(500).send('Error updating configuration');
    }
});


// POST route to delete a scrape configuration
router.post('/delete/:id', async (req, res) => {
    const { id } = req.params;
    console.log(id);

    try {
        const [row] = await db.query('SELECT file_scrape, file_loadimg, file_insertdb FROM scrape_configs WHERE id = ?', [id]);
        if (row.length === 0) {
            return res.status(404).send('Configuration not found');
        }

        const filePath = path.join(__dirname, '../../uploads/scrape_code', row[0].file_scrape);
        const filePathload = path.join(__dirname, '../../uploads/load_image', row[0].file_loadimg);
        const filePathdb = path.join(__dirname, '../../uploads/InsertDBcode', row[0].file_insertdb);


        // Remove both the scrape code and load code files if they exist
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        if (fs.existsSync(filePathload)) {
            fs.unlinkSync(filePathload);
        }
        if (fs.existsSync(filePathdb)) {
            fs.unlinkSync(filePathdb);
        }

        await db.query('DELETE FROM scrape_configs WHERE id = ?', [id]);
        res.redirect('/config');
    } catch (err) {
        console.error("Error deleting configuration:", err.message);
        res.status(500).send('Error deleting configuration');
    }
});

module.exports = router;
