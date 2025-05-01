const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const moment = require('moment');
const iconv = require('iconv-lite'); // ใช้ iconv-lite สำหรับการแปลง encoding

async function insertCSV(auction, csvFile, csvFilePath) {
    try {
        const results = [];
        const fileName = path.basename(csvFilePath);
        const fileParts = csvFile.split('-'); // ตัวอย่าง: "Premium_Inter_auction-30_1_2025-14_43 copy 2.csv"
        
        // ตรวจสอบว่าไฟล์มีรูปแบบที่ถูกต้อง
        if (fileParts.length < 2) {
            throw new Error(`ชื่อไฟล์ CSV ไม่ถูกต้อง: ${fileName}`);
        }

        // Extract auction_name & auction_date
        const auctionName = auction;
        let datePart = fileParts[1].replace(/_/g, '/'); // เช่น "20_01_2568" → "20/01/2568"
        // Extract auction_name & auction_date
        // เติมศูนย์หน้าสำหรับวันที่และเดือนที่เป็นเลขหลักเดียว
        const parts = datePart.split('/');
        const day = parts[0].padStart(2, '0'); // เติมศูนย์ให้วันที่
        const month = parts[1].padStart(2, '0'); // เติมศูนย์ให้เดือน
        
        // ตรวจสอบปี ถ้ามากกว่า 2500 ให้ลบ 543 เพื่อแปลงเป็น ค.ศ.
        let year = parseInt(parts[2]);
        if (year > 2500) {
          year -= 543; // ลบ 543 เพื่อแปลงเป็น ค.ศ.
        }
        
        // รวมใหม่เป็นรูปแบบที่ถูกต้อง
        datePart = `${day}/${month}/${year}`;
        const auctionDate = moment(datePart, 'DD/MM/YYYY').format('YYYY-MM-DD'); // แปลงเป็น "YYYY-MM-DD"

        // ฟังก์ชันสำหรับอ่าน CSV และดึงข้อมูล
        const readCSV = () => {
            return new Promise((resolve, reject) => {
                const stream = fs.createReadStream(csvFilePath)
                    .pipe(iconv.decodeStream('utf-8')) // แปลง encoding เป็น utf-8
                    .pipe(csv({ separator: ',' })) // ใช้ csv-parser สำหรับแปลง CSV
                    .on('data', (row) => {
                        const data = {
                            Company: auctionName,
                            Auction_date: auctionDate,
                            Auction_name: row['Auction Details'] || '',
                            Auction_location: (row.Place).replace(/\s*เลน\s+\d+/g, '').trim() || '',
                            Auction_lane: (row['Lot No.'])?.match(/^\d/)[0] || '', // แก้ไขการจัดการ Lot No.
                            Order_No: row['Lot No.'] || '',
                            Remark1: row.Notes || '',
                            Remark2: '',
                            Reserve_price: 0.0,
                            Start_price: parseFloat((row.Price || '0').replace(' ', '')) || 0.0,
                            Category: row.Type || '',
                            Reg_No: row['Registration Number'] || '',
                            Reg_Province: '',
                            Brand: row.Brand || '',
                            Model: row.Model || '',
                            Engine_displacement: 0,
                            Gear: row.Gear || '',
                            Fuel: row.Fuel || '',
                            Color: row.Color || '',
                            Car_man_year: 0,
                            Car_reg_year: parseInt(row.Year) || 0,
                            Mile: parseInt((row.Mileage || '0').replace(' ', '')) || 0,
                            Engine_No: row['Engine Number'] || '',
                            Chassis_No: row['Chassis Number'] || '',
                            Grade_overall: row['Out Grade'] || '',
                            Grade_frame: row['Out Grade'] || '',
                            Grade_Internal: row['Internal Grade'] || '',
                            Seller_name: row['bank'] || '',
                            Seller_code: '',
                            Sourcing_type: '',
                            Car_tax_expired_date: null,
                            Car_title_group: row['Car Title Group'] || '',
                            imageUrl: row['Image URL'] || '',
                            csv: fileName
                        };
                        results.push(data);
                    })
                    .on('end', () => resolve(results))
                    .on('error', (err) => reject(err));

                // กำหนด timeout เพื่อป้องกันกรณีที่ไฟล์ใหญ่เกินไป
                stream.on('close', () => resolve(results));
            });
        };

        // อ่านข้อมูลจาก CSV
        const rows = await readCSV();
        
        // ส่งผลลัพธ์ในรูปแบบ JSON
        return JSON.stringify({
            status: 'success',
            message: `✅ อ่านข้อมูลจาก ${fileName} เสร็จแล้ว`,
            data: rows,
            rowCount: rows.length
        }, null, 2);

    } catch (error) {
        return JSON.stringify({
            status: 'error',
            message: error.message
        }, null, 2);
    }
}

// ตรวจสอบว่าเรียกใช้สคริปต์พร้อม arguments หรือไม่
if (process.argv.length < 5) {
    console.error(JSON.stringify({
        status: 'error',
        message: 'กรุณาระบุ auction, subfolder, และ csvFile'
    }, null, 2));
    process.exit(1);
}

// รับค่า arguments จาก command line
const auction = process.argv[2];
const subfolder = process.argv[3];
const csvFile = process.argv[4];

// สร้างพาธของไฟล์ CSV จาก arguments
const csvFilePath = path.join(__dirname, '../../public/downloads', auction, subfolder, csvFile);

// เรียกใช้ฟังก์ชัน
insertCSV(auction, csvFile, csvFilePath).then((result) => {
    console.log(result);
}).catch((error) => {
    console.error(JSON.stringify({
        status: 'error',
        message: error.message
    }, null, 2));
});
