const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { exec } = require('child_process');
const fastCsv = require('fast-csv')
const router = express.Router();
const downloadsPath = path.join(__dirname, '../../public/downloads');

router.get('/', async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login"); // ถ้าไม่ได้ล็อกอินให้ไปที่หน้า Login
    }
    const roleMap = req.app.locals.roleMap || {}; // ถ้า roleMap ยังไม่มี ให้ใช้ object ว่างแทน
    const { auctionSelect, subfolderSelect, csvSelect } = req.query;

    if (!auctionSelect || !subfolderSelect || !csvSelect) {
        return res.status(400).send('Missing required query parameters');
    }

    const csvPath = path.join(downloadsPath, auctionSelect, subfolderSelect, csvSelect);

    // ตรวจสอบว่าไฟล์ CSV มีอยู่หรือไม่
    if (!fs.existsSync(csvPath)) {
        return res.status(404).send('CSV file not found');
    }

    let Checkinsert = false;

    try {
        const [rows] = await db.execute( // ใช้ pool ที่เชื่อมต่อกับ DB
            `SELECT * FROM dashboard WHERE csv = ?`,
            [csvSelect]
        );

        if (rows.length > 0) {
            Checkinsert = true;
        } else {
            Checkinsert = false;
        }
    } catch (error) {
        console.error("Login Error:", error);
    }

    // อ่านข้อมูล CSV
    const csvData = [];
    fs.createReadStream(csvPath)
        .pipe(fastCsv.parse({ headers: true }))
        .on("data", (row) => csvData.push(row))
        .on("end", () => {
            res.render('dbinsert', {
                title: 'Database',
                page_title: 'Database',
                folder: 'Insert',
                layout: 'layouts/layout-without-nav', session: req.session,
                roleMap: roleMap,
                auctionSelect,
                subfolderSelect,
                csvSelect,
                csvData,
                Checkinsert
            });
        });
});

function runInsertScript(insertPath, auction, subfolder, csvFile) {
    return new Promise((resolve, reject) => {
        const command = `node ${insertPath} ${auction} "${subfolder}" "${csvFile}"`;

        const options = {
            maxBuffer: 2 * 1024 * 1024 * 1024
        };

        exec(command, options, (error, stdout, stderr) => {
            if (error) {
                reject(`Error executing script: ${error.message}`);
            } else if (stderr) {
                reject(`Script error: ${stderr}`);
            } else {
                try {
                    const parsedOutput = JSON.parse(stdout); // Try parsing the output as JSON
                    resolve(parsedOutput);
                } catch (parseError) {
                    reject(`Error parsing script output: ${parseError.message}`);
                }
            }
        });
    });
}


async function insertDataToDb(rows) {
    const sql = `
        INSERT INTO dashboard (
            Company, Auction_date, Auction_name, Auction_location, Auction_lane, Order_No, 
            Remark1, Remark2, Reserve_price, Start_price, Category, Reg_No, Reg_Province, 
            Brand, Model, Engine_displacement, Gear, Fuel, Color, Car_man_year, Car_reg_year, 
            Mile, Engine_No, Chassis_No, Grade_overall, Grade_frame, Grade_Internal, 
            Seller_name, Seller_code, Sourcing_type, Car_tax_expired_date, Car_title_group, 
            imageUrl, csv
        ) 
        VALUES 
        ${rows.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(",")}
    `;

    const valuesList = rows.flatMap((row, index) => {
        const data = [
            row.Company,
            row.Auction_date,
            row.Auction_name,
            row.Auction_location,
            row.Auction_lane,
            row.Order_No,
            row.Remark1,
            row.Remark2,
            row.Reserve_price,
            row.Start_price,
            row.Category,
            row.Reg_No,
            row.Reg_Province,
            row.Brand,
            row.Model,
            row.Engine_displacement,
            row.Gear,
            row.Fuel,
            row.Color,
            row.Car_man_year,
            row.Car_reg_year,
            row.Mile,
            row.Engine_No,
            row.Chassis_No,
            row.Grade_overall,
            row.Grade_frame,
            row.Grade_Internal,
            row.Seller_name,
            row.Seller_code,
            row.Sourcing_type,
            row.Car_tax_expired_date,
            row.Car_title_group,
            row.imageUrl,
            row.csv
        ];

        // ตรวจสอบว่ามีค่า undefined ใน row ใด ๆ หรือไม่
        data.forEach((value, colIndex) => {
            if (value === undefined) {
                console.warn(`⚠️ พบ undefined ในแถวที่ ${index + 1}, คอลัมน์ที่ ${colIndex + 1}`);
            }
        });

        return data;
    });

    // สมมุติว่ามีการใช้การ execute เพื่อนำ sql และ valuesList ไปทำการแทรกข้อมูลในฐานข้อมูล
    try {
        await db.execute(sql, valuesList);
        console.log('ข้อมูลถูกแทรกสำเร็จ');
    } catch (error) {
        console.error('เกิดข้อผิดพลาด:', error);
    }
}


router.post('/savecsv', (req, res) => {
    try {
        const { auction, subfolder, csvFile, data } = req.body;

        console.log("Received Data:", req.body);

        const filePath = path.join(downloadsPath, auction, subfolder, csvFile);

        // ตรวจสอบว่าไฟล์ CSV มีอยู่หรือไม่
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "❌ File not found." });
        }

        // ตรวจสอบว่าข้อมูลที่ได้รับมาอยู่ในรูปแบบที่ถูกต้อง
        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ message: "❌ Invalid data format." });
        }

        // เขียนข้อมูลกลับลงไฟล์ CSV โดยใช้ fast-csv
        const ws = fs.createWriteStream(filePath);

        fastCsv
            .write(data, { headers: true })
            .pipe(ws)
            .on("finish", () => {
                console.log("✅ CSV file saved successfully.");
                //res.redirect(`/db-upload?auctionSelect=${auction}&subfolderSelect=${subfolder}&csvSelect=${csvFile}`);
                res.status(500).json({ message: '✅ CSV file saved successfully.' });
            })
            .on("error", (err) => {
                console.error("❌ Error writing CSV file:", err);
                res.status(500).json({ message: "❌ Failed to save file." });
            });

    } catch (error) {
        console.error("❌ Server error:", error);
        res.status(500).json({ message: "❌ Internal Server Error." });
    }
});



router.post('/insertcsv', async (req, res) => {
    const { auction, subfolder, csvFile } = req.body;  // รับข้อมูลจาก request body
    console.log(auction, subfolder, csvFile);

    if (!auction || !subfolder || !csvFile) {
        return res.status(400).send('Auction, Subfolder, and CSV are required');
    }

    let statusMessage = '';

    try {
        // Query the database for the scrape config using action_name (auction)
        const [config] = await db.query('SELECT * FROM scrape_configs WHERE action_name = ?', [auction]);

        if (config.length === 0) {
            return res.status(404).send('Configuration not found for this action');
        }

        console.log(`${config[0].file_insertdb}`)

        // Get the file path from the config (file_insertdb)
        const insertPath = path.join(__dirname, '../../uploads/InsertDBcode', `${config[0].file_insertdb}`);

        // Check if the file exists
        if (!fs.existsSync(insertPath)) {
            return res.status(500).send('Insert DB script file not found');
        }

        console.log('insertPath:', insertPath);
        console.log('Running insert script with parameters:', { auction, subfolder, csvFile });

        const result = await runInsertScript(insertPath, auction, subfolder, csvFile);
        console.log('Script result:', result);


        // Check if result is in valid JSON format
        if (result.status === 'success') {
            console.log(`stdout: ${result.message}`);

            // Example of how rows might look like (modify accordingly)
            const rows = result.data; // Adjust as per your script's structure
            await insertDataToDb(rows);

            statusMessage = '✅ Insert ข้อมูลเรียบร้อย';  // สถานะที่ต้องการส่งกลับ
        } else {
            statusMessage = '❌ Insert ข้อมูลไม่สำเร็จ';
        }
    } catch (error) {
        console.error('Error:', error);
        statusMessage = `An error occurred: ${error.message}`;  // ส่งข้อผิดพลาดหากเกิด
    }

    // ส่ง statusMessage กลับไปยัง client
    res.send(statusMessage);
});

module.exports = router;
