// ฟังก์ชันเพื่อดึงวันที่ปัจจุบันในรูปแบบ dd/mm/yyyy
function getCurrentDate() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
}

// Utility function: Download CSV file
function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Utility function: Convert array of objects to CSV format
function convertToCSV(items) {
    if (!items.length) return '';

    const headers = Object.keys(items[0]).join(',');
    const rows = items.map(item =>
        Object.values(item).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
    );

    return [headers, ...rows].join('\n');
}

// ฟังก์ชันเพื่อปรับเวลาสำหรับ log
function getFormattedDateTime() {
    const now = new Date();
    const date = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return { date, time };
}

// ฟังก์ชันเพื่ออัพเดตสถานะการทำงาน
function updateStatus(statusType, count, date, time, message) {
    const url = `http://10.1.136.121:8081/status/update?name_status=Auction_express&num_row=${count}&status=${statusType}&message=${encodeURIComponent(message)}&date=${date}&time=${time}`;
    window.location = url;
}

// ฟังก์ชันหลักในการดึงข้อมูล location_id และ auction_id
async function fetchData() {
    const url2 = '/th/get-schedule';
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const data = { date: getCurrentDate() };

    try {
        const response = await fetch(url2, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': csrfToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const responseData = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(responseData, 'text/html');
        const anchorTag = doc.querySelector('a');

        if (anchorTag) {
            const href = anchorTag.getAttribute('href');
            const linkedResponse = await fetch(href);

            if (!linkedResponse.ok) throw new Error(`Error fetching href! Status: ${linkedResponse.status}`);

            const linkedData = await linkedResponse.text();
            const linkedDoc = parser.parseFromString(linkedData, 'text/html');
            const tableContainer = linkedDoc.querySelector('#catalog-item-0');
            const catalogItem = tableContainer.closest('.catalog-item');

            if (catalogItem) {
                const locationId = catalogItem.getAttribute('data-location-id');
                const auctionId = catalogItem.getAttribute('data-auction-id');
                return { locationId, auctionId };
            } else {
                console.log('No catalog-table-container found in the linked page.');
                return {};
            }
        } else {
            console.log('No auction for today.');
            const { date, time } = getFormattedDateTime();
            updateStatus('warn', 0, date, time, 'No Auction for today');
            return {};
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        return {};
    }
}

// ฟังก์ชันสำหรับดึงข้อมูลจาก API
async function fetchAuctionData(locationId, auctionId) {
    const url = 'https://www.auctionexpress.co.th/th/catalog/get-datatable';
    const params = new URLSearchParams({
        draw: 2,
        start: 0,
        length: 100000,
        search: '',
        location_id: locationId,
        auction_id: auctionId,
        '_': Date.now(),
        'columns[0][data]': 'picture', 'columns[0][name]': 'picture', 'columns[0][searchable]': 'true', 'columns[0][orderable]': 'false',
        'columns[1][data]': 'lot_number', 'columns[1][name]': 'lot_number', 'columns[1][searchable]': 'true', 'columns[1][orderable]': 'false',
        'columns[0][data]': 'picture', 'columns[0][name]': 'picture', 'columns[0][searchable]': 'true', 'columns[0][orderable]': 'false', 'columns[0][search][value]': '', 'columns[0][search][regex]': 'false',
        'columns[1][data]': 'lot_number', 'columns[1][name]': 'lot_number', 'columns[1][searchable]': 'true', 'columns[1][orderable]': 'false', 'columns[1][search][value]': '', 'columns[1][search][regex]': 'false',
        'columns[2][data]': 'brand_name', 'columns[2][name]': 'brand_name', 'columns[2][searchable]': 'true', 'columns[2][orderable]': 'false', 'columns[2][search][value]': '', 'columns[2][search][regex]': 'false',
        'columns[3][data]': 'group_type_name', 'columns[3][name]': 'group_type_name', 'columns[3][searchable]': 'true', 'columns[3][orderable]': 'false', 'columns[3][search][value]': '', 'columns[3][search][regex]': 'false',
        'columns[4][data]': 'car_body_type_pickup_th', 'columns[4][name]': 'car_body_type_pickup_th', 'columns[4][searchable]': 'true', 'columns[4][orderable]': 'false', 'columns[4][search][value]': '', 'columns[4][search][regex]': 'false',
        'columns[5][data]': 'type_name', 'columns[5][name]': 'type_name', 'columns[5][searchable]': 'true', 'columns[5][orderable]': 'false', 'columns[5][search][value]': '', 'columns[5][search][regex]': 'false',
        'columns[6][data]': 'inspection_total_grade', 'columns[6][name]': 'inspection_total_grade', 'columns[6][searchable]': 'true', 'columns[6][orderable]': 'false', 'columns[6][search][value]': '', 'columns[6][search][regex]': 'false',
        'columns[7][data]': 'car_start_price', 'columns[7][name]': 'car_start_price', 'columns[7][searchable]': 'true', 'columns[7][orderable]': 'false', 'columns[7][search][value]': '', 'columns[7][search][regex]': 'false',
        'columns[8][data]': 'fee', 'columns[8][name]': 'fee', 'columns[8][searchable]': 'true', 'columns[8][orderable]': 'false', 'columns[8][search][value]': '', 'columns[8][search][regex]': 'false',
        'columns[9][data]': 'highest_price', 'columns[9][name]': 'highest_price', 'columns[9][searchable]': 'true', 'columns[9][orderable]': 'false', 'columns[9][search][value]': '', 'columns[9][search][regex]': 'false',
        'columns[10][data]': 'car_man_year', 'columns[10][name]': 'car_man_year', 'columns[10][searchable]': 'true', 'columns[10][orderable]': 'false', 'columns[10][search][value]': '', 'columns[10][search][regex]': 'false',
        'columns[11][data]': 'car_reg_no', 'columns[11][name]': 'car_reg_no', 'columns[11][searchable]': 'true', 'columns[11][orderable]': 'false', 'columns[11][search][value]': '', 'columns[11][search][regex]': 'false',
        'columns[12][data]': 'province_name', 'columns[12][name]': 'province_name', 'columns[12][searchable]': 'true', 'columns[12][orderable]': 'false', 'columns[12][search][value]': '', 'columns[12][search][regex]': 'false',
        'columns[13][data]': 'car_reg_date', 'columns[13][name]': 'car_reg_date', 'columns[13][searchable]': 'true', 'columns[13][orderable]': 'false', 'columns[13][search][value]': '', 'columns[13][search][regex]': 'false',
        'columns[14][data]': 'car_mileage', 'columns[14][name]': 'car_mileage', 'columns[14][searchable]': 'true', 'columns[14][orderable]': 'false', 'columns[14][search][value]': '', 'columns[14][search][regex]': 'false',
        'columns[15][data]': 'drive_description', 'columns[15][name]': 'drive_description', 'columns[15][searchable]': 'true', 'columns[15][orderable]': 'false', 'columns[15][search][value]': '', 'columns[15][search][regex]': 'false',
        'columns[16][data]': 'car_engine_description', 'columns[16][name]': 'car_engine_description', 'columns[16][searchable]': 'true', 'columns[16][orderable]': 'false', 'columns[16][search][value]': '', 'columns[16][search][regex]': 'false',
        'columns[17][data]': 'color_name', 'columns[17][name]': 'color_name', 'columns[17][searchable]': 'true', 'columns[17][orderable]': 'false', 'columns[17][search][value]': '', 'columns[17][search][regex]': 'false',
        'columns[18][data]': 'car_transmission', 'columns[18][name]': 'car_transmission', 'columns[18][searchable]': 'true', 'columns[18][orderable]': 'false', 'columns[18][search][value]': '', 'columns[18][search][regex]': 'false',
        'columns[19][data]': 'fuel_name_th', 'columns[19][name]': 'fuel_name_th', 'columns[19][searchable]': 'true', 'columns[19][orderable]': 'false', 'columns[19][search][value]': '', 'columns[19][search][regex]': 'false',
        'columns[20][data]': 'location_name_th', 'columns[20][name]': 'location_name_th', 'columns[20][searchable]': 'true', 'columns[20][orderable]': 'false', 'columns[20][search][value]': '', 'columns[20][search][regex]': 'false',
        'columns[21][data]': 'sourcing_type_name_th', 'columns[21][name]': 'sourcing_type_name_th', 'columns[21][searchable]': 'true', 'columns[21][orderable]': 'false', 'columns[21][search][value]': '', 'columns[21][search][regex]': 'false'
    });

    try {
        const response = await fetch(`${url}?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const auctionData = await response.json();
        console.log(auctionData);
        return auctionData;
    } catch (error) {
        console.error('Error fetching auction data:', error);
        return null;
    }
}

// เรียกใช้งานฟังก์ชันทั้งหมด
(async () => {
    const { locationId, auctionId } = await fetchData();

    if (locationId && auctionId) {
        try {
            console.log(`location_id: ${locationId}, auction_id: ${auctionId}`);
            const auctionData = await fetchAuctionData(locationId, auctionId);
            const filteredData = auctionData.data.map(item => ({
                auction_date: item.auction_date,
                auction_type: item.auction_type,
                car_body_type_id: item.car_body_type_id,
                car_body_type_pickup_th: item.car_body_type_pickup_th,
                car_body_type_th: item.car_body_type_th,
                car_engine_capacity: item.car_engine_capacity,
                car_engine_description: item.car_engine_description,
                car_enging_no: item.car_enging_no,
                car_entry_date: item.car_entry_date,
                car_inventory_number: item.car_inventory_number,
                car_leasing_contract: item.car_leasing_contract,
                car_man_year: item.car_man_year,
                car_mileage: item.car_mileage,
                car_reg_date: item.car_reg_date,
                car_reg_no: item.car_reg_no,
                car_reserved_price: item.car_reserved_price,
                car_start_price: item.car_start_price,
                car_tax_expired_date: item.car_tax_expired_date,
                car_transmission: item.car_transmission,
                car_vin: item.car_vin,
                color_id: item.color_id,
                color_name_en: item.color_name_en,
                color_name_th: item.color_name_th,
                created_at: item.created_at,
                drive_description: item.drive_description,
                fuel_name_en: item.fuel_name_en,
                group_type_name_th: item.group_type_name_th,
                highest_price: item.highest_price,
                inspection_body_grade: item.inspection_body_grade,
                inspection_date: item.inspection_date,
                inspection_engine_grade: item.inspection_engine_grade,
                inspection_exterior_grade: item.inspection_exterior_grade,
                inspection_frame_grade: item.inspection_frame_grade,
                inspection_interior_grade: item.inspection_interior_grade,
                inspection_mileage: item.inspection_mileage,
                inspection_total_grade: item.inspection_total_grade,
                lane_number: item.lane_number,
                location_name_en: item.location_name_en,
                location_name_th: item.location_name_th,
                lot_number: item.lot_number,
                membership_name: item.membership_name,
                membership_no: item.membership_no,
                message_auction: item.message_auction,
                parking_location_code: item.parking_location_code,
                parking_location_name_th: item.parking_location_name_th,
                province_code: item.province_code,
                province_name_th: item.province_name_th,
                sourcing_type_name_th: item.sourcing_type_name_th,
                start_time: item.start_time,
                sub_model_name: item.sub_model_name,
                sum_fee: item.sum_fee,
                sum_fee_individual: item.sum_fee_individual,
                updated_at: item.updated_at,
                brand_name: item.brand_name,
                group_type_name: item.group_type_name,
                province_name: item.province_name,
                color_name: item.color_name,
                DT_RowIndex: item.DT_RowIndex,
                Imgcode: `${item.auction_car_list_id}||${item.inventory_car_id}`,
                bank:''
            }));
            // แสดงผลข้อมูลที่กรองแล้ว
            console.log(filteredData);

            // สร้างอาร์เรย์ของ Promise ที่จะดึงข้อมูลจาก API
            const fetchPromises = filteredData.map(item => {
                return new Promise((resolve, reject) => {
                    const url2 = 'https://www.auctionexpress.co.th/th/search/detail';
                    const ids = item.Imgcode;
                    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                    const data = { id: ids };

                    fetch(url2, {
                        method: 'POST',
                        headers: {
                            'X-CSRF-TOKEN': csrfToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data)
                    })
                        .then(response => {
                            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                            return response.json();
                        })
                        .then(responseData => {
                            const carDocumentFiles = responseData.data.inventory_document
                                .filter(item => item.car_document_file)
                                .map(item => item.car_document_file);

                            const carDocumentFilesString = carDocumentFiles.join(' | ');
                            item.Imagepath = carDocumentFilesString;

                            resolve(); // เมื่อคำขอเสร็จสิ้น
                        })
                        .catch(error => {
                            console.error('Error fetching data:', error);
                            reject(error); // หากมีข้อผิดพลาด
                        });
                });
            });

            // ใช้ Promise.all เพื่อรอให้ทุกคำขอเสร็จสมบูรณ์
            Promise.all(fetchPromises)
                .then(() => {
                    // เมื่อทุกคำขอเสร็จสมบูรณ์แล้ว ทำการแสดงผล gg และแปลงเป็น CSV
                    const gg = filteredData;
                    console.log(gg);
                    const csvContent = convertToCSV(gg);
                    const { date, time } = getFormattedDateTime();
                    const filename = `Auction_express-${date.replace('/', '_')}-${time}.csv`;
                    downloadCSV(csvContent, filename);
                    let total_img = 0;
                    total_img += gg.reduce((sum, product) => sum + (product['Imagepath']?.split('|').length || 0), 0);
                    const url = `http://10.1.136.121:8081/status/update?name_status=Auction_express&num_row=${gg.length}&status=success&message=finish&date=${date}&time=${time}&csv_name=${filename.replace(/\//g, '_').replace(/:/g, '_')}&total_img=${total_img}`;
                    window.location = url;
                })
                .catch(error => {
                    console.error('Error processing promises:', error);
                    const { date, time } = getFormattedDateTime();
                    updateStatus('error', 0, date, time, error);
                });
        } catch (error) {
            console.error('Error during the main process:', error);
            const { date, time } = getFormattedDateTime();
            updateStatus('error', 0, date, time, error);
        }
    } else {
        console.log('No valid auction data found.');
        const { date, time } = getFormattedDateTime();
        updateStatus('warn', 0, date, time, 'No Auction for today');
    }
})();
