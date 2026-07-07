from PIL import Image
try:
    img = Image.open('/Users/linhvu/.gemini/antigravity-ide/brain/ae94079b-eead-481e-b366-1fe809de3f0b/media__1783259634336.png')
    print(f"Size: {img.size}")
    print(f"Mode: {img.mode}")
    print("Image opened successfully!")
except Exception as e:
    print("Error:", e)
