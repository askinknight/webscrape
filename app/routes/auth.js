const express = require("express");
const router = express.Router();
const getRoleMap = require("../config/roleMap");
const db = require('../config/database'); // นำเข้าการเชื่อมต่อฐานข้อมูล

// หน้า Login
router.get("/login", (req, res) => {
    res.render('login', { title: 'Login', layout: 'layouts/layout-without-nav' });
});

// หน้า Logout
router.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect("/data");
        }
        res.clearCookie("cookie");
        res.redirect("/auth/login");
    });
});

router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await db.execute( // ใช้ pool ที่เชื่อมต่อกับ DB
            `SELECT 
                *,
                r.role_name as 'role'
            FROM users u
            JOIN roles r ON u.role_id = r.id WHERE username = ? AND password = ?`,
            [username, password]
        );

        if (rows.length > 0) {
            req.session.user = rows[0]; // ตั้ง session ให้ผู้ใช้
            
            // โหลด roleMap ใหม่
            req.app.locals.roleMap = await getRoleMap(req.app);
            console.log("🔄 Role Map Reloaded:", req.app.locals.roleMap);

            res.redirect("/data"); // ไปหน้าแรกหลังจากล็อกอินสำเร็จ
        } else {
            res.render('login', { title: 'Login', layout: 'layouts/layout-without-nav' });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).send("เกิดข้อผิดพลาดในระบบ");
    }
});

module.exports = router;