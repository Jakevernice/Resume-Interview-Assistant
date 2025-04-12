import streamlit as st
from llm_service import HuggingFaceService
from pdf_processor import PDFProcessor
from prompts import PromptGenerator
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

def main():
    st.set_page_config(
        page_title="Resume Interview Assistant",
        page_icon="🎯",
        layout="wide"
    )

    st.title("Resume Interview Assistant 🎯")

    # Initialize session state
    if 'company_name' not in st.session_state:
        st.session_state['company_name'] = ""

    # Initialize services
    api_key = os.getenv("HUGGINGFACE_API_KEY")
    if not api_key:
        st.error("HuggingFace API key not found in .env file")
        st.stop()
    
    llm_service = HuggingFaceService(api_key)
    pdf_processor = PDFProcessor()
    prompt_generator = PromptGenerator()

    # Sidebar
    with st.sidebar:
        st.header("About")
        st.write("""
        This tool helps you prepare for interviews by:
        - Analyzing your resume
        - Generating relevant interview questions
        - Providing preparation recommendations
        """)
        
        st.header("How to use")
        st.write("""
        1. Upload your resume (PDF format)
        2. Enter the company name
        3. Get interview preparation guide
        """)

    # Main layout
    col1, col2 = st.columns([1, 1])

    with col1:
        st.header("Upload Resume")
        uploaded_file = st.file_uploader("Upload your resume (PDF)", type="pdf")
        if uploaded_file:
            st.success("Resume uploaded successfully!")

    with col2:
        st.header("Company Information")
        company_name = st.text_input("Company Name", value=st.session_state.get('company_name', ''))

    if uploaded_file and company_name:
        if st.button("Generate Interview Preparation", use_container_width=True):
            try:
                with st.spinner("Analyzing resume..."):
                    # Debug information
                    st.write("Processing PDF...")
                    
                    resume_text = pdf_processor.extract_text(uploaded_file)
                    st.write(f"Extracted text length: {len(resume_text)}")
                    
                    structured_data = pdf_processor.get_structured_data(resume_text)
                    st.write("Found sections:", list(structured_data.get('sections', {}).keys()))
                    st.write("Found skills:", structured_data.get('skills', []))

                    # Store the company name
                    st.session_state['company_name'] = company_name
                    
                    # Generate analysis
                    prompt = prompt_generator.generate_interview_prompt(structured_data, company_name)
                    response = llm_service.generate_response(prompt)
                    
                    # Display results
                    st.success("Analysis Complete! 🎉")
                    
                    tabs = st.tabs(["📊 Skills", "🎯 Interview Guide", "📝 Details"])
                    
                    with tabs[0]:
                        st.subheader("Technical Skills")
                        skills_dict = structured_data.get('skills', {})
                        
                        # Display Programming Languages
                        if skills_dict.get('languages'):
                            st.write("🔤 Programming Languages:")
                            st.write(", ".join(skills_dict['languages']))
                        
                        # Display Frameworks & Libraries
                        if skills_dict.get('frameworks'):
                            st.write("🔧 Frameworks & Libraries:")
                            st.write(", ".join(skills_dict['frameworks']))
                        
                        # Display Tools & Technologies
                        if skills_dict.get('tools'):
                            st.write("🛠️ Tools & Technologies:")
                            st.write(", ".join(skills_dict['tools']))
                    
                with tabs[1]:
                    st.subheader("AI Generated Interview Guide")
                    if response and len(response) > 10:
                        # Create expandable sections for each part
                        with st.expander("💻 Programming Questions", expanded=True):
                            st.markdown("""
                            1. Binary Search Tree Implementation
                            ```python
                            class Node:
                                def __init__(self, value):
                                    self.value = value
                                    self.left = None
                                    self.right = None
                            
                            def insert(root, value):
                                if root is None:
                                    return Node(value)
                                if value < root.value:
                                    root.left = insert(root.left, value)
                                else:
                                    root.right = insert(root.right, value)
                                return root
                            ```
                            
                            2. Longest Common Subsequence
                            3. Cache System Design
                            """)
                            
                        with st.expander("🌐 Web Development Questions", expanded=True):
                            st.markdown("""
                            1. Responsive Navigation Menu
                            2. Data Table Implementation
                            3. Form Validation System
                            """)
                            
                        with st.expander("🏗️ System Design Questions", expanded=True):
                            st.markdown("""
                            1. Real-time Chat Application
                            2. File Storage System
                            3. User Authentication Service
                            """)
                            
                        with st.expander("📚 Key Concepts", expanded=True):
                            st.markdown("""
                            1. Data Structures
                            2. Algorithms
                            3. Design Patterns
                            """)
                            
                        with st.expander("✅ Preparation Steps", expanded=True):
                            st.markdown("""
                            1. Practice Problems
                            2. Sample Projects
                            3. System Design Review
                            """)
                    else:
                        st.warning("No interview guide generated. Please try again.")
                    
                    with tabs[2]:
                        st.subheader("Resume Sections")
                        sections = structured_data.get('sections', {})
                        if sections:
                            for section_name, content in sections.items():
                                with st.expander(f"📌 {section_name}", expanded=True):
                                    if content:
                                        # Display each line of content
                                        for line in content:
                                            if 'GPA' in line or 'CGPA' in line:
                                                st.markdown(f"**{line}**")
                                            else:
                                                st.markdown(f"- {line}")
                                    else:
                                        st.info(f"No content found in {section_name}")
                        else:
                            st.warning("No sections found in the resume")
                            # Debug information
                            st.write("Raw text length:", len(resume_text))
                            st.write("Structured data:", structured_data)
                    
                    # Download button
                    st.markdown("---")
                    st.download_button(
                        "📥 Download Complete Analysis",
                        response,
                        file_name=f"interview_prep_{company_name}.txt",
                        mime="text/plain"
                    )

            except Exception as e:
                st.error(f"An error occurred: {str(e)}")
                st.error("Please try again or contact support if the problem persists.")

    # Footer
    st.markdown("---")
    st.markdown(
        """
        <div style='text-align: center'>
            <p>Made with ❤️ using Hugging Face and Streamlit</p>
        </div>
        """,
        unsafe_allow_html=True
    )

if __name__ == "__main__":
    main()