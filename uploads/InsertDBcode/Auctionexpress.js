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
        // เติมศูนย์หน้าสำหรับวันที่และเดือนที่เป็นเลขหลักเดียว
        let parts = datePart.split('/');
        const day = parts[0].padStart(2, '0'); // เติมศูนย์ให้วันที่
        const month = parts[1].padStart(2, '0'); // เติมศูนย์ให้เดือน

        // ตรวจสอบปี ถ้ามากกว่า 2500 ให้ลบ 543 เพื่อแปลงเป็น ค.ศ.
        let year = parseInt(parts[2]);
        if (year > 2500) {
            year -= 543; // ลบ 543 เพื่อแปลงเป็น ค.ศ.
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
                        const date = row['car_tax_expired_date']? new Intl.DateTimeFormat('en-CA').format(new Date(row['car_tax_expired_date'])) : null;
                        const data = {
                            Company: auctionName,
                            Auction_date: auctionDate,
                            Auction_name: '',
                            Auction_location: (row.location_name_th) || '',
                            Auction_lane: (row['lane_number']) || '', // แก้ไขการจัดการ Lot No.
                            Order_No: row['lot_number'] || '',
                            Remark1: row['message_auction'] || '',
                            Remark2: '',
                            Reserve_price: row['car_reserved_price'],
                            Start_price: parseFloat((row.car_start_price || '0')) || 0.0,
                            Category: row['car_body_type_th'] || 'รถยนต์',
                            Reg_No: row['car_reg_no'] || '',
                            Reg_Province: row['province_name'] || '',
                            Brand: row['brand_name'] || '',
                            Model: row['group_type_name'] || '',
                            Engine_displacement: row['car_engine_capacity'],
                            Gear: row['car_transmission'] || '',
                            Fuel: row['fuel_name_en'] || '',
                            Color: row['color_name_th'] || '',
                            Car_man_year: parseInt(row['car_man_year']) || 0,
                            Car_reg_year: parseInt(row.car_reg_date) || 0,
                            Mile: parseInt((row.car_mileage || '0')) || 0,
                            Engine_No: row['car_enging_no'] || '',
                            Chassis_No: row['car_vin'] || '',
                            Grade_overall: row['inspection_total_grade'] || '',
                            Grade_frame: row['inspection_frame_grade'] || '',
                            Grade_Internal: row['inspection_interior_grade'] || '',
                            Seller_name: row['membership_name'] || '',
                            Seller_code: '',
                            Sourcing_type: row['sourcing_type_name_th'],
                            Car_tax_expired_date: date || null,
                            Car_title_group: '',
                            imageUrl: row['Imagepath'] || '',
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
