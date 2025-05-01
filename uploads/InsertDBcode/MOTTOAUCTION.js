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

        const vendorMap = new Map([
            [
               "กรุงเทพประกันภัย จำกัด (มหาชน)",
               "BKI"
             ],
             [
               "กรุงไทยคาร์เร้นท์ แอนด์ ลีส จำกัด (มหาชน)",
               "KCAR"
             ],
             [
               "กรุงไทยธุรกิจลีสซิ่ง จำกัด",
               "KTBL"
             ],
             [
               "กรุ๊ปลีส จำกัด (มหาชน)",
               "GL"
             ],
             [
               "กาญจนสิงขร จำกัด",
               "THAIBEV"
             ],
             [
               "เกียรตินาคินภัทร จำกัด (มหาชน)",
               "KKP"
             ],
             [
               "แก่นขวัญ จำกัด",
               "THAIBEV"
             ],
             [
               "คลังเศรษฐการ จำกัด",
               "KLA"
             ],
             [
               "ควิก ลิสซิ่ง จำกัด",
               "QUI"
             ],
             [
               "คาเธ่ย์ ลีสซิ่ง จำกัด",
               "CATHAY"
             ],
             [
               "คาร์ โก (ประเทศไทย) จำกัด",
               "CARGO"
             ],
             [
               "คาร์ซัม(ประเทศไทย) จำกัด",
               "CARSOME"
             ],
             [
               "คิงส์ ซิตี้ จำกัด",
               "KCITY"
             ],
             [
               "คุ้มภัยโตเกียวมารีนประกันภัย (ประเทศไทย) จำกัด (มหาชน)",
               "SFTISR"
             ],
             [
               "เคบี เจ แคปปิตอล จำกัด",
               "KBJ"
             ],
             [
               "เงินซิ่งได้ ฟอร์ ควิก แคช จำกัด",
               "ZINGDAI"
             ],
             [
               "เงินติดล้อ จำกัด (มหาชน)",
               "NTL"
             ],
             [
               "ศรีสวัสดิ์ แคปปิตอล 1969 จำกัด (มหาชน)",
               "BFIT"
             ],
             [
               "เงินเทอร์โบ จำกัด (มหาชน)",
               "NTB"
             ],
             [
               "d",
               "BFIT"
             ],
             [
               "จรัญธุรกิจ 52 จำกัด",
               "THAIBEV"
             ],
             [
               "เจ เอ็ม ที เน็ทเวอร์ค เซอร์วิสเซ็ส จำกัด (มหาชน)",
               "JMT"
             ],
             [
               "เจมาร์ท ประกันภัย จำกัด (มหาชน)",
               "JAYMART"
             ],
             [
               "ช.การช่าง จำกัด (มหาชน)",
               "PPE"
             ],
             [
               "ช.พัฒนาคาร์เรนท์ จำกัด",
               "CPATTANA"
             ],
             [
               "ชโย กรุ๊ป จำกัด (มหาชน)",
               "CHAYO"
             ],
             [
               "ชับบ์สามัคคีประกันภัย จำกัด (มหาชน)",
               "CHUBB"
             ],
             [
               "ชัยฤทธิ์ ลีสซิ่ง 58 จำกัด",
               "CHAIRITLEASING"
             ],
             [
               "โชคอนันต์ชุมพรมอเตอร์เซลล์ จำกัด",
               "CHOKMOT"
             ],
             [
               "ซัมมิท แคปปิตอล ลีสซิ่ง จำกัด",
               "SUMMIT"
             ],
             [
               "ซิงเกอร์ประเทศไทย จำกัด (มหาชน)",
               "SINGER"
             ],
             [
               "ซิตี้ ลิสซิ่ง จำกัด",
               "CITY"
             ],
             [
               "ซีไอเอ็มบี ไทย จำกัด (มหาชน)",
               "CIMB"
             ],
             [
               "ซีไอเอ็มบี ไทย ออโต้ จำกัด",
               "CIMB"
             ],
             [
               "ซูมิโตโม มิตซุย ออโต้ ลิสซิ่ง แอนด์ เซอร์วิส (ไทยแลนด์)",
               "ZUM"
             ],
             [
               "ได้เงิน ดอทคอม จำกัด",
               "DAINGERN"
             ],
             [
               "ตะวันออกพาณิชย์ลีสซิ่ง จำกัด (มหาชน)",
               "ECL"
             ],
             [
               "โตโยต้า ลีสซิ่ง (ประเทศไทย) จำกัด",
               "TOY"
             ],
             [
               "ทริปเปิลที บรอดแบนด์ จำกัด (มหาชน)",
               "3BB"
             ],
             [
               "ทรู ลีสซิ่ง จำกัด",
               "true"
             ],
             [
               "ทหารไทยธนชาต จำกัด (มหาชน)",
               "TTB"
             ],
             [
               "ทิสโก้ จำกัด (มหาชน)",
               "TISCO"
             ],
             [
               "ทิสโก้ โตเกียว ลีสซิ่ง จำกัด",
               "TISCO"
             ],
             [
               "ทิสโก้ อินชัวรันส์ โซลูชั่น จำกัด",
               "TISCO"
             ],
             [
               "ทิสโก้ไฟแนนเชียลกรุ๊ป จำกัด (มหาชน)",
               "TISCO"
             ],
             [
               "ที แอล ลิสซิ่ง จำกัด",
               "TLLEASING"
             ],
             [
               "ที-พลัส ลีสซิ่ง จำกัด",
               "T-PLUS"
             ],
             [
               "เทพอรุโณทัย จำกัด",
               "THAIBEV"
             ],
             [
               "เทเวศประกันภัย จำกัด (มหาชน)",
               "DEVES"
             ],
             [
               "ไทยเครดิต เพื่อรายย่อย จำกัด (มหาชน)",
               "THAICR"
             ],
             [
               "ไทยดริ้งค์ จำกัด",
               "THAIBEV"
             ],
             [
               "ไทยเบฟเวอเรจ จำกัด (มหาชน)",
               "THAIBEV"
             ],
             [
               "ไทยเบฟเวอเรจ รีไซเคิล จำกัด",
               "THAIBEV"
             ],
             [
               "ไทยเบฟเวอเรจ โลจิสติก จำกัด",
               "THAIBEV"
             ],
             [
               "ไทยประกันชีวิต จำกัด (มหาชน)",
               "THLIFE"
             ],
             [
               "ไทยพาณิชย์ จำกัด (มหาชน)",
               "SCB"
             ],
             [
               "ไทยพาณิชย์พลัส จำกัด",
               "SCB"
             ],
             [
               "ไทยโอริกซ์ลีสซิ่ง จำกัด",
               "THAIORIX"
             ],
             [
               "ธนชาตประกันภัย จำกัด (มหาชน)",
               "TNI"
             ],
             [
               "นครหลวง ลิสซิ่ง จำกัด",
               "NKL"
             ],
             [
               "นวกิจประกันภัย จำกัด (มหาชน)",
               "NVK"
             ],
             [
               "น้าณุเพียงพอ",
               "NNPP"
             ],
             [
               "นำกิจการ จำกัด",
               "THAIBEV"
             ],
             [
               "นำทิพย์ จำกัด",
               "THAIBEV"
             ],
             [
               "นำธุรกิจ จำกัด",
               "THAIBEV"
             ],
             [
               "นำนคร จำกัด",
               "THAIBEV"
             ],
             [
               "นำพลัง จำกัด",
               "THAIBEV"
             ],
             [
               "นำเมือง จำกัด",
               "THAIBEV"
             ],
             [
               "นำยุค จำกัด",
               "THAIBEV"
             ],
             [
               "นำรุ่งโรจน์ จำกัด",
               "THAIBEV"
             ],
             [
               "เน็คซ์ แคปปิตอล จำกัด (มหาชน)",
               "NEXTCAPITAL"
             ],
             [
               "บริหารสินทรัพย์ เจ จำกัด",
               "JAM"
             ],
             [
               "บริหารสินทรัพย์ วี ซี จำกัด (มหาชน)",
               "VCAMC"
             ],
             [
               "เบทเตอร์ลีสซิ่ง จำกัด",
               "BET"
             ],
             [
               "เบนซ์คาร์ เซ็นเตอร์ โดยนายประสิทธิ์ ขันตินิยม",
               "BCC"
             ],
             [
               "เบียร์ไทย (1991) จำกัด (มหาชน)",
               "THAIBEV"
             ],
             [
               "ประกันคุ้มภัย จำกัด (มหาชน)",
               "SFTISR"
             ],
             [
               "ป้อมกิจ จำกัด",
               "THAIBEV"
             ],
             [
               "ป้อมคลัง จำกัด",
               "THAIBEV"
             ],
             [
               "ป้อมเจริญ จำกัด",
               "THAIBEV"
             ],
             [
               "ป้อมโชค จำกัด",
               "THAIBEV"
             ],
             [
               "ป้อมบูรพา จำกัด",
               "THAIBEV"
             ],
             [
               "พลัส โพรเกรส เอ็นจิเนียริ่ง จำกัด",
               "PPE"
             ],
             [
               "พี เอส ที จี จำกัด",
               "PSTG"
             ],
             [
               "มงคลสมัย จำกัด",
               "THAIBEV"
             ],
             [
               "มิชลิน อาร์โอเอช จำกัด",
               "MICHELINROH"
             ],
             [
               "แม็คแคปปิตอล จำกัด",
               "MAXCAPITAL"
             ],
             [
               "แม็คซ์กรุ๊ป คอร์ปอเรชั่น จำกัด",
               "MAXGROUP"
             ],
             [
               "โมเดิร์นเทรด แมนเนจเม้นท์ จำกัด",
               "THAIBEV"
             ],
             [
               "รถดีเด็ด ออโต้ จำกัด",
               "DDED"
             ],
             [
               "รีไลแอนซ์ เมเนจเม้นท์ จำกัด",
               "RELIANCE"
             ],
             [
               "ลีพัฒนาผลิตภัณฑ์ จำกัด (มหาชน)",
               "LEP"
             ],
             [
               "ลีสซิ่งกสิกรไทย จำกัด",
               "KSL"
             ],
             [
               "ลีสซิ่งไอซีบีซี (ไทย) จำกัด",
               "ICBC"
             ],
             [
               "วินเพอร์ฟอร์มานซ์ จำกัด",
               "WINPERFORM"
             ],
             [
               "วีซี แอสเสท คอร์ปอเรชั่น จำกัด",
               "VCAS"
             ],
             [
               "เวิลด์สปีด เซลส์ แอนด์ เซอร์วิส จำกัด",
               "WORLDSPEED"
             ],
             [
               "ศรีสวัสดิ์ พาวเวอร์ 2014 จำกัด",
               "BFIT"
             ],
             [
               "ศักดิ์สยามลิสซิ่ง จำกัด (มหาชน)",
               "SAKSIAM"
             ],
             [
               "สยามคาร์เรนท์ จำกัด",
               "SCR"
             ],
             [
               "สยามคูโบต้า ลีสซิ่ง จำกัด",
               "SKL"
             ],
             [
               "สยามคูโบต้าคอร์ปอเรชั่น จำกัด",
               "SKL"
             ],
             [
               "สยามราชธานี จำกัด (มหาชน)",
               "SIAMRAJATHANEE"
             ],
             [
               "สินมั่นคงประกันภัย จำกัด (มหาชน)",
               "SMK"
             ],
             [
               "สุรากระทิงแดง (1988) จำกัด",
               "THAIBEV"
             ],
             [
               "สุราบางยี่ขัน จำกัด",
               "THAIBEV"
             ],
             [
               "แสงโสม จำกัด",
               "THAIBEV"
             ],
             [
               "อธิมาตร จำกัด",
               "THAIBEV"
             ],
             [
               "อยุธยา แคปปิตอล ออโต้ ลีส จำกัด (มหาชน)",
               "AYCAL"
             ],
             [
               "ออโต้ เอกซ์ จำกัด",
               "AUTOX"
             ],
             [
               "อะมานะฮ์ ลิสซิ่ง จำกัด (มหาชน)",
               "ANAMAH"
             ],
             [
               "อาคเนย์ประกันภัย จำกัด (มหาชน)",
               "SEIC"
             ],
             [
               "อินดัส เอ็กซิม ไอเอ็นซี จำกัด",
               "INDUS"
             ],
             [
               "อินทร ลิสซิ่ง กรุ๊ป (1995) จำกัด",
               "INTHORN"
             ],
             [
               "อิออน ธนสินทรัพย์ (ไทยแลนด์) จำกัด (มหาชน)",
               "AEON"
             ],
             [
               "อุดมทรัพย์รุ่งเรือง จำกัด",
               "UDOMSUBRR"
             ],
             [
               "เอซีซี แคปปิตอล จำกัด",
               "ACC"
             ],
             [
               "เอเซียเสริมกิจลีสซิ่ง จำกัด (มหาชน)",
               "ASIA"
             ],
             [
               "เอส ลีสซิ่ง จำกัด",
               "SLEASING"
             ],
             [
               "เอส เอ็น เอ็น ลีสซิ่ง จำกัด",
               "SNN"
             ],
             [
               "เอส. เอ. เอ็น. มอเตอร์คาร์ จำกัด",
               "SANMOT"
             ],
             [
               "เอส.เอส.การสุรา จำกัด",
               "THAIBEV"
             ],
             [
               "เอสจีเอฟ แคปปิตอล จำกัด (มหาชน)",
               "SGF"
             ],
             [
               "เอเอสเอ็น โบรกเกอร์ จำกัด (มหาชน)",
               "ASNBROKER"
             ],
             [
               "แอกซ่าประกันภัย จำกัด (มหาชน)",
               "AXA"
             ],
             [
               "โอริโค่ ออโต้ ลีสซิ่ง (ประเทศไทย) จำกัด",
               "ORICO"
             ],
             [
               "ไอซีบีซี (ไทย) จำกัด (มหาชน)",
               "ICBC"
             ],
             [
               "ไอลิส อินโนเวชั่น จำกัด",
               "ILEASE"
             ],
             [
               "ไฮเวย์ จำกัด",
               "HIWAY"
             ],
             [
               "เฉียบ ภิรมย์เนตร",
               "CHIABPIROMNET"
             ],
             [
               "ทวี มาเอม",
               "TAWEEMA"
             ],
             [
               "นิคม วงศ์เบี้ยสัจจ์",
               "NIKOMWONGBIASAT"
             ],
             [
               "ปรีชา ทรัพย์สถิตย์",
               "PREECHASABSATIT"
             ],
             [
               "สมชัย ภู่แก้ว",
               "SOMCHAIPHU"
             ],
             [
               "อนุสิษฐ์ อัครธัญญรัตน์",
               "ANUSITAK"
             ],
             [
               "อรอนงค์ ส่งเสริม",
               "ANA"
             ],
             [
               "พินนะเคิล แอสเซท แมเนจเม้นท์ จำกัด",
               "PAM"
             ],
             [
               "ซิตี้ คอลเลคชั่น จำกัด",
               "CCOLLECTION"
             ],
             [
               "เอ็มโอเอส แคปปิตอล จำกัด",
               "MOS"
             ],
             [
               "สีมาธุรกิจ จำกัด",
               "THAIBEV"
             ],
             [
               "ศรีสวัสดิ์ พาวเวอร์ 2022 จำกัด",
               "BFIT"
             ],
             [
               "ไทย เพรสทิจ เร้นท์ เอ คาร์ จำกัด",
               "TPR"
             ],
             [
               "ไทย วี.พี.คอร์ปอเรชั่น จำกัด",
               "THAIVP"
             ],
             [
               "ด๊อกเตอร์ มันนี่ จำกัด",
               "SNN"
             ],
             [
               "บริหารสินทรัพย์ เอส ดับบลิว พี จำกัด",
               "BFIT"
             ],
             [
               "ตรีเพชรอีซูซุลิสซิ่ง จำกัด",
               "TRIPETCH"
             ],
             [
               "ทีซี คาร์ โซลูชั่นส์ (ไทยแลนด์) จำกัด",
               "TCCARS"
             ],
             [
               "เงินให้ใจ จำกัด",
               "NGERNHAIJAI"
             ],
             [
               "สยามนิสสัน บอดี้ จำกัด",
               "SIAMNISSANBODY"
             ],
           ]);
           
           // Reverse mapping (Vendor_Group → [Vendor_Name])
           const reverseVendorMap = new Map();
           
           for (const [name, group] of vendorMap.entries()) {
             if (!reverseVendorMap.has(group)) {
               reverseVendorMap.set(group, []);
             }
             reverseVendorMap.get(group).push(name);
           }
           
        if (fileParts.length < 2) {
            throw new Error(`❌ ชื่อไฟล์ CSV ไม่ถูกต้อง: ${fileName}`);
        }

        // Extract auction_name & auction_date
        const auctionName = auction; // ใช้ค่า auction ที่รับเข้ามาจาก arguments
        const datePart = fileParts[1].replace('_', '/'); // เช่น "20_01_2568" → "20/01/2568"
        const auctionDate = moment(datePart, 'DD/MM/YYYY').format('YYYY-MM-DD'); // แปลงเป็น "YYYY-MM-DD"

        function extractFuelType(text) {
            const match = text.match(/(?:\d+cc\s)(.*)/);  // ใช้ Regular Expression เพื่อจับคำหลังจาก "cc"
            return match ? match[1].trim() : text;  // ถ้าจับได้ จะส่งค่าคำหลัง "cc", ถ้าไม่ได้ก็ส่งค่าตัวเต็ม
        }

        // ฟังก์ชันสำหรับอ่าน CSV และดึงข้อมูล
        const readCSV = () => {
            return new Promise((resolve, reject) => {
                fs.createReadStream(csvFilePath)
                    .pipe(iconv.decodeStream('utf-8'))
                    .pipe(csv())
                    .on('data', (row) => {
                        const sellerGroupValue = reverseVendorMap.get(`${[row.seller]}`);
                        const data = {
                            Company: auctionName,
                            Auction_date: auctionDate,
                            Auction_name:  '',
                            Auction_location: row.storageLocation || '',
                            Auction_lane: (row['lane'])|| '', // แก้ไขการจัดการ Lot No.
                            Order_No: row['lot'] || '',
                            Remark1: row.descriptionTH || '',
                            Remark2:  '',
                            Reserve_price: row.reserve || 0.0,
                            Start_price:  0.0,
                            Category:  row.sellingCategoryTH || '',
                            Reg_No:  row.rego ||'',
                            Reg_Province: row.stateTH || '',
                            Brand: row.makeEN || '',
                            Model: row.modelEN || '',
                            Engine_displacement: parseInt((row.engine).split(' ')[0]) ||0,
                            Gear: row.gearEN || '',
                            Fuel: extractFuelType(`${row.engine}`) ||'',
                            Color: row.colour || '',
                            Car_man_year: 0 ,
                            Car_reg_year: row.dateFirstReg? parseInt((new Date(row.dateFirstReg)).getFullYear()) : 0,
                            Mile:  row.bookinKm,
                            Engine_No: row.engineNumber ||'',
                            Chassis_No:  row.chassis || '',
                            Grade_overall: row.grade || '',
                            Grade_frame: '',
                            Grade_Internal:  '',
                            Seller_name: sellerGroupValue ? sellerGroupValue.join(', ') : '',
                            Seller_code: row.seller || '',
                            Sourcing_type:  '',
                            Car_tax_expired_date:  row.regoExpiry ,
                            Car_title_group: row['titleFlag'] || '',
                            imageUrl: row['imageUrl'] || '',
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
