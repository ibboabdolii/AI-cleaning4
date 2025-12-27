import re
from typing import Dict, List

class IntentClassifier:
    def __init__(self):
        self.patterns = {
            "quote_home": [
                r"(price|cost|quote|how much).*clean",
                r"clean.*apartment|house|home",
                r"(cleaning|clean).*price",
            ],
            "booking_new": [
                r"book.*clean",
                r"schedule.*clean",
                r"(tomorrow|next week|monday).*clean",
            ],
            "booking_status": [
                r"where.*cleaner",
                r"status.*booking",
                r"when.*cleaner.*arrive",
            ],
            "faq_generic": [
                r"when.*open",
                r"business hours",
                r"what.*include",
                r"how.*work",
            ],
            "escalate_human": [
                r"(talk|speak).*human|person|agent",
                r"customer service",
                r"representative",
            ],
        }
    
    def classify(self, utterance: str) -> Dict:
        utterance_lower = utterance.lower()
        scores = {}
        
        for intent, patterns in self.patterns.items():
            score = 0.0
            for pattern in patterns:
                if re.search(pattern, utterance_lower):
                    score = max(score, 0.85)
                    break
            scores[intent] = score
        
        if max(scores.values()) == 0:
            scores["faq_generic"] = 0.5
        
        sorted_intents = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        return {
            "name": sorted_intents[0][0],
            "confidence": sorted_intents[0][1],
            "alternatives": [
                {"name": intent, "confidence": conf}
                for intent, conf in sorted_intents[1:3]
                if conf > 0
            ]
        }