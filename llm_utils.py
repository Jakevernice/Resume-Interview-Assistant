import re
from typing import Dict, List
from fallback_templates import get_role_template

class LLMUtils:
    def validate_response(self, response: str) -> bool:
        """Validate the response meets minimum requirements"""
        if not response or len(response) < 50:  # Reduced minimum length
            print(f"Response failed length validation: {len(response) if response else 0} chars")
            return False
            
        # Removed section validation to allow more flexible responses
        return True

    def clean_response(self, generated_text: str, prompt: str) -> str:
        """Clean and format the generated response"""
        try:
            # Debug print
            print(f"Cleaning text of length: {len(generated_text)}")
            
            # Remove the prompt from the beginning
            if prompt in generated_text:
                response = generated_text[len(prompt):].strip()
            else:
                response = generated_text.strip()

            # Basic cleaning
            response = re.sub(r'\n{3,}', '\n\n', response)
            response = re.sub(r'\s{2,}', ' ', response)
            
            # Debug print
            print(f"Cleaned text length: {len(response)}")
            
            return response

        except Exception as e:
            print(f"Error cleaning response: {str(e)}")
            return generated_text

    def get_fallback_response(self, role: str = "Software Engineer") -> str:
        return get_role_template(role)

    def format_code_block(self, code: str, language: str = "python") -> str:
        return f"```{language}\n{code}\n```"

    def extract_sections(self, response: str) -> Dict[str, List[str]]:
        sections = {}
        current_section = None
        current_content = []

        for line in response.split('\n'):
            line = line.strip()
            
            if line.startswith('#'):
                if current_section:
                    sections[current_section] = current_content
                current_section = line.lstrip('#').strip()
                current_content = []
            elif current_section and line:
                current_content.append(line)

        if current_section:
            sections[current_section] = current_content

        return sections