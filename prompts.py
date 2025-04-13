class PromptGenerator:
    def generate_interview_prompt(self, structured_data: dict, company_name: str, role_name: str) -> str:
        skills = structured_data.get('skills', {})
        languages = skills.get('languages', [])
        frameworks = skills.get('frameworks', [])
        tools = skills.get('tools', [])
        
        # Remove duplicates and clean up skills
        languages = list(set([lang.strip() for lang in languages]))
        frameworks = list(set([framework.strip() for framework in frameworks]))
        tools = list(set([tool.strip() for tool in tools]))

        prompt = f"""Creating interview guide for {role_name} position at {company_name}.

Candidate's Technical Profile:
- Programming Languages: {', '.join(languages) if languages else 'Not specified'}
- Frameworks & Libraries: {', '.join(frameworks) if frameworks else 'Not specified'}
- Tools & Technologies: {', '.join(tools) if tools else 'Not specified'}

Consider {company_name}'s:
- Technical environment and scale
- Industry-specific challenges
- Required technical expertise for {role_name}

Provide practical examples and specific scenarios relevant to {company_name} and this role."""

        return prompt