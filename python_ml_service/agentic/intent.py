import openai

def classify_intent(query: str) -> dict:
    system_prompt = (
        "Classify the user's intent as one of: document_query, send_email, schedule_meeting, linkedin_post, generate_pdf. "
        "Return JSON: {\"intent\": ..., \"requires_action\": true/false}. "
        "If the user is asking ABOUT the document, intent is document_query. "
        "If the user is asking to DO something, intent is the corresponding action."
    )
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": query}
    ]
    resp = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=messages,
        max_tokens=50,
        temperature=0
    )
    import json
    try:
        return json.loads(resp['choices'][0]['message']['content'])
    except Exception:
        return {"intent": "document_query", "requires_action": False}
