
# Resume Interview Assistant 🎯

A smart tool that analyzes resumes and generates personalized technical interview preparation guides using Google's Gemini 2.0 Flash AI model.

---

## 🚀 Features

- **Resume Analysis**: Extracts and processes skills, experience, and qualifications from PDF resumes
- **Dynamic Interview Guides**: Generates role-specific interview preparation content
- **Company-Specific Focus**: Tailors questions and preparation steps for specific companies
- **Multi-Section Output**:
  - Technical Questions
  - Coding Challenges
  - System Design Questions
  - Key Concepts
  - Preparation Steps
- **Downloadable Results**: Export the complete interview guide as a text file

---

## 💻 Tech Stack

- **Frontend**: Streamlit  
- **AI Model**: Google Gemini 2.0 Flash  
- **PDF Processing**: PyPDF2  
- **Other Tools**: Python, dotenv

---

## 🛠️ Setup & Installation

1. **Clone the repository**
    ```bash
    git clone https://github.com/jakevernice/Resume-Interview-Assistant.git
    cd Resume-Interview-Assistant
    ```

2. **Set up a virtual environment (recommended)**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3. **Install dependencies**
    ```bash
    pip install -r requirements.txt
    ```

4. **Set up environment variables**
    - Create a `.env` file in the root directory
    - Add your Google API key:
      ```env
      GOOGLE_API_KEY=your_api_key_here
      ```

5. **Run the application**
    ```bash
    streamlit run main.py
    ```

---

## 📖 Usage Guide

- **Upload Resume**
  - Click "Upload Resume" button
  - Select a PDF file of your resume

- **Enter Details**
  - Company Name
  - Role/Position
  - Select from suggested roles or enter custom role

- **Generate Guide**
  - Click "Generate Interview Preparation"
  - View results in different tabs:
    - Skills Overview
    - Interview Guide
    - Resume Details

- **Download Results**
  - Use the download button to save the complete guide

---

## 📋 Requirements

- Python 3.8+
- Google API Key (Gemini AI)
- PDF resume file
- Internet connection

---

## 💬 Support

For support, please open an issue in the GitHub repository.
