#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <dirent.h>
#include <opencv2/opencv.hpp>
#include <string>

using namespace cv;
using namespace std;

// ฟังก์ชันตรวจสอบว่าเป็นเอกสารหรือไม่
bool is_document(const char *image_path) {
    Mat image = imread(image_path, IMREAD_COLOR);
    if (image.empty()) {
        return false; // ถ้าโหลดรูปไม่ได้ ให้ข้ามไปเลย
    }

    // 🔹 1. แปลงเป็นขาวดำ
    Mat gray;
    cvtColor(image, gray, COLOR_BGR2GRAY);

    // 🔹 2. เช็คเปอร์เซ็นต์ของสีขาวและดำ
    Mat binary;
    threshold(gray, binary, 200, 255, THRESH_BINARY);

    int white_pixels = countNonZero(binary);
    int total_pixels = binary.rows * binary.cols;
    double white_ratio = (double)white_pixels / total_pixels;
    double black_ratio = 1.0 - white_ratio;

    // 🔹 3. ตรวจสอบรูปร่างโดยใช้ Contour
    vector<vector<Point>> contours;
    findContours(binary, contours, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE);

    int rectangular_shapes = 0;
    for (const auto &cnt : contours) {
        vector<Point> approx;
        approxPolyDP(cnt, approx, 0.02 * arcLength(cnt, true), true);
        if (approx.size() == 4) {
            rectangular_shapes++;
        }
    }

    // ✅ เงื่อนไขเป็นเอกสาร
    return (white_ratio > 0.7 && black_ratio < 0.3 && rectangular_shapes > 0);
}

int main(int argc, char *argv[]) {
    if (argc != 2) {
        printf("❌ โปรดระบุพาธโฟลเดอร์เป็นพารามิเตอร์\n");
        return 1;
    }

    // รับพาธจาก arguments
    char folder_path[512];
    snprintf(folder_path, sizeof(folder_path), "%s", argv[1]);

    // เปลี่ยน backslash ให้เป็น forward slash (รองรับทั้ง Windows และ Linux)
    for (int i = 0; folder_path[i]; i++) {
        if (folder_path[i] == '\\') {
            folder_path[i] = '/';
        }
    }

    struct dirent *entry;
    DIR *dir = opendir(folder_path);

    if (!dir) {
        printf("❌ ไม่พบโฟลเดอร์: %s\n", folder_path);
        return 1;
    }
    
    int i = 0;
    
    // เริ่มต้น JSON string
    printf("[\n");

    bool first = true;
    
    while ((entry = readdir(dir)) != NULL) {
        if (entry->d_type == DT_REG) {  // อ่านเฉพาะไฟล์ (ไม่ใช่โฟลเดอร์)
            // ใช้ std::string แทน char array
            string file_path = string(folder_path) + "/" + entry->d_name;

            bool is_doc = is_document(file_path.c_str());

            // ตรวจสอบว่าเป็นไฟล์แรกหรือไม่
            if (!first) {
                printf(",\n");  // เพิ่มเครื่องหมาย comma ถ้าไม่ใช่ไฟล์แรก
            }
            first = false;

            // แสดงข้อมูลในรูปแบบ JSON
            printf("  {\n");
            printf("    \"filename\": \"%s\",\n", entry->d_name);
            printf("    \"doc\": \"%s\"\n", is_doc ? "true" : "false");
            printf("  }");
        }
    }

    printf("\n]\n");

    closedir(dir);
    return 0;
}
