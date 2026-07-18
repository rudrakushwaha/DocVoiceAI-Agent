import openai

OPENAI_MODEL = 'gpt-3.5-turbo'

# --- Email ---
EMAIL_PROMPT = (
    "Extract the following fields as JSON: to, subject, body, use_document_context (true/false). "
    "Rules for use_document_context:\n"
    "- Set to TRUE if body mentions: 'summary', 'summary of', 'from document', 'from uploaded', 'document content', 'document summary', or similar references to generate content FROM the document\n"
    "- Set to FALSE if body is a complete, full message not referencing the document\n"
    "- If no body provided, set to TRUE"
)
def extract_email_details(query: str) -> dict:
    messages = [
        {"role": "system", "content": EMAIL_PROMPT},
        {"role": "user", "content": query}
    ]
    resp = openai.ChatCompletion.create(
        model=OPENAI_MODEL,
        messages=messages,
        max_tokens=150,
        temperature=0
    )
    import json
    try:
        return json.loads(resp['choices'][0]['message']['content'])
    except Exception:
        return {"to": "", "subject": "", "body": "", "use_document_context": True}

# --- Meeting ---
MEETING_PROMPT = (
    "Extract meeting details from user query.\n"
    "Return JSON:\n"
    "{\n"
    "  \"title\": \"\",\n"
    "  \"participants\": [],\n"
    "  \"date\": \"YYYY-MM-DD\",\n"
    "  \"time\": \"HH:MM (24-hour format)\",\n"
    "  \"duration\": \"minutes\",\n"
    "  \"use_document_context\": \"false\",\n"
    "}\n"
    "Rules:\n"
    "- Convert natural language dates like '5th April 2026' → '2026-04-05'\n"
    "- Convert time like '3 pm' → '15:00'\n"
    "- If time like '3:30 pm' → '15:30'\n"
    "- If date/time missing → leave empty string\n"
    "- Do NOT return anything except JSON\n"
)
def extract_meeting_details(query: str) -> dict:
    messages = [
        {"role": "system", "content": MEETING_PROMPT},
        {"role": "user", "content": query}
    ]
    resp = openai.ChatCompletion.create(
        model=OPENAI_MODEL,
        messages=messages,
        max_tokens=150,
        temperature=0
    )
    import json
    try:
        return json.loads(resp['choices'][0]['message']['content'])
    except Exception:
        return {"title": "", "participants": [], "date": "", "time": "", "duration": "", "use_document_context": False}

# --- LinkedIn ---
LINKEDIN_PROMPT = (
    "Extract as JSON: topic, tone (professional|casual|motivational), use_document_context (true/false)."
)
def extract_linkedin_details(query: str) -> dict:
    messages = [
        {"role": "system", "content": LINKEDIN_PROMPT},
        {"role": "user", "content": query}
    ]
    resp = openai.ChatCompletion.create(
        model=OPENAI_MODEL,
        messages=messages,
        max_tokens=100,
        temperature=0
    )
    import json
    try:
        return json.loads(resp['choices'][0]['message']['content'])
    except Exception:
        return {"topic": "", "tone": "professional", "use_document_context": True}

# --- PDF ---
PDF_PROMPT = (
'''
Extract PDF creation details from user query.

Return ONLY valid JSON:
{
  "content_type": "summary | full | custom",
  "custom_text": "",
  "use_document_context": true/false,
  "requires_generation": true/false,
  "extracted_query": ""
}

CRITICAL: extracted_query must contain the COMPLETE content/topic after removing "generate pdf of" or similar phrases.

Examples:
- "generate pdf of summary of uploaded document" -> {"content_type": "summary", "use_document_context": true, "extracted_query": "summary of uploaded document"}
- "create pdf saying hello world" -> {"content_type": "custom", "custom_text": "hello world", "requires_generation": false}
- "generate pdf about AI" -> {"content_type": "custom", "requires_generation": true, "extracted_query": "AI"}
- "make pdf of machine learning concepts" -> {"content_type": "custom", "extracted_query": "machine learning concepts"}

Rules:
- Remove ALL PDF creation phrases: "generate pdf of", "create pdf of", "make pdf of", "pdf of", "generate pdf", "create pdf", "make pdf"
- Keep the remaining content as extracted_query
- For document/summary topics -> use_document_context = true, content_type = "summary"
- For direct text -> custom_text = that text, requires_generation = false
- For general topics -> requires_generation = true, content_type = "custom"
- extracted_query should NEVER be empty if there's content after removing PDF phrases
- Do NOT include any explanation text, only JSON
'''
)
def extract_pdf_details(query: str) -> dict:
    messages = [
        {"role": "system", "content": PDF_PROMPT},
        {"role": "user", "content": query}
    ]
    resp = openai.ChatCompletion.create(
        model=OPENAI_MODEL,
        messages=messages,
        max_tokens=100,
        temperature=0
    )
    import json
    try:
        return json.loads(resp['choices'][0]['message']['content'])
    except Exception:
        return {"content_type": "summary", "custom_text": "", "use_document_context": True}


# Generate general pdf content
def generate_general_content(query):
    """
    Generate well-structured content for PDF using LLM.
    Suitable for topic-based content generation without RAG.
    """
    prompt = f"""
Generate well-structured, professional content for a PDF document.

Topic: {query}

Requirements:
- Write in clear, readable paragraphs
- Use proper headings and structure
- Provide comprehensive explanation
- Make it suitable for PDF format
- Be informative and engaging
- Use professional tone
- Length: 300-500 words

Content:
"""

    try:
        response = openai.ChatCompletion.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are a professional content writer creating high-quality content for PDF documents."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=800
        )
        
        content = response["choices"][0]["message"]["content"]
        
        # Basic validation
        if not content or len(content.strip()) < 50:
            raise ValueError("Generated content is too short or empty")
            
        return content.strip()
        
    except Exception as e:
        print(f"Error in generate_general_content: {e}")
        # Fallback content
        return f"Content about {query}\n\nThis document provides information about {query}. Due to a generation error, this fallback content is provided. Please try again for detailed content."