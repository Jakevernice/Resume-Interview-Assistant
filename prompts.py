# prompts.py
class PromptGenerator:
    def generate_interview_prompt(self, structured_data: dict, company_name: str, company_info: str = "") -> str:
        skills = ", ".join(structured_data['skills'])
        
        return f"""Create a brief technical interview guide for {company_name}.
Skills: {skills}

Provide:
1. Key technical topics to review
2. Sample interview questions
3. Preparation tips

Keep it focused and specific."""

    def generate_followup_prompt(self, initial_response: str) -> str:
        return """Provide brief example answers for:
1. Technical concepts
2. Coding approaches
3. System design basics"""