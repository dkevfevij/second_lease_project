import os
import requests
import re
from dotenv import load_dotenv
load_dotenv()

CHATPDF_API_KEY = os.getenv("CHATPDF_API_KEY")

if not CHATPDF_API_KEY or not CHATPDF_API_KEY.startswith("sec_"):
    raise Exception("❌ Clé API ChatPDF invalide ou absente. Vérifie ton .env")

headers = {
    "x-api-key": CHATPDF_API_KEY
}


def upload_pdf_to_chatpdf(filepath):
    url = "https://api.chatpdf.com/v1/sources/add-file"
    with open(filepath, "rb") as f:
        response = requests.post(url, headers=headers, files={"file": f})
        if response.status_code != 200:
            raise Exception(f"❌ Erreur upload: {response.status_code} - {response.text}")
        return response.json()["sourceId"]


def ask_chatpdf_for_extraction(source_id):
    url = "https://api.chatpdf.com/v1/chats/message"
    payload = {
        "sourceId": source_id,
        "referenceSources": False,  # ✅ pour éviter les [P2], [P4], etc.
        "messages": [
            {
                "role": "user",
                "content": (
                    "Lis uniquement les sections contenant des articles ou des produits à installer ou livrer.\n"
                    "Retourne uniquement un tableau JSON comme celui-ci :\n\n"
                    "[\n"
                    "  {\n"
                    "    \"type\": \"produit\",\n"
                    "    \"reference\": \"10W40\",\n"
                    "    \"description\": \"Huile moteur 10W40\",\n"
                    "    \"quantite\": 40.0\n"
                    "  },\n"
                    "  {\n"
                    "    \"type\": \"article\",\n"
                    "    \"reference\": \"V2F\",\n"
                    "    \"description\": \"VIDANGE MOTEUR 2 FILTRE\",\n"
                    "    \"quantite\": 1.0\n"
                    "  }\n"
                    "]\n\n"
                    "Retourne uniquement ce tableau JSON, sans aucun texte avant ou après."
                )
            }
        ]
    }

    response = requests.post(url, headers=headers, json=payload)
    if response.status_code != 200:
        raise Exception(f"❌ Erreur ChatPDF: {response.status_code} - {response.text}")

    content = response.json()["content"]

    # 🔍 Log complet pour vérification
    print("\n🧠 Réponse BRUTE de ChatPDF :\n", content, "\n🔚 Fin de réponse\n")

    # ✅ Extraction stricte du JSON dans la réponse
    match = re.search(r"\[\s*{.*?}\s*\]", content, re.DOTALL)
    if not match:
        raise Exception("❌ Aucun tableau JSON détecté dans la réponse :\n" + content)

    return match.group(0) 