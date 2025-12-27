import re
from typing import List, Dict

class EntityExtractor:
    def __init__(self):
        self.patterns = {
            "bedroom_count": r"(\d+)\s*(bedroom|br|bed)",
            "home_area_m2": r"(\d+)\s*(m2|sqm|square meter)",
            "date": r"(tomorrow|next\s+\w+|monday|tuesday|wednesday|thursday|friday|saturday|sunday)",
            "booking_ref": r"(BK-[A-Z0-9]{6})",
        }
    
    def extract(self, utterance: str, intent: str) -> List[Dict]:
        entities = []
        utterance_lower = utterance.lower()
        
        for entity_name, pattern in self.patterns.items():
            matches = re.finditer(pattern, utterance_lower, re.IGNORECASE)
            for match in matches:
                if entity_name == "bedroom_count":
                    value = int(match.group(1))
                    entities.append({
                        "name": entity_name,
                        "value": value,
                        "raw_value": match.group(0),
                        "confidence": 0.85,
                        "start": match.start(),
                        "end": match.end(),
                    })
                    # Infer home_area_m2
                    m2_map = {1: 50, 2: 80, 3: 110, 4: 140}
                    entities.append({
                        "name": "home_area_m2",
                        "value": m2_map.get(value, value * 40),
                        "raw_value": match.group(0),
                        "confidence": 0.75,
                        "estimated": True,
                    })
                elif entity_name == "home_area_m2":
                    entities.append({
                        "name": entity_name,
                        "value": int(match.group(1)),
                        "raw_value": match.group(0),
                        "confidence": 0.90,
                        "start": match.start(),
                        "end": match.end(),
                        "estimated": False,
                    })
                elif entity_name == "date":
                    entities.append({
                        "name": entity_name,
                        "value": match.group(0),
                        "raw_value": match.group(0),
                        "confidence": 0.80,
                        "start": match.start(),
                        "end": match.end(),
                    })
                elif entity_name == "booking_ref":
                    entities.append({
                        "name": entity_name,
                        "value": match.group(0).upper(),
                        "raw_value": match.group(0),
                        "confidence": 0.95,
                        "start": match.start(),
                        "end": match.end(),
                    })
        
        return entities