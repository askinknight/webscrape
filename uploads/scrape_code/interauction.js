(async () => {
    // Get today's date in the desired format (e.g., 'YYYYMMDD')
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Month is zero-based
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}${month}19`; // Set to dynamic today's date

    // Select the container that holds all the list items
    const listContainer = document.querySelector('body > div.container.content > div:nth-child(1) > div > div > div.col-md-4');

    // Array to hold all matching URLs and lanes
    let linksAndLanes = [];

    if (listContainer) {
        const listItems = listContainer.querySelectorAll('div.card');

        // Update selector to match the new <a> tag structure
        listItems.forEach(item => {
            const linkElement = item.querySelector('a.btn.btn-success'); // Updated selector
            const provinceElement = item.querySelector('div > h4');

            if (linkElement && provinceElement) {
                const href = linkElement.getAttribute('href');
                const dateMatch = href.match(/auctiondate=(\d{14})/); // Updated regex to match 14 digits

                if (dateMatch && dateMatch[1].startsWith(todayString)) {
                    linksAndLanes.push({
                        url: href,           // Add the matched link to the array
                        lane: provinceElement.textContent.trim() // Add the matching lane to the array
                    });
                    console.log(`Link: ${href}`);
                    console.log(`Lane: ${provinceElement.textContent.trim()}`);
                }
            }
        });

    }

    // Proceed if at least one matching URL is found
    if (linksAndLanes.length === 0) {
        const errorMessage = 'No Auction for today.';
        const status = 'warn';
        window.location = `http://10.1.136.121:8081/status/update?name_status=Inter_auction&num_row=0&status=${status}&message=${encodeURIComponent(errorMessage)}&date=${day}/${month}/${year}&time=${today.getHours()}:${today.getMinutes()}`;
        return;
    }

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
    }

    async function extractData(doc, lane) {
        const items = doc.querySelectorAll('li a[target="_parent"]');
        const data = [];

        for (const item of items) {
            const imgElement = item.querySelector('img');
            const img = imgElement ? imgElement.src.replace(/,/g, ' ') : '';

            const dateAuctionElement = item.querySelector('.headlist p');
            const dateAuction = dateAuctionElement ? dateAuctionElement.textContent.trim().replace(/,/g, ' ') : '';

            const orderNoElement = item.querySelector('.headlist p.font-orange');
            const orderNo = orderNoElement ? orderNoElement.textContent.trim().replace(/,/g, ' ') : '';

            const brandElement = item.querySelector('.headlist2 p.font-orange:nth-of-type(1)');
            const brand = brandElement ? brandElement.textContent.trim().replace(/,/g, ' ') : '';

            const modelElement = item.querySelector('.headlist2 p.font-orange:nth-of-type(2)');
            const model = modelElement ? modelElement.textContent.trim().replace(/,/g, ' ') : '';

            const yearElement = item.querySelector('.headlist2 p.font-orange:nth-of-type(3)');
            const year = yearElement ? yearElement.textContent.trim().replace(/,/g, ' ') : '';

            const detailsElement = item.querySelector('.headlist p.font-gray');
            const details = detailsElement ? detailsElement.textContent.trim().replace(/,/g, ' ') : '';

            const conditionElement = item.querySelector('.headlist p.font-gray:nth-of-type(2)');
            const condition = conditionElement ? conditionElement.textContent.trim().replace(/,/g, ' ') : '';

            const remarkElement = item.querySelector('.headlist p.font-gray:nth-of-type(3)');
            const remark = remarkElement ? remarkElement.textContent.trim().replace(/,/g, ' ') : '';

            const priceElement = item.querySelector('.headlist p.font-orange:nth-of-type(4)');
            const price = priceElement ? priceElement.textContent.trim().replace(/,/g, ' ') : '';

            const urlElement = item.getAttribute('href');

            let registration = '', carType = '', color = '';  // เปลี่ยนเป็น let เพราะจะเปลี่ยนค่าได้
            let subImg = new Set();

            if (urlElement) {
                const subItem = await fetchPageSubData(urlElement);

                subItem.querySelectorAll('div.container.content p > a img').forEach(item => {
                    subImg.add(item.src);
                });

                // เลือกทุก <li> ที่มี <div class="col-xs-2 headdetail">
                const listItems = subItem.querySelectorAll('li');

                listItems.forEach(li => {
                    const headDetail = li.querySelector('.col-xs-2.headdetail');
                    const detailElement = li.querySelector('.col-xs-10');

                    // ตรวจสอบว่า <div class="col-xs-2 headdetail"> มีข้อความ "รายละเอียด"
                    if (headDetail && headDetail.textContent.includes("รายละเอียด") && detailElement) {
                        // ดึงข้อมูลจาก <div class="col-xs-10">
                        const dataText = detailElement.textContent.trim();

                        // แยกข้อมูลและอัปเดตตัวแปร
                        [registration, carType, color] = dataText.split(',');
                    }
                });
            }


            data.push({
                img,
                dateAuction,
                orderNo,
                brand,
                model,
                year,
                details,
                condition,
                remark,
                price,
                lane,
                subImg,registration, carType, color
            });
        }

        return data;
    }

    function convertToCSV(data) {
        const headers = `"Image",bank,"subImg","Date Auction","Order No","Brand","Model","Year","Details","Condition","Remark","Price",registration,carType,color,"Lane"\n`;
        const rows = data.map(item =>
            `"${item.img}","","${Array.from(item.subImg).join(' | ')}","${item.dateAuction}","${item.orderNo}","${item.brand}","${item.model}","${item.year}","${item.details}","${item.condition}","${item.remark}","${item.price}","${item.registration}","${item.carType}","${item.color}","${item.lane}"`.replace('"',"")
        ).join("\n");

        return headers + rows;
    }

    async function fetchPageSubData(url) {
        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc;
    }

    async function fetchPageData(url, lane) {
        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return extractData(doc, lane);
    }

    async function getMaxPage(url) {
        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const select = doc.querySelector('select[name="pageresult"]');
        return select ? Math.max(...Array.from(select.options).map(opt => Number(opt.value))) : 1;
    }

    // Array to collect all data from all links
    let allData = [];

    // Loop through all matching URLs and lanes
    for (const { url: currentUrl, lane } of linksAndLanes) {
        // Find maxPage for each link
        const maxPage = await getMaxPage(currentUrl);

        // Collect data from all pages for the current URL
        for (let i = 1; i <= maxPage; i++) {
            let pageUrl;

            // Adjust URL for pagination
            if (currentUrl.includes('page=')) {
                pageUrl = currentUrl.replace(/page=\d+/, `page=${i}`);
            } else if (currentUrl.includes('?')) {
                pageUrl = `${currentUrl}&page=${i}`;
            } else {
                pageUrl = `${currentUrl}?page=${i}`;
            }

            const pageData = await fetchPageData(pageUrl, lane);
            allData = allData.concat(pageData);
        }
    }

    console.log(allData);

    // Check if any data was collected
    if (allData.length === 0) {
        const warningMessage = 'No Auction for today.';
        const status = 'warn';
        window.location = `http://10.1.136.121:8081/status/update?name_status=Inter_auction&num_row=0&status=${status}&message=${encodeURIComponent(warningMessage)}&date=${day}/${month}/${year}&time=${today.getHours()}:${today.getMinutes()}`;
        return;
    }

    const csv = convertToCSV(allData);
    let total_img = 0;
    total_img += allData.reduce((sum, product) => sum + (product.subImg.size || 0), 0);
    // Get current date and time in UTC+7
    const now = new Date();
    const utc7Time = new Date(now.getTime());
    const formattedDate = utc7Time.toLocaleDateString('en-GB').split('/').join('_'); // Format DD_MM_YYYY
    const formattedTime = utc7Time.toTimeString().split(' ')[0].replace(/:/g, '_').slice(0, 5); // Format HH_mm

    // Set the filename in the desired format
    const filename = `Inter_auction-${formattedDate}-${formattedTime}.csv`;
    downloadCSV(csv, filename);
    window.location = `http://10.1.136.121:8081/status/update?name_status=Inter_auction&num_row=${allData.length}&status=success&message=finish&date=${day}/${month}/${year}&time=${today.getHours()}:${today.getMinutes()}&csv_name=${filename.replace(/\//g, '_').replace(/:/g, '_')}&total_img=${total_img}`;
})();
