const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const db = require('../config/database');
const router = express.Router();
const statusPath = path.join(__dirname, '../../public/status.json');
const cron = require('node-cron');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec); // Promisify exec for better async handling

let scheduledJobs = [];
const jobsFilePath = path.join(__dirname, '../config', 'jobs.json');

// Load scheduled jobs from jobs.json
try {
    if (fs.existsSync(jobsFilePath)) {
        const fileContent = fs.readFileSync(jobsFilePath, 'utf8');
        scheduledJobs = fileContent.trim() ? JSON.parse(fileContent) : [];
    }
} catch (err) {
    console.error('Error reading jobs.json:', err);
}

// Schedule a job
const scheduleJob = (id, dateTime, auction_name) => {
    const [date, time] = dateTime.split('T');
    const [year, month, day] = date.split('-');
    const [hour, minute] = time.split(':');

    const cronTime = `${minute} ${hour} ${day} ${month} *`; // Validate this if needed

    const job = cron.schedule(cronTime, () => {
        scrape([auction_name]);
        removeJob(id); // Remove the job after execution
    });

    return job;
};

// Initialize scheduled jobs
scheduledJobs.forEach(job => {
    const scheduled = scheduleJob(job.id, job.dateTime, job.auction_name);
    job.cronJob = scheduled;
});

// Remove job by ID
const removeJob = (id) => {
    scheduledJobs = scheduledJobs.filter(job => {
        if (job.id === id) {
            job.cronJob.stop();
            return false; // Exclude this job from the new array
        }
        return true;
    });

    const jobsToSave = scheduledJobs.map(({ cronJob, ...jobData }) => jobData);
    fs.writeJsonSync(jobsFilePath, jobsToSave);
};

async function updateStatusesToRest() {
    try {
        const [rows] = await db.query('SELECT * FROM scrape_configs');
        let existingStatuses = [];

        // Read existing status file
        try {
            const data = fs.readFileSync(statusPath, 'utf-8');
            existingStatuses = JSON.parse(data);
        } catch (err) {
            console.warn('Status file not found or invalid. Initializing new status file.');
        }

        const statusData = rows.map(config => {
            // Get the existing status if it exists
            const existingStatus = existingStatuses.find(status => status.action_name === config.action_name);

            if (existingStatus) {
                // If the existing status is 'onprocess', retain it
                if (existingStatus.status === 'onprocess') {
                    return {
                        action_name: config.action_name,
                        status: existingStatus.status, // Keep the onprocess status
                        datetime: existingStatus.datetime, // Retain the existing datetime
                        num_row: existingStatus.num_row
                    };
                } else {
                    return {
                        action_name: config.action_name,
                        status: 'ready', // Keep the onprocess status
                        datetime: existingStatus.datetime, // Retain the existing datetime
                        num_row: existingStatus.num_row
                    };
                }
            } else {
                // If it doesn't exist or is not onprocess, set to rest
                return {
                    action_name: config.action_name,
                    status: 'ready', // Default to 'rest'
                    datetime: "", // Set datetime to empty string
                    num_row: 0
                };
            }
        });

        // Write the updated status data back to the file
        fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2), 'utf-8');
        console.log('Status data updated successfully.');
    } catch (err) {
        console.error('Error updating statuses to ready:', err.message);
    }
}

// Main schedule route
router.get('/', async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login"); // ถ้าไม่ได้ล็อกอินให้ไปที่หน้า Login
    }
    const userRole = req.session.user.role;
    const roleMap = req.app.locals.roleMap || {}; // ถ้า roleMap ยังไม่มี ให้ใช้ object ว่างแทน
    try {
        await updateStatusesToRest();
        const [rows] = await db.query('SELECT * FROM scrape_configs ORDER BY action_name');
        res.render('Schedule', {
            configs: rows,
            scheduledJobs,
            title: 'Schedule',
            page_title: 'Schedule',
            folder: 'Schedules',
            layout: 'layouts/layout-horizontal',            session: req.session,
            roleMap: roleMap
        });
    } catch (err) {
        console.error("Error fetching configurations:", err);
        res.status(500).send('Internal Server Error');
    }
});

// Handle form submission for scheduling
router.post('/add-schedule', (req, res) => {
    const { auction_name_select, date, time } = req.body;
    console.log({ auction_name_select, date, time });
    const id = Date.now();
    const dateTime = `${date}T${time}`;

    const job = {
        id,
        auction_name: auction_name_select,
        dateTime
    };

    job.cronJob = scheduleJob(id, dateTime, job.auction_name);
    scheduledJobs.push(job);

    const jobsToSave = scheduledJobs.map(({ cronJob, ...jobData }) => jobData);
    fs.writeJsonSync(jobsFilePath, jobsToSave);
    res.redirect('/schedule');
});

// Route to fetch scheduled jobs as JSON
router.get('/get-scheduled-jobs', (req, res) => {
    const jobsToSend = scheduledJobs.map(job => {
        const { cronJob, ...jobData } = job; // Exclude cronJob
        return jobData;
    });
    res.json({ scheduledJobs: jobsToSend });
});

// Route to update an event
router.post('/update-event/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { auction_name_update, dateTime } = req.body;

    const job = scheduledJobs.find(job => job.id === id);
    if (job) {
        job.cronJob.stop(); // Stop the current job
        job.auction_name = auction_name_update;
        job.dateTime = dateTime;
        job.cronJob = scheduleJob(id, dateTime, auction_name_update); // Reschedule

        const jobsToSave = scheduledJobs.map(({ cronJob, ...jobData }) => jobData);
        fs.writeJsonSync(jobsFilePath, jobsToSave);
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// Route to delete an event
router.post('/delete-event/:id', (req, res) => {
    const id = parseInt(req.params.id);
    removeJob(id);
    res.sendStatus(200);
});

// Helper function to update status in status.json
async function updateStatus(actionNames, newStatus) {
    try {
        const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));

        // ฟังก์ชันสำหรับแปลงวันที่เป็นรูปแบบ DD/MM/YYYY HH:mm
        function formatDateToDDMMYYYYHHMM(date) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0'); // เดือนเริ่มจาก 0
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        }

        // ใช้ในส่วนที่คุณต้องการวันที่และเวลา
        const now = new Date();
        const datetime = formatDateToDDMMYYYYHHMM(now); // จะได้ผลลัพธ์เป็น '28/10/2024 13:29'


        actionNames.forEach(actionName => {
            const statusItem = statusData.find(item => item.action_name === actionName);
            if (statusItem) {
                statusItem.status = newStatus;
                statusItem.datetime = datetime; // Update the datetime
                statusItem.num_row = 0;
            }
        });

        fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2), 'utf-8');
        console.log(`Status updated to '${newStatus}' and datetime set for action_names: ${actionNames.join(', ')}`);
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

// Route for scraping
router.post('/scrape', async (req, res) => {
    const { actionNames } = req.body;

    if (!actionNames || actionNames.length === 0) {
        return res.status(400).send('Missing required fields');
    }

    scrape(actionNames);
    res.status(200).send("Scraping requests initiated.");
});

// Scrape function
async function scrape(actionNames) {
    try {
        await updateStatus(actionNames, 'onprocess');

        for (const actionName of actionNames) {
            const [config] = await db.query('SELECT * FROM scrape_configs WHERE action_name = ?', [actionName]);
            console.log(actionName);

            if (config?.[0]?.url) {
                const { file_scrape: fileName, url } = config[0];
                const command = `/venv/bin/python /app/uploads/scrape.py "${fileName}" "${url}" "${actionName}"`;

                try {
                    const { stdout, stderr } = await execPromise(command);
                    console.log(`Success for ${actionName}: ${stdout}`);
                } catch (error) {
                    console.error(`Error for ${actionName}: ${error.message}`);
                    // Insert into status table  
                    const statusSql = 'INSERT INTO status (name_status, num_row, status, message, timestamp, file_name) VALUES (?, ?, ?, ?, ?, ?)';
                    const currentTime = new Date();  // Get current time  
                    await updateStatus([actionName], 'error');
                    console.log(actionName);
                    await db.query(statusSql, [actionName, 0, 'error', error.message, currentTime, 'scrape.py']);
                }
            }

        }
    } catch (err) {
        // Insert into status table  
        const statusSql = 'INSERT INTO status (name_status, num_row, status, message, timestamp, file_name) VALUES (?, ?, ?, ?, ?, ?)';
        const currentTime = new Date();  // Get current time  
        await updateStatus(actionNames, 'error');
        console.log(actionNames);
        await db.query(statusSql, [actionNames, 0, 'error', err.message, currentTime, 'scrape.py']);
        
        console.error("Error running scrape:", err.message);
    }
};

module.exports = router;