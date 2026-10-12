# Cassandra AI — Cyber Operations Platform

<p align="center">
  <img src="cs.png" alt="Cassandra AI Logo" width="120" />
</p>

<h3 align="center">AI-Powered Cyber Operations & Security Analysis</h3>

<p align="center">
  A multi-agent cybersecurity interface for AI-assisted security analysis, investigation, and operational workflows.
</p>

<p align="center">
  <a href="https://cassandra-new-face.vercel.app/"><strong>🚀 Live Demo</strong></a>
  ·
  <a href="https://github.com/mustafaColak0/CassandraNewFace"><strong>📦 GitHub Repository</strong></a>
</p>

---

## Overview

**Cassandra AI** is an AI-powered cyber operations platform designed to bring cybersecurity analysis into a unified, interactive interface.

It combines a cyber operations dashboard with role-oriented AI analysis workflows, allowing users to submit questions, examine security-related scenarios, and analyze supported files through a configurable AI backend.

The project focuses on usability, modularity, and a modern security operations experience.

## Preview

<!-- Replace cassandra-demo.gif with your optimized GIF filename -->
<p align="center">
  <img width="800" height="357" alt="cassssss-ezgif com-video-to-gif-converter" src="https://github.com/user-attachments/assets/4902f6ef-fe4d-46a8-b3ad-ca6a25fdaa09" />

</p>

## Key Features

- **Cyber Operations Dashboard** — A dark, HUD-inspired interface with live clock displays, telemetry panels, and operational status indicators.
- **Role-Oriented AI Analysis** — Switch between specialized analyst profiles, including Red Team, Blue Team, Strategist, OSINT, Threat Intelligence, Forensics, and Compliance.
- **General Chat Mode** — Ask general questions without selecting a cybersecurity scenario.
- **Scenario-Based Workflows** — Choose a security domain and a corresponding scenario to guide an analysis.
- **Text and Log Analysis** — Upload supported TXT, LOG, JSON, CSV, and Markdown files for contextual analysis.
- **Image Analysis** — Submit supported images for AI-assisted visual inspection.
- **Analysis Reports** — Display generated analysis in the application interface and preserve reports in the local session history.
- **PDF Export** — Export analysis reports as PDF documents.
- **Pass-to-Expert Workflow** — Continue an analysis with a different analyst profile.
- **Bring Your Own Key (BYOK)** — Use your own Groq API key rather than relying on a hard-coded project key.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Node.js, Express |
| Serverless Deployment | Vercel Functions |
| AI Provider | Groq API |
| AI SDK | Groq JavaScript SDK |
| Report Export | jsPDF |
| Version Control | Git & GitHub |

## Getting Started

### Prerequisites

- Node.js and npm
- A Groq API key
- Git (for cloning the repository)

### Installation

Clone the repository:

```bash
git clone https://github.com/mustafaColak0/CassandraNewFace.git
cd CassandraNewFace
```

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm start
```

Open the application at:

```text
http://localhost:5000
```

### API Key Setup

1. Open the application.
2. Enter your Groq API key in the connection screen.
3. Connect to the system and begin an analysis.

Cassandra AI uses a **Bring Your Own Key (BYOK)** workflow. The key is supplied with analysis requests to the application's backend, which uses it to communicate with Groq. The key is not intended to be committed to the repository or configured as a shared public project secret.

**Important:** Treat your API key as a secret. Do not share it, commit it to Git, or enter it into an untrusted deployment.

## Deployment

The current live version is deployed on Vercel:

**Live application:** https://cassandra-new-face.vercel.app/

The project uses Vercel serverless endpoints under the `api/` directory and keeps `server.js` for local Express development.

## Security & Responsible Use

Cassandra AI is intended for cybersecurity learning, authorized testing, defensive analysis, and security investigation.

- Only test systems you own or have explicit permission to assess.
- Do not submit sensitive data unless you are authorized to process it.
- Review AI-generated findings before using them in real operational decisions.
- AI-generated output may be incomplete or inaccurate and should not replace independent verification.
- Keep API keys and other credentials private.

## Project Status

Cassandra AI is an actively evolving personal project. Features, model availability, and analysis behavior may change as development continues.

## Author

**Mustafa Çolak**

- GitHub: [@mustafaColak0](https://github.com/mustafaColak0)
- Project: [CassandraNewFace](https://github.com/mustafaColak0/CassandraNewFace)
- Live Demo: [Cassandra AI](https://cassandra-new-face.vercel.app/)

---

<p align="center">
  <i>Built to explore the intersection of AI and cybersecurity operations.</i>
</p>
