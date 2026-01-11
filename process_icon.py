from PIL import Image
import os
import shutil

# Paths
source_image_path = r"C:\Users\USER\.gemini\antigravity\brain\3f6cb48b-dd2f-4eed-b267-247eb513ced6\icon_teal_final_source_1768142467559.png"
static_dir = r"d:\集結網頁\static"
favicon_path = os.path.join(static_dir, "favicon.ico")
logo_path = os.path.join(static_dir, "logo.png")

def process_icon():
    try:
        if not os.path.exists(source_image_path):
            print(f"Error: Source image not found at {source_image_path}")
            return

        print("Opening source image...")
        img = Image.open(source_image_path)
        img = img.convert("RGBA")
        
        datas = img.getdata()
        new_data = []
        
        # Simple threshold for white background removal
        # Adjust threshold if needed (240-255 range is usually safe for pure white)
        threshold = 240
        for item in datas:
            if item[0] > threshold and item[1] > threshold and item[2] > threshold:
                new_data.append((255, 255, 255, 0))  # Transparent
            else:
                new_data.append(item)
        
        img.putdata(new_data)
        
        # Crop to content (optional, but good for icons)
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
            print("Image cropped to content.")
        
        # Save as logo.png (high res transparent)
        img.save(logo_path, "PNG")
        print(f"Saved transparent logo to {logo_path}")
        
        # Resize and save as favicon.ico
        # Standard favicon sizes
        icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
        img.save(favicon_path, sizes=icon_sizes)
        print(f"Saved favicon to {favicon_path}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    # Ensure static dir exists
    if not os.path.exists(static_dir):
        os.makedirs(static_dir)
    process_icon()
