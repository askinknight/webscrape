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

        // ฟังก์ชันสำหรับอ่าน CSV และดึงข้อมูล
        const readCSV = () => {
            return new Promise((resolve, reject) => {
                fs.createReadStream(csvFilePath)
                    .pipe(iconv.decodeStream('utf-8'))
                    .pipe(csv())
                    .on('data', (row) => {
                        const dateTh = row.วันที่ประมูล; // "วันเสาร์ ที่ 23 พ.ย. 2567"
                        const tax = row.วันครบกำหนดภาษี; // "25 ต.ค. 2568"
                        
                        const monthMap = {  
                            'ม.ค.': 'Jan', 'ก.พ.': 'Feb', 'มี.ค.': 'Mar', 'เม.ย.': 'Apr', 'พ.ค.': 'May',  
                            'มิ.ย.': 'Jun', 'ก.ค.': 'Jul', 'ส.ค.': 'Aug', 'ก.ย.': 'Sep', 'ต.ค.': 'Oct',  
                            'พ.ย.': 'Nov', 'ธ.ค.': 'Dec'  
                        };  
                        
                        // ฟังก์ชันแปลงวันที่  
                        function formatDate(dateStr) {  
                            // ลบวันและช่องว่าง และแปลงเดือน  
                            const dateFormatted = dateStr.replace(/^[^\d]+/, '') // ลบวัน (ที่ไม่ใช่ตัวเลข)  
                                .replace(/ม.ค.|ก.พ.|มี.ค.|เม.ย.|พ.ค.|มิ.ย.|ก.ค.|ส.ค.|ก.ย.|ต.ค.|พ.ย.|ธ.ค./g, match => monthMap[match]) // แปลงเดือน  
                                .trim();  
                        
                            // แยกปี พ.ศ. และแปลงเป็น ค.ศ.  
                            const parts = dateFormatted.split(' ');  
                            const day = parts[0]; // วัน  
                            const month = parts[1]; // เดือน  
                            const yearInThai = parseInt(parts[2]); // ปี  
                            const yearInAD = yearInThai - 543; // แปลงปีพ.ศ. เป็น ค.ศ.  
                        
                            // สร้างวันใหม่ในรูปแบบ "D MMM YYYY"  
                            return `${day} ${month} ${yearInAD}`; // คืนค่าผลลัพธ์ในรูปแบบที่ Moment เข้าใจ  
                        }  
                        
                        // คำสั่งที่ใช้ moment.js แปลงเป็นรูปแบบ "YYYY-MM-DD"  
                        const formattedTaxDate = moment(formatDate(tax), 'D MMM YYYY').format('YYYY-MM-DD');  
                        const formattedAuctionDate = moment(formatDate(dateTh), 'D MMM YYYY').format('YYYY-MM-DD'); 
                        let match = (row.สถานที่).match(/จ\.(\p{Script=Thai}+)/u);
                        match = match? match[1] : row.สถานที่;
                        

                        const data = {
                            Company: auctionName,
                            Auction_date: formattedAuctionDate || null,
                            Auction_name: row.สถานที่ || '',
                            Auction_location: match|| '',
                            Auction_lane:'',
                            Order_No: row.ลำดับที่|| '',
                            Remark1: row.remark || '',
                            Remark2: '',
                            Reserve_price: 0.0,
                            Start_price: parseFloat((row.ราคาตั้งประมูล || '0')) || 0.0,
                            Category: row.ประเภท|| '',
                            Reg_No: row.เลขทะเบียน|| '',
                            Reg_Province: '',
                            Brand: row.ยี่ห้อ || '',
                            Model: row.รุ่น || '',
                            Engine_displacement: parseInt((row.ขนาดเครื่องยนต์).replace(',','')) || 0,
                            Gear: row.เกียร์|| '',
                            Fuel: '',
                            Color: row.สี || '',
                            Car_man_year:  parseInt(row.ปีผลิต) || 0,
                            Car_reg_year: 0,
                            Mile: parseInt((row.เลขไมล์|| '0')) || 0,
                            Engine_No: row.เลขตัวถัง|| '',
                            Chassis_No: row.เลขเครื่องยนต์ || '',
                            Grade_overall:  '',
                            Grade_frame:  '',
                            Grade_Internal: '',
                            Seller_name: row['bank'] || '',
                            Seller_code: '',
                            Sourcing_type: '',
                            Car_tax_expired_date: formattedTaxDate || null,
                            Car_title_group: row.taxDueDate || '',
                            imageUrl: row['รย.']|| '',
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
