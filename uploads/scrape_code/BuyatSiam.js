(async () => {
    function convertToCSV(objArray) {
        const array = Array.isArray(objArray) ? objArray : JSON.parse(objArray);
        let headers = Object.keys(array[0]).join(",") + '\r\n';
        let csvRows = headers;

        array.forEach(row => {
            let line = '';
            for (const [key, value] of Object.entries(row)) {
                if (line !== '') line += ',';

                let cellValue = typeof value === 'string' ? value.replace(/,/g, ' ') : value;
                cellValue = key === 'เลขทะเบียน' ? cellValue.trim().replace(/\n/g, ' ') : cellValue;
                line += `"${cellValue}"`;
            }
            csvRows += line + '\r\n';
        });

        return '\uFEFF' + csvRows; // Including BOM for UTF-8 encoding in Excel
    }

    function formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function formatDateForFilename(date) {
        const [day, month, year] = date.toLocaleDateString('en-GB').split('/');
        const [hours, minutes] = date.toTimeString().slice(0, 5).split(':');
        return `${day}_${month}_${year}-${hours}_${minutes}`;
    }

    async function updateStatus(name, rowCount, status, message) {
        const date = formatDate(new Date());
        const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        window.location = `http://199.21.175.150:8081/status/update?name_status=${name}&num_row=${rowCount}&status=${status}&message=${message}&date=${date}&time=${time}`;
    }

    async function retryFetch(url, options = {}, retries = 3, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (!response.ok) throw new Error(`Failed with status: ${response.status}`);
                return await response.text();
            } catch (error) {
                if (i < retries - 1) await new Promise(res => setTimeout(res, delay));
                else throw error;
            }
        }
    }

    async function fetchAuctionInfo() {
        const rows = document.querySelectorAll('tbody tr');
        const auctionlist = [];

        for (const row of rows) {
            const link = row.querySelector('a');
            if (!link) continue;

            const urlParams = new URLSearchParams(link.href.split('?')[1]);
            const auctionId = urlParams.get('aucEvntId');
            if (!auctionId) continue;

            const auctionUrl = `https://www.buyatsiam.com/CarPrintAuctionDetail.html?aucEvntId=${auctionId}`;
            try {
                const response = await retryFetch(auctionUrl);
                const doc = new DOMParser().parseFromString(response, 'text/html');

                auctionlist.push({
                    auctionUrl,
                    province: doc.querySelector('#aucdesc > table > tbody > tr:nth-child(1) > td.u3tg').textContent.trim().replace(',', ''),
                    date: doc.querySelector('#aucdesc > table > tbody > tr:nth-child(2) > td.u3tw').textContent.match(/วัน[^\n]+/)?.[0] || 'ไม่พบข้อมูลวัน',
                    time: doc.querySelector('#aucdesc > table > tbody > tr:nth-child(2) > td.u3tw').textContent.match(/เวลา [^\n]+/)?.[0] || 'ไม่พบข้อมูลเวลา',
                    place: doc.querySelector('#aucdesc > table > tbody > tr:nth-child(3) > td.u3tw').textContent.trim().replace(',', ''),
                    links: Array.from(new Set(Array.from(doc.querySelectorAll('a')).map(a => a.href)))
                });
            } catch (error) {
                console.error(`Error fetching auction details for ID ${auctionId}:`, error);
            }
        }
        return auctionlist;
    }

    async function scrapeCarAuctionDetailsFromLink(link, auctionInfo) {
        try {
            const html = await retryFetch(link);
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            function getTextFromSelector(selector) {
                const element = doc.querySelector(selector);
                return element ? element.innerText.trim() : '';
            }

            const carDetails = {
                'ประเภท': getTextFromSelector('#col_right > table:nth-child(5) > tbody > tr > td.cardesc > table > tbody > tr:nth-child(1) > td.txtw').replace(',', ''),
                'ปีผลิต': getTextFromSelector('#col_right > table:nth-child(5) > tbody > tr > td.cardesc > table > tbody > tr:nth-child(2) > td.txtw').replace(',', ''),
                'ยี่ห้อ': getTextFromSelector('#col_right > table:nth-child(5) > tbody > tr > td.cardesc > table > tbody > tr:nth-child(3) > td.txtw').replace(',', ''),
                'รุ่น': getTextFromSelector('#col_right > table:nth-child(5) > tbody > tr > td.cardesc > table > tbody > tr:nth-child(4) > td.txtw').replace(',', ''),
                'เลขทะเบียน': getTextFromSelector('#col_right > table:nth-child(5) > tbody > tr > td.cardesc > table > tbody > tr:nth-child(5) > td.txtw').replace(',', ''),
                'สี': getTextFromSelector('#col_right > table:nth-child(5) > tbody > tr > td.cardesc > table > tbody > tr:nth-child(6) > td.txtw').replace(',', ''),
                'เกียร์': getTextFromSelector('#col_right > table:nth-child(5) > tbody > tr > td.cardesc > table > tbody > tr:nth-child(7) > td.txtw').replace(',', ''),
                'ประเภทเชื้อเพลิง': getTextFromSelector('#col_right > table:nth-child(5) > tbody > tr > td.cardesc > table > tbody > tr:nth-child(8) > td.txtw').replace(',', ''),
                'เลขไมล์': getTextFromSelector('#col_right > table:nth-child(5) > tbody > tr > td.cardesc > table > tbody > tr:nth-child(9) > td.txtw').replace(',', ''),
                'ขนาดเครื่องยนต์': getTextFromSelector('#col_right > table:nth-child(5) > tbody > tr > td.cardesc > table > tbody > tr:nth-child(10) > td.txtw').replace(',', ''),
                'เลขเครื่องยนต์': getTextFromSelector('#col_right > table:nth-child(5) > tbody > tr > td.cardesc > table > tbody > tr:nth-child(11) > td.txtw').replace(',', ''),
                'เลขตัวถัง': getTextFromSelector('#col_right > table:nth-child(5) > tbody > tr > td.cardesc > table > tbody > tr:nth-child(12) > td.txtw').replace(',', ''),
                'วันจดทะเบียน': getTextFromSelector('#col_right > table:nth-child(5) > tbody > tr > td.cardesc > table > tbody > tr:nth-child(13) > td.txtw').replace(',', ''),
                'วันครบกำหนดภาษี': getTextFromSelector('#col_right > table:nth-child(5) > tbody > tr > td.cardesc > table > tbody > tr:nth-child(14) > td.txtw').replace(',', ''),
                'option': getTextFromSelector('#col_right > table:nth-child(5) > tbody > tr > td.cardesc > table > tbody > tr:nth-child(15) > td.txtw').replace(',', ''),
                'remark': getTextFromSelector('#col_right > table:nth-child(5) > tbody > tr > td.cardesc > table > tbody > tr:nth-child(16) > td.txtw').replace(',', ''),
                'ลำดับที่': getTextFromSelector('#col_right > table:nth-child(7) > tbody > tr > td > div > div > div > table > tbody > tr:nth-child(1) > td:nth-child(2)').replace(',', ''),
                'ราคาตั้งประมูล': getTextFromSelector('#col_right > table:nth-child(7) > tbody > tr > td > div > div > div > table > tbody > tr:nth-child(1) > td:nth-child(4)').replace(',', '')
            };

            // ดึง URL ของภาพจาก gallery
            const imageUrls = [];
            const imageGalleryItems = doc.querySelectorAll('#imageGallery li a');
            imageGalleryItems.forEach(item => {
                const imgElement = item.querySelector('img');
                if (imgElement) {
                    const src = imgElement.src;
                    if (src) {
                        imageUrls.push(src);
                    }
                }
            });

            carDetails['bank'] = '';
            carDetails['รย.'] = imageUrls.join(' | ');
            // รวมข้อมูลจังหวัด วัน เวลา สถานที่ที่ดึงมาจาก auctionInfo
            carDetails['จังหวัด'] = auctionInfo.province;
            carDetails['วันที่ประมูล'] = auctionInfo.date;
            carDetails['เวลา'] = auctionInfo.time;
            carDetails['สถานที่'] = auctionInfo.place;
            carDetails['ชื่อผู้ให้บริการประมูล'] = "Buy at Siam";

            return carDetails;

        } catch (error) {
            console.error('Error fetching car auction details:', error);
            return null;
        }
    }

    async function fetchAllAuctionDetails(links, auctionInfo) {
        const auctionDetailsList = [];
        let i = 0;
        for (const link of links) {
            console.log(`${i++} / ${links.length}`);
            const auctionDetails = await scrapeCarAuctionDetailsFromLink(link, auctionInfo);
            if (auctionDetails) auctionDetailsList.push(auctionDetails);
        }
        return auctionDetailsList;
    }

    const auctionInfoList = await fetchAuctionInfo();
    if (!auctionInfoList.length) return await updateStatus("Buy_at_Siam", 0, "warn", "Auction data not found for date.");

    const auctionDetailsList = [];
    for (const auctionInfo of auctionInfoList) {
        const details = await fetchAllAuctionDetails(auctionInfo.links, auctionInfo);
        if (details) auctionDetailsList.push(...details);
    }

    const csvString = convertToCSV(auctionDetailsList);
    const filename = `Buy_at_Siam-${formatDateForFilename(new Date())}.csv`;

    const csvFile = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(csvFile);
    downloadLink.download = filename;
    downloadLink.click();

    const date = formatDate(new Date());
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    let total_img = 0;
    total_img += auctionDetailsList.reduce((sum, product) => sum + (product['รย.']?.split('|').length || 0), 0);
    window.location = `http://199.21.175.150:8081/status/update?name_status=Buy_at_Siam&num_row=${auctionDetailsList.length}&status=success&message=finish&date=${date}&time=${time}&csv_name=${filename.replace(/\//g, '_').replace(/:/g, '_')}&total_img=${total_img}`;

})();