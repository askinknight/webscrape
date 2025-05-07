(async () => {
    function convertToCSV(objArray) {
        const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
        let str = Object.keys(array[0]).join(",") + '\r\n';

        for (let i = 0; i < array.length; i++) {
            let line = '';
            for (let index in array[i]) {
                if (line !== '') line += ',';
                let value = `${array[i][index]}`.replace(/,/g, ' ');
                line += `"${value}"`;
            }
            str += line + '\r\n';
        }
        return '\uFEFF' + str;
    }

    function formatDateuse(date) {
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }

    function formatTime(date) {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    function downloadCSV(csv, filename) {
        const csvFile = new Blob(['\uFEFF' + csv], { type: "text/csv;charset=utf-8;" });
        const downloadLink = document.createElement("a");
        downloadLink.download = filename;
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
    }

    async function openAndCloseTab(url, delay = 2000) {
        return new Promise((resolve) => {
            const newTab = window.open(url, '_blank');
            setTimeout(() => {
                if (newTab) newTab.close();
                resolve();
            }, delay);
        });
    }

    const todayFormatted = (new Date()).toISOString().split('T')[0];
    try {
        const auctionResponse = await fetch('https://home.sia.co.th/assets/json/numCarEvent.json');
        const auctionData = await auctionResponse.json();
        const auctionsToday = auctionData.filter(auction => auction.AUCTION_DATE === todayFormatted);
        const products = [];

        for (const auction of auctionsToday) {
            const response = await fetch(`https://home.sia.co.th/get_product/${auction.AUCTION_NO}`);
            const auctionProducts = await response.json();
        
            if (typeof auctionProducts.data === 'object' && auctionProducts.data !== null) {
                // สร้าง Map จาก stageList เพื่อให้ง่ายต่อการค้นหา
                const stageMap = {};
                if (Array.isArray(auctionProducts.stageList)) {
                    auctionProducts.stageList.forEach(stage => {
                        stageMap[stage.stage_no] = stage; // เก็บทั้ง object ของ stage
                    });
                }
                
                // วนลูปใน auctionProducts.data
                for (const stage in auctionProducts.data) {
                    if (Array.isArray(auctionProducts.data[stage])) {
                        auctionProducts.data[stage].forEach(product => {
                            const { PICTURE_SERVER, view_360, view_360_in, view_360_out, youtubeLink, ...filteredProduct } = product;
                            filteredProduct.PRODUCT_GRADE = product.PRODUCT_GRADE ? product.PRODUCT_GRADE[0] : '-';
                            filteredProduct.last_update = auctionProducts.last_update;
                            filteredProduct.bank = '';
                            filteredProduct.link = `https://img3.sia.co.th/img/product/productbook/${product.PRODUCT_NO_CHASSIS}.pdf`;
                
                            // ดึงข้อมูล stage และเพิ่มเข้าไปใน filteredProduct
                            const stage_no = product.AUCTION_STAGE;
                            if (stageMap[stage_no]) {
                                Object.assign(filteredProduct, stageMap[stage_no]); // รวมค่าเข้า object หลัก
                            }
                
                            products.push(filteredProduct);
                        });
                    }
                }                
            }
        }
        
        

        const today = new Date();
        const todayDateuse = formatDateuse(today);
        const currentTime = formatTime(today);
        const errors = [];

        if (products.length > 0) {
            const filename = `SiamInter_auction-${todayDateuse}-${currentTime}.csv`;
            const csv = convertToCSV(products);
            downloadCSV(csv, filename);
            console.log(`File saved as ${filename}`);

            let total_img = 0;
            let total_pdf = products.length;
            total_img += products.reduce((sum, product) => sum + (product.NF_PRODUCT_PICTURE?.split('|').length || 0), 0);
            let finishUrl = `http://199.21.175.150:8081/status/update?name_status=SiamInter_auction&num_row=${products.length}&status=success&message=finish&date=${todayDateuse}&time=${currentTime}&csv_name=${filename.replace(/\//g, '_').replace(/:/g, '_')}&total_img=${total_img + total_pdf}`;
            await openAndCloseTab(finishUrl);
        } else {
            console.log('No auctions or products found for today.');
            let incompleateUrl = `http://199.21.175.150:8081/status/update?name_status=SiamInter_auction&num_row=${products.length}&status=warn&message=${encodeURI('No auctions or products found for today.')}&date=${todayDateuse}&time=${currentTime}`;
            await openAndCloseTab(incompleateUrl);
        }
    } catch (error) {
        console.error('Error:', error);
        errors.push(error.message);
        let errorUrl = `http://199.21.175.150:8081/status/update?name_status=SiamInter_auction&num_row=0&status=error&message=${encodeURIComponent(errors.join('; '))}&date=${todayDateuse}&time=${currentTime}`;
        await openAndCloseTab(errorUrl);
    }
})();