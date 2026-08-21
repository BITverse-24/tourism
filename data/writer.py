"""
Writer module for citywise incremental JSON output persistence and atomic checkpointing.
Saves data under data/output/attractions.json and state under data/checkpoint.json.
"""

import json
import os
from typing import Dict, List, Any, Set


class DatasetWriter:
    def __init__(self, output_dir: str = "data/output", checkpoint_file: str = "data/checkpoint.json"):
        if not os.path.isabs(output_dir):
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            output_dir = os.path.join(base_dir, output_dir)
        if not os.path.isabs(checkpoint_file):
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            checkpoint_file = os.path.join(base_dir, checkpoint_file)

        self.output_dir = output_dir
        self.checkpoint_file = checkpoint_file
        self.json_path = os.path.join(self.output_dir, "attractions.json")

        # Ensure output directory exists
        os.makedirs(self.output_dir, exist_ok=True)

    def load_existing_attractions(self) -> List[Dict[str, Any]]:
        """Load currently saved attractions from attractions.json if file exists."""
        if not os.path.exists(self.json_path):
            return []
        try:
            with open(self.json_path, mode="r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return []
                return json.loads(content)
        except Exception as e:
            print(f"[Writer] Warning reading {self.json_path}: {e}")
            return []

    def append_city_attractions(self, city_id: str, new_attractions: List[Dict[str, Any]]) -> int:
        """
        Append new attraction records for city_id into attractions.json.
        Deduplicates by attraction_id.
        Returns total record count in dataset after append.
        """
        existing = self.load_existing_attractions()

        # Build map keyed by attraction_id
        attraction_map: Dict[str, Dict[str, Any]] = {
            item["attraction_id"]: item for item in existing if "attraction_id" in item
        }

        # Add or update new records
        added_count = 0
        for item in new_attractions:
            att_id = item.get("attraction_id")
            if att_id and att_id not in attraction_map:
                added_count += 1
            attraction_map[att_id] = item

        updated_list = list(attraction_map.values())

        # Atomic write to JSON
        temp_path = self.json_path + ".tmp"
        with open(temp_path, mode="w", encoding="utf-8") as f:
            json.dump(updated_list, f, indent=2, ensure_ascii=False)

        os.replace(temp_path, self.json_path)
        print(f"[Writer] Appended {added_count} new attractions for city '{city_id}'. Total stored: {len(updated_list)}")

        return len(updated_list)

    def load_checkpoint(self) -> Dict[str, Any]:
        """Load checkpoint state from checkpoint.json."""
        if not os.path.exists(self.checkpoint_file):
            return {
                "completed_city_ids": [],
                "city_progress": {},
                "total_attractions": 0,
                "metrics": {}
            }
        try:
            with open(self.checkpoint_file, mode="r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[Writer] Warning reading checkpoint file: {e}")
            return {
                "completed_city_ids": [],
                "city_progress": {},
                "total_attractions": 0,
                "metrics": {}
            }

    def save_checkpoint(self, completed_city_ids: List[str], city_progress: Dict[str, Any], total_attractions: int, metrics: Dict[str, Any]):
        """Atomically update checkpoint.json."""
        checkpoint_data = {
            "completed_city_ids": list(set(completed_city_ids)),
            "city_progress": city_progress,
            "total_attractions": total_attractions,
            "metrics": metrics
        }
        temp_cp = self.checkpoint_file + ".tmp"
        with open(temp_cp, mode="w", encoding="utf-8") as f:
            json.dump(checkpoint_data, f, indent=2)
        os.replace(temp_cp, self.checkpoint_file)


if __name__ == "__main__":
    writer = DatasetWriter()
    sample = [{
        "attraction_id": "test_attraction_shimla_himachal_pradesh",
        "city_id": "shimla_himachal_pradesh",
        "name": "Test Attraction"
    }]
    count = writer.append_city_attractions("shimla_himachal_pradesh", sample)
    print("Test append complete. Total attractions:", count)
