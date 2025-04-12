import streamlit as st
from llm_service import HuggingFaceService
from pdf_processor import PDFProcessor
from prompts import PromptGenerator

def main():
    st.set_page_config(
        page_title="Resume Interview Assistant",
        page_icon="🎯",
        layout="wide"
    )

    st.title("Resume Interview Assistant 🎯")

    # Initialize services
    llm_service = HuggingFaceService()
    pdf_processor = PDFProcessor()
    prompt_generator = PromptGenerator()

    # Sidebar
    with st.sidebar:
        st.header("About")
        st.write("Upload your resume and get interview preparation guidance.")

    # Main layout
    col1, col2 = st.columns([1, 1])

    with col1:
        st.header("Upload Resume")
        uploaded_file = st.file_uploader("Upload your resume (PDF)", type="pdf")
        if uploaded_file:
            st.success("Resume uploaded successfully!")

    with col2:
        st.header("Company Information")
        company_name = st.text_input("Company Name")

    if uploaded_file and company_name:
        if st.button("Generate Interview Preparation", use_container_width=True):
            with st.spinner("Analyzing resume..."):
                try:
                    # Process PDF
                    resume_text = pdf_processor.extract_text(uploaded_file)
                    structured_data = pdf_processor.get_structured_data(resume_text)
                    
                    # Generate initial analysis
                    prompt = prompt_generator.generate_interview_prompt(structured_data, company_name)
                    
                    # Get AI response
                    response = llm_service.generate_response(prompt)
                    
                    # Display results in a clear format
                    st.success("Analysis Complete! 🎉")
                    
                    # Display Skills
                    st.header("Your Technical Skills")
                    st.write(", ".join(structured_data.get('skills', [])))
                    
                    # Display AI Generated Response
                    st.header("AI Interview Preparation Guide")
                    
                    # Create tabs for different sections
                    tab1, tab2 = st.tabs(["📝 Main Analysis", "🔍 Detailed View"])
                    
                    with tab1:
                        # Display the raw AI response
                        st.markdown("### AI Generated Guide")
                        st.markdown(response)  # This is where the AI output appears!
                    
                    with tab2:
                        # Display structured data from resume
                        st.markdown("### Resume Sections")
                        for section, content in structured_data.get('sections', {}).items():
                            with st.expander(f"📌 {section}"):
                                for item in content:
                                    st.markdown(f"- {item}")
                    
                    # Add download button
                    st.download_button(
                        "📥 Download Analysis",
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