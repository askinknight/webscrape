// Get today's date in Thai format
const today = new Date();
const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const year = today.getFullYear() + 543; // Convert to Thai Buddhist calendar
const month = thaiMonths[today.getMonth()];
const day = String(today.getDate()).padStart(2, '0'); // Add leading zero
const todayDate = `${day} ${month} ${year}`; // Format: "09 ตุลาคม 2567"

// Get all auction cards with the class '.auctions-date'
const auctionCards = document.querySelectorAll('.auctions-date');

// Array to store all matching auction_id, lane_id, and lane
let auctionDetails = [];

// Loop through all auction cards to find those with today's date
auctionCards.forEach(card => {
    // Get the date text from the card
    const auctionDateText = card.querySelector('div.date-section > h4').innerText;

    // Check if the date matches today's date
    if (auctionDateText.trim() === todayDate) {
        // Get all "View car list" links using querySelectorAll
        const viewCarListLinks = card.querySelectorAll('a.btn.btn-primary');
        // Get all lane elements
        const laneElements = card.querySelectorAll('p.no.font-yellow.font-bold');

        // Loop through all the links and extract auction_id, lane_id, and lane text
        viewCarListLinks.forEach((link, index) => {
            const viewCarListLink = link.href;
            // If the link exists, extract auction_id and lane_id from the link using regex
            if (viewCarListLink) {
                const match = viewCarListLink.match(/auction_id=(\d+)&lane_id=(\d+)/);
                if (match) {
                    // Add auction_id, lane_id, and the corresponding lane text to the auctionDetails array
                    auctionDetails.push({
                        auction_id: match[1],
                        lane_id: match[2],
                        lane: laneElements[index]?.innerText.trim() || '' // Ensure lane exists
                    });
                }
            }
        });
    }
});

// Check if there are any auction details for today
if (auctionDetails.length === 0) {
    console.log("No auctions found for today.");
    // Send warning status update
    sendStatusUpdate('warn', 'No auction today');
} else {
    console.log("Auction Details: ", auctionDetails);

    // Generate the filename based on the current date and time
    const currentDate = new Date();
    const dateString = `${currentDate.getDate()}_${currentDate.getMonth() + 1}_${currentDate.getFullYear()}`;
    const timeString = `${currentDate.getHours()}:${String(currentDate.getMinutes()).padStart(2, '0')}`;
    const filename = `Premium_Inter_auction-${dateString}-${timeString}.csv`;

    // Function to fetch car data from a given URL
    async function fetchCarData(url, lane) {
        try {
            const response = await fetch(url);
            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            // Extract car data
            const carCenterElement = doc.querySelector('.text-center');
            if (!carCenterElement) {
                console.error("Failed to find .text-center in the document");
                return null;
            }

            const lotNo = carCenterElement?.textContent.split(' - ')[0].replace('ลำดับที่ ', '').trim();
            const name = carCenterElement?.textContent.split(' - ')[1].split(' ')[0].trim();
            const model = carCenterElement?.textContent.split(' - ')[1].replace(`${name} `, '').trim();

            const grade = doc.querySelector('.car-column:nth-child(1) .font-16:last-child')?.textContent.trim();
            const priceStart = doc.querySelector('.car-column:nth-child(2) .font-16:last-child')?.textContent.trim();
            const mileage = doc.querySelector('.car-column:nth-child(3) .font-16:last-child')?.textContent.trim();
            const year = doc.querySelector('.car-column:nth-child(4) .font-16:last-child')?.textContent.trim();

            // Check if detailListElement exists
            const detailListElement = doc.querySelector('.detail-list');
            if (!detailListElement) {
                console.error("Failed to find .detail-list in the document");
                return null;
            }

            const labels = detailListElement.querySelectorAll('p:not(.desc)');
            const values = detailListElement.querySelectorAll('p.desc');

            const details = {};
            labels.forEach((label, index) => {
                details[label.textContent.trim()] = values[index]?.textContent.trim();
            });

            // Extract car images
            const imageElements = doc.querySelectorAll('#wrapper img, img.t-image, .bg');
            if (!imageElements) {
                console.error("Failed to find any car images in the document");
            }

            const carImages = Array.from(imageElements)
                .map(el => el.tagName === 'IMG' ? el.src : el.style.backgroundImage.slice(5, -2));

            // Create an object to store car data  
            return {
                lotNo,
                name,
                model: model.replace(` ${details['ทะเบียน']}`, ''),
                grade,
                priceStart,
                mileage,
                yearRegistered: details['ปีจด'],
                yearManufactured: details['ปีผลิต'],
                color: details['สี'],
                gear: details['เกียร์'],
                mileage: details['เลขไมล์'],
                licensePlate: details['ทะเบียน'],
                province: details['จังหวัด'],
                engineNumber: details['เลขเครื่อง'],
                chassisNumber: details['เลขถัง'],
                fuel: details['เชื้อเพลิง'],
                carType: details['ประเภทรถ'],
                registrationDate: details['วันที่จดทะเบียน'],
                taxDueDate: details['วันครบกำหนดภาษี'],
                ccWeight: details['ซีซี/น้ำหนัก'],
                ownerCount: details['ลำดับผู้ครอบครอง'],
                remarks: details['หมายเหตุ'],
                lane: lane, // Use lane passed as a parameter
                bank:'',
                images: carImages.join(' | '),
            };
        } catch (error) {
            console.error("Error fetching car data:", error);
            // Send error status update
            sendStatusUpdate('error', error.message);
            return null;
        }
    }

    // Function to download CSV
    function downloadCSV(csv, filename) {
        const bom = '\uFEFF'; // UTF-8 BOM
        const csvFile = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
        const downloadLink = document.createElement("a");
        downloadLink.download = filename;
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        console.log(`Download initiated: ${filename}`);
    }

    // Function to fetch auction data and scrape car links
    async function fetchAuctionData() {
        const carDataArray = [];
        const carLinksMap = new Map(); // Use Map to store link and lane

        // Store links and lanes from all auctionDetails
        for (const detail of auctionDetails) {
            const fetchLink = `https://www.pia.co.th/home/get_cars?auction_id=${detail.auction_id}&lane_id=${detail.lane_id}`;
            try {
                const response = await fetch(fetchLink);
                const html = await response.text();

                // Parse the HTML response
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                console.log("Fetching cars from:", fetchLink);

                // Get car links from the page
                const carsOnPage = doc.querySelectorAll('a');
                carsOnPage.forEach(car => {
                    // ดึง href จาก attribute   
                    const rawHref = car.href;

                    // ทำความสะอาด URL โดยใช้ replace  
                    const cleanedHref = rawHref
                        .replace(/%22/g, '') // ลบ %22  
                        .replace(/\\/g, '') // ลบ \
                        .replace(/https:\/\/www\.pia\.co\.th\//g, '') // ลบ prefix ของ URL  
                        .replace(/^www\.pia\.co\.th\//g, '') // ลบ wwwไป  
                        .replace(/^home\//, ''); // ลบ 'home/' ข้างหน้า  

                    // เช็คว่า cleanedHref ยังไม่ถูกเก็บ  
                    if (!carLinksMap.has(cleanedHref)) {
                        carLinksMap.set(cleanedHref, detail.lane);
                    }
                });

            } catch (error) {
                console.error("Error fetching cars:", error);
                // Send error status update
                sendStatusUpdate('error', error.message);
            }
        }

        console.log(`Total unique car links scraped: ${carLinksMap.size}`);

        // Fetch data for each unique car link
        for (const [link, lane] of carLinksMap.entries()) {
            console.log(`Fetching data from: ${link}`);
            const carData = await fetchCarData(link, lane);
            if (carData) {
                carDataArray.push(carData);
            }
        }

        // Create CSV from car data only if carDataArray is not empty  
        if (carDataArray.length > 0) {
            const headers = Object.keys(carDataArray[0]);
            const rows = carDataArray.map(car =>
                headers.map(header => {
                    const value = car[header] || '';
                    // Escape commas and quotes for CSV  
                    return `"${value.replace(/"/g, '""')}"`; // Escape double quotes  
                }).join(',')
            );
            const csvContent = [headers.join(','), ...rows].join('\n');

            // Download CSV  
            downloadCSV(csvContent, filename);
            // Send success status update
            const tday = new Date();
            const day = String(tday.getDate()).padStart(2, '0');
            const month = String(tday.getMonth() + 1).padStart(2, '0'); // เดือนเริ่มที่ 0
            const year = tday.getFullYear();
            const timeString = `${tday.getHours()}:${String(today.getMinutes()).padStart(2, '0')}`; // ปรับเวลาสำหรับ GMT+7
            let total_img = 0;
            total_img += carDataArray.reduce((sum, product) => sum + (product.images?.split('|').length || 0), 0);
            window.location = `http://10.1.136.121:8081/status/update?name_status=Premium_Inter_auction&num_row=${carDataArray.length}&status=success&message=Finish&date=${day}/${month}/${year}&time=${timeString}&csv_name=${filename.replace(/\//g, '_').replace(/:/g, '_')}&total_img=${total_img}`;
            sendStatusUpdate('success', 'Finish',);
        } else {
            console.log("No car data found to generate CSV.");
            // Send warning status update  
            sendStatusUpdate('warn', 'No car data found.');
        }
    }

    // Start fetching auction data
    fetchAuctionData();
}

// Function to send status updates (dummy implementation)
function sendStatusUpdate(type, message, count = 0) {
    const tday = new Date();
    const day = String(tday.getDate()).padStart(2, '0');
    const month = String(tday.getMonth() + 1).padStart(2, '0'); // เดือนเริ่มที่ 0
    const year = tday.getFullYear();
    const timeString = `${tday.getHours()}:${String(today.getMinutes()).padStart(2, '0')}`; // ปรับเวลาสำหรับ GMT+7
    window.location = `http://10.1.136.121:8081/status/update?name_status=Premium_Inter_auction&num_row=${count}&status=${type}&message=${message}&date=${day}/${month}/${year}&time=${timeString}`;
    console.log(`Status Update [${type}]: ${message} (Count: ${count})`);
}