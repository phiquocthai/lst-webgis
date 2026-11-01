import psycopg2
import os

conn = psycopg2.connect(
    dbname=os.environ.get('DB_NAME', 'lst-hcm'),
    user=os.environ.get('DB_USER', 'postgres'),
    password=os.environ.get('DB_PASSWORD', '123'),
    host=os.environ.get('DB_HOST', 'localhost'),
    port=os.environ.get('DB_PORT', 5432)
)
cur = conn.cursor()

# Xoá hoặc ẩn danh hoá toàn bộ thông tin cá nhân trong bảng nguoi_dung
cur.execute("UPDATE nguoi_dung SET email='admin@webgis.local' WHERE ten_dang_nhap='admin123'")
cur.execute("UPDATE nguoi_dung SET ten_dang_nhap='viewer', email='viewer@webgis.local' WHERE ten_dang_nhap='khoi'")
conn.commit()

cur.execute("SELECT ma_nguoi_dung, ten_dang_nhap, email, vai_tro FROM nguoi_dung")
rows = cur.fetchall()
print("Users after cleaning:")
for r in rows:
    print(r)

cur.close()
conn.close()
