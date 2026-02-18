"""
AEGIS — Python AI Detection Microservice
FastAPI server for CCTV frame analysis, speed detection & incident classification
Port: 8000
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import asyncio
import json
import logging
import random
import time
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AEGIS-AI")

app = FastAPI(
    title="AEGIS AI Detection Service",
    description="Real-time accident detection, speed analysis and incident classification",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── DATA MODELS ──────────────────────────────────────────

class FrameAnalysisResult(BaseModel):
    camera_id: str
    timestamp: str
    vehicles_detected: int
    anomaly_score: float
    incident_detected: bool
    incident_type: Optional[str]
    confidence: float
    bounding_boxes: List[dict]
    avg_speed_estimate: float
    severity: Optional[str]
    alert_triggered: bool
    processing_time_ms: int

class SpeedDetectionResult(BaseModel):
    camera_id: str
    plate_number: str
    speed_kmh: float
    speed_limit: float
    violation: bool
    severity: str
    timestamp: str
    location: str
    confidence: float

class IncidentClassification(BaseModel):
    incident_id: str
    type: str
    severity: str
    estimated_casualties: int
    road_blockage: str
    recommended_response: List[str]
    confidence: float

# ─── MOCK AI ENGINE ──────────────────────────────────────
# In production, replace these with actual CV model calls
# (YOLOv8, OpenCV, DeepSORT, etc.)

def mock_yolo_detect(frame_data: bytes = None) -> dict:
    """Simulates YOLOv8 vehicle/collision detection."""
    num_vehicles = random.randint(1, 8)
    anomaly = random.uniform(0.1, 0.95)
    incident = anomaly > 0.75
    return {
        "vehicles": num_vehicles,
        "anomaly_score": round(anomaly, 3),
        "incident_detected": incident,
        "confidence": round(random.uniform(0.7, 0.99), 3),
        "incident_type": random.choice(["rear-end", "side-swipe", "head-on", "rollover"]) if incident else None,
        "bounding_boxes": [
            {"x": random.randint(50, 400), "y": random.randint(80, 300),
             "w": random.randint(40, 120), "h": random.randint(25, 70),
             "class": "vehicle", "conf": round(random.uniform(0.7, 0.98), 2)}
            for _ in range(num_vehicles)
        ],
    }

def classify_severity(anomaly_score: float, vehicles: int) -> str:
    if anomaly_score > 0.85 or vehicles >= 3:
        return "critical"
    elif anomaly_score > 0.6 or vehicles == 2:
        return "moderate"
    return "minor"

def estimate_speed(vehicle_box: dict) -> float:
    """Pixel displacement to speed estimate (mock)."""
    return round(random.uniform(40, 160), 1)

# ─── ENDPOINTS ───────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "AEGIS AI Detection",
        "timestamp": datetime.utcnow().isoformat(),
        "models": {
            "vehicle_detection": "YOLOv8 (mock)",
            "speed_estimation": "DeepSORT (mock)",
            "incident_classifier": "ResNet50 (mock)",
        }
    }

@app.post("/analyze/frame", response_model=FrameAnalysisResult)
async def analyze_frame(
    camera_id: str,
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(None),
):
    """
    Analyze a single CCTV frame for accidents and anomalies.
    In production: pass actual frame bytes to YOLO model.
    """
    start = time.time()
    frame_bytes = await file.read() if file else None
    
    detection = mock_yolo_detect(frame_bytes)
    severity = classify_severity(detection["anomaly_score"], detection["vehicles"])
    avg_speed = round(sum(estimate_speed(b) for b in detection["bounding_boxes"]) / 
                      max(len(detection["bounding_boxes"]), 1), 1)

    elapsed_ms = int((time.time() - start) * 1000)
    alert = detection["incident_detected"] and detection["confidence"] > 0.8

    result = FrameAnalysisResult(
        camera_id=camera_id,
        timestamp=datetime.utcnow().isoformat(),
        vehicles_detected=detection["vehicles"],
        anomaly_score=detection["anomaly_score"],
        incident_detected=detection["incident_detected"],
        incident_type=detection.get("incident_type"),
        confidence=detection["confidence"],
        bounding_boxes=detection["bounding_boxes"],
        avg_speed_estimate=avg_speed,
        severity=severity if detection["incident_detected"] else None,
        alert_triggered=alert,
        processing_time_ms=elapsed_ms,
    )

    if alert:
        logger.warning(f"🚨 INCIDENT DETECTED — Camera {camera_id} | Score: {detection['anomaly_score']}")
        background_tasks.add_task(notify_node_api, result.dict())

    return result

@app.post("/analyze/speed", response_model=SpeedDetectionResult)
async def analyze_speed(
    camera_id: str,
    location: str = "Unknown",
    speed_limit: float = 80.0,
):
    """Analyze speed from radar/camera data."""
    speed = round(random.uniform(40, 160), 1)
    violation = speed > speed_limit
    severity = "critical" if speed > speed_limit * 1.4 else "moderate" if speed > speed_limit * 1.15 else "minor"

    plates = ["TN09AB1234", "KA05CD5678", "MH12EF2345", "AP39IJ3456", "DL01KL7890"]
    return SpeedDetectionResult(
        camera_id=camera_id,
        plate_number=random.choice(plates),
        speed_kmh=speed,
        speed_limit=speed_limit,
        violation=violation,
        severity=severity if violation else "none",
        timestamp=datetime.utcnow().isoformat(),
        location=location,
        confidence=round(random.uniform(0.85, 0.99), 3),
    )

@app.post("/classify/incident", response_model=IncidentClassification)
async def classify_incident(incident_id: str, anomaly_score: float, vehicles: int):
    """Classify incident and recommend response."""
    severity = classify_severity(anomaly_score, vehicles)
    
    response_map = {
        "critical": ["Dispatch ambulance immediately", "Deploy traffic police", "Alert nearest hospital", "Block road via VMS"],
        "moderate": ["Send traffic police", "Ambulance on standby", "Activate alternate route signage"],
        "minor":    ["Traffic police notification", "Tow service dispatch"],
    }
    
    return IncidentClassification(
        incident_id=incident_id,
        type=random.choice(["rear-end", "side-swipe", "head-on", "rollover", "pedestrian"]),
        severity=severity,
        estimated_casualties=max(0, vehicles - 1) if severity == "critical" else 0,
        road_blockage="full" if severity == "critical" else "partial" if severity == "moderate" else "none",
        recommended_response=response_map[severity],
        confidence=round(random.uniform(0.78, 0.97), 3),
    )

@app.get("/cameras/status")
async def cameras_status():
    """Return simulated status for all cameras."""
    cameras = [
        {"id": f"CAM-{i:02d}", "status": "active",
         "fps": random.randint(25, 30),
         "vehicles_last_minute": random.randint(5, 25),
         "anomaly_score": round(random.uniform(0.05, 0.95), 2)}
        for i in range(1, 13)
    ]
    return {"cameras": cameras, "total_active": len(cameras)}

@app.get("/analytics/summary")
async def analytics_summary():
    """Return accident analytics summary."""
    return {
        "total_accidents_ytd": 148,
        "avg_survival_rate": 76.4,
        "fatalities_ytd": 22,
        "preventable_pct": 68,
        "peak_hours": ["08:00", "14:00", "20:00"],
        "hotspot_locations": [
            {"location": "NH-44 Junction A", "count": 18},
            {"location": "Ring Road West Km 12", "count": 12},
            {"location": "Highway Overpass", "count": 9},
        ],
        "monthly_trend": [18, 22, 14, 28, 19, 13],
        "type_distribution": {
            "rear-end": 34, "head-on": 18, "side-swipe": 22,
            "rollover": 12, "pedestrian": 8, "other": 6,
        }
    }

# ─── BACKGROUND TASK: NOTIFY NODE API ─────────────────────

async def notify_node_api(data: dict):
    """Push incident alert to Node.js API for authority dispatch."""
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post(
                "http://localhost:3000/api/alerts/auto",
                json=data, timeout=5.0,
            )
    except Exception as e:
        logger.error(f"Failed to notify Node API: {e}")

# ─── MAIN ─────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True,
                log_level="info", workers=2)
