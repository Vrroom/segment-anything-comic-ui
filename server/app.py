PATH_TO_SEGMENT_ANYTHING = '../../segment-anything'
import numpy as np
import os
import os.path as osp
import sys
sys.path.append(PATH_TO_SEGMENT_ANYTHING) 
from model import * 
from PIL import Image
from subprocess import call
from flask import Flask, jsonify, request, session, make_response, send_file
from io import BytesIO
import zipfile
from flask_session import Session
import pickle
import requests
import uuid
import json
from functools import partial
import random
import string

model = load_model(
    osp.join(PATH_TO_SEGMENT_ANYTHING, 'lightning_logs/version_27'),
    dict(sam_ckpt_path=osp.join(PATH_TO_SEGMENT_ANYTHING, './checkpoints/sam_vit_h_4b8939.pth'))
)

def random_string(k=10):
    return ''.join(random.choices(string.ascii_lowercase, k=k))

def rootdir():  
    return osp.abspath(osp.dirname(__file__))

# Setup application.
app = Flask(__name__, static_url_path='', static_folder='../client/build')
SESSION_TYPE = 'filesystem'
app.config.from_object(__name__)
Session(app)

def image_coord_to_point (image_coord, imageHeight, imageWidth) : 
    X, Y = image_coord

    if imageHeight > imageWidth:
        newHeight = 100
        newWidth = int(100 * (imageWidth / imageHeight))
        newY = 0
        newX = int((100 - newWidth) / 2)
    else:
        newWidth = 100
        newHeight = int(100 * (imageHeight / imageWidth))
        newX = 0
        newY = int((100 - newHeight) / 2)

    scale = max(imageHeight, imageWidth)
    x, y = X * 100 / scale, Y * 100 / scale

    return (x + newX, y + newY)

def point_to_image_coord (point, imageHeight, imageWidth) : 
    x, y = point

    if imageHeight > imageWidth:
        newHeight = 100
        newWidth = int(100 * (imageWidth / imageHeight))
        newY = 0
        newX = int((100 - newWidth) / 2)
    else:
        newWidth = 100
        newHeight = int(100 * (imageHeight / imageWidth))
        newX = 0
        newY = int((100 - newHeight) / 2)
    
    dx = max(0, x - newX)
    dy = max(0, y - newY)

    if imageHeight > imageWidth :
        dy = min(100, dy)
        dx = min(100 * imageWidth / imageHeight, dx)
        X = (dx / 100) * imageHeight
        Y = (dy / 100) * imageHeight
    else : 
        dx = min(100, dx)
        dy = min(100 * imageHeight / imageWidth, dy)
        X = (dx / 100) * imageWidth
        Y = (dy / 100) * imageWidth

    return (X, Y)

def cropImg (img, rect) : 
    x, y, width, height = rect['x'], rect['y'], rect['width'], rect['height'] 
    imgWidth, imgHeight = img.size
    l, t = point_to_image_coord((x, y), imgHeight, imgWidth)
    r, b = point_to_image_coord((x + width, y + height), imgHeight, imgWidth) 
    return img.crop((l, t, r, b))

# Important globals.
@app.route('/')
def root():  
    session['id'] = uuid.uuid4()
    with open(f'{app.static_folder}/index.html') as fp :
        content = fp.read()
    resp = make_response(content)
    return resp

@app.route('/inference', methods=['POST'])
def inference():
    if 'id' not in session:
        return jsonify(success=False, message="No session ID found"), 400
    
    id = session['id']

    if 'image' not in request.files:
        return jsonify(success=False, message="No image part in the request"), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify(success=False, message="No selected file"), 400

    if file:
        image = Image.open(file.stream).convert('RGB')
        width, height = image.size
        click = json.loads(request.form.get('click'))
        point = point_to_image_coord((click['x'], click['y']), height, width)
        pts = model.run_inference_simple_pil(image, [point])
        pts = np.array([image_coord_to_point(_, height, width) for _ in pts])
        x, y = np.min(pts[:, 0]), np.min(pts[:, 1])
        X, Y = np.max(pts[:, 0]), np.max(pts[:, 1])
        return jsonify(dict(x=x, y=y, width=X - x, height=Y - y))

    return jsonify(dict(success=False))

@app.route('/cropper', methods=['POST']) 
def cropper() : 
    if 'id' not in session:
        return jsonify(success=False, message="No session ID found"), 400
    
    id = session['id']

    if 'image' not in request.files:
        return jsonify(success=False, message="No image part in the request"), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify(success=False, message="No selected file"), 400

    if file:
        image = Image.open(file.stream)
        rects = json.loads(request.form.get('annot'))
        crops = [cropImg(image, _) for _ in rects]

        directory_path = f'/tmp/{random_string(10)}' 
        os.makedirs(directory_path, exist_ok=True) 
        image.save(osp.join(directory_path, file.filename))

        for i, crop in enumerate(crops) :
            crop.save(osp.join(directory_path, f'crop_{i}.png'))

        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for root, dirs, files in os.walk(directory_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    zip_file.write(file_path, arcname=os.path.relpath(file_path, start=directory_path))
        zip_buffer.seek(0)
        return send_file(zip_buffer, mimetype='application/zip', download_name='crops.zip', as_attachment=True)


    return jsonify(dict(success=False))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=7860)

