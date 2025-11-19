# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO
import numpy as np
from PIL import Image
import io
import base64
from typing import Optional
import requests
import time

# Per-driver drowsiness state
_drowsy_state = {}

BACKEND_URL = "http://localhost:5000" # <--- adjust as needed

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO("best.pt")

class ImageBase64(BaseModel):
    image: str
    driverId: Optional[str] = None

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": True}

@app.post("/predict")
async def predict(data: ImageBase64):
    print(f"ML DEBUG: Received /predict POST with data: {data}")
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(data.image)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Run inference
        results = model(image)
        now = time.time()
        
        # Handle different YOLO model types
        if len(results) > 0:
            result = results[0]
            
            # Check if it's a classification model
            if hasattr(result, 'probs') and result.probs is not None:
                # Classification model
                probs = result.probs.data.cpu().numpy()
                cls_idx = int(np.argmax(probs))
                conf = float(np.max(probs))
            elif hasattr(result, 'boxes') and result.boxes is not None and len(result.boxes) > 0:
                # Detection model - get the first detection
                boxes = result.boxes
                cls_idx = int(boxes.cls[0])
                conf = float(boxes.conf[0])
            else:
                # Fallback - assume classification with equal probabilities
                cls_idx = 0
                conf = 0.5
            
            label = str(cls_idx)  # "0" for drowsy, "1" for not drowsy
            print(f"Prediction: label={label}, confidence={conf:.3f}")
            
            # --- Drowsiness Alert State Machine ---
            driverId = data.driverId
            if driverId:
                state = _drowsy_state.get(driverId, {"drowsy": False, "last_time": None, "seconds": 0, "last_alert": None})
                prev_drowsy = state["drowsy"]
                prev_alert = state["last_alert"]
                last_time = state["last_time"]
                seconds = state["seconds"]
                is_drowsy = (label == "0")
                # Only update if confidence is high enough (e.g. >0.6)
                if is_drowsy and conf > 0.6:
                    if last_time is not None:
                        seconds += now - last_time
                    else:
                        seconds = 0
                    state["drowsy"] = True
                    state["last_time"] = now
                    state["seconds"] = seconds
                else:
                    state["drowsy"] = False
                    state["last_time"] = None
                    state["seconds"] = 0
                    # If previously drowsy, must send "clear" event
                    if prev_drowsy and prev_alert != "clear":
                        print(f"ML: Emitting CLEAR for driver {driverId}")
                        requests.post(f"{BACKEND_URL}/ml/alert", json={"driverId": driverId, "type": "clear"}, timeout=2)
                        state["last_alert"] = "clear"
                # Threshold triggers
                if state["drowsy"]:
                    if seconds >= 20 and prev_alert != "critical":
                        print(f"ML: Emitting CRITICAL for driver {driverId} after {seconds:.1f} sec")
                        requests.post(f"{BACKEND_URL}/ml/alert", json={"driverId": driverId, "type": "critical"}, timeout=2)
                        state["last_alert"] = "critical"
                    elif seconds >= 10 and prev_alert != "normal" and seconds < 20:
                        print(f"ML: Emitting NORMAL for driver {driverId} after {seconds:.1f} sec")
                        requests.post(f"{BACKEND_URL}/ml/alert", json={"driverId": driverId, "type": "normal"}, timeout=2)
                        state["last_alert"] = "normal"
                _drowsy_state[driverId] = state
            
            # --- Drowsiness detected, make POST log with prints ---
            if label == "0" and data.driverId:
                log_data = {
                    "driverId": data.driverId,
                    "eventType": "drowsy",
                    "confidence": conf
                }
                print(f"DEBUG: About to POST log to backend: {log_data}")
                try:
                    resp = requests.post(
                        "http://localhost:5000/api/driver/logs/add",
                        json=log_data,
                        timeout=2
                    )
                    print(f"DEBUG: Log POST response: {resp.status_code} {resp.text}")
                except Exception as log_err:
                    print(f"ERROR: Failed to post log to backend: {log_err}")
            
            return {"detections": [{"label": label, "confidence": conf}]}
        else:
            # No results
            return {"detections": [{"label": "1", "confidence": 0.0}]}
            
    except Exception as e:
        print(f"Error in prediction: {str(e)}")
        return {"detections": [{"label": "1", "confidence": 0.0}]}
