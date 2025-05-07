import os
import pandas as pd
import requests
import sys
import re

downloads_dir = os.path.join(os.path.dirname(__file__), '../../public', 'downloads', 'Buy_at_Siam')
output_dir = os.path.join(os.path.dirname(__file__), '../../public', 'downloads', 'Buy_at_Siam')
log_dir = os.path.join(os.path.dirname(__file__), '../../logs', 'Buy_at_Siam')
api_url = 'http://10.1.136.121:8081/load-image/update-status'  # เปลี่ยน URL ของ API ตามต้องการ

def create_dir(dir_path):
    os.makedirs(dir_path, exist_ok=True)

def write_log(log_file_path, message):
    with open(log_file_path, 'a', encoding='utf-8') as log_file:
        log_file.write(message + '\n')

def format_license_plate(license_plate):
    match = re.match(r'(.+?)\s*\((.+?)\)', license_plate.replace('\n', ' ').strip())
    if match:
        plate, province = match.groups()
        return f"{plate}({province})"
    return license_plate.strip()

def get_base_folder(file_name):
    match = re.match(r"(.*?-\d{1,2}_\d{1,2}_\d{4})", file_name)
    return match.group(1) if match else file_name

def send_status_to_api(successful_images, log_file_path, status, id):
    try:
        data = {
            'successful_images': successful_images,
            'log_file': log_file_path.split('logs', 1)[-1].lstrip(r'\/'),
            'status_code': status,  # ส่งค่า 'success' หรือ 'error'
            'id': id
        }

        response = requests.post(api_url, json=data)

        if response.status_code >= 400:
            write_log(log_file_path, f"Error: Received status code {response.status_code} from API.")
            return 'error'
        else:
            write_log(log_file_path, f"Successfully sent status to API: {response.status_code}")
            return 'success'
    except requests.exceptions.RequestException as e:
        write_log(log_file_path, f"Error sending status to API: {e}")
        return 'error'

def download_image(url, dest, log_file_path):
    try:
        if os.path.exists(dest):
            write_log(log_file_path, f"Skipping download; file already exists: {dest}")
            return 200

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            'Referer': 'http://www.inter-auction.in.th/'
        }

        response = requests.get(url, stream=True, headers=headers)
        if response.status_code == 200:
            with open(dest, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            return 200
        elif response.status_code == 410:
            write_log(log_file_path, f"Resource is permanently gone (410): {url}")
            return 410
        else:
            write_log(log_file_path, f"Failed to download {url}: Status code {response.status_code}")
            return response.status_code
    except Exception as e:
        write_log(log_file_path, f"Error downloading {url}: {e}")
        return 500

def process_csv(file_path, id):
    file_name = os.path.basename(file_path).replace('.csv', '')
    base_folder = get_base_folder(file_name)
    log_file_path = os.path.join(log_dir, f"{file_name}.log")

    create_dir(log_dir)
    write_log(log_file_path, f"Processing file: {file_name}.csv")

    base_dir = os.path.join(output_dir, base_folder)
    create_dir(base_dir)
    image_dir = os.path.join(base_dir, 'images')
    create_dir(image_dir)

    df = pd.read_csv(file_path, encoding='utf-8')
    updated_rows = []
    total_images = successful_images = 0
    iden = 1
    stop = False

    for _, row in df.iterrows():
        license_plate = format_license_plate(str(row['เลขทะเบียน']).strip())
        row['เลขทะเบียน'] = license_plate
        row['เลขไมล์'] = format_license_plate(str(row['เลขไมล์']).strip())

        reg_folder = f"{iden}-{license_plate}"
        iden += 1
        if not license_plate or license_plate.lower() == 'nan':
            continue

        reg_image_dir = os.path.join(image_dir, reg_folder)
        create_dir(reg_image_dir)

        image_urls = str(row['รย.']).split(' | ') if pd.notna(row['รย.']) else []
        new_url = ''

        for url in image_urls:
            if not url.strip():
                continue

            image_name = os.path.basename(url.split('?')[0])
            dest_path = os.path.join(reg_image_dir, image_name)

            total_images += 1
            status_code = download_image(url, dest_path, log_file_path)

            if status_code == 200:
                successful_images += 1
                new_url = f'downloads/Buy_at_Siam/{base_folder}/images/{reg_folder}/'
            elif status_code == 410:
                write_log(log_file_path, f"Skipping permanently deleted resource: {url}")
                continue
            else:
                write_log(log_file_path, f"Stopping process due to error on {url}")
                stop = True
                break

        row['รย.'] = new_url
        updated_rows.append(row)

        if stop:
            break  # หยุดโหลดทั้งหมดทันทีหากมีปัญหา

    if stop:
        send_status_to_api(successful_images, log_file_path, 'error', id)
        return

    updated_df = pd.DataFrame(updated_rows)
    updated_df.to_csv(file_path, index=False, encoding='utf-8-sig')

    dest_csv_path = os.path.join(base_dir, os.path.basename(file_path))
    os.rename(file_path, dest_csv_path)

    write_log(log_file_path, f"Total images: {total_images}, Successfully downloaded: {successful_images}")

    send_status_to_api(successful_images, log_file_path, 'success', id)

def main():
    file = sys.argv[1]
    id = sys.argv[2]
    csv_file_path = os.path.join(downloads_dir, file)
    if os.path.exists(csv_file_path):
        process_csv(csv_file_path, id)
    else:
        print(f"File not found: {csv_file_path}")

if __name__ == "__main__":
    main()
