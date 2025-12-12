# scripts/import-roboflow.py
import os
from roboflow import Roboflow
import json
import shutil

# Get API key from environment variable
API_KEY = os.getenv('ROBOFLOW_API_KEY') or input("Enter your Roboflow API key: ")

# Initialize Roboflow
rf = Roboflow(api_key=API_KEY)

# Access Noah's public project
print("Downloading Maya glyphs dataset...")
project = rf.workspace("maya-glyphs").project("yax-w4l6k")

# Download the dataset (format: coco, yolov8, voc, etc.)
# Using 'coco' format for JSON annotations
dataset = project.version(1).download("coco")

print(f"Dataset downloaded to: {dataset.location}")

# The dataset will have:
# - train/ folder with images
# - valid/ folder with images  
# - test/ folder with images (if available)
# - _annotations.coco.json in each folder

# Next step: Parse the annotations and import to your database
print("\nNext: Parse annotations and add to database as sign_instances")
