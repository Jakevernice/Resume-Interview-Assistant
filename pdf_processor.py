import PyPDF2
import re
from typing import Dict, List, Any

class PDFProcessor:
    def __init__(self):
        # Define section markers
        self.sections = {
            "Education": ["EDUCATION", "ACADEMIC BACKGROUND", "ACADEMIC QUALIFICATIONS"],
            "Experience": ["EXPERIENCE", "WORK EXPERIENCE", "PROFESSIONAL EXPERIENCE", "EMPLOYMENT HISTORY"],
            "Projects": ["PROJECTS", "PROJECT EXPERIENCE", "PERSONAL PROJECTS", "ACADEMIC PROJECTS"],
            "Technical Skills": ["TECHNICAL SKILLS", "SKILLS", "TECHNOLOGIES", "TECHNICAL EXPERTISE"],
            "Certificates": ["CERTIFICATES", "CERTIFICATIONS", "COURSES", "ACHIEVEMENTS"]
        }
        
        # Comprehensive skill patterns
        self.tech_patterns = {
            'languages': [
                # Programming Languages
                r'Python', r'Java(?:Script)?', r'TypeScript', r'C\+\+', r'C#', r'Ruby', r'PHP',
                r'Go(?:lang)?', r'Rust', r'Swift', r'Kotlin', r'R', r'MATLAB', r'Scala',
                r'Perl', r'Haskell', r'Lua', r'Dart', r'Julia',
                # Web Technologies
                r'HTML[5]?', r'CSS[3]?', r'SQL', r'NoSQL', r'GraphQL',
                # Shell Scripting
                r'Bash', r'Shell', r'PowerShell',
                # Game Development
                r'GDScript', r'Unity'
            ],
            'frameworks': [
                # Frontend Frameworks
                r'React(?:\.js)?', r'Angular(?:JS)?', r'Vue(?:\.js)?', r'Svelte', r'Next\.js',
                r'jQuery', r'Bootstrap', r'Tailwind', r'Material-UI', r'Ember',
                # Backend Frameworks
                r'Django', r'Flask', r'FastAPI', r'Spring(?:Boot)?', r'Express(?:\.js)?',
                r'Laravel', r'Ruby on Rails', r'ASP\.NET', r'Node\.js',
                # Mobile Frameworks
                r'React Native', r'Flutter', r'Xamarin', r'SwiftUI', r'Kotlin Multiplatform',
                # Data Science
                r'TensorFlow', r'PyTorch', r'Keras', r'Scikit-learn', r'Pandas',
                r'NumPy', r'SciPy', r'Matplotlib', r'Seaborn', r'Plotly',
                # Testing Frameworks
                r'Jest', r'Mocha', r'Pytest', r'JUnit', r'Selenium'
            ],
            'tools': [
                # Version Control
                r'Git', r'GitHub', r'GitLab', r'Bitbucket', r'SVN',
                # DevOps & Cloud
                r'Docker', r'Kubernetes', r'Jenkins', r'Travis CI', r'CircleCI',
                r'AWS', r'Azure', r'GCP', r'Heroku', r'DigitalOcean',
                # Databases
                r'MySQL', r'PostgreSQL', r'MongoDB', r'Redis', r'Cassandra',
                r'Oracle', r'SQLite', r'Firebase',
                # IDEs & Editors
                r'VS Code', r'Visual Studio', r'IntelliJ', r'PyCharm', r'Eclipse',
                r'Sublime', r'Atom', r'Vim', r'Emacs',
                # Design Tools
                r'Figma', r'Sketch', r'Adobe XD', r'Photoshop', r'Illustrator',
                # Other Tools
                r'Jira', r'Confluence', r'Trello', r'Slack', r'Postman'
            ]
        }

    def extract_text(self, pdf_file) -> str:
        """Extract text from PDF file with error handling"""
        try:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                try:
                    text += page.extract_text() + "\n"
                except Exception as e:
                    print(f"Error extracting text from page: {str(e)}")
                    continue
            return text
        except Exception as e:
            print(f"Error processing PDF: {str(e)}")
            raise Exception(f"Error processing PDF: {str(e)}")

    def extract_skills(self, text: str) -> Dict[str, List[str]]:
        """Extract and categorize skills from text"""
        skills = {
            'languages': set(),
            'frameworks': set(),
            'tools': set()
        }
        
        try:
            # First, try to extract from Technical Skills section
            skills_section = None
            for marker in self.sections["Technical Skills"]:
                match = re.search(f"{marker}.*?(?=\n\w+:|$)", text, re.DOTALL | re.IGNORECASE)
                if match:
                    skills_section = match.group(0)
                    break

            if skills_section:
                # Process structured skills section
                categories = {
                    'Languages:': 'languages',
                    'Programming Languages:': 'languages',
                    'Frameworks:': 'frameworks',
                    'Libraries:': 'frameworks',
                    'Tools:': 'tools',
                    'Technologies:': 'tools'
                }

                for header, category in categories.items():
                    match = re.search(f"{header}(.*?)(?=\n\w+:|$)", skills_section, re.DOTALL | re.IGNORECASE)
                    if match:
                        items = match.group(1).strip().split(',')
                        skills[category].update(item.strip() for item in items if item.strip())

            # Then scan entire text for additional technologies
            for category, patterns in self.tech_patterns.items():
                for pattern in patterns:
                    matches = re.finditer(pattern, text, re.IGNORECASE)
                    for match in matches:
                        skills[category].add(match.group())

            # Convert sets to sorted lists and remove duplicates
            return {
                category: sorted(list(set(skill_set)), key=str.lower)
                for category, skill_set in skills.items()
            }

        except Exception as e:
            print(f"Error in skill extraction: {str(e)}")
            return {
                'languages': ['Python'],  # Default fallback
                'frameworks': ['React'],
                'tools': ['Git']
            }

    def get_structured_data(self, text: str) -> Dict[str, Any]:
        """Extract structured data from resume text"""
        try:
            sections_dict = {}
            current_section = None
            current_content = []
            
            # Split text into lines and process
            lines = text.split('\n')
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Check for section headers
                section_match = None
                for section_name, markers in self.sections.items():
                    for marker in markers:
                        if marker.upper() in line.upper():
                            section_match = section_name
                            break
                    if section_match:
                        break

                if section_match:
                    # Save previous section
                    if current_section and current_content:
                        sections_dict[current_section] = self._clean_content(current_content)
                    # Start new section
                    current_section = section_match
                    current_content = []
                elif current_section:
                    current_content.append(line)

            # Add last section
            if current_section and current_content:
                sections_dict[current_section] = self._clean_content(current_content)

            # Extract skills
            skills_dict = self.extract_skills(text)

            # Validate and return structured data
            return self._validate_structured_data({
                'sections': sections_dict,
                'skills': skills_dict
            })

        except Exception as e:
            print(f"Error in structured data extraction: {str(e)}")
            return {
                'sections': {
                    'Education': ['Education information not found'],
                    'Experience': ['Experience information not found'],
                    'Technical Skills': ['Technical skills information not found']
                },
                'skills': {
                    'languages': ['Python'],
                    'frameworks': ['React'],
                    'tools': ['Git']
                }
            }

    def _clean_content(self, content: List[str]) -> List[str]:
        """Clean and format section content"""
        cleaned = []
        for line in content:
            line = line.strip()
            if line and not any(marker.upper() in line.upper() 
                              for markers in self.sections.values() 
                              for marker in markers):
                # Remove bullet points and other common markers
                line = re.sub(r'^[-•●■◆○*]+\s*', '', line)
                if line:
                    cleaned.append(line)
        return cleaned

    def _validate_structured_data(self, data: Dict) -> Dict:
        """Validate and ensure minimum required data structure"""
        validated = {
            'sections': {},
            'skills': {
                'languages': [],
                'frameworks': [],
                'tools': []
            }
        }
        
        # Validate sections
        if 'sections' in data and isinstance(data['sections'], dict):
            validated['sections'] = data['sections']

        # Validate skills
        if 'skills' in data and isinstance(data['skills'], dict):
            for category in ['languages', 'frameworks', 'tools']:
                if category in data['skills'] and isinstance(data['skills'][category], list):
                    validated['skills'][category] = data['skills'][category]

        return validated
