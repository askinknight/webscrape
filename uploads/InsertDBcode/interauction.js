const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const moment = require('moment');
const iconv = require('iconv-lite'); // ใช้ iconv-lite สำหรับการแปลง encoding

async function insertCSV(auction, csvFile, csvFilePath) {
    try {
        const results = [];
        const fileName = path.basename(csvFilePath);
        const fileParts = csvFile.split('-'); // ตัวอย่าง: "SiamInter_auction-20_01_2568-09_49.csv"

        // ตรวจสอบว่าไฟล์มีรูปแบบที่ถูกต้อง
        if (fileParts.length < 2) {
            throw new Error(`❌ ชื่อไฟล์ CSV ไม่ถูกต้อง: ${fileName}`);
        }

        const auctionName = auction;
        let datePart = fileParts[1].replace(/_/g, '/'); // เช่น "20_01_2568" → "20/01/2568"
        // เติมศูนย์หน้าสำหรับวันที่และเดือนที่เป็นเลขหลักเดียว
        let parts = datePart.split('/');
        const day = parts[0].padStart(2, '0'); // เติมศูนย์ให้วันที่
        const month = parts[1].padStart(2, '0'); // เติมศูนย์ให้เดือน
        
        // ตรวจสอบปี ถ้ามากกว่า 2500 ให้ลบ 543 เพื่อแปลงเป็น ค.ศ.
        let year = parseInt(parts[2]);
        if (year > 2500) {
          year -= 543; // ลบ 543 เพื่อแปลงเป็น ค.ศ.
        }

        function extractLocation(name) {
            const match = name.match(/^(.+?)(?:\s?\(.*\))?$/);  // ใช้ Regular Expression เพื่อจับชื่อสถานที่ก่อนวงเล็บ
            return match ? match[1] : name;  // ถ้าจับได้ จะส่งค่าก่อนวงเล็บ, ถ้าไม่ได้ก็ส่งค่าตัวเต็ม
        }
        
        // รวมใหม่เป็นรูปแบบที่ถูกต้อง
        datePart = `${day}/${month}/${year}`;
        
        // แปลงเป็นรูปแบบ 'YYYY-MM-DD'
        const auctionDate = moment(datePart, 'DD/MM/YYYY').format('YYYY-MM-DD');

        // ฟังก์ชันสำหรับอ่าน CSV และดึงข้อมูล
        const readCSV = () => {
            return new Promise((resolve, reject) => {
                fs.createReadStream(csvFilePath)
                    .pipe(iconv.decodeStream('utf-8'))
                    .pipe(csv())
                    .on('data', (row) => {
                        const data = {
                            Company: auctionName,
                            Auction_date: auctionDate,
                            Auction_name:  '',
                            Auction_location: extractLocation(row.Lane)|| '',
                            Auction_lane: (row['Order No'])?.match(/^\d/)[0]|| '', // แก้ไขการจัดการ Lot No.
                            Order_No: row['Order No'] || '',
                            Remark1: row.Remark || '',
                            Remark2: row['Condition'] || '',
                            Reserve_price: 0.0,
                            Start_price: parseFloat((row.Price || '0')) || 0.0,
                            Category:  '',
                            Reg_No:  '',
                            Reg_Province: '',
                            Brand: row.Brand || '',
                            Model: row.Model || '',
                            Engine_displacement: 0,
                            Gear: row.Details.split(' ')[2] || '',
                            Fuel: '',
                            Color: row.color? row.Details.split(' ')[0] : '',
                            Car_man_year: null,
                            Car_reg_year: parseInt(row.Year) || 0,
                            Mile:  0,
                            Engine_No: '',
                            Chassis_No:  '',
                            Grade_overall: '',
                            Grade_frame: '',
                            Grade_Internal:  '',
                            Seller_name: row['bank'] || '',
                            Seller_code: '',
                            Sourcing_type: '',
                            Car_tax_expired_date: null,
                            Car_title_group: row['Car Title Group'] || '',
                            imageUrl: row['subImg'] || '',
                            csv: fileName
                            };
                        results.push(data);
                    })
                    .on('end', () => resolve(results))
                    .on('error', (err) => reject(err));
            });
        };

        // อ่านข้อมูลจาก CSV
        const rows = await readCSV();
        
        // ส่งผลลัพธ์ในรูปแบบ JSON
        return {
            status: 'success',
            message: `✅ อ่านข้อมูลจาก ${fileName} เสร็จแล้ว`,
            data: rows,
            rowCount: rows.length
        };

    } catch (error) {
        console.error('❌ Error:', error.message);
        
        // ส่งข้อความแสดงข้อผิดพลาดในรูปแบบ JSON
        return {
            status: 'error',
            message: error.message
        };
    }
}

// ตรวจสอบว่าเรียกใช้สคริปต์พร้อม arguments หรือไม่
if (process.argv.length < 5) {
    console.error('❌ กรุณาระบุ auction, subfolder, และ csvFile');
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
    // ส่งผลลัพธ์กลับเป็น JSON
    console.log(JSON.stringify(result, null, 2));
}).catch((error) => {
    console.error(JSON.stringify(error, null, 2));
});
