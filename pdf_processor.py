import PyPDF2
import re
from typing import Dict, List
import spacy
from spacy.language import Language

class PDFProcessor:
    def __init__(self):
        # Common section headers in resumes
        self.sections = {
            "EDUCATION": ["education", "academic background", "academic qualification"],
            "EXPERIENCE": ["experience", "work experience", "employment history", "work history"],
            "SKILLS": ["skills", "technical skills", "core competencies", "technologies"],
            "PROJECTS": ["projects", "personal projects", "academic projects"],
            "CERTIFICATIONS": ["certifications", "certificates", "courses"],
            "ACHIEVEMENTS": ["achievements", "awards", "honors"]
        }
        
        # Load spaCy model for better text processing
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except:
            # If model not found, download it
            import subprocess
            subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"])
            self.nlp = spacy.load("en_core_web_sm")

    def extract_text(self, pdf_file) -> str:
        """Extract text from PDF with better formatting preservation"""
        try:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text_chunks = []
            
            for page in pdf_reader.pages:
                text = page.extract_text()
                # Preserve section headers
                for section in self.get_all_section_variants():
                    text = text.replace(section, f"\n\n{section}\n")
                text_chunks.append(text)
            
            full_text = "\n".join(text_chunks)
            return self.clean_text(full_text)
            
        except Exception as e:
            raise Exception(f"Error processing PDF: {str(e)}")

    def clean_text(self, text: str) -> str:
        """Enhanced text cleaning"""
        # Remove excessive whitespace while preserving structure
        text = re.sub(r'\s*\n\s*\n\s*', '\n\n', text)
        text = re.sub(r'\s+', ' ', text)
        
        # Clean up bullet points and dashes
        text = re.sub(r'[•●■◆▪︎]+', '•', text)
        text = re.sub(r'\s*•\s*', '\n• ', text)
        
        # Clean up dates
        text = re.sub(r'(\d{4})\s*-\s*(\d{4}|present|Present)', r'\1 - \2', text)
        
        # Normalize section headers
        for main_section, variants in self.sections.items():
            for variant in variants:
                pattern = re.compile(variant, re.IGNORECASE)
                text = pattern.sub(main_section, text)
        
        return text.strip()

    def get_all_section_variants(self) -> List[str]:
        """Get all possible section header variants"""
        variants = []
        for main_section, section_variants in self.sections.items():
            variants.extend([main_section] + section_variants)
        return variants

    def parse_sections(self, text: str) -> Dict[str, List[str]]:
        """Improved section parsing"""
        sections = {}
        current_section = None
        current_content = []
        
        # Split text into lines and process
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check if line is a section header
            is_section_header = False
            for section_name, variants in self.sections.items():
                if any(variant.lower() in line.lower() for variant in [section_name] + variants):
                    if current_section:
                        sections[current_section] = self.process_section_content(current_content)
                    current_section = section_name
                    current_content = []
                    is_section_header = True
                    break
            
            if not is_section_header and current_section:
                current_content.append(line)
        
        # Add the last section
        if current_section:
            sections[current_section] = self.process_section_content(current_content)
        
        return sections

    def process_section_content(self, content: List[str]) -> List[str]:
        """Process content within each section"""
        processed_content = []
        current_item = []
        
        for line in content:
            # New item starts with bullet point or date
            if line.startswith('•') or re.match(r'\d{4}', line):
                if current_item:
                    processed_content.append(' '.join(current_item))
                current_item = [line]
            else:
                current_item.append(line)
        
        # Add the last item
        if current_item:
            processed_content.append(' '.join(current_item))
        
        return processed_content

    def extract_skills(self, text: str) -> List[str]:
        """Extract technical skills using NLP"""
        doc = self.nlp(text)
        skills = set()
        
        # Common technical skill patterns
        skill_patterns = [
            r'python|java|javascript|c\+\+|ruby|php|sql|html|css',
            r'docker|kubernetes|aws|azure|gcp',
            r'machine learning|artificial intelligence|data science',
            r'react|angular|vue|node\.js|django|flask'
        ]
        
        for pattern in skill_patterns:
            matches = re.finditer(pattern, text.lower())
            for match in matches:
                skills.add(match.group())
        
        return sorted(list(skills))

    def extract_education(self, text: str) -> List[Dict[str, str]]:
        """Extract education details"""
        education = []
        education_section = None
        
        # Find education section
        sections = self.parse_sections(text)
        if "EDUCATION" in sections:
            education_section = sections["EDUCATION"]
        
        if education_section:
            for entry in education_section:
                edu_entry = {}
                # Extract degree
                degree_match = re.search(r'(Bachelor|Master|PhD|B\.|M\.|Ph\.D).*?(\d{4})', entry)
                if degree_match:
                    edu_entry['degree'] = degree_match.group(0)
                
                # Extract GPA if present
                gpa_match = re.search(r'GPA:?\s*(\d+\.\d+)', entry)
                if gpa_match:
                    edu_entry['gpa'] = gpa_match.group(1)
                
                if edu_entry:
                    education.append(edu_entry)
        
        return education

    def get_structured_data(self, text: str) -> Dict:
        """Get complete structured data from resume"""
        structured_data = {
            'sections': self.parse_sections(text),
            'skills': self.extract_skills(text),
            'education': self.extract_education(text)
        }
        return structured_data
