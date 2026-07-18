from .extract import extract_email_details, extract_meeting_details, extract_linkedin_details, extract_pdf_details, generate_general_content
from services.langchain_rag import query_rag
import requests
import os

BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:4000/api')

async def handle_send_email(query, userId, user_firebase_token=None):
    params = extract_email_details(query)
    print(params)
    if params.get('use_document_context'):
        rag = await query_rag(userId, params.get('body'), skip_intent_classification=True)
        params['body'] = rag['answer']
    if not params.get('to'):
        return {"answer": "Who should I send the email to?", "action": "email", "data": {}}
    payload = {"to": params['to'], "subject": params['subject'], "body": params['body']}
    try:
        print(f"{BACKEND_URL}/send-email")
        headers = {}
        if user_firebase_token:
            headers["Authorization"] = f"Bearer {user_firebase_token}"
        resp = requests.post(f"{BACKEND_URL}/send-email", json=payload, headers=headers)
        resp.raise_for_status()
        return {"answer": "Email sent successfully.", "action": "email", "data": {}}
    except Exception as e:
        return {"answer": f"Failed to send email: {e}", "action": "email", "data": {}}

async def handle_schedule_meeting(query, userId, user_firebase_token=None):
    params = extract_meeting_details(query)
    if not params.get('title') or not params.get('participants'):
        return {"answer": "Please provide meeting title and participants.", "action": "meeting", "data": {}}
    payload = {"title": params['title'], "participants": params['participants'], "date": params['date'], "time": params['time']}
    try:
        headers = {}
        if user_firebase_token:
            headers["Authorization"] = f"Bearer {user_firebase_token}"
        resp = requests.post(f"{BACKEND_URL}/schedule-meeting", json=payload, headers=headers)
        resp.raise_for_status()
        return {"answer": "Meeting scheduled successfully.", "action": "meeting", "data": {}}
    except Exception as e:
        return {"answer": f"Failed to schedule meeting: {e}", "action": "meeting", "data": {}}

async def handle_linkedin_post(query, userId, user_firebase_token=None):
    params = extract_linkedin_details(query)
    print(params)
    if params.get('use_document_context'):
        rag = await query_rag(userId, params.get('content_type'), skip_intent_classification=True)
        post_text = rag['answer']
    else:
        post_text = params.get('topic', '')
    return {"answer": post_text, "action": "linkedin_post", "data": {"text": post_text}}

async def handle_generate_pdf(query, userId, user_firebase_token=None):
    params = extract_pdf_details(query)
    print("[handle_generate_pdf] Extracted params:", params)
    
    content = None
    
    # Intelligent content selection logic
    if params.get('use_document_context'):
        print("[handle_generate_pdf] Using document context, calling query_rag...")
        
        # Use extracted_query from LLM parsing, or fallback to original
        content_query = params.get('extracted_query', query)
        print(f"[handle_generate_pdf] Using extracted query: '{content_query}'")
        
        try:
            rag = await query_rag(userId, content_query, skip_intent_classification=True)
            print("[handle_generate_pdf] RAG answer:", rag)
            content = rag['answer']
            if not content or content.strip() == "":
                print("[handle_generate_pdf] RAG returned empty, falling back to generation")
                content = generate_general_content(content_query)
        except Exception as e:
            print(f"[handle_generate_pdf] RAG failed: {e}, falling back to generation")
            content = generate_general_content(content_query)
            
    elif params.get('requires_generation'):
        print("[handle_generate_pdf] Using LLM generation (no RAG)...")
        try:
            content = generate_general_content(query)
        except Exception as e:
            print(f"[handle_generate_pdf] LLM generation failed: {e}")
            return {"answer": "Failed to generate content for PDF.", "action": "pdf", "data": {}}
            
    elif params.get('custom_text'):
        print("[handle_generate_pdf] Using user-provided custom text...")
        content = params.get('custom_text')
        
    else:
        # Fallback: try to determine from query
        print("[handle_generate_pdf] No clear instruction, analyzing query...")
        if any(keyword in query.lower() for keyword in ['summary', 'document', 'this document']):
            print("[handle_generate_pdf] Detected document context, using RAG")
            try:
                rag = await query_rag(userId, query, skip_intent_classification=True)
                content = rag['answer']
            except Exception as e:
                print(f"[handle_generate_pdf] Fallback RAG failed: {e}")
                content = generate_general_content(query)
        else:
            print("[handle_generate_pdf] Using general content generation")
            content = generate_general_content(query)
    
    # Validate content
    if not content or content.strip() == "":
        print("[handle_generate_pdf] Content is empty after processing")
        return {"answer": "Please provide content for PDF.", "action": "pdf", "data": {}}
    
    print("[handle_generate_pdf] Final content for PDF:", content[:200] + "..." if len(content) > 200 else content)
    payload = {"content": content}
    
    try:
        headers = {}
        if user_firebase_token:
            headers["Authorization"] = f"Bearer {user_firebase_token}"
        print(f"[handle_generate_pdf] Sending POST to {BACKEND_URL}/generate-pdf with payload:", payload)
        resp = requests.post(f"{BACKEND_URL}/generate-pdf", json=payload, headers=headers)
        print("[handle_generate_pdf] Response status code:", resp.status_code)
        print("[handle_generate_pdf] Response JSON:", resp.json())
        resp.raise_for_status()
        url = resp.json().get('fileUrl', '')
        print("[handle_generate_pdf] Extracted PDF URL:", url)
        answer_text = f"PDF generated: {url}" if url else "PDF generated."
        return {"answer": answer_text, "action": "pdf", "data": {"url": url}}
    except Exception as e:
        print("[handle_generate_pdf] Exception:", e)
        return {"answer": f"Failed to generate PDF: {e}", "action": "pdf", "data": {}}
