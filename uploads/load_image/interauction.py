import os
import pandas as pd
import requests
import sys
import re

# Directory configuration
downloads_dir = os.path.join(os.path.dirname(__file__), '../../public', 'downloads', 'Inter_auction')
output_dir = os.path.join(os.path.dirname(__file__), '../../public', 'downloads', 'Inter_auction')
log_dir = os.path.join(os.path.dirname(__file__), '../../logs', 'Inter_auction')
api_url = 'http://199.21.175.150:8081/load-image/update-status'  # เปลี่ยน URL ของ API ตามต้องการ

# Utility functions
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
            return 200  # Image already exists

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            'Referer': 'http://www.inter-auction.in.th/'
        }

        response = requests.get(url, stream=True, headers=headers)
        if response.status_code == 200:
            with open(dest, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            return 200  # Successful download
        elif response.status_code == 410:
            write_log(log_file_path, f"Image is permanently gone (410): {url}")
            return 410  # Resource permanently gone
        else:
            write_log(log_file_path, f"Failed to download {url}: Status code {response.status_code}")
            return 500  # Failed download
    except Exception as e:
        write_log(log_file_path, f"Error downloading {url}: {e}")
        return 500  # Error during download

def get_base_folder(file_name):
    # Extract base folder name, including the full date format (e.g., "-28_10_2024")
    match = re.match(r"(.*?-\d{1,2}_\d{1,2}_\d{4})", file_name)
    return match.group(1) if match else file_name

# Main processing function
def process_csv(file_path, id):
    file_name = os.path.basename(file_path).replace('.csv', '')
    base_folder_name = get_base_folder(file_name)  # Use get_base_folder to create folder name
    log_file_path = os.path.join(log_dir, f"{file_name}.log")

    # Create log directory if it doesn't exist
    create_dir(log_dir)
    write_log(log_file_path, f"Processing file: {file_name}.csv")

    base_dir = os.path.join(output_dir, base_folder_name)  # Use base_folder_name
    create_dir(base_dir)
    image_dir = os.path.join(base_dir, 'images')
    create_dir(image_dir)

    # Read the CSV file with UTF-8 encoding
    df = pd.read_csv(file_path, encoding='utf-8')

    updated_rows = []
    total_images = successful_images = 0
    iden = 1

    for _, row in df.iterrows():
        license_plate = str(row['registration']).strip()
        lane = str(row['Lane']).strip()

        # Combine licensePlate and lane to form the folder name
        reg_folder = f"{iden}-{license_plate}-{lane}".strip()
        iden += 1

        # Skip rows where either licensePlate or lane is empty or null
        if not license_plate or license_plate.lower() == 'nan':
            continue

        reg_image_dir = os.path.join(image_dir, reg_folder)
        create_dir(reg_image_dir)

        image_urls = str(row['subImg']).split(' | ') if pd.notna(row['subImg']) else []
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

                # Update the URL format
            if status_code == 200:
                new_url = f'downloads/Inter_auction/{base_folder_name}/images/{reg_folder}/'
                successful_images+=1


        # Store the updated row with the new subImg URLs
        row['subImg'] = new_url
        updated_rows.append(row)
        
    if stop:
        send_status_to_api(successful_images, log_file_path, status_code, id)
        return

    # Write updated rows back to CSV with UTF-8 encoding
    updated_df = pd.DataFrame(updated_rows)
    updated_df.to_csv(file_path, index=False, encoding='utf-8')

    # Move the CSV file to the new directory
    dest_csv_path = os.path.join(base_dir, os.path.basename(file_path))
    os.rename(file_path, dest_csv_path)

    # Write summary to log file
    write_log(log_file_path, f"Total images: {total_images}, Successfully downloaded: {successful_images}")
    
    # Send the status to the API
    send_status_to_api(successful_images, log_file_path,'success', id)

# Entry point
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
