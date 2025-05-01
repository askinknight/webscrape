// Utility function: Convert array of objects to CSV format
function convertToCSV(items) {
    if (!items.length) return '';

    const headers = Object.keys(items[0]).join(',');
    const rows = items.map(item =>
        Object.values(item).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
    );

    return [headers, ...rows].join('\n');
}

// Utility function: Generate a formatted date and time string for filenames
function getFormattedDateTime() {
    const today = new Date();
    const date = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const time = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
    return { date, time };
}

// Utility function: Download CSV file
function downloadCSV(csvContent, filename) {
    const blob = new Blob(['\uFEFF'+ csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Fetch auction details and save to CSV
async function fetchAuctionDetailsAndSaveToCSV(codesWithNum) {
    try {
        const auctionDetailsPromises = codesWithNum.flatMap(({ code, num }) =>
            Array.from({ length: num }, (_, pageNumber) => fetchAuctionPage(code, pageNumber + 1))
        );

        const allItems = (await Promise.all(auctionDetailsPromises)).flat();
        const updatedItems = await addImageUrlsToItems(allItems);

        const csvContent = convertToCSV(updatedItems);
        const { date, time } = getFormattedDateTime();
        const filename = `Motto_Auction-${date.replace('/', '_')}-${time}.csv`;
        downloadCSV(csvContent, filename);
    } catch (error) {
        console.error('Error fetching auction details:', error);
    }
}

// Fetch a single auction page
function fetchAuctionPage(code, pageNumber) {
    const url = `https://www.mottoauction.com/api/services/app/auction/GetByCodeWithPagin?pageNumber=${pageNumber}`;
    const payload = { code, customer: null, sortBy: 0 };

    return $.ajax({
        url: url,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
    }).then(response => response.result.items);
}

// Add image URLs to auction items
async function addImageUrlsToItems(items) {
    const updatedItems = [];

    for (const item of items) {
        try {
            const imageUrls = await fetchImageUrls(item.vehicle);
            updatedItems.push({ ...item, bank:'',imageUrl: imageUrls.join(' | ') || null });
        } catch (error) {
            console.error(`Error fetching image URLs for vehicle ${item.vehicle}:`, error);
            updatedItems.push({ ...item, bank:'',imageUrl: null });
        }
    }

    return updatedItems;
}

// Fetch image URLs for a given vehicle
async function fetchImageUrls(vehicle) {
    const vehicleUrl = `https://www.mottoauction.com/auction/detail/${vehicle}`;
    const response = await fetch(vehicleUrl);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const imageContainers = doc.querySelectorAll('.image-container');
    const imageUrls = [];

    imageContainers.forEach(container => {
        const imageName = container.querySelector('.overlay .image-name')?.textContent?.trim();
        if (imageName && imageName.includes('Titlebook_')) {
            container.querySelectorAll('img').forEach(img => {
                if (img.src) imageUrls.push(img.src);
            });
        }
    });

    return imageUrls;
}

// Extract auction codes from response
function extractAuctionCodes(data) {
    return data.result?.flatMap(result =>
        result.items?.map(item => item.auctionCode) || []
    ) || [];
}

// Fetch record counts for auction codes
async function fetchRecordCounts(auctionCodes) {
    const requests = auctionCodes.map(code => {
        const url = 'https://www.mottoauction.com/api/services/app/auction/GetRecordCountByCode';
        const payload = { code, customer: null, sortBy: 0 };

        return $.ajax({
            url: url,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
        }).then(response => ({ code, num: response.result.totalPage }));
    });

    return Promise.all(requests);
}


// Main process: Fetch and process auction details
$(document).ready(async function () {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const url = `https://www.mottoauction.com/api/services/app/auction/GetByDate?date=${formattedDate}`;

    try {
        const response = await $.ajax({
            url: url,
            method: 'POST',
            contentType: 'application/json',
        });

        const auctionCodes = extractAuctionCodes(response);
        if (auctionCodes.length === 0) {
            console.log('No Auction for today');
        } else {
            const codesWithNum = await fetchRecordCounts(auctionCodes);
            await fetchAuctionDetailsAndSaveToCSV(codesWithNum);
        }
    } catch (error) {
        console.error('Error during the main process:', error);

    }
});