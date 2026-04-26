# 🎯 EquiLens — AI Ethics Operating System

![EquiLens Hero](https://via.placeholder.com/1200x400/8B5CF6/ffffff?text=EquiLens+-+Detect+and+Fix+Bias+in+AI+Systems)

**EquiLens** helps organizations build fair, transparent, and compliant AI systems. It is an end-to-end AI ethics operating system that makes bias visible, explains its root causes, and provides an interactive environment to simulate and apply real-time fixes before your AI models hit production.

---

## 🧠 The Problem

Modern AI systems drive critical decisions in hiring, lending, healthcare, and law enforcement. However, they often inherit deeply ingrained biases from historical data. 

This leads to:
* **Unfair Outcomes**: Systematic discrimination against marginalized groups based on gender, race, or age.
* **Legal Risks**: Non-compliance with strict new regulations like the EU AI Act, GDPR (Art. 22), and US EO 13985.
* **Erosion of Trust**: Loss of consumer and stakeholder confidence in algorithmic decision-making.

---

## 🚀 The Solution

EquiLens transforms AI compliance from an abstract legal requirement into an actionable engineering workflow.

* 🔍 **Make Bias Visible**: Instantly analyze training datasets to surface disparate impacts.
* 💡 **Explain It Clearly**: AI-generated insights translate complex statistical disparities into plain-English root causes.
* ⚙️ **Real-Time Fixes**: Interactively simulate parameter adjustments and instantly see their impact on fairness.
* 📄 **Deployable Strategy**: Generate a comprehensive, audit-ready compliance report.

---

## ✨ Key Features

* **Bias Detection Engine**: Analyzes structured datasets to detect disparities across protected attributes (gender, age, race, etc.).
* **AI Insight Panel**: Uses Google Gemini to explain *why* the bias exists and how features intersect to cause unfairness.
* **Recommended Actions**: Auto-generates actionable, targeted remediation strategies.
* **Real-time Simulation (What-If Analysis)**: A dynamic playground to test fairness tweaks instantly without touching the underlying model.
* **Demo Mode**: A guided, one-click walkthrough designed for presentations to demonstrate live bias fixing.
* **Exportable Compliance Report**: Generates JSON/PDF documentation of all applied fixes, fairness deltas, and regulatory compliance checks.
* **Dual UI Mode**: Switch between a gamified "Demo" presentation mode and a professional "Enterprise" dashboard.

---

## 🧪 How It Works

The system is designed around a simple, 5-step interactive workflow:

1. **Upload Dataset**: Ingest your raw structured CSV data.
2. **Analyze Bias**: The engine parses the data and flags fairness violations.
3. **Review Issues**: Read the AI-generated diagnosis to understand the root causes.
4. **Apply Fixes**: Use sliders or one-click auto-fixes to simulate fairness improvements.
5. **Export Report**: Download a certified compliance log detailing the exact steps taken to remediate the system.

---

## 📂 Data Format

EquiLens is designed to analyze **structured tabular datasets**. 

To get the best results, your CSV file should include:
* **Protected Attributes**: Columns representing demographic features (e.g., `gender`, `age`, `race`, `ethnicity`).
* **Target Outcome**: The label or decision column (e.g., `hired`, `approved`, `score`).
* **General Features**: Other relevant data points used for the decision process.

*A sample dataset (`sample_hiring.csv`) is included in the project root for testing.*

---

## 🏗️ Tech Stack

**Frontend**
* React 19 + Vite
* Zustand (Global State Management)
* Recharts & Chart.js (Data Visualization)

**Backend**
* FastAPI (Python)
* Pandas / NumPy (Data Processing)

**AI Integration**
* Google Gemini API (via Google AI Studio) for advanced insight generation.
* Robust local heuristic fallbacks when offline.

**Deployment & Cloud**
* Frontend hosted on Vercel.
* Backend hosted on Google Cloud / Vercel Serverless Functions.

---

## 📊 Live Demo

**Experience EquiLens in Action!**
We've built a dedicated **Demo Mode** specifically for hackathons and presentations. Click the "Run Live Demo" button on the onboarding screen to watch the system orchestrate an automatic 4-step bias remediation sequence, transforming a highly biased dataset into a compliant state in seconds.

---

## ⚠️ Limitations

* **Simulation Only**: EquiLens is a diagnostic and simulation tool; it does not directly modify your raw dataset or retrain your actual machine learning weights.
* **Data Types**: The current version only supports structured tabular data (CSV) and does not yet analyze unstructured text, audio, or image models.

---

## 🔮 Future Work

* **Automatic Dataset Transformation**: Exporting re-weighted or synthetically balanced datasets directly from the UI.
* **Model Retraining Pipelines**: Integration with MLOps platforms to automatically push fairness constraints to the training layer.
* **Advanced Metrics**: Support for Equalized Odds, Demographic Parity, and Counterfactual Fairness testing.

---

<div align="center">
  <b>EquiLens</b><br>
  <i>Empowering organizations to build the next generation of fair, transparent, and compliant AI.</i>
</div>
