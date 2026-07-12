import os
import json
from typing import List, Dict, Any, Optional
from app.config import settings

# Programmatic detection of installed Gemini SDK version
try:
    from google import genai
    from google.genai import types
    USE_NEW_SDK = True
    print("[AI Service] Detected new Google GenAI SDK (google-genai).")
except ImportError:
    import google.generativeai as genai
    from google.generativeai.types import HarmCategory, HarmBlockThreshold
    USE_NEW_SDK = False
    print("[AI Service] Detected legacy Generative AI SDK (google-generativeai).")

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self._resolved_model_name = None
        
        if not USE_NEW_SDK and self.api_key:
            genai.configure(api_key=self.api_key)

    def _check_config(self):
        if not self.api_key:
            raise ValueError(
                "Gemini API Key is not configured. Please define GEMINI_API_KEY in the backend environment variables."
            )

    def _get_supported_model(self) -> str:
        """Programmatically tests preferred models and returns the first one that successfully generates content."""
        self._check_config()
        
        if self._resolved_model_name:
            return self._resolved_model_name

        preferred_models = [
            "models/gemini-flash-latest",
            "models/gemini-2.0-flash",
            "models/gemini-1.5-flash",
            "models/gemini-2.5-flash",
            "models/gemini-2.5-pro",
            "models/gemini-pro-latest",
        ]

        # Try to find a working model from the preferred list by making a quick test generation call
        for model_name in preferred_models:
            try:
                if USE_NEW_SDK:
                    client = genai.Client(api_key=self.api_key)
                    # Test call with 1 token limit to keep it fast
                    client.models.generate_content(
                        model=model_name,
                        contents="test",
                        config=types.GenerateContentConfig(max_output_tokens=1)
                    )
                else:
                    model = genai.GenerativeModel(model_name=model_name)
                    # Test call with 1 token limit to keep it fast
                    model.generate_content("test", generation_config={"max_output_tokens": 1})
                
                # If it succeeds, cache and return it!
                self._resolved_model_name = model_name
                print(f"[AI Service] Resolved active working Gemini model: {model_name}")
                return model_name
            except Exception as e:
                print(f"[AI Service] Model {model_name} failed validation check: {str(e)[:100]}")
                continue

        # Ultimate fallback
        fallback = "models/gemini-flash-latest"
        self._resolved_model_name = fallback
        return fallback

    def chat(self, messages: List[Dict[str, str]], system_instruction: str) -> Dict[str, Any]:
        """Runs a stateless chat dialogue converting conversation history to Gemini schema."""
        self._check_config()
        model_name = self._get_supported_model()

        # Convert roles: Gemini expects 'user' or 'model'
        contents = []
        for msg in messages:
            role = "model" if msg.get("role") == "assistant" else "user"
            contents.append({
                "role": role,
                "parts": [msg.get("content", "")]
            })

        if USE_NEW_SDK:
            client = genai.Client(api_key=self.api_key)
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                safety_settings=[
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold=types.HarmBlockThreshold.BLOCK_NONE,
                    ),
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold=types.HarmBlockThreshold.BLOCK_NONE,
                    ),
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold=types.HarmBlockThreshold.BLOCK_NONE,
                    ),
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold=types.HarmBlockThreshold.BLOCK_NONE,
                    ),
                ]
            )
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config
            )
            text = response.text
        else:
            safety_settings = {
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_instruction,
                safety_settings=safety_settings
            )
            response = model.generate_content(contents)
            text = response.text

        if not text:
            raise ValueError("Gemini returned an empty response.")

        return {"role": "assistant", "content": text}

    def summarize_document(self, file_path: str, mime_type: str, prompt: str) -> Dict[str, Any]:
        """Ingests raw file binary (PDF/Image) inline and returns structured JSON OCR parameter extractions."""
        self._check_config()
        model_name = self._get_supported_model()

        if not os.path.exists(file_path):
            raise FileNotFoundError("The target document file was not found on disk.")

        with open(file_path, "rb") as f:
            file_bytes = f.read()

        if USE_NEW_SDK:
            client = genai.Client(api_key=self.api_key)
            part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                safety_settings=[
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold=types.HarmBlockThreshold.BLOCK_NONE,
                    ),
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold=types.HarmBlockThreshold.BLOCK_NONE,
                    ),
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold=types.HarmBlockThreshold.BLOCK_NONE,
                    ),
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold=types.HarmBlockThreshold.BLOCK_NONE,
                    ),
                ]
            )
            response = client.models.generate_content(
                model=model_name,
                contents=[part, prompt],
                config=config
            )
            text = response.text
        else:
            contents = [
                {
                    "mime_type": mime_type,
                    "data": file_bytes
                },
                prompt
            ]
            safety_settings = {
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }
            model = genai.GenerativeModel(
                model_name=model_name,
                safety_settings=safety_settings
            )
            generation_config = genai.GenerationConfig(
                response_mime_type="application/json"
            )
            response = model.generate_content(
                contents,
                generation_config=generation_config
            )
            text = response.text

        if not text:
            raise ValueError("Gemini returned an empty response.")

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            raise ValueError("Gemini did not return valid JSON. Response was: " + text)
