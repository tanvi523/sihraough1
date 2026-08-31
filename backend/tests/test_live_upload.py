import urllib.request
import urllib.error
import json
import os
import mimetypes

BASE_URL = "http://localhost:8000/api"
datasets_dir = os.path.join(os.path.dirname(__file__), "../datasets")

def post_multipart(url, files_dict):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = bytearray()
    
    for field_name, file_path in files_dict.items():
        filename = os.path.basename(file_path)
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode("utf-8"))
        body.extend(b"Content-Type: text/csv\r\n\r\n")
        with open(file_path, "rb") as f:
            body.extend(f.read())
        body.extend(b"\r\n")
        
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    
    req = urllib.request.Request(url, data=bytes(body))
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return 0, str(e)

def run_tests():
    tms_path = os.path.join(datasets_dir, "tms_dataset.csv")
    smms_path = os.path.join(datasets_dir, "smms_dataset.csv")
    tdms_path = os.path.join(datasets_dir, "tdms_dataset.csv")
    norm_path = os.path.join(datasets_dir, "normalized_maintenance_dataset.csv")

    print("[1] Testing /upload/tms...")
    code, res = post_multipart(f"{BASE_URL}/upload/tms", {"file": tms_path})
    print(f"Status: {code} | Response: {res[:150]}")

    print("\n[2] Testing /upload/smms...")
    code, res = post_multipart(f"{BASE_URL}/upload/smms", {"file": smms_path})
    print(f"Status: {code} | Response: {res[:150]}")

    print("\n[3] Testing /upload/tdms...")
    code, res = post_multipart(f"{BASE_URL}/upload/tdms", {"file": tdms_path})
    print(f"Status: {code} | Response: {res[:150]}")

    print("\n[4] Testing /upload/batch (all 3 files)...")
    code, res = post_multipart(f"{BASE_URL}/upload/batch", {
        "tms_file": tms_path,
        "smms_file": smms_path,
        "tdms_file": tdms_path
    })
    print(f"Status: {code} | Response: {res[:150]}")

    print("\n[5] Testing /upload/batch (only SMMS and TDMS, tms omitted)...")
    code, res = post_multipart(f"{BASE_URL}/upload/batch", {
        "smms_file": smms_path,
        "tdms_file": tdms_path
    })
    print(f"Status: {code} | Response: {res[:150]}")

    print("\n[6] Testing /upload/auto with normalized dataset...")
    code, res = post_multipart(f"{BASE_URL}/upload/auto", {"file": norm_path})
    print(f"Status: {code} | Response: {res[:150]}")

    print("\n[7] Testing /upload/merged...")
    code, res = post_multipart(f"{BASE_URL}/upload/merged", {"file": norm_path})
    print(f"Status: {code} | Response: {res[:150]}")

if __name__ == "__main__":
    run_tests()
