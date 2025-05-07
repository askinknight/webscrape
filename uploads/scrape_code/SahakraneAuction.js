(async function () {
    console.clear();
    // Function to get today's date in the format "26 ส.ค. 2567"
    function formatDateForComparison(date) {
        return date.toISOString().split('T')[0]; // แปลงเป็น YYYY-MM-DD
    }

    const today = formatDateForComparison(new Date());

    let auctionIds;

    try {
        // ดึงข้อมูลจาก API
        const response = await fetch('https://www.sahaauction.com/Home/data_auction');
        const auctionData = await response.json();

        if (!Array.isArray(auctionData) || auctionData.length === 0) {
            console.warn("⚠️ ไม่พบข้อมูลการประมูลจาก API");
            return;
        }

        // คัดกรองเฉพาะรายการที่ตรงกับวันนี้
        const todayAuctions = auctionData.filter(auction => {
            const auctionDate = formatDateForComparison(new Date(auction.auct_auctiondate));
            return auctionDate === today;
        });

        if (todayAuctions.length === 0) {
            console.warn("⚠️ ไม่มีการประมูลในวันนี้");
            return;
        }

        // ดึงเฉพาะ `auct_auctionid`
        auctionIds = todayAuctions.map(auction => auction.auct_auctionid);

    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดระหว่างดึงข้อมูล:", error);
    }

    // Function to format the date as DD/MM/YYYY in Buddhist Era
    function formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear(); // Convert to Buddhist Era
        return `${day}/${month}/${year}`; // Use '/' as the separator
    }

    // Function to get current time in HH:mm format
    function formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}.${minutes}`;
    }


    // Function to fetch car list for each auction ID
    const fetchCarList = (auctionId) => {
        console.log(`Fetching data for Auction ID: ${auctionId}`);
        return $.ajax({
            type: "POST",
            url: '/Home/GetCarlistAPI',
            data: {
                card_brand_model: '',
                caryear: '',
                cartype: '',
                auli_auctionid: auctionId,
            }
        });
    };

    // Function to fetch image URLs for a given car ID
    const fetchImageUrls = async (carId) => {
        const url = `https://www.sahaauction.com/Home/carauctiondetail?ID=${carId}`;
        console.log(`ID=${carId}`);
        const response = await fetch(url);
        const text = await response.text();

        // Create a DOM parser to parse the response text
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // Select all img elements
        const images = doc.querySelectorAll("img");

        // Extract the src attributes
        const imgSrcs = Array.from(images).map(img => img.src);

        // Create the regex pattern using the carId variable
        const regex = new RegExp(`${carId}-(\\d+)\\.jpeg$`);

        // Use a Set to store unique matching links
        const matchingLinks = new Set();

        // Extract full src links that match the pattern and store them in the Set
        imgSrcs.forEach(src => {
            if (regex.test(src)) {
                matchingLinks.add(src);  // Add the full src link to the Set
            }
        });

        // Convert the Set back to an array for formatting
        return Array.from(matchingLinks).join(' | ');
    };

    let todaynow;

    let todayDate;
    let currentTime;

    let hours;
    let minutes;

    // Start fetching all auction data
    if (auctionIds.length > 0) {
        console.log('Starting to fetch auction data...');

        try {
            const results = await Promise.all(auctionIds.map(id => fetchCarList(id)));

            const combinedData = [];

            // Fetch images for each auction ID
            for (let i = 0; i < results.length; i++) {
                const json = results[i];
                if (json.response.data.length === 0) {
                    console.log(`ไม่พบข้อมูลสำหรับ Auction ID: ${auctionIds[i]}`);
                    continue;
                }

                // Extract the new columns from the response
                const auctNameth = json.auct_nameth;
                const auctDate = json.auct_date;
                const auctTime = json.auct_time;

                // Add the new columns to each item in the data array
                for (const item of json.response.data) {
                    item.auct_nameth = auctNameth;
                    item.auct_date = auctDate;
                    item.auct_time = auctTime;

                    // Fetch and add the image URL
                    item.bank = '';
                    item.imgurl = await fetchImageUrls(item.card_carid);

                    combinedData.push(item); // Add item to combined data
                }
                console.log(`Fetched data for Auction ID: ${auctionIds[i]}`);
            }

            // Convert the data to CSV format and download it
            if (combinedData.length > 0) {
                todaynow = new Date();
                todayDate = formatDate(todaynow);
                currentTime = formatTime(todaynow);
                hours = String(todaynow.getHours()).padStart(2, '0');
                minutes = String(todaynow.getMinutes()).padStart(2, '0');
                // Create filename with the desired format
                const filename = `Sahakrane_Auction-${todayDate}-${currentTime}.csv`;

                var csvData = convertToCSV(combinedData);
                downloadCSV(csvData, filename); // Use the new filename
                console.log('Data has been successfully fetched and CSV has been downloaded.');
                let total_img = 0;
                total_img += combinedData.reduce((sum, product) => sum + (product.imgurl?.split('|').length || 0), 0);
                const finishUrl = `http://10.1.136.121:8081/status/update?name_status=Sahakrane_Auction&num_row=${combinedData.length}&status=success&message=finish&date=${todayDate}&time=${hours}:${minutes}&csv_name=${filename.replace(/\//g, '_').replace(/:/g, '_')}&total_img=${total_img}`;
                window.location = finishUrl;
            } else {
                todaynow = new Date();
                todayDate = formatDate(todaynow);
                currentTime = formatTime(todaynow);
                hours = String(todaynow.getHours()).padStart(2, '0');
                minutes = String(todaynow.getMinutes()).padStart(2, '0');
                console.log('ไม่มีข้อมูลที่จะดาวน์โหลด');
                const noUrl = `http://10.1.136.121:8081/status/update?name_status=Sahakrane_Auction&num_row=0&status=warn&message=${encodeURI('No products found for today.')}&date=${todayDate}&time=${hours}:${minutes}`;
                window.location = noUrl;
            }
        } catch (error) {
            todaynow = new Date();
            todayDate = formatDate(todaynow);
            currentTime = formatTime(todaynow);
            hours = String(todaynow.getHours()).padStart(2, '0');
            minutes = String(todaynow.getMinutes()).padStart(2, '0');
            console.error("Unable to fetch data:", error);
            const errUrl = `http://10.1.136.121:8081/status/update?name_status=Sahakrane_Auction&num_row=0&status=error&message=${encodeURI(error)}&date=${todayDate}&time=${hours}:${minutes}`;
            window.location = errUrl;
        }
    } else {
        todaynow = new Date();
        todayDate = formatDate(todaynow);
        currentTime = formatTime(todaynow);
        hours = String(todaynow.getHours()).padStart(2, '0');
        minutes = String(todaynow.getMinutes()).padStart(2, '0');
        console.log('ไม่พบ Auction ID ที่ตรงกับวันที่วันนี้');
        const AUrl = `http://10.20.45.188:8081/status/update?name_status=Sahakrane_Auction&num_row=0&status=warn&message=${encodeURI('No Auction ID for today')}&date=${todayDate}&time=${hours}:${minutes}`;
        window.location = AUrl;
    }
})();

// Function to convert data to CSV format
function convertToCSV(data) {
    const csvRows = [];

    // Add headers
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

// Function to download CSV
function downloadCSV(csv, filename) {
    let csvFile;
    let downloadLink;

    // Add BOM for UTF-8 encoding
    const bom = '\uFEFF';

    csvFile = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink); // Remove the link after downloading
}