"""ARGUS AI Model Registry
Single source of truth for all integrated computer vision models,
their verified checkpoints, published benchmark metrics, datasets, and limitations.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class ModelBenchmarkMetrics(BaseModel):
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    map_50: Optional[float] = None
    map_50_95: Optional[float] = None
    per_class_ap: Optional[Dict[str, float]] = None
    iou: Optional[float] = None
    subpixel_accuracy: Optional[float] = None
    confusion_matrix: Optional[List[List[float]]] = None
    test_dataset_size: Optional[int] = None
    training_dataset_size: Optional[int] = None
    validation_split: Optional[str] = None
    test_split: Optional[str] = None
    evaluation_methodology: Optional[str] = None
    parameters_count: Optional[int] = None
    checkpoint_size_mb: Optional[float] = None
    published_inference_speed_ms: Optional[float] = None
    published_benchmark_source: Optional[str] = None
    published_paper_url: Optional[str] = None


class ModelRegistryEntry(BaseModel):
    model_id: str
    model_name: str
    category: str
    architecture: str
    checkpoint_filename: str
    checkpoint_hash: str
    model_version: str
    repository_url: str
    licence: str
    classes: Dict[int, str]
    class_display_names: Dict[int, str]
    input_resolution: List[int] = Field(default_factory=lambda: [640, 640])
    confidence_threshold: float = 0.25
    benchmark_metrics: ModelBenchmarkMetrics
    benchmark_dataset: str
    evaluation_split: str
    limitations: List[str]
    integration_status: str  # INTEGRATED, EXPERIMENTAL, UNAVAILABLE, DISABLED
    is_primary_for_category: bool = True


# Central Model Registry Catalog
MODEL_REGISTRY: Dict[str, ModelRegistryEntry] = {
    # ----------------------------------------------------
    # MODEL 1: WASTE - YOLO11n PyTorch Neural Engine
    # ----------------------------------------------------
    "waste_siyad23_yolo11n": ModelRegistryEntry(
        model_id="waste_siyad23_yolo11n",
        model_name="YOLO11n Real-Time Waste & Litter Classifier",
        category="garbage",
        architecture="YOLO11n PyTorch Neural Engine",
        checkpoint_filename="waste_siyad23_yolo11n.pt",
        checkpoint_hash="f64e94c7da5f655a82b60a368add374e6e9769c0b03b97c51bfa8c27942ee09c",
        model_version="1.0.0",
        repository_url="https://github.com/siyad23/waste-sorting-model",
        licence="AGPL-3.0",
        classes={
            0: "aluminumCan_awss",
            1: "aluminumFoil_awss",
            2: "apple_awss",
            3: "banana_awss",
            4: "battery_awss",
            5: "bolt_awss",
            6: "bottle_awss",
            7: "cigarette_awss",
            8: "egg_awss",
            9: "foodContainer_awss",
            10: "juiceBox_awss",
            11: "leaf_awss",
            12: "nut_awss",
            13: "orange_awss",
            14: "paperBag_awss",
            15: "paperCup_awss",
            16: "paper_awss",
            17: "plasticFoodPacket_awss",
            18: "plasticPacket_awss",
        },
        class_display_names={
            0: "Aluminum Can",
            1: "Aluminum Foil",
            2: "Apple / Organic Waste",
            3: "Banana / Organic Waste",
            4: "Battery (E-Waste)",
            5: "Bolt / Hardware",
            6: "Bottle",
            7: "Cigarette Butt",
            8: "Egg / Food Waste",
            9: "Food Container",
            10: "Juice Box / Carton",
            11: "Leaf / Yard Waste",
            12: "Nut / Fastener",
            13: "Orange / Organic Waste",
            14: "Paper Bag",
            15: "Paper Cup",
            16: "Paper Waste",
            17: "Plastic Food Packet",
            18: "Plastic Packet / Bag",
        },
        input_resolution=[640, 640],
        confidence_threshold=0.30,
        benchmark_metrics=ModelBenchmarkMetrics(
            precision=0.8548,
            recall=0.8499,
            f1_score=0.8523,
            map_50=0.9017,
            map_50_95=0.7043,
            test_dataset_size=5513,
            training_dataset_size=55134,
            validation_split="10% validation holdout",
            test_split="Independent holdout split",
            evaluation_methodology="Ultralytics YOLO evaluation harness across 19 fine-grained waste classes",
            parameters_count=2593545,
            checkpoint_size_mb=5.23,
            published_inference_speed_ms=3.5,
            published_benchmark_source="Ultralytics YOLO11n Neural Waste Benchmark",
            published_paper_url="https://github.com/siyad23/waste-sorting-model/blob/main/docs/training_analysis.md",
        ),
        benchmark_dataset="AWSS Snapshot (55,134 images, 106,044 bounding boxes)",
        evaluation_split="Held-out test split from documented dataset",
        limitations=[
            "Detects individual discarded items, wrappers, and containers; does not directly measure total cubic volume of illegal roadside dumping.",
            "May detect small loose litter (e.g. single bottle or paper cup) which does not alone constitute a municipal garbage blockage emergency.",
            "High confidence requires clear lighting and unoccluded object contours.",
        ],
        integration_status="INTEGRATED",
        is_primary_for_category=True,
    ),

    # ----------------------------------------------------
    # MODEL 2: POTHOLE PRIMARY - YOLOv8s PyTorch Convolutional Engine
    # ----------------------------------------------------
    "pothole_peterhdd_yolov8s": ModelRegistryEntry(
        model_id="pothole_peterhdd_yolov8s",
        model_name="YOLOv8s High-Precision Road Cavity Detector",
        category="pothole",
        architecture="YOLOv8s PyTorch Convolutional Engine",
        checkpoint_filename="pothole_peterhdd_yolov8s.pt",
        checkpoint_hash="af2ac6ce7bfec72e71643659ac946caf80ced84869e526a60135c457abfbb200",
        model_version="1.0.0",
        repository_url="https://github.com/PeterHdd/pothole-detection-yolo",
        licence="Apache 2.0",
        classes={
            0: "pothole",
        },
        class_display_names={
            0: "Pothole / Road Cavity",
        },
        input_resolution=[640, 640],
        confidence_threshold=0.25,
        benchmark_metrics=ModelBenchmarkMetrics(
            precision=None,  # Not published in upstream repo
            recall=None,     # Not published in upstream repo
            f1_score=None,   # Not published in upstream repo
            map_50=None,     # Not published in upstream repo
            map_50_95=None,  # Not published in upstream repo
            training_dataset_size=None,
            checkpoint_size_mb=21.48,
            published_inference_speed_ms=8.5,
            published_benchmark_source="Fine-Tuned YOLOv8s Pothole Detection Suite",
            published_paper_url="https://huggingface.co/peterhdd/pothole-detection-yolov8",
        ),
        benchmark_dataset="Independent Pothole Dataset (640x640, 100 Epochs)",
        evaluation_split="Not published by repository author",
        limitations=[
            "Fine-tuned specifically for roadway asphalt cavities; not trained to detect longitudinal or alligator cracks.",
            "May occasionally trigger false detections on wet tar patches, manhole covers, or dark asphalt shadows under harsh low sun angles.",
            "Precision/Recall metrics not independently published upstream; ARGUS tracks actual inference duration and confidence distributions.",
        ],
        integration_status="INTEGRATED",
        is_primary_for_category=True,
    ),

    # ----------------------------------------------------
    # MODEL 3: INDIAN ROAD DAMAGE ALTERNATIVE - YOLO11n ONNX
    # ----------------------------------------------------
    "indian_road_hazard_yolo11n": ModelRegistryEntry(
        model_id="indian_road_hazard_yolo11n",
        model_name="YOLO11n High-Diversity Road Surface Anomaly Engine",
        category="pothole",
        architecture="YOLO11n ONNX Runtime Engine",
        checkpoint_filename="indian_road_hazard_yolo11n.onnx",
        checkpoint_hash="a93a8e1735aaf6cd502d13be54684b6335eb8cca1eec270d053e43550531e1f9",
        model_version="1.0.0",
        repository_url="https://github.com/VivekVagale/road-hazard",
        licence="MIT",
        classes={
            0: "longitudinal crack",
            1: "transverse crack",
            2: "alligator crack",
            3: "pothole",
        },
        class_display_names={
            0: "Longitudinal Road Crack",
            1: "Transverse Road Crack",
            2: "Alligator / Mesh Road Crack",
            3: "Pothole Cavity",
        },
        input_resolution=[640, 640],
        confidence_threshold=0.25,
        benchmark_metrics=ModelBenchmarkMetrics(
            precision=None,
            recall=None,
            f1_score=None,
            map_50=0.386,
            map_50_95=0.164,
            per_class_ap={"pothole_ap_50": 0.429},
            test_dataset_size=775,
            training_dataset_size=7706,
            validation_split="RDD2022 India subset validation",
            test_split="775 held-out test images from RDD2022 India subset",
            evaluation_methodology="Evaluated on 775 held-out real Indian road images from RDD2022 (Arya et al., CC BY 4.0)",
            parameters_count=2600000,
            checkpoint_size_mb=10.12,
            published_inference_speed_ms=2.9,
            published_benchmark_source="RDD2022 Highway & Urban Damage Benchmark (ONNX Runtime)",
            published_paper_url="https://doi.org/10.6084/m9.figshare.21431547",
        ),
        benchmark_dataset="RDD2022 (Road Damage Dataset 2022) India Subset",
        evaluation_split="775 held-out test images",
        limitations=[
            "Trained specifically on Indian road conditions with varied asphalt surfacing, dirt shoulders, and monsoon wear.",
            "Moderate mAP@50 (38.6%) reflects challenging diverse road environments; serves as secondary contextual validator alongside primary YOLOv8s detector.",
            "Confidence scores must not be linearly averaged with primary YOLOv8s checkpoint.",
        ],
        integration_status="INTEGRATED",
        is_primary_for_category=False,
    ),

    # ----------------------------------------------------
    # MODEL 4: CONSTRUCTION SITE - RF-DETR Transformer Medium ONNX
    # ----------------------------------------------------
    "construction_hasnat_rf_detr": ModelRegistryEntry(
        model_id="construction_hasnat_rf_detr",
        model_name="RF-DETR Transformer Construction Site Safety Detector",
        category="construction",
        architecture="RF-DETR Medium ONNX Engine",
        checkpoint_filename="construction_hasnatz_rf_detr.onnx",
        checkpoint_hash="d4d5da43cf49735d961b985ecea0c2f13109b69d2b7e9d3c8914181fde1f6815",
        model_version="1.0.0",
        repository_url="https://github.com/HasnatHridoy/construction-safety-equipment-detection",
        licence="MIT",
        classes={
            0: "None",
            1: "Boots",
            2: "C-worker",
            3: "Cone",
            4: "Construction-hat",
            5: "Crane",
            6: "Excavator",
            7: "Gloves",
            8: "Goggles",
            9: "Ladder",
            10: "Mask",
            11: "Truck",
            12: "Vest",
        },
        class_display_names={
            0: "Background / None",
            1: "Safety Boots",
            2: "Construction Worker",
            3: "Traffic / Safety Cone",
            4: "Hard Hat / Helmet",
            5: "Construction Crane",
            6: "Excavator / Earthmover",
            7: "Safety Gloves",
            8: "Safety Goggles",
            9: "Ladder / Scaffolding Element",
            10: "Protective Mask",
            11: "Construction Truck",
            12: "High-Visibility Safety Vest",
        },
        input_resolution=[640, 640],
        confidence_threshold=0.25,
        benchmark_metrics=ModelBenchmarkMetrics(
            precision=None,  # Not independently published for single class
            recall=None,
            f1_score=None,
            map_50=None,
            map_50_95=0.720,
            training_dataset_size=7488,  # 78% of 9600
            test_dataset_size=192,       # 2% of 9600
            validation_split="20% validation split (1920 images)",
            test_split="2% test holdout split (192 images)",
            evaluation_methodology="RF-DETR Medium evaluated across 12 construction and PPE classes on cleaned dataset",
            parameters_count=29000000,
            checkpoint_size_mb=121.93,
            published_inference_speed_ms=18.0,
            published_benchmark_source="RF-DETR Real-Time Detection Transformer Benchmark",
            published_paper_url="https://huggingface.co/hasnatz/v-safe-rf-detr",
        ),
        benchmark_dataset="Cleaned Multi-source Construction Safety Dataset (9,600 images)",
        evaluation_split="78% Train / 20% Val / 2% Test split",
        limitations=[
            "Contextual Rule: A lone detected worker or truck is NOT sufficient evidence of an active construction hazard zone.",
            "Requires meaningful combinations (e.g. excavator + truck, crane + workers, heavy machinery + barriers/safety gear) to reach EVIDENCE_FOUND.",
            "Weak or isolated detections without construction machinery will be marked INCONCLUSIVE / NEEDS_REVIEW.",
        ],
        integration_status="INTEGRATED",
        is_primary_for_category=True,
    ),

    # ----------------------------------------------------
    # MODEL 5: CUT / DAMAGED ELECTRICAL WIRES - Multi-Task CNN
    # ----------------------------------------------------
    "powerline_benel_mtyolo": ModelRegistryEntry(
        model_id="powerline_benel_mtyolo",
        model_name="Multi-Task CNN Overhead Conductor Anomaly Detector",
        category="exposed_wire",
        architecture="PowerLine-MTYOLO Nano Multi-Task Architecture",
        checkpoint_filename="powerline_mtyolo_nano.pt",
        checkpoint_hash="4b67f43db483db11fffd7433c96b4d4eeec0478dc4b53a7dbbabd545d56e15e0",
        model_version="1.0.0",
        repository_url="https://github.com/phd-benel/PowerLine-MTYOLO",
        licence="AGPL-3.0",
        classes={
            0: "cable",
            1: "broken_strand",
        },
        class_display_names={
            0: "Power Line Cable Conductor",
            1: "Broken Cable Strand / Anomaly",
        },
        input_resolution=[640, 640],
        confidence_threshold=0.25,
        benchmark_metrics=ModelBenchmarkMetrics(
            precision=None,
            recall=0.877,
            f1_score=None,
            map_50=0.767,
            map_50_95=None,  # Not published upstream
            iou=0.767,
            subpixel_accuracy=0.932,
            training_dataset_size=1871,
            test_dataset_size=374,
            evaluation_methodology="Multitask cable segmentation & broken strand detection on MPCD (MDPI Drones 2024)",
            parameters_count=3100000,
            checkpoint_size_mb=5.90,
            published_inference_speed_ms=4.2,
            published_benchmark_source="MDPI Drones 2024: PowerLine-MTYOLO Multitask Architecture (Seed 0)",
            published_paper_url="https://github.com/phd-benel/PowerLine-MTYOLO",
        ),
        benchmark_dataset="Merged Public Power Cable Dataset (MPCD: 1,871 images, 2,501 masks, 1,906 broken cable annotations)",
        evaluation_split="Held-out MPCD split (In-dataset mAP50: 76.7%, Unseen UAV mAP50: 47.1%)",
        limitations=[
            "CRITICAL DOMAIN LIMITATION: Model was developed and trained exclusively for aerial UAV / overhead high-voltage transmission line inspection.",
            "Model is NOT calibrated or validated for ordinary street-level municipal photographs of low-hanging or dangling street cables.",
            "ARGUS DOMAIN GUARD: When an ordinary citizen submits a street-level photograph of dangling or fallen wires, ARGUS safely flags the result as NEEDS_REVIEW / INCONCLUSIVE to prevent false safety assurances.",
        ],
        integration_status="INTEGRATED",
        is_primary_for_category=True,
    ),
}


def get_model_entry(model_id: str) -> Optional[ModelRegistryEntry]:
    """Retrieve model registry entry by model ID."""
    return MODEL_REGISTRY.get(model_id)


def get_primary_model_for_category(category: str) -> Optional[ModelRegistryEntry]:
    """Retrieve the primary recommended model for a given ARGUS hazard category."""
    norm_category = category.lower().strip()
    if norm_category in ("debris", "general"):
        norm_category = "garbage"
    elif norm_category in ("cut_wire", "cut_wires", "wire", "wires"):
        norm_category = "exposed_wire"

    for entry in MODEL_REGISTRY.values():
        if entry.category == norm_category and entry.is_primary_for_category:
            return entry
    # Fallback to any model in that category
    for entry in MODEL_REGISTRY.values():
        if entry.category == norm_category:
            return entry
    return None


def get_all_models_for_category(category: str) -> List[ModelRegistryEntry]:
    """Retrieve all candidate models (primary and alternatives) for a given category."""
    norm_category = category.lower().strip()
    if norm_category in ("cut_wire", "cut_wires", "wire", "wires"):
        norm_category = "exposed_wire"
    return [m for m in MODEL_REGISTRY.values() if m.category == norm_category]


def get_full_registry_summary() -> List[Dict[str, Any]]:
    """Return JSON-serializable list of all registry entries for API consumption."""
    result = []
    for entry in MODEL_REGISTRY.values():
        d = entry.dict()
        d["license"] = entry.licence
        result.append(d)
    return result
