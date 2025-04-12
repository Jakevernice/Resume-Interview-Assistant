# llm_service.py
from transformers import pipeline
import torch

class HuggingFaceService:
    def __init__(self):
        self.model_name = "facebook/bart-large-cnn"
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        self.generator = pipeline(
            "text-generation",
            model=self.model_name,
            device=self.device
        )

    def generate_response(self, prompt: str) -> str:
        try:
            response = self.generator(
                prompt,
                max_length=200,  # Shorter length for concise responses
                min_length=50,
                do_sample=True,
                temperature=0.7
            )[0]['generated_text']

            return self.format_response(response)

        except Exception as e:
            print(f"Error: {str(e)}")
            return self.get_fallback_response()

    def format_response(self, text: str) -> str:
        return f"""
Key Technical Topics:
- Data structures and algorithms
- Web development fundamentals
- Database concepts

Sample Questions:
1. "Explain your experience with {text.split()[0]}"
2. "How would you optimize a slow application?"
3. "Describe a challenging technical problem you solved"

Preparation Tips:
1. Review core concepts
2. Practice coding problems
3. Research company products
"""

    def get_fallback_response(self) -> str:
        return """
Key Topics:
- Programming fundamentals
- System design basics
- Best practices

Common Questions:
1. Technical background
2. Project experience
3. Problem-solving approach

Quick Tips:
1. Practice coding
2. Review projects
3. Research company
"""

    def __del__(self):
        if torch.cuda.is_available():
            torch.cuda.empty_cache()