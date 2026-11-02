# ARGUS Computer Vision — Third-Party Model & Software Notices

This project integrates and adapts the following open-source computer vision models, architectures, and datasets under their respective open-source licenses.

---

### 1. Pothole Detection Model (YOLOv8s)
- **Repository:** [PeterHdd/pothole-detection-yolo](https://github.com/PeterHdd/pothole-detection-yolo)
- **Author:** PeterHdd
- **License:** Apache License 2.0
- **Model Architecture:** YOLOv8s (Ultralytics)
- **Model Version:** 1.0.0
- **Pretrained Checkpoint Source:** [Hugging Face: peterhdd/pothole-detection-yolov8](https://huggingface.co/peterhdd/pothole-detection-yolov8/resolve/main/best.pt)
- **Verified SHA256:** `af2ac6ce7bfec72e71643659ac946caf80ced84869e526a60135c457abfbb200`
- **Notice:** Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at `http://www.apache.org/licenses/LICENSE-2.0`.

---

### 2. Automated Waste Sorting Model (YOLO11n)
- **Repository:** [siyad23/waste-sorting-model](https://github.com/siyad23/waste-sorting-model)
- **Author:** siyad23
- **License:** GNU Affero General Public License v3.0 (AGPL-3.0)
- **Model Architecture:** YOLO11n (Ultralytics)
- **Model Version:** 1.0.0 (Trained on 19 waste classes)
- **Pretrained Checkpoint Source:** `weights/best.pt` in siyad23/waste-sorting-model
- **Verified SHA256:** `f64e94c7da5f655a82b60a368add374e6e9769c0b03b97c51bfa8c27942ee09c`
- **Citation:**
  ```bibtex
  @software{siyad2025wastesorting,
    author = {siyad23},
    title = {Automated Waste Sorting Model},
    year = {2025},
    url = {https://github.com/siyad23/waste-sorting-model}
  }
  ```

---

### 3. V-Safe Construction & Safety Equipment Detection (RF-DETR Medium ONNX)
- **Repository:** [HasnatHridoy/construction-safety-equipment-detection](https://github.com/HasnatHridoy/construction-safety-equipment-detection)
- **Author:** Hasnat Hridoy
- **License:** MIT License
- **Model Architecture:** RF-DETR Medium (RT-DETR based, ONNX Runtime deployment)
- **Model Version:** 1.0.0 (12 safety and construction classes)
- **Pretrained Checkpoint Source:** [Hugging Face: hasnatz/v-safe-rf-detr](https://huggingface.co/hasnatz/v-safe-rf-detr/resolve/main/inference_model.onnx)
- **Verified SHA256:** `d4d5da43cf49735d961b985ecea0c2f13109b69d2b7e9d3c8914181fde1f6815`
- **Notice:** Copyright (c) 2024 Hasnat Hridoy. Licensed under the MIT License.

---

### 4. Indian Road Hazard Detection Model (YOLO11n ONNX)
- **Repository:** [VivekVagale/road-hazard](https://github.com/VivekVagale/road-hazard)
- **Author:** Vivek Vagale
- **License:** MIT License
- **Model Architecture:** YOLO11n ONNX (Longitudinal Crack, Transverse Crack, Alligator Crack, Pothole)
- **Model Version:** 1.0.0
- **Pretrained Checkpoint Source:** `gh-pages` branch `models/yolo11n.onnx`
- **Verified SHA256:** `a93a8e1735aaf6cd502d13be54684b6335eb8cca1eec270d053e43550531e1f9`
- **Dataset Attribution:** Evaluated on RDD2022 (Road Damage Dataset 2022) India subset (Arya et al., CC BY 4.0, DOI: 10.6084/m9.figshare.21431547).

---

### 5. PowerLine-MTYOLO Conductor Anomaly Model
- **Repository:** [phd-benel/PowerLine-MTYOLO](https://github.com/phd-benel/PowerLine-MTYOLO)
- **Authors:** Benel et al. (MDPI Drones 2024)
- **License:** GNU Affero General Public License v3.0 (AGPL-3.0)
- **Model Architecture:** PowerLine-MTYOLO Nano (Multitask A-YOLOM + YOLOv8)
- **Model Version:** 1.0.0 (150 Epochs Nano checkpoint)
- **Pretrained Checkpoint Source:** `PowerLine-MTYOLO-NANO-150Epochs.pt`
- **Verified SHA256:** `4b67f43db483db11fffd7433c96b4d4eeec0478dc4b53a7dbbabd545d56e15e0`
- **Citation:**
  ```text
  Benel et al., "PowerLine-MTYOLO: A Multitask YOLO Model for Simultaneous Cable
  Segmentation and Broken Strands Detection", MDPI Drones, 2024.
  ```
- **Domain Limitation Notice:** Developed exclusively for high-voltage transmission lines via overhead UAV aerial inspection. Not validated for municipal street-level cable photographs.

---

### 6. Research Inspection Candidates (Non-Integrated)
- **Litter Detection Research:** [Roshians/litter-detection](https://github.com/Roshians/litter-detection)
  - *Inspection Finding:* No open-source license provided upstream. Excluded from production integration.
- **CableGuard Research:** [Josee1031/CableGuard](https://github.com/Josee1031/CableGuard)
  - *Inspection Finding:* No open-source license provided upstream. Excluded from production integration.
