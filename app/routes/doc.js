const express = require("express");
const router = express.Router();
const path = require('path');
const { exec } = require('child_process');
const db = require("../config/database");

router.get("/", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login"); // ถ้าไม่ได้ล็อกอินให้ไปที่หน้า Login
    }

    try {
        // ดึงค่าที่ไม่ซ้ำกันจากแต่ละฟิลด์
        const queries = [
            "SELECT DISTINCT Company FROM dashboard",
            "SELECT DISTINCT Brand FROM dashboard",
            "SELECT DISTINCT Gear FROM dashboard",
            "SELECT DISTINCT Category FROM dashboard",
            "SELECT DISTINCT Seller_name FROM dashboard",
            "SELECT DISTINCT Reg_Province FROM dashboard"
        ];

        // รันทุก Query พร้อมกันเพื่อประหยัดเวลา
        const results = await Promise.all(queries.map(query => db.execute(query)));

        // แปลงข้อมูลให้อยู่ในรูปแบบ array
        const [companies, brands, gears, categories, sellers, provinces] = results.map(([rows]) => rows);

        res.render("doc", {
            title: "Edit",
            page_title: "Edit",
            folder: "Seller",
            layout: "layouts/layout-horizontal",
            session: req.session,
            auctionData: {
                companies, brands, gears, categories, sellers, provinces
            },
            results: []
        });

    } catch (error) {
        console.error("Error fetching auction data:", error);
        res.status(500).send("Error fetching auction data");
    }
});



router.post("/filter", async (req, res) => {
    if (!req.session.user) {
        return res.status(403).json({ message: "Unauthorized" });
    }

    const { auction_name, brand, gear, car_type, seller_name, province, daterange, start, length, draw, search, order, columns } = req.body;
    let conditions = [];
    let params = [];

    // กรองตามเงื่อนไข
    if (auction_name) {
        conditions.push("Company = ?");
        params.push(auction_name);
    }

    if (brand) {
        conditions.push("Brand = ?");
        params.push(brand);
    }

    if (gear) {
        conditions.push("Gear = ?");
        params.push(gear);
    }

    if (car_type) {
        conditions.push("Category = ?");
        params.push(car_type);
    }

    if (seller_name) {
        conditions.push("Seller_name = ?");
        params.push(seller_name);
    }

    if (province) {
        conditions.push("Reg_Province = ?");
        params.push(province);
    }

    if (daterange) {
        const [startDate, endDate] = daterange.split(" - ");
        if (startDate === endDate) {
            conditions.push("Auction_date = ?");
            params.push(startDate);
        } else {
            conditions.push("Auction_date BETWEEN ? AND ?");
            params.push(startDate, endDate);
        }
    }

    // ค้นหาจากทุกคอลัมน์
    if (search && search !== '') {
        const searchTerm = `%${search}%`;
        conditions.push(
            "(Company LIKE ? OR Seller_name LIKE ? OR Brand LIKE ? OR Auction_name LIKE ? OR Auction_location LIKE ? OR Auction_lane LIKE ? OR Order_No LIKE ? OR Reserve_price LIKE ? OR Start_price LIKE ? OR Category LIKE ? OR Reg_No LIKE ? OR Reg_Province LIKE ? OR Model LIKE ?)"
        );
        for (let i = 0; i < 13; i++) {
            params.push(searchTerm);
        }
    }

    let sqlQuery = `SELECT * FROM dashboard`;

    if (conditions.length > 0) {
        sqlQuery += " WHERE " + conditions.join(" AND ");
    }

    // จัดการ ORDER BY ตามที่ DataTables ส่งมา
    if (order && order.length > 0) {
        let orderClause = [];
        for (let i = 0; i < order.length; i++) {
            let columnIndex = order[i].column;
            let columnName = columns[columnIndex].data; // ชื่อคอลัมน์จาก DataTables
            let dir = order[i].dir.toUpperCase(); // ASC หรือ DESC
            orderClause.push(`${columnName} ${dir}`);
        }
        sqlQuery += " ORDER BY " + orderClause.join(", ");
    } else {
        sqlQuery += " ORDER BY id DESC"; // Default ถ้าไม่มีการกำหนด
    }

    // เพิ่ม LIMIT และ OFFSET สำหรับ pagination
    sqlQuery += ` LIMIT ? OFFSET ?`;

    let countQuery = `SELECT COUNT(*) AS total FROM dashboard`;

    if (conditions.length > 0) {
        countQuery += " WHERE " + conditions.join(" AND ");
    }

    try {
        const [dataResults] = await db.execute(sqlQuery, [...params, length, start]);
        const [countResults] = await db.execute(countQuery, params);
        const filteredRecords = countResults[0].total;

        res.json({
            draw: draw,
            recordsTotal: filteredRecords,
            recordsFiltered: filteredRecords,
            data: dataResults
        });
    } catch (error) {
        console.error("Error fetching filtered data:", error);
        res.status(500).json({ message: "Error fetching data", error });
    }
});

// Endpoint สำหรับการอัปเดตข้อมูล
router.post("/update", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login");
    }

    const {Seller_name, Seller_code, id } = req.body;

    try {
        // Update query based on the provided form data
        const [updateResult] = await db.execute(
            ` UPDATE dashboard SET Seller_name = ?, Seller_code = ? WHERE id = ?;`,
            [Seller_name, Seller_code, id]
        );

        if (updateResult.affectedRows > 0) {
            res.json({ message: "Record updated successfully" });
        } else {
            res.status(400).json({ message: "No record found with the provided id" });
        }
    } catch (error) {
        console.error("Error updating record:", error);
        res.status(500).json({ message: "Error processing request", error });
    }
});

router.post('/check-files', (req, res) => {
    const fileUrl = req.body.path;

    if (!fileUrl) {
        return res.status(400).json({ error: 'Missing file path' });
    }

    // ให้ path เป็น absolute path
    const absolutePath = `public/${fileUrl}`;
    
    // ใช้เครื่องหมายคำพูดล้อมรอบ path เพื่อรองรับ path ที่มีช่องว่าง
    const command = `./lol "${absolutePath.trim()}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: `exec error: ${error.message}` });
        }
        if (stderr) {
            return res.status(500).json({ error: `stderr: ${stderr}` });
        }

        // ถ้าทุกอย่างเรียบร้อย ส่งข้อมูล JSON กลับไป
        try {
            const result = JSON.parse(stdout); // แปลงผลลัพธ์ที่ได้จาก C++ เป็น JSON
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: 'Error parsing C++ output as JSON' });
        }
    });
});

module.exports = router;