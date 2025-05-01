(async () => {
    // Extract dropdown data based on today's date
    function extractDropdownDataForToday(doc, today) {
        const items = doc.querySelectorAll('ul.dropdown-menu-form.dropdown-menu.ps li');
        const todayData = [];

        items.forEach(item => {
            const text = item.textContent.trim();
            if (text.includes(`วันที่ ${today}`)) {
                const [place, typeAndDate] = text.split(' : ');
                const [type, date] = typeAndDate.split(' วันที่ ');
                todayData.push({ place, type, date, value: item.querySelector('span').getAttribute('data-value') });
            }
        });

        return todayData;
    }

    // Function to select an auction from the dropdown and submit the form
    async function selectAuctionAndSubmit(value) {
        const dropdownButton = document.querySelector('#ddl-auction .btn.dropdown-toggle');
        dropdownButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));

        const option = Array.from(document.querySelectorAll('#ddl-auction ul.dropdown-menu-form li'))
            .find(li => li.querySelector('span').getAttribute('data-value') === value);

        if (option) {
            option.querySelector('span').click();
        } else {
            throw new Error('Option not found in dropdown');
        }

        const searchButton = document.querySelector('#btn-search');
        searchButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Function to fetch additional product details from the URL
    const fetchProductDetails = async (link) => {
        try {
            console.log(`Fetching product details from: https://www.appleauction.co.th${link}`);
            const response = await fetch(`https://www.appleauction.co.th${link}`);
            if (!response.ok) {
                console.error(`Failed to fetch product details: ${response.status} ${response.statusText}`);
                return {};
            }
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');

            function extractProductDetails() {
                const productDetails = {
                    'Brand': '',
                    'Model': '',
                    'Sub Model': '',
                    'Year': '',
                    'Color': '',
                    'Gear': '',
                    'Internal Grade': '',
                    'Image URL': ''
                };

                // Extracting information from <li> elements
                const listItems = doc.querySelectorAll('li');
                listItems.forEach(item => {
                    const text = item.textContent.trim();
                    const brandMatch = text.match(/ยี่ห้อ\s*:\s*(.+)/);
                    const modelMatch = text.match(/รุ่น\s*:\s*(.+)/);
                    const subModelMatch = text.match(/รุ่นย่อย\s*:\s*(.+)/);
                    const yearMatch = text.match(/ปี\s*:\s*(.+)/);
                    const colorMatch = text.match(/สี\s*:\s*(.+)/);
                    const gearMatch = text.match(/เกียร์\s*:\s*(.+)/);
                    const gradeMatch = text.match(/เกรดภายใน\s*:\s*(.+)/);

                    if (brandMatch) productDetails['Brand'] = brandMatch[1].trim();
                    if (modelMatch) productDetails['Model'] = modelMatch[1].trim();
                    if (subModelMatch) productDetails['Sub Model'] = subModelMatch[1].trim();
                    if (yearMatch) productDetails['Year'] = yearMatch[1].trim();
                    if (colorMatch) productDetails['Color'] = colorMatch[1].trim();
                    if (gearMatch) productDetails['Gear'] = gearMatch[1].trim();
                    if (gradeMatch) productDetails['Internal Grade'] = gradeMatch[1].trim();
                });

                // Extracting image URLs
                const imageElements = doc.querySelectorAll('.photo-item img');
                const imageUrls = Array.from(imageElements).map(img => img.src);
                const imageUrlString = imageUrls.join(' | ');
                productDetails['Image URL'] = imageUrlString;

                return productDetails;
            }
            const product = extractProductDetails();
            console.log(product);

            return product;
        } catch (error) {
            console.error('Error fetching product details:', error);
            return {};
        }
    };

    // Function to scrape table data
    async function scrapeAuctionDataForToday(todayData) {
        const results = [];

        for (const { place, type, date, value } of todayData) {
            await selectAuctionAndSubmit(value);

            const selectElement = document.querySelector('select.mvc-grid-pager-rows');
            selectElement.value = '200';
            selectElement.dispatchEvent(new Event('change'));

            let hasNextPage = true;

            while (hasNextPage) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for page to load

                const rows = document.querySelectorAll('table.program-grid tbody tr');
                for (const row of rows) {
                    const linkfetch = row.querySelector('td.vcenter a.have-item')?.getAttribute('href') || '';
                    const lotNo = row.querySelector('td.text-right:nth-of-type(2)')?.textContent.trim() || '';
                    const price = row.querySelector('td.text-right:nth-of-type(3)')?.textContent.trim() || '';
                    const registrationNumber = row.querySelector('td:nth-of-type(5) p')?.textContent.trim() || '';
                    const outgrade = row.querySelector('td:nth-of-type(6)')?.textContent.trim() || '';
                    const mileage = row.querySelector('td:nth-of-type(7)')?.textContent.trim() || '';
                    const engineNumber = row.querySelector('td:nth-of-type(8)')?.textContent.trim() || '';
                    const chassisNumber = row.querySelector('td:nth-of-type(9)')?.textContent.trim() || '';
                    const auctionDetails = row.querySelector('td:nth-of-type(10)')?.textContent.trim() || '';
                    const notes = row.querySelector('td:nth-of-type(11)')?.textContent.trim() || '';

                    // Fetch additional details from the constructed URL
                    const productDetails = await fetchProductDetails(linkfetch);

                    results.push({
                        place,
                        type,
                        date,
                        linkfetch,
                        lotNo,
                        price,
                        registrationNumber,
                        outgrade,
                        mileage,
                        engineNumber,
                        chassisNumber,
                        auctionDetails,
                        notes,
                        ...productDetails
                    });
                }

                const nextPageButton = Array.from(document.querySelectorAll('ul.grid-pager-list li')).find(
                    li => li.textContent.trim() === '›' && !li.classList.contains('disabled')
                );

                if (nextPageButton) {
                    nextPageButton.querySelector('span').click();
                } else {
                    hasNextPage = false;
                }
            }
        }

        return results;
    }

    // Convert the results to CSV
    function convertToCSV(data) {
        const headers = [
            'Place', 'Type', 'Date', 'Link Fetch', 'Lot No.', 'Price', 'Registration Number',
            'Out Grade', 'Mileage', 'Engine Number', 'Chassis Number', 'Auction Details', 'Notes',
            'Brand', 'Model', 'Sub Model', 'Year', 'Color', 'Gear', 'Internal Grade', 'bank','Image URL'
        ];
        const rows = data.map(row => [
            row.place.replace(/,/g, ' '),
            row.type.replace(/,/g, ' '),
            row.date.replace(/,/g, ' '),
            row.linkfetch.replace(/,/g, ' '),
            row.lotNo.replace(/,/g, ' '),
            row.price.replace(/,/g, ' '),
            row.registrationNumber.replace(/,/g, ' '),
            row.outgrade.replace(/,/g, ' '),
            row.mileage.replace(/,/g, ' '),
            row.engineNumber.replace(/,/g, ' '),
            row.chassisNumber.replace(/,/g, ' '),
            row.auctionDetails.replace(/,/g, ' '),
            row.notes.replace(/,/g, ' '),
            row['Brand']?.replace(/,/g, ' ') || '',
            row['Model']?.replace(/,/g, ' ') || '',
            row['Sub Model']?.replace(/,/g, ' ') || '',
            row['Year']?.replace(/,/g, ' ') || '',
            row['Color']?.replace(/,/g, ' ') || '',
            row['Gear']?.replace(/,/g, ' ') || '',
            row['Internal Grade']?.replace(/,/g, ' ') || '',
            '',
            row['Image URL']?.replace(/,/g, ' ') || ''
        ].map(field => `"${field}"`).join(','));

        return [headers.join(','), ...rows].join('\n');
    }

    // Save the CSV to a file with UTF-8 encoding
    function downloadCSV(csv, filename) {
        let csvFile;
        let downloadLink;

        const bom = '\uFEFF';
        csvFile = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
        downloadLink = document.createElement("a");
        downloadLink.download = filename; // Use the provided filename
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    // Function to format the date as DD-MM-YYYY
    function formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear() + 543;
        return `${day}-${month}-${year}`;
    }

    // Function to format the date as DD/MM/YYYY in Buddhist Era
    function formatDateuse(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear(); // Convert to Buddhist Era
        return `${day}/${month}/${year}`; // Use '/' as the separator
    }

    function openAndCloseTab(url, delay = 2000) {
        return new Promise((resolve) => {
            const newTab = window.open(url, '_blank');
            setTimeout(() => {
                if (newTab) {
                    newTab.close();
                }
                resolve();
            }, delay);
        });
    }

    // Function to get current time in HH:mm format
    function formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}.${minutes}`;
    }

    let daynow = new Date();
    const todayDate = formatDate(daynow);
    const currentTime = formatTime(daynow);
    const todayNow = formatDateuse(daynow);
    const hours = String(daynow.getHours()).padStart(2, '0');
    const minutes = String(daynow.getMinutes()).padStart(2, '0');

    // Create filename
    const filename = `Apple_Auction-${todayNow}-${currentTime}.csv`;
    console.log(filename); // Display the filename

    // Main function
    const doc = document; // Assuming this script runs in the same document context

    const dropdownDataForToday = extractDropdownDataForToday(doc, todayDate);
    if (dropdownDataForToday.length > 0) {
        const scrapedData = await scrapeAuctionDataForToday(dropdownDataForToday);
        const csvData = convertToCSV(scrapedData);
        downloadCSV(csvData, filename); // Pass the filename to the download function
        console.log('Data has been scraped and saved to CSV.');
        let total_img = 0;
        total_img += scrapedData.reduce((sum, product) => sum + (product['Image URL']?.split('|').length || 0), 0);

        // Send success status
        const successUrl = `http://10.1.136.121:8081/status/update?name_status=Apple_Auction&num_row=${scrapedData.length}&status=success&message=finish&date=${todayNow}&time=${hours}:${minutes}&csv_name=${filename.replace(/\//g, '_').replace(/:/g, '_')}&total_img=${total_img}`;
        window.location = successUrl;
    } else {
        console.log('No data found for today.');

        // Send warning status with error message
        const errorMessage = encodeURIComponent('No auctions or products found for today.');
        const warnUrl = `http://10.1.136.121:8081/status/update?name_status=Apple_Auction&num_row=0&status=warn&message=${errorMessage}&date=${todayNow}&time=${hours}:${minutes}`;
        window.location = warnUrl;
    }
})();