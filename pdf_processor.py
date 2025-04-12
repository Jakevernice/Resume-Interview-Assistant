import PyPDF2
import re
from typing import Dict, List

class PDFProcessor:
    def __init__(self):
        self.sections = {
            "Education": "EDUCATION",
            "Experience": "EXPERIENCE",
            "Projects": "PROJECTS",
            "Technical Skills": "TECHNICAL SKILLS",
            "Certificates and Courses Completed": "CERTIFICATES"
        }
        
        # Comprehensive list of programming languages and technologies to look for
        self.tech_patterns = {
            'languages': [
                r'Python', r'Java(?:Script)?', r'C\+\+', r'C#', r'Ruby', r'PHP',
                r'TypeScript', r'SQL', r'R', r'Swift', r'Kotlin', r'Go', r'Rust',
                r'HTML', r'CSS', r'Shell', r'Perl', r'Scala', r'GDScript'
            ],
            'frameworks': [
                r'React', r'Angular', r'Vue\.js', r'Django', r'Flask', r'Spring',
                r'Node\.js', r'Express\.js', r'TensorFlow', r'PyTorch', r'Pandas',
                r'NumPy', r'Matplotlib', r'Scikit-learn', r'Tkinter'
            ],
            'tools': [
                r'Git', r'Docker', r'Kubernetes', r'Jenkins', r'AWS', r'Azure',
                r'GCP', r'MySQL', r'PostgreSQL', r'MongoDB', r'Redis', r'Eclipse',
                r'VSCode', r'PyCharm', r'Jupyter', r'Godot'
            ]
        }

    def extract_text(self, pdf_file) -> str:
        try:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            return text
        except Exception as e:
            print(f"PDF extraction error: {str(e)}")
            raise Exception(f"Error processing PDF: {str(e)}")

    def extract_skills(self, text: str) -> Dict[str, List[str]]:
        skills = {
            'languages': set(),
            'frameworks': set(),
            'tools': set()
        }
        
        # First, extract from Technical Skills section if present
        tech_skills_match = re.search(r'Technical Skills(.*?)(?=\n\w+:|$)', text, re.DOTALL)
        if tech_skills_match:
            tech_skills_text = tech_skills_match.group(1)
            
            # Extract from specific categories
            if 'Languages:' in tech_skills_text:
                languages = tech_skills_text.split('Languages:')[1].split('Developer Tools:')[0]
                skills['languages'].update([l.strip() for l in languages.split(',')])
            
            if 'Developer Tools:' in tech_skills_text:
                tools = tech_skills_text.split('Developer Tools:')[1].split('Libraries:')[0]
                skills['tools'].update([t.strip() for t in tools.split(',')])
            
            if 'Libraries:' in tech_skills_text:
                libraries = tech_skills_text.split('Libraries:')[1]
                skills['frameworks'].update([l.strip() for l in libraries.split(',')])

        # Then scan entire text for additional technologies
        for category, patterns in self.tech_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    skills[category].add(match.group())

        # Convert sets to sorted lists
        return {
            'languages': sorted(list(skills['languages'])),
            'frameworks': sorted(list(skills['frameworks'])),
            'tools': sorted(list(skills['tools']))
        }

    def get_structured_data(self, text: str) -> Dict:
        sections_dict = {}
        current_section = None
        current_content = []
        
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            section_match = None
            for original, standardized in self.sections.items():
                if original in line:
                    section_match = standardized
                    break
            
            if section_match:
                if current_section:
                    sections_dict[current_section] = current_content
                current_section = section_match
                current_content = []
            elif current_section:
                line = line.strip('•').strip()
                if line:
                    current_content.append(line)
        
        if current_section and current_content:
            sections_dict[current_section] = current_content

        # Extract all skills
        skills_dict = self.extract_skills(text)

        return {
            'sections': sections_dict,
            'skills': skills_dict
        }