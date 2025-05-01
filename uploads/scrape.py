import os
import time
import sys
import requests  # เพิ่ม requests สำหรับ HTTP requests
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
from datetime import datetime, timedelta

# ตรวจสอบจำนวน arguments ที่ส่งเข้ามา
if len(sys.argv) < 4:
    print("Usage: python scrape.py <filename> <url> <filenamepath>")
    sys.exit(1)

# รับชื่อไฟล์และ URL จาก arguments
filename = sys.argv[1]
url = sys.argv[2]
filenamepath = sys.argv[3]

download_path = "/app/public/downloads/" + filenamepath

# Check if the folder exists, if not, create it
if not os.path.exists(download_path):
    os.makedirs(download_path)

# ตั้งค่าให้ใช้ headless mode
chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")

# Set download behavior to a specific directory
prefs = {
    "download.default_directory": download_path,
    "download.prompt_for_download": False,
    "download.directory_upgrade": True,
    "safebrowsing.enabled": True
}
chrome_options.add_experimental_option("prefs", prefs)

# ใช้ WebDriver Manager เพื่อจัดการ driver
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

# ฟังก์ชันสำหรับส่งสถานะ
def send_status_update(url, filenamepath, status, message):
    # Get the current time and add 7 hours
    todayNow = datetime.now()
    
    # Format the date and time
    formatted_date = todayNow.strftime("%d/%m/%Y")
    formatted_time = todayNow.strftime("%H:%M")
    
    # Prepare the payload
    payload = {
        'name_status': filenamepath,
        'num_row': 0,
        'status': status,
        'message': message,
        'date': formatted_date,
        'time': formatted_time
    }
    
    try:
        # Send the GET request with the payload
        requests.get(url, params=payload)
    except Exception as e:
        print(f"Error sending status: {e}")

# ส่งสถานะเริ่มต้น
start_url = "http://10.1.136.121:8081/status/insert"
send_status_update(start_url, filenamepath, "process", "start")

try:
    # Read the JavaScript code from the uploads directory
    uploads_dir = os.path.join("/app/uploads/scrape_code", filename)  # ใช้ path ที่สัมพันธ์กับ Docker
    with open(uploads_dir, 'r') as file:  # ใช้ path ที่ถูกต้อง
        scrape_code = file.read()

    # เข้าสู่เว็บไซต์
    driver.get(url)

    # รันโค้ด JavaScript ภายใน console ของ driver
    driver.execute_script(scrape_code)

    # ให้ Selenium รันจนเสร็จ
    time.sleep(3000)

except Exception as err:
    # ส่งสถานะเมื่อเกิดข้อผิดพลาด
    error_url = "http://10.1.136.121:8081/status/update"
    send_status_update(error_url, filenamepath, "error", str(err))

finally:
    # ปิด driver
    driver.quit()
    incomplateurl = "http://10.1.136.121:8081/status/update"
    send_status_update(incomplateurl, filenamepath, "warn", "Python run finished but not complete; driver quit")
