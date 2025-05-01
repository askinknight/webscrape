const fs = require('fs');
const db = require('../config/database');
const express = require('express');
const router = express.Router();

// ฟังก์ชันสำหรับดึงข้อมูลจากฐานข้อมูลและบันทึกเป็นไฟล์ JSON
async function getData() {
    const query = `
        SELECT
            YEAR(Auction_date) AS year,
            QUARTER(Auction_date) AS quarter,
            MONTH(Auction_date) AS month,
            Company AS action_name,
            COUNT(*) AS value
        FROM dashboard
        WHERE Auction_date >= CURDATE() - INTERVAL 2 YEAR
        GROUP BY year, quarter, month, action_name

        UNION

        SELECT
            YEAR(Auction_date) AS year,
            QUARTER(Auction_date) AS quarter,
            MONTH(Auction_date) AS month,
            'all' AS action_name,
            COUNT(*) AS value
        FROM dashboard
        WHERE Auction_date >= CURDATE() - INTERVAL 2 YEAR
        GROUP BY year, quarter, month

        ORDER BY action_name, year DESC, quarter, month;
    `;

    try {
        const [rows] = await db.execute(query);
        return rows; // ส่งกลับข้อมูลที่ดึงจากฐานข้อมูล
    } catch (error) {
        console.error('Error executing query:', error);
        return []; // ถ้าเกิดข้อผิดพลาด ให้คืนค่า array ว่าง ๆ
    }
}

// ฟังก์ชันสำหรับดึงข้อมูลจากฐานข้อมูลและบันทึกเป็นไฟล์ JSON (แบบที่ 2)
async function getData2() {
    const query = `
      SELECT
        DATE_FORMAT(Auction_date, '%Y') AS year,
        Company as action_name,
        COUNT(*) AS value
      FROM dashboard
      WHERE DATE_FORMAT(Auction_date, '%Y') BETWEEN DATE_FORMAT(CURRENT_DATE, '%Y') - 2 AND DATE_FORMAT(CURRENT_DATE, '%Y')
      GROUP BY year, action_name;
    `;

    try {
        const [rows] = await db.execute(query);
        return rows; // ส่งกลับข้อมูลที่ดึงจากฐานข้อมูล
    } catch (error) {
        console.error('Error executing query:', error);
        return []; // ถ้าเกิดข้อผิดพลาด ให้คืนค่า array ว่าง ๆ
    }
}

// ฟังก์ชันเพื่อจัดรูปแบบข้อมูลที่ดึงจากฐานข้อมูลให้เป็นรูปแบบที่ต้องการ
function transformData(data) {
    const seriesData = {
        quarter: {},
        month: {},
    };

    // จัดกลุ่มข้อมูลตามปี
    data.forEach(row => {
        const { year, quarter, month, action_name, value } = row;

        // สร้างกลุ่มปีและไตรมาสใน seriesData
        if (!seriesData.quarter[year]) {
            seriesData.quarter[year] = {};
        }
        if (!seriesData.quarter[year][quarter]) {
            seriesData.quarter[year][quarter] = {};
        }
        if (!seriesData.quarter[year][quarter][action_name]) {
            seriesData.quarter[year][quarter][action_name] = [];
        }

        // เพิ่มค่า value สำหรับแต่ละ action_name ตามไตรมาส
        seriesData.quarter[year][quarter][action_name].push(value);

        // สร้างกลุ่มเดือนใน seriesData
        if (!seriesData.month[year]) {
            seriesData.month[year] = {};
        }
        if (!seriesData.month[year][action_name]) {
            seriesData.month[year][action_name] = new Array(12).fill(0);
        }

        // เพิ่มค่า value ตามเดือน
        seriesData.month[year][action_name][month - 1] = value; // เดือนเริ่มที่ 0
    });
    return seriesData;
}

function transformDatause(data) {
    const result = {
        years: [],
        quarter: {
            all: [],
            Apple: [],
            Motto: [],
            Express: [],
            BuyAtSiam: [],
            Inter: [],
            Premium: [],
            Sahakrane: [],
            Siaminter: []
        },
        month: {
            all: [],
            Apple: [],
            Motto: [],
            Express: [],
            BuyAtSiam: [],
            Inter: [],
            Premium: [],
            Sahakrane: [],
            Siaminter: []
        }
    };

    // Transform quarter data
    for (const year in data.quarter) {
        result.years.push(year); // เก็บค่าปีทั้งหมด
        const quarters = data.quarter[year];
        const allQuarterData = [];
        const appleQuarterData = [];
        const mottoQuarterData = [];
        const expressQuarterData = [];
        const buyAtSiamQuarterData = [];
        const interQuarterData = [];
        const premiumQuarterData = [];
        const sahakraneQuarterData = [];
        const siaminterQuarterData = [];

        for (const quarter in quarters) {
            const auctionData = quarters[quarter];

            allQuarterData.push(eval(auctionData.all.join('+')));
            appleQuarterData.push(eval(auctionData.Apple_Auction.join('+')));
            mottoQuarterData.push(eval(auctionData.Motto_Auction.join('+')));
            expressQuarterData.push(eval(auctionData.Auction_express.join('+')));
            buyAtSiamQuarterData.push(eval(auctionData.Buy_at_Siam.join('+')));
            interQuarterData.push(eval(auctionData.Inter_auction.join('+')));
            premiumQuarterData.push(eval(auctionData.Premium_Inter_Auction.join('+')));
            sahakraneQuarterData.push(eval(auctionData.Sahakrane_Auction.join('+')));
            siaminterQuarterData.push(eval(auctionData.SiamInter_Auction.join('+')));
        }

        result.quarter.all.push(allQuarterData);
        result.quarter.Apple.push(appleQuarterData);
        result.quarter.Motto.push(mottoQuarterData);
        result.quarter.Express.push(expressQuarterData);
        result.quarter.BuyAtSiam.push(buyAtSiamQuarterData);
        result.quarter.Inter.push(interQuarterData);
        result.quarter.Premium.push(premiumQuarterData);
        result.quarter.Sahakrane.push(sahakraneQuarterData);
        result.quarter.Siaminter.push(siaminterQuarterData);
    }

    // Transform month data
    for (const year in data.month) {
        result.years.push(year); // เก็บค่าปีใน month ด้วย
        const months = data.month[year];

        result.month.Apple.push(months.Apple_Auction);
        result.month.Motto.push(months.Motto_Auction);
        result.month.Express.push(months.Auction_express);
        result.month.BuyAtSiam.push(months.Buy_at_Siam);
        result.month.Inter.push(months.Inter_auction);
        result.month.Premium.push(months.Premium_Inter_Auction);
        result.month.Sahakrane.push(months.Sahakrane_Auction);
        result.month.Siaminter.push(months.SiamInter_Auction);
        result.month.all.push(months.all);
    }

    // กำจัดค่าปีที่ซ้ำ
    result.years = [...new Set(result.years)].sort((a, b) => a - b);

    return result;
}

// ฟังก์ชันแปลงข้อมูลจาก getData2 ให้อยู่ในโครงสร้างที่ต้องการ
function transformData2(data) {
    const transformedData = { years: [], data: {} };

    // ดึงรายการปีทั้งหมดที่มีอยู่และเรียงจากมากไปน้อย
    const years = [...new Set(data.map(row => row.year))].sort((a, b) => a - b);
    transformedData.years = years; // เก็บปีไว้ในโครงสร้างข้อมูล

    // ดึงรายการบริษัททั้งหมดที่มีอยู่
    const companies = [...new Set(data.map(row => row.action_name))];

    // สร้างโครงสร้างข้อมูล
    companies.forEach(company => {
        transformedData.data[company] = years.map(year => {
            // ดึงค่าของปีนั้น ๆ ตามบริษัท
            const record = data.find(row => row.year === year && row.action_name === company);
            return record ? record.value : 0; // ถ้าไม่มีค่าให้ใส่ 0
        });
    });

    return transformedData;
}




// Mockup Data Page
router.get('/', async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login"); // ถ้าไม่ได้ล็อกอินให้ไปที่หน้า Login
    }
    const userRole = req.session.user.role;
    const roleMap = req.app.locals.roleMap || {}; // ถ้า roleMap ยังไม่มี ให้ใช้ object ว่างแทน

    // ดึงข้อมูลจากฐานข้อมูล
    const rows = await getData();
    const rows2 = await getData2();

    // ส่งข้อมูลที่แปลงแล้วไปแสดงผล
    res.render('data', {
        title: 'Dashboard',
        page_title: 'Dashboard',
        folder: 'Dashboards',
        layout: 'layouts/layout-horizontal',
        session: req.session,
        roleMap: roleMap,
        data: JSON.stringify(transformDatause(transformData(rows))),
        data2: JSON.stringify(transformData2(rows2))
    });
});

module.exports = router;
