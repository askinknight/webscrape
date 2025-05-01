import os
import json
import pandas as pd
import requests
import sys
import re

downloads_dir = os.path.join(os.path.dirname(__file__), '../../public', 'downloads', 'Motto_Auction')
output_dir = os.path.join(os.path.dirname(__file__), '../../public', 'downloads', 'Motto_Auction')
log_dir = os.path.join(os.path.dirname(__file__), '../../logs', 'Motto_Auction')
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
    # Extract base folder name, including the full date format (e.g., "-28_10_2024")
    match = re.match(r"(.*?-\d{1,2}_\d{1,2}_\d{4})", file_name)
    return match.group(1) if match else file_name

def process_csv(file_path, id):
    file_name = os.path.basename(file_path).replace('.csv', '')
    base_folder_name = get_base_folder(file_name)

    # Determine base folder path
    base_dir = os.path.join(output_dir, base_folder_name)
    create_dir(base_dir)
    log_file_path = os.path.join(log_dir, f"{file_name}.log")

    # Ensure log directory exists
    os.makedirs(log_dir, exist_ok=True)

    write_log(log_file_path, f"Processing file: {file_name}.csv")

    image_dir = os.path.join(base_dir, 'images')
    create_dir(image_dir)

    # Read the CSV file with UTF-8 encoding
    df = pd.read_csv(file_path, encoding='utf-8')

    updated_rows = []
    total_images = successful_images = 0
    iden = 1

    for _, row in df.iterrows():
        registration_province = str(row['rego']).strip()

        # Combine licensePlate and registrationProvince to form the folder name
        reg_folder = f"{iden}-{registration_province}".strip()
        iden += 1

        # Skip rows where either licensePlate or registrationProvince is empty or null
        if not registration_province or registration_province.lower() == 'nan':
            continue

        reg_image_dir = os.path.join(image_dir, reg_folder)
        create_dir(reg_image_dir)

        image_urls = str(row['imageUrl']).split(' | ') if pd.notna(row['imageUrl']) else []
        new_url = ''
        stop = False

        for url in image_urls:
            if not url.strip():
                continue  # Skip empty URLs

            image_name = os.path.basename(url.split('?')[0])
            dest_path = os.path.join(reg_image_dir, image_name)

            total_images += 1
            status_code = download_image(url, dest_path, log_file_path)
            
            if status_code != 200 and not (400 <= status_code < 500):  # If not status 200 or 4xx
                # If downloading failed or API returns an error, stop further processing
                write_log(log_file_path, f"Stopping further processing due to error with {url}, status code: {status_code}")
                stop = True
                break  # Stop execution here
            
            if status_code == 200:
                successful_images += 1
                new_url = os.path.join('downloads', 'Motto_Auction', base_folder_name, 'images', reg_folder).replace('\\', '/')


        # Store the updated row with the new Image URLs
        row['imageUrl'] = new_url
        updated_rows.append(row)
    
    if stop:
        send_status_to_api(successful_images, log_file_path, status_code, id)
        return

    # Write updated rows to a NEW CSV file with UTF-8 encoding
    updated_csv_path = os.path.join(base_dir, f"{file_name}.csv")
    updated_df = pd.DataFrame(updated_rows)
    updated_df.to_csv(updated_csv_path, index=False, encoding='utf-8')

    # Remove the original CSV file
    os.remove(file_path)
    write_log(log_file_path, f"Original CSV file deleted: {file_path}")

    # Write summary to log file
    write_log(log_file_path, f"Total images: {total_images}, Successfully downloaded: {successful_images}")
    write_log(log_file_path, f"Updated CSV saved at: {updated_csv_path}")

    # Send the status to the API
    send_status_to_api(successful_images, log_file_path,'success', id)


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

