# Drowsiguard DDS: Drowsiness Detection System


## Table of Contents

- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Backend](#running-the-backend)
  - [Running the Frontend](#running-the-frontend)
- [Usage](#usage)
- [Team](#team)
- [Acknowledgments](#acknowledgments)

---

## About the Project

Drowsiguard DDS is a real-time drowsiness detection system designed to prevent accidents caused by driver fatigue. It uses computer vision to monitor the driver’s eyes and triggers alerts when signs of drowsiness are detected.

The primary goal of this project is to enhance road safety by reducing fatigue-related accidents in public transport and commercial vehicles.

---

## Key Features

* Real-time Eye Tracking: Monitors driver’s eyes using camera input.
* Drowsiness Detection: Detects signs of drowsiness based on blinking patterns and eye closure.
* Alerts: Notifies when drowsiness is detected.
* Mobile Interface: Displays real-time alerts and detection confidence.

---

## Technologies Used

* Programming Languages: Python, JavaScript (React Native)
* Libraries & Frameworks: OpenCV, YOLOv8, Expo, React Native, FastAPI, Uvicorn
* Database: MongoDB (stores driver logs and detections)
* Hardware: Camera (webcam or mobile device camera)

---

## Getting Started

Follow these steps to set up the project locally.

### Prerequisites

* Python 3.8+
* Node.js and npm
* MongoDB (local or Atlas)
* Expo CLI (`npm install -g expo-cli`)

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/Chitra-2024/drowsiguard_dds.git
   ```
2. Navigate to the project directory:

   ```
   cd drowsiguard_dds
   ```
3. Install backend dependencies:

   ```
   pip install -r requirements.txt
   ```
4. Install frontend dependencies:

   ```
   cd frontend
   npm install
   ```

### Running the Backend

1. Start MongoDB:

   * For local MongoDB:

     ```
     mongod
     ```
   * Or use a cloud MongoDB by setting the `MONGO_URI` in `config.py`.

2. Run the FastAPI server with Uvicorn:

   ```
   uvicorn main:app --reload
   ```

   The ML API will run at `http://localhost:8000`.

3. Ensure the YOLO model is available in the `models/` folder or update the path in `main.py`.

### Running the Frontend

1. Start the Expo app:

   ```
   cd frontend
   npx expo start
   ```
2. Open the app on a mobile device using Expo Go, or run in an emulator.

---

## Usage

1. Open the mobile app and grant camera permissions.
2. Position your face in front of the camera.
3. The system will continuously monitor your eyes.
4. An alert will trigger if drowsiness is detected (for example, eyes closed for 5+ seconds).

---

## Acknowledgments

* YOLOv8 object detection models
* FastAPI for the ML backend API
* Expo and React Native for mobile frontend development
* OpenCV for computer vision functionalities
