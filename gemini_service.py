import google.generativeai as genai
from typing import Optional
import time

class GeminiService:
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        
        # Initialize with Gemini 2.0 Flash model
        try:
            self.model = genai.GenerativeModel('gemini-2.0-flash')
        except Exception as e:
            print(f"Error initializing Gemini model: {str(e)}")
            raise

    def generate_response(self, prompt: str, role: str) -> str:
        try:
            # Enhanced prompt for better structure
            structured_prompt = f"""As an expert technical interviewer, create a detailed interview guide for a {role} position.

Context:
{prompt}

Please provide a structured response with the following sections:
# Technical Questions
# Coding Challenges
# System Design Questions
# Key Concepts
# Preparation Steps

Focus on practical, real-world scenarios and provide specific examples."""

            # Generate response with Gemini 2.0 Flash
            response = self.model.generate_content(
                contents=structured_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    top_p=0.95,
                    top_k=40,
                    max_output_tokens=2048,
                    candidate_count=1
                )
            )

            if response.text:
                return response.text
            return "Failed to generate response."

        except Exception as e:
            print(f"Error in Gemini API call: {str(e)}")
            return f"Error generating response: {str(e)}"