import random
import mysql.connector
from datetime import datetime, timedelta

# Database connection
conn = mysql.connector.connect(
    host="db",
    user="root",
    password="rootpassword",
    database="scrape_configs",
)
cursor = conn.cursor()

# Define data sources
companies = [
    "Apple_Auction", "Auction_express", "Buy_at_Siam", "Inter_auction",
    "Motto_Auction", "Premium_Inter_auction", "Sahakrane_Auction", "SiamInter_auction"
]
brands_models = {
    "Toyota": ["Camry", "Corolla", "Hilux"],
    "Honda": ["Civic", "Accord", "CR-V"],
    "Nissan": ["Almera", "Navara", "X-Trail"],
    "Mazda": ["Mazda2", "Mazda3", "CX-5"],
    "Ford": ["Ranger", "Everest", "Mustang"]
}
banks = {
    "Bangkok Bank": "BBL",
    "Kasikorn Bank": "KBANK",
    "Siam Commercial Bank": "SCB",
    "Krungthai Bank": "KTB",
    "TMBThanachart Bank": "TTB"
}

insert_query = """
    INSERT INTO dashboard (
        Company, Auction_date, Auction_name, Auction_location, Auction_lane, Order_No,
        Remark1, Remark2, Reserve_price, Start_price, Category, Reg_No, Reg_Province,
        Brand, Model, Engine_displacement, Gear, Fuel, Color, Car_man_year, Car_reg_year,
        Mile, Engine_No, Chassis_No, Grade_overall, Grade_frame, Grade_Internal,
        Seller_name, Seller_code, Sourcing_type, Car_tax_expired_date, Car_title_group,
        imageUrl, csv, created_at
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
    )
"""

data = []
start_date = datetime(2024, 1, 1)
end_date = datetime(2024, 12, 31)

for _ in range(1000000):
    company = random.choice(companies)
    auction_date = start_date + timedelta(days=random.randint(0, (end_date - start_date).days))
    auction_name = f"{company}_Auction"
    auction_location = f"Location_{random.randint(1, 100)}"
    auction_lane = f"Lane_{random.randint(1, 10)}"
    order_no = random.randint(1, 5000)
    remark1 = remark2 = "Random remark"
    reserve_price = round(random.uniform(100000, 500000), 2)
    start_price = round(reserve_price * 0.9, 2)
    category = "Car"
    reg_no = f"{random.randint(1000, 9999)}-{random.choice('ABCDEFG')}{random.randint(10,99)}"
    reg_province = f"Province_{random.randint(1, 77)}"
    brand = random.choice(list(brands_models.keys()))
    model = random.choice(brands_models[brand])
    engine_displacement = random.randint(1000, 5000)
    gear = random.choice(["Manual", "Automatic"])
    fuel = random.choice(["Petrol", "Diesel", "Hybrid", "Electric"])
    color = random.choice(["Red", "Blue", "Black", "White", "Silver", "Green"])
    car_man_year = random.randint(2000, 2023)
    car_reg_year = car_man_year + random.randint(0, 3)
    mile = random.randint(1000, 200000)
    engine_no = f"ENG{random.randint(10000, 99999)}"
    chassis_no = f"CHS{random.randint(10000, 99999)}"
    grade_overall = grade_frame = geade_internal = random.choice(["A", "B", "C", "D"])
    seller_name, seller_code = random.choice(list(banks.items()))
    sourcing_typ = random.choice(["Lease", "Trade-in", "Bank Repo"])
    car_tax_expired_date = auction_date + timedelta(days=random.randint(30, 365))
    car_title_group = "Clean"
    image_url = "https://example.com/image.jpg"
    csv = "https://example.com/data.csv"
    created_at = datetime.now()
    
    data.append((
        company, auction_date.strftime("%Y-%m-%d"), auction_name, auction_location, auction_lane, order_no,
        remark1, remark2, reserve_price, start_price, category, reg_no, reg_province,
        brand, model, engine_displacement, gear, fuel, color, car_man_year, car_reg_year,
        mile, engine_no, chassis_no, grade_overall, grade_frame, geade_internal,
        seller_name, seller_code, sourcing_typ, car_tax_expired_date.strftime("%Y-%m-%d"), car_title_group,
        image_url, csv, created_at.strftime("%Y-%m-%d %H:%M:%S")
    ))

# Insert data with transaction
try:
    batch_size = 1000  # แบ่งเป็นชุดละ 1,000 แถว
    for i in range(0, len(data), batch_size):
        batch = data[i:i+batch_size]
        cursor.executemany(insert_query, batch)
        conn.commit()  # Commit ทุกชุด
    print("Successfully inserted 10,000 rows into dashboard.")
except Exception as e:
    conn.rollback()
    print("Error occurred:", str(e))
finally:
    cursor.close()
    conn.close()
