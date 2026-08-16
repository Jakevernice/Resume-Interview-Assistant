import os
import tempfile
import subprocess
import re
from typing import Dict, Any, List
import json

DANGEROUS_LATEX_PATTERNS = [
    r"\\input\s*\{[^}]*[\/\\]",
    r"\\input\s*\{(?:\.\.|\/)",
    r"\\input\s+[^\s{}]+",
    r"\\include\s*\{[^}]*[\/\\]",
    r"\\include\s*\{(?:\.\.|\/)",
    r"\\include\s+[^\s{}]+",
    r"\\lstinputlisting",
    r"\\VerbatimInput",
    r"\\openin",
    r"\\read\s*\d+",
    r"\\write18",
    r"\\immediate\s*\\write18",
    r"\\catcode",
]


def sanitize_latex_source(source: str) -> None:
    """
    Sanitizes LaTeX source to block local file read/inclusion primitives,
    directory traversals, and shell escape directives.
    """
    if not source or not isinstance(source, str):
        raise ValueError("LaTeX source must be a non-empty string.")

    for pattern in DANGEROUS_LATEX_PATTERNS:
        if re.search(pattern, source, re.IGNORECASE):
            raise ValueError("Disallowed LaTeX file inclusion primitive or directive detected.")


def compile_latex_to_pdf(latex_source: str) -> bytes:
    """
    Compiles LaTeX source code to a PDF byte stream using Tectonic in untrusted sandboxed mode.
    Sanitizes source before compilation to prevent local file inclusion.
    """
    sanitize_latex_source(latex_source)

    with tempfile.TemporaryDirectory() as temp_dir:
        input_file = os.path.join(temp_dir, "resume.tex")
        with open(input_file, "w", encoding="utf-8") as f:
            f.write(latex_source)

        try:
            # Tectonic compiles to PDF in one pass with untrusted sandboxing
            result = subprocess.run(
                ["tectonic", "--untrusted", input_file],
                cwd=temp_dir,
                capture_output=True,
                text=True,
                check=True
            )

            output_file = os.path.join(temp_dir, "resume.pdf")
            if os.path.exists(output_file):
                with open(output_file, "rb") as f:
                    return f.read()
            else:
                raise Exception("PDF was not generated despite successful Tectonic run.")

        except subprocess.CalledProcessError as e:
            # Capture stdout and stderr for error parsing
            errors = parse_tectonic_errors(e.stderr + e.stdout)
            if not errors:
                raise Exception(f"Tectonic failed with exit code {e.returncode}: {e.stderr}")
            else:
                # Return the structured errors as part of the exception message
                # main.py will parse this
                raise Exception(f"LATEX_ERROR:{json.dumps(errors)}")


def parse_tectonic_errors(output: str) -> List[Dict[str, Any]]:
    """
    Parses Tectonic's stderr/stdout to extract line numbers and error descriptions.
    Format is typically: error: <file>:<line>:<col>: <message>
    """
    errors = []
    # Search for lines starting with 'error:' and containing line/column numbers
    pattern = r"error: [^:]+:(\d+):(\d+): (.*)"
    matches = re.finditer(pattern, output)

    for match in matches:
        errors.append({
            "line": int(match.group(1)),
            "column": int(match.group(2)),
            "message": match.group(3).strip()
        })

    # Generic fallback if no specific line errors found but 'error:' exists
    if not errors and "error:" in output:
        generic_pattern = r"error: (.*)"
        matches = re.finditer(generic_pattern, output)
        for match in matches:
            errors.append({
                "line": 0,
                "column": 0,
                "message": match.group(1).strip()
            })

    return errors
