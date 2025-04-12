from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
import torch
import os
from typing import Optional

class HuggingFaceService:
    def __init__(self, api_token: str):
        self.api_token = api_token
        self.model_name = "gpt2"  # Using GPT-2 for better text generation
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Initialize tokenizer and model
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.model_name, 
            use_auth_token=self.api_token
        )
        
        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            use_auth_token=self.api_token,
            torch_dtype=torch.float32,
            low_cpu_mem_usage=True
        )
        
        # Initialize pipeline
        self.generator = pipeline(
            "text-generation",
            model=self.model,
            tokenizer=self.tokenizer,
            device=-1 if self.device == "cpu" else 0
        )

    def generate_response(self, prompt: str) -> str:
        try:
            # Generate response
            outputs = self.generator(
                prompt,
                max_length=1000,  # Increased length for more detailed response
                min_length=200,
                do_sample=True,
                temperature=0.7,
                top_p=0.95,
                repetition_penalty=1.2,
                num_return_sequences=1
            )
            
            # Extract the generated text
            if outputs and len(outputs) > 0:
                generated_text = outputs[0].get('generated_text', '')
                
                # Remove the original prompt from the response
                if generated_text and prompt in generated_text:
                    response = generated_text[len(prompt):].strip()
                else:
                    response = generated_text.strip()
                
                # If response is too short or empty, return fallback
                if len(response) < 50:
                    return self.get_fallback_response()
                    
                return response
            else:
                return self.get_fallback_response()

        except Exception as e:
            print(f"Error in generation: {str(e)}")
            return self.get_fallback_response()

    def get_fallback_response(self) -> str:
        """Provide a structured fallback response"""
        return """
Programming Questions:
1. Implement a binary search tree with insert and search operations
2. Create a function to find the longest common subsequence
3. Design a cache system with get and put operations

Technical Concepts:
1. Data Structures: Trees, Graphs, Hash Tables
2. Algorithms: Sorting, Searching, Dynamic Programming
3. Design Patterns: Observer, Factory, Singleton

System Design:
1. Design a scalable chat application
2. Create a file storage system
3. Implement user authentication

Preparation Steps:
1. Practice coding problems on LeetCode
2. Build sample projects
3. Review system design fundamentals
"""

    def __del__(self):
        if hasattr(self, 'model'):
            del self.model
        if hasattr(self, 'generator'):
            del self.generator
        if torch.cuda.is_available():
            torch.cuda.empty_cache()