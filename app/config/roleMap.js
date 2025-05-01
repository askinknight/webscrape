// ไม่ต้องใช้ app.get("db") แล้ว เพราะจะใช้ db ที่มาจาก config
const db = require('../config/database'); // นำเข้าการเชื่อมต่อจาก config

async function getRoleMap() {
    const query = `SELECT 
                        r.role_name as "role",
                        p.path
                    FROM users u
                    JOIN roles r ON u.role_id = r.id
                    JOIN role_map rm ON r.id = rm.role_id
                    JOIN paths p ON rm.path_id = p.id
                    ORDER BY u.id, p.path;`;

    try {
        const [rows] = await db.query(query); // ใช้ db.query แทน pool.query

        const roleMap = rows.reduce((acc, row) => {
            if (!acc[row.role]) {
                acc[row.role] = [];
            }
            acc[row.role].push(row.path);
            return acc;
        }, {});

        return roleMap;
    } catch (error) {
        console.error("Error fetching role map:", error);
        return {};
    }
}

module.exports = getRoleMap;
