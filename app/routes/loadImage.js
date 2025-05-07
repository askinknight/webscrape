const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const router = express.Router();
const db = require('../config/database');
const { exec } = require('child_process');
const csv = require('csv-parser');
// Path to the JSON file for load image status
const statusFilePath = path.join(__dirname, '../../public/load-image-status.json');
const imgconfig = path.join(__dirname, '../../public/imgcon.json');
// Path to the downloads directory
const downloadsDir = path.join(__dirname, '../../public/downloads');

// Helper function to count images in CSV
async function countImagesInCSV(filePath, column) {
    
    return new Promise((resolve, reject) => {
        let totalImages = 0;

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {

                const imageUrls = row[column];
                
                if (imageUrls) {
                    // Split by '|' to count URLs and add to total
                    const imagesInRow = imageUrls.split('|').length;
                    totalImages += imagesInRow;
                }
            })
            .on('end', () => {
                resolve(totalImages);
            })
            .on('error', (err) => {
                console.error(`Error reading CSV file at ${filePath}:`, err);
                reject(err);
            });
    });
}


// Function to update the JSON status file
async function updateStatusFile(actionName, items) {
    try {
        let existingStatuses = {};

        // Read existing status file
        try {
            const data = await fs.promises.readFile(statusFilePath, 'utf-8');
            existingStatuses = JSON.parse(data);
        } catch (err) {
            console.warn('Status file not found or invalid. Initializing new status file.');
        }

        // Read imgconfig file to get the column configuration for the actionName
        const imgConfigData = await fs.promises.readFile(imgconfig, 'utf-8');
        const imgConfig = JSON.parse(imgConfigData);
        const columnToCount = imgConfig[actionName]?.col;

        // Initialize the action group if it doesn't exist
        if (!existingStatuses[actionName]) {
            existingStatuses[actionName] = [];
        }

        // Remove any entries with 'done' status in the specified action group
        existingStatuses[actionName] = existingStatuses[actionName].filter(status => status.status !== 'done');

        // Create a map for faster lookup of existing statuses in the action group
        const existingStatusMap = new Map(existingStatuses[actionName].map(status => [status.name, status]));

        for (const item of items) {
            if (item.path.toLowerCase().endsWith('.csv')) {
                const fileStatus = existingStatusMap.get(item.name);

                if (!fileStatus) {
                    // New item: set initial status and calculate num_img
                    const filePath = path.join(downloadsDir, actionName, item.name);
                    const numImages = columnToCount ? await countImagesInCSV(filePath, columnToCount) : 0;

                    existingStatuses[actionName].push({
                        name: item.name,
                        status: 'rest',
                        num_img: numImages
                    });
                } else if (fileStatus.status !== 'onprocess') {
                    // Update existing item if not 'onprocess'
                    const filePath = path.join(downloadsDir, actionName, item.name);
                    console.log(filePath);
                    console.log(columnToCount);
                    const numImages = columnToCount ? await countImagesInCSV(filePath, columnToCount) : 0;
                    fileStatus.num_img = numImages;
                }
            }
        }

        // Write the updated statuses back to the file
        await fs.promises.writeFile(statusFilePath, JSON.stringify(existingStatuses, null, 2), 'utf-8');
        console.log('Status data updated successfully for', actionName);
    } catch (err) {
        console.error('Error updating status file:', err.message);
    }
}


// Helper function to get file icons and types
const getFileIconAndType = (filePath) => {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) return { icon: '📁', isDirectory: true };
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.csv' || ext === '.pdf') return { icon: '📄', isDirectory: false };
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') return { icon: '🖼️', isDirectory: false };
    return { icon: '📄', isDirectory: false }; // Default to a generic file icon
};

// Render the load images page
router.get('/', async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login"); // ถ้าไม่ได้ล็อกอินให้ไปที่หน้า Login
    }
    const userRole = req.session.user.role;
    const roleMap = req.app.locals.roleMap || {}; // ถ้า roleMap ยังไม่มี ให้ใช้ object ว่างแทน
    fs.readdir(downloadsDir, { withFileTypes: true }, (err, files) => {
        if (err) {
            console.error('Error reading downloads directory:', err);
            return res.status(500).send('Error reading downloads directory');
        }

        const folderList = files
            .filter(file => file.isDirectory())
            .map(folder => ({
                name: folder.name,
                path: folder.name,
            }));

        res.render('load-image/folder', {
            title: 'Load Image',
            page_title: 'Load Image',
            folder: 'Load Image',
            layout: 'layouts/layout-horizontal',            session: req.session,
            roleMap: roleMap,
            folders: folderList
        });
    });
});

// GET route to display only CSV files in the selected action_name folder
router.get('/:action_name', (req, res) => {
    const actionName = req.params.action_name;
    const actionDir = path.join(downloadsDir, actionName);

    fs.readdir(actionDir, (err, items) => {
        if (err) {
            console.error('Error reading action directory:', err);
            return res.status(500).send('Error reading action directory');
        }

        const itemList = items.map(item => {
            const itemPath = path.join(actionDir, item);
            const { icon, isDirectory } = getFileIconAndType(itemPath);
            return {
                name: item,
                path: path.join(actionName, item),
                icon,
                isDirectory
            };
        });

        // Update the status file with the current items and actionName
        updateStatusFile(actionName, itemList);

        res.render('load-image/file', {
            folders: itemList,
            folderName: actionName,
            title: actionName,
            page_title: actionName,
            folder: 'Load Image',
            layout: 'layouts/layout-horizontal',            session: req.session,
            roleMap: roleMap
        });
    });
});

router.post('/:action_name/:filename/:id', async (req, res) => {
    const actionName = req.params.action_name;
    const fileName = req.params.filename; // Extract the filename correctly
    const statusId = req.params.id; // Extract the status ID

    try {
        // Query the database for the scrape config
        const [config] = await db.query('SELECT * FROM scrape_configs WHERE action_name = ?', [actionName]);

        if (config.length === 0) {
            return res.status(404).send('Configuration not found for this action');
        }

        // Update status to 'onprocess' in the database before running the Python script
        await updateStatus('process', statusId);

        // Build the path to the Python script
        const scriptPath = path.join(__dirname, '../../uploads/load_image', `${config[0].file_loadimg}`);
        console.log(scriptPath + '\n' + fileName);

        if (fs.existsSync(scriptPath)) {
            const command = `/venv/bin/python "${scriptPath}" "${fileName}" "${statusId}"`; // Send statusId to the Python script

            exec(command, async (err, stdout, stderr) => {
                if (err) {
                    console.error('Error executing script:', stderr);
                    // Update status to 'error' in case of failure
                    await updateStatus('error', statusId);
                    return res.status(500).send('Error executing script');
                }

                res.json({ success: true, message: 'File loaded successfully' });
            });
        } else {
            return res.status(404).send('Load Image script not found');
        }
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).send('Internal server error');
    }
});


// Helper function to update status in the database
async function updateStatus( status, statusId) {
    try {
        // Query to update the status and related information in the load_image_status table
        const [result] = await db.query(`
            UPDATE load_image_status
            SET errcode = ?
            WHERE id = ?
        `, [status, statusId]);

        if (result.affectedRows === 0) {
            console.error(`No matching record found for update , ${[status, statusId]}`);
        }
    } catch (error) {
        console.error('Error updating status in database:', error);
    }
}

router.post('/update-status', async (req, res) => {
    const { id, successful_images, log_file, status_code } = req.body;

    if (!id || successful_images === undefined || !log_file || !status_code) {
        return res.status(400).json({ message: 'Missing required parameters.' });
    }

    try {
    
        const [updateResult] = await db.query(
            'UPDATE load_image_status SET errcode = ?, log_file = ?, finish_img = ? WHERE id = ?',
            [status_code, log_file, successful_images, id]
        );

        if (updateResult.affectedRows > 0) {
            console.log(`Status updated successfully , ${[status_code, log_file, successful_images, id]}`);
        } else {
            console.log(`No matching status found in the database. , ${[status_code, log_file, successful_images, id]}`);
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error updating the status.', error: err.message });
    }
});


module.exports = router;
