import dspy

class AnalyzeResume(dspy.Signature):
    """
    Critique a LaTeX resume against a specific job description.
    Identify strengths, weaknesses, and specifically required skills/missing keywords.
    Preserve LaTeX integrity and structure in any recommendations.
    """
    resume_latex = dspy.InputField(desc="The LaTeX source of the resume.")
    job_description = dspy.InputField(desc="The job description to analyze against.")

    critique = dspy.OutputField(
        desc="A plain text critique string only. No markdown list wrappers."
    )
    required_skills = dspy.OutputField(
        desc='Return STRICT JSON array of strings only, for example ["Docker", "Terraform"]. No bullets, no prose.'
    )
    missing_keywords = dspy.OutputField(
        desc='Return STRICT JSON array of strings only, for example ["Jenkins", "Observability"]. No bullets, no prose.'
    )

class RebuildResume(dspy.Signature):
    """
    Generate surgical LaTeX patches to improve a resume based on a critique and missing keywords.
    The goal is to modify existing sections (e.g., Skills, Experience) to better match the job without breaking the LaTeX structure.

    LaTeX Safety & Escaping Rules:
    - Escape special LaTeX characters (%, &, _, $, #, {, }) appropriately when injecting new content into text bodies (e.g., use \\%, \\&, \\_, \\$, \\#, \\{, \\}).
    - Always preserve LaTeX syntax, document structure, packages, custom environments, and closing \\end{document} tags.
    - Never strip document preamble or modify unrelated macros.

    Output format:
    Output exactly a JSON array of objects. Each object MUST have:
    1. 'search_text': A UNIQUE, verbatim block of text from the original LaTeX to be replaced.
    2. 'replace_with': The new LaTeX code that replaces the search_text.

    Rules:
    - Do not include markdown code fences.
    - Do not include explanation text.
    - Output must be valid JSON parsable by json.loads.
    - Keep deterministic order from top-to-bottom occurrences in the resume.

    Example output format for surgical_patches:
    [{"search_text": "\\item Skill A", "replace_with": "\\item Skill A, Skill B"}]
    """
    resume_latex = dspy.InputField(desc="The original LaTeX source of the resume.")
    critique = dspy.InputField(desc="The critique providing specific improvement suggestions.")
    missing_keywords = dspy.InputField(desc="The keywords to incorporate into the resume.")

    surgical_patches = dspy.OutputField(
        desc="STRICT JSON array of {search_text, replace_with} objects only. No markdown formatting."
    )

class ChatAssistant(dspy.Signature):
    """
    An AI resume assistant that can answer questions about the resume and job description.

    Behavior based on input_mode:
    - If input_mode is 'latex': You MUST suggest specific surgical patches in the 'suggested_patches' field for any requested edits.
      LaTeX Safety: When generating patches, escape special LaTeX characters (%, &, _, $, #, {, }) in text bodies and preserve document structure.
    - If input_mode is 'pdf': You CANNOT suggest patches (as you don't have the source). Instead, provide a descriptive 'changelog' or advice in the 'response_text' on what the user should change in their original source document.
    """
    chat_history = dspy.InputField(desc="The conversation history so far.")
    resume_content = dspy.InputField(desc="The current content of the resume (LaTeX or plain text).")
    input_mode = dspy.InputField(desc="The format of the resume_content: 'latex' or 'pdf' (plain text).")
    user_message = dspy.InputField(desc="The user's latest query or request.")

    response_text = dspy.OutputField(desc="A helpful and concise text response to the user.")
    suggested_patches = dspy.OutputField(
        desc="STRICT JSON array of {search_text, replace_with} objects if any edits are suggested. Empty array [] if no edits."
    )

