🌥️ Cloudly – AI Assistant Demo

Cloudly is a demo project showcasing how to embed an AI-powered assistant into a website.

🛠️ Tech Overview

Backend

Built with NestJS (TypeScript)

Connected to Ollama Serve running LLaMA 3

Provided API endpoints for the assistant widget

Frontend

Pure HTML/CSS/JS site

Integrated the chatbot widget via API calls

⚠️ Currently only a static site, so the widget no longer functions (backend offline due to DevOps costs)

🎯 Purpose

This project was developed as a proof-of-concept/demo, showing how a simple frontend can connect to a local or remote AI backend (Ollama + LLaMA 3) to power conversational assistants.

🚧 Current Status

✅ Static frontend live

⚠️ Backend and widget integration offline

👉 This repo serves as a reference implementation of how to integrate Ollama running locally (ollama serve) with NestJS and a simple HTML frontend.

https://cloudly-is65.vercel.app *STATIC SITE*

![1](https://github.com/user-attachments/assets/6b43dc67-81b1-4ef9-b9c8-a98dc12dfba3)
Home (desktop) — Landing hero with “Ask Cloudly” CTA. Caption: Responsive landing with assistant CTA.

![2](https://github.com/user-attachments/assets/044301af-34b9-4cf9-afa1-77153f53c6c0)
Widget open (desktop) — Ask a product question and show the answer. Caption: No-iframe widget, RAG-first with fallback.

![3](https://github.com/user-attachments/assets/0d86ade0-33b7-43c2-8835-096438d63d95)
Example question

![4](https://github.com/user-attachments/assets/5b5311a0-c313-4f44-a35c-8456a6680c7f)
Example question

![5](https://github.com/user-attachments/assets/4c8d87b5-a66f-4dbd-9948-67b017d2ac34)
Lead capture — Trigger by asking any kind of question related to more contact or difficult answering triggers forms to be sent to the Mongo

![6](https://github.com/user-attachments/assets/15576d7e-8143-4162-a43d-2345cb37d9ec)
Forms style
