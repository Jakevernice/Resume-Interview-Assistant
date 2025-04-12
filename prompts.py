class PromptGenerator:
    def generate_interview_prompt(self, structured_data: dict, company_name: str) -> str:
        skills = structured_data.get('skills', {})
        languages = skills.get('languages', [])
        
        # Pick the main programming languages (Python, Java, C++, etc.)
        main_langs = [lang for lang in languages if lang.lower() not in ['html', 'css', 'sql']]
        web_techs = [lang for lang in languages if lang.lower() in ['html', 'css', 'javascript']]
        
        prompt = f"""Create a technical interview preparation guide for {company_name}.

For Programming Questions (using {', '.join(main_langs)}):
1. Implement a binary search tree with insert and search operations
2. Create a function to find the longest common subsequence
3. Design a cache system with get and put operations

For Web Development (using {', '.join(web_techs)}):
1. Create a responsive navigation menu
2. Implement a data table with sorting and filtering
3. Design a form validation system

System Design Questions:
1. Design a real-time chat application
2. Create a scalable file storage system
3. Implement a user authentication service

Key Concepts to Review:
1. Data Structures: Trees, Graphs, Hash Tables
2. Algorithms: Sorting, Searching, Dynamic Programming
3. Design Patterns: Observer, Factory, Singleton

Preparation Steps:
1. Practice leetcode medium/hard problems
2. Build sample projects using your tech stack
3. Review system design fundamentals

Provide specific technical details and example code snippets."""

    def generate_followup_prompt(self, initial_response: str) -> str:
        return """Provide sample solutions for:
1. Binary search tree implementation
2. Real-time chat system design
3. Authentication service architecture"""
