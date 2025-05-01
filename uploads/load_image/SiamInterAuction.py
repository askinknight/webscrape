import os
import pandas as pd
import requests
import re
import sys

downloads_dir = os.path.join(os.path.dirname(__file__), '../../public', 'downloads', 'SiamInter_auction')
log_dir = os.path.join(os.path.dirname(__file__), '../../logs', 'SiamInter_auction')
output_dir = os.path.join(os.path.dirname(__file__), '../../public', 'downloads', 'SiamInter_auction')
api_url = 'http://199.21.175.150:8081/load-image/update-status'  # เปลี่ยน URL ของ API ตามต้องการ

def create_dir(dir_path):
    os.makedirs(dir_path, exist_ok=True)

def write_log(log_file_path, message):
    with open(log_file_path, 'a', encoding='utf-8') as log_file:
        log_file.write(message + '\n')
        
def send_status_to_api(successful_images, log_file_path, status_code, id):
    try:
        data = {
            'successful_images': successful_images,
            'log_file': log_file_path.split('logs', 1)[-1].lstrip(r'\/'),
            'status_code': str(status_code),  # ส่งเป็น string เพื่อความปลอดภัย
            'id': id
        }

        response = requests.post(api_url, json=data)

        if response.status_code >= 400:
            write_log(log_file_path, f"Error: Received status code {response.status_code} from API.")
            return False
        else:
            write_log(log_file_path, f"Successfully sent status to API: {response.status_code}")
            return True
    except requests.exceptions.RequestException as e:
        write_log(log_file_path, f"Error sending status to API: {e}")
        return False


def download_image(url, dest, log_file_path):
    try:
        if os.path.exists(dest):
            write_log(log_file_path, f"Skipping download; file already exists: {dest}")
            return 200  # Image already exists, HTTP Status OK

        response = requests.get(url, stream=True)
        if response.status_code == 200:
            with open(dest, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            return 200  # Successful download, HTTP Status OK
        else:
            write_log(log_file_path, f"Failed to download {url}: Status code {response.status_code}")
            return int(response.status_code)  # แปลงให้แน่ใจว่าเป็น int
    except Exception as e:
        write_log(log_file_path, f"Error downloading {url}: {e}")
        return 500  # กำหนดให้เป็น 500 (Internal Server Error) เมื่อเกิด Exception

def get_base_folder(file_name):
    match = re.match(r"(.*?-\d{1,2}_\d{1,2}_\d{4})", file_name)
    return match.group(1) if match else file_name

def process_csv(file_path, id):
    file_name = os.path.basename(file_path).replace('.csv', '')
    base_folder_name = get_base_folder(file_name)

    # Use the base_folder_name for the base directory
    base_dir = os.path.join(output_dir, base_folder_name)
    create_dir(base_dir)

    log_file_path = os.path.join(log_dir, f"{file_name}.log")
    create_dir(log_dir)

    write_log(log_file_path, f"Processing file: {file_name}.csv")

    image_dir = os.path.join(base_dir, 'image')
    create_dir(image_dir)
    pdf_dir = os.path.join(base_dir, 'pdf')
    create_dir(pdf_dir)

    # Read the CSV file with UTF-8 encoding
    df = pd.read_csv(file_path, encoding='utf-8')

    updated_rows = []
    total_images = total_pdfs = successful_images = successful_pdfs = 0
    iden = 1

    for _, row in df.iterrows():
        product_registration = str(row['PRODUCT_REGISTRATION']).strip() if pd.notnull(row['PRODUCT_REGISTRATION']) else ''
        product_province = str(row['PRODUCT_PROVINCE']).strip() if pd.notnull(row['PRODUCT_PROVINCE']) else ''
        combined_dir = f"{iden}-{product_registration}-{product_province}"
        iden += 1

        current_image_dir = os.path.join(image_dir, combined_dir)
        current_pdf_dir = os.path.join(pdf_dir, combined_dir)
        create_dir(current_image_dir)
        create_dir(current_pdf_dir)

        # Process images
        nf_product_pictures = row['NF_PRODUCT_PICTURE'].strip().split('|')
        updated_url = ''
        stop = False

        for image_name in nf_product_pictures:
            if image_name:
                image_url = f"https://img3.sia.co.th/img/product/{row['PRODUCT_NO_CHASSIS']}/{image_name.replace('.jpeg','.JPG')}"
                image_dest = os.path.join(current_image_dir, image_name.replace('.jpeg','.JPG'))
                
                total_images += 1
                
                status_code = download_image(image_url, image_dest, log_file_path)

            if status_code != 200 and not (400 <= status_code < 500):  # If not status 200 or 4xx
                # If downloading failed or API returns an error, stop further processing
                write_log(log_file_path, f"Stopping further processing due to error with {image_url}, status code: {status_code}")
                stop = True
                break  # Stop execution here
            if status_code == 200:
                successful_images += 1
                updated_url = f"downloads/SiamInter_auction/{base_folder_name}/image/{combined_dir}/"

        row['NF_PRODUCT_PICTURE'] = updated_url
        if stop:
            send_status_to_api(successful_images, log_file_path, status_code, id)
            return

        # Process PDFs
        pdf_link = row['link'].strip()
        if pdf_link:
            # ตรวจสอบว่า PDF Link มีรูปแบบที่สมบูรณ์ (มี scheme เช่น https://)
            if not pdf_link.startswith('http'):
                pdf_link = f'https://{pdf_link}'

            pdf_name = os.path.basename(pdf_link)
            pdf_dest = os.path.join(current_pdf_dir, pdf_name)

            total_pdfs += 1
            status_code = download_image(pdf_link, pdf_dest, log_file_path)

            if status_code != 200 and not (400 <= status_code < 500):  # If not status 200 or 4xx
                # If downloading failed or API returns an error, stop further processing
                write_log(log_file_path, f"Stopping further processing due to error with {pdf_name}, status code: {status_code}")
                stop = True
                break  # Stop execution here
            if status_code == 200:
                successful_pdfs += 1  
                row['link'] = f'downloads/SiamInter_auction/{base_folder_name}/pdf/{combined_dir}/'

        updated_rows.append(row)
        
    if stop:
        send_status_to_api(successful_images+successful_pdfs, log_file_path, status_code, id)
        return

    updated_df = pd.DataFrame(updated_rows)
    updated_df.to_csv(file_path, index=False, encoding='utf-8')

    dest_csv_path = os.path.join(base_dir, os.path.basename(file_path))
    os.rename(file_path, dest_csv_path)

    write_log(log_file_path, f"Total images: {total_images}, Successfully downloaded: {successful_images}")
    write_log(log_file_path, f"Total PDFs: {total_pdfs}, Successfully downloaded: {successful_pdfs}")
    send_status_to_api(successful_images+successful_pdfs, log_file_path, "success", id)

def main():
    file = sys.argv[1]
    id = sys.argv[2]  # รับ id จาก argument
    csv_file_path = os.path.join(downloads_dir, file)
    if os.path.exists(csv_file_path):
        process_csv(csv_file_path, id)  # ส่ง id ไปที่ process_csv
    else:
        print(f"File not found: {csv_file_path}")

if __name__ == "__main__":
    main()
