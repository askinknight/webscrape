const express = require("express");
const router = express.Router();
const db = require("../config/database");

/** 🔹 โหลดข้อมูลทั้งหมดไปแสดงในหน้า admin.ejs */
router.get("/", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login"); // ถ้าไม่ได้ล็อกอินให้ไปที่หน้า Login
    }
    const roleMap = req.app.locals.roleMap || {};
    try {
        const [users] = await db.query(`
            SELECT users.id, users.name, users.username, users.password, users.role_id,roles.role_name, users.created_at 
            FROM users 
            JOIN roles ON users.role_id = roles.id
        `);
        const [roles] = await db.query(`SELECT * FROM roles`);
        const [paths] = await db.query(`SELECT * FROM paths`);
        const [roleMaps] = await db.query(`
            SELECT role_map.id, roles.role_name, paths.path ,roles.id as "role_id", paths.id as "path_id"
            FROM role_map
            JOIN roles ON role_map.role_id = roles.id
            JOIN paths ON role_map.path_id = paths.id
        `);
        res.render("usermanagement", { 
            title: 'Admin',
            page_title: 'Admin',
            folder: 'Usermanagement',
            layout: 'layouts/layout-horizontal',
            session: req.session,
            roleMap: roleMap,
            users, roles, paths, roleMaps});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/manage", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login"); // ถ้าไม่ได้ล็อกอินให้ไปที่หน้า Login
    }

    const { action, type, id, name, username, password, role_id, path, path_id,role_name } = req.body;

    try {
        if (type === 'user') {
            if (action === 'insert') {
                // เพิ่ม User
                await db.query(`INSERT INTO users (name, username, password, role_id) VALUES (?, ?, ?, ?)`, 
                    [name, username, password, role_id]);
            } else if (action === 'update') {
                // อัปเดต User
                await db.query(`UPDATE users SET name=?, username=?, role_id=? WHERE id=?`, 
                    [name, username, role_id, id]);
            } else if (action === 'delete') {
                // ลบ User
                await db.query(`DELETE FROM users WHERE id=?`, [id]);
            }
        } else if (type === 'role') {
            if (action === 'insert') {
                // เพิ่ม Role
                await db.query(`INSERT INTO roles (role_name) VALUES (?)`, [role_name]);
            } else if (action === 'update') {
                // อัปเดต Role
                await db.query(`UPDATE roles SET role_name=? WHERE id=?`, [role_name, id]);
            } else if (action === 'delete') {
                // ลบ Role
                await db.query(`DELETE FROM roles WHERE id=?`, [id]);
            }
        } else if (type === 'path') {
            if (action === 'insert') {
                // เพิ่ม Path
                await db.query(`INSERT INTO paths (path) VALUES (?)`, [path]);
            } else if (action === 'update') {
                // อัปเดต Path
                await db.query(`UPDATE paths SET path=? WHERE id=?`, [path, id]);
            } else if (action === 'delete') {
                // ลบ Path
                await db.query(`DELETE FROM paths WHERE id=?`, [id]);
            }
        } else if (type === 'role-map') {
            if (action === 'insert') {
                // กำหนดสิทธิ์ให้ Role
                await db.query(`INSERT INTO role_map (role_id, path_id) VALUES (?, ?)`, [role_id, path_id]);
            } else if (action === 'update') {
                // อัปเดต Role Mapping
                await db.query(`UPDATE role_map SET role_id=?, path_id=? WHERE id=?`, [role_id, path_id, id]);
            } else if (action === 'delete') {
                // ลบ Role Mapping
                await db.query(`DELETE FROM role_map WHERE id=?`, [id]);
            }
        }

        res.redirect("/admin");  // หลังจากดำเนินการแล้วให้กลับไปที่หน้า admin
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
