# raigo Compliance Mappings

**Specification version: 0.2.0**

This document provides the complete, canonical list of compliance framework codes supported by raigo, maps each framework to its key articles and clauses, and shows how those references appear in `.raigo` policy files and API responses.

---

## Overview

Every rule in a `.raigo` policy file may carry one or more `compliance` references. These references serve three purposes:

1. **Traceability** — linking each enforcement rule back to the specific regulatory obligation it implements.
2. **Audit evidence** — the `evaluate` API response includes `compliance_refs` from the matched rule, creating a machine-readable audit trail for every blocked or warned request.
3. **Reporting** — raigo cloud and the CLI can filter violations by framework, enabling per-regulation compliance dashboards.

---

## Supported Frameworks

### EU AI Act

The EU AI Act (Regulation (EU) 2024/1689) establishes a risk-based framework for AI systems placed on the EU market. High-risk systems are subject to the most stringent requirements.

| Code | Article / Clause | Topic | Typical raigo Use |
|---|---|---|---|
| `EUAIA-Art.9` | Article 9 | Risk management system | Rules that implement a documented risk management process |
| `EUAIA-Art.10` | Article 10 | Data governance and management | Rules blocking training data leakage or PII in prompts |
| `EUAIA-Art.11` | Article 11 | Technical documentation | Rules enforcing documentation requirements |
| `EUAIA-Art.13` | Article 13 | Transparency and provision of information | Rules requiring disclosure of AI involvement |
| `EUAIA-Art.14` | Article 14 | Human oversight | Rules that trigger human review before high-risk actions |
| `EUAIA-Art.16` | Article 16 | Obligations of providers of high-risk AI systems | Rules that enforce logging and audit trail requirements |
| `EUAIA-Art.26` | Article 26 | Obligations of deployers of high-risk AI systems | Rules applied at the deployment layer |
| `EUAIA-Art.52` | Article 52 | Transparency obligations for certain AI systems | Rules requiring chatbot disclosure |
| `EUAIA-Ann.III` | Annex III | High-risk AI system categories | Used to tag rules applicable to specific high-risk domains |

**Example:**

```yaml
compliance:
  - "EUAIA-Art.14"   # Human oversight required before high-risk action
  - "EUAIA-Art.16"   # Audit log must record this evaluation
```

---

### DORA (Digital Operational Resilience Act)

DORA (Regulation (EU) 2022/2554) applies to financial entities and their ICT third-party providers. It mandates operational resilience, incident reporting, and third-party risk management for digital systems.

| Code | Article / Clause | Topic | Typical raigo Use |
|---|---|---|---|
| `DORA-Art.5` | Article 5 | ICT risk management framework | Rules implementing the ICT risk management process |
| `DORA-Art.9` | Article 9 | Protection and prevention | Rules blocking unauthorised data access or exfiltration |
| `DORA-Art.10` | Article 10 | Detection | Rules that detect anomalous AI behaviour |
| `DORA-Art.13` | Article 13 | ICT business continuity policy | Rules ensuring AI systems degrade gracefully |
| `DORA-Art.15` | Article 15 | Reporting of major ICT-related incidents | Rules that flag incidents for mandatory reporting |
| `DORA-Art.28` | Article 28 | General principles for sound management of ICT third-party risk | Rules governing third-party AI provider usage |
| `DORA-Art.30` | Article 30 | Key contractual provisions | Rules enforcing contractual obligations on AI providers |

**Example:**

```yaml
compliance:
  - "DORA-Art.9"    # Prevent unauthorised data access
  - "DORA-Art.15"   # Flag for incident reporting
```

---

### HIPAA

The Health Insurance Portability and Accountability Act (HIPAA) governs the use and disclosure of Protected Health Information (PHI) in the United States.

| Code | Article / Clause | Topic | Typical raigo Use |
|---|---|---|---|
| `HIPAA-164.502` | §164.502 | Uses and disclosures of PHI | Rules blocking PHI disclosure via AI |
| `HIPAA-164.504` | §164.504 | Uses and disclosures — organisational requirements | Rules enforcing business associate obligations |
| `HIPAA-164.508` | §164.508 | Uses and disclosures requiring authorisation | Rules requiring patient authorisation before AI access |
| `HIPAA-164.512` | §164.512 | Uses and disclosures not requiring authorisation | Rules for permitted disclosures |
| `HIPAA-164.514` | §164.514 | De-identification of PHI | Rules blocking identifiable patient data in prompts |
| `HIPAA-164.312` | §164.312 | Technical safeguards | Rules enforcing access controls and audit controls |
| `HIPAA-164.316` | §164.316 | Policies and procedures | Rules implementing documented governance procedures |

**Example:**

```yaml
compliance:
  - "HIPAA-164.514"   # De-identification — block identifiable patient data
  - "HIPAA-164.312"   # Technical safeguards — enforce access control
```

---

### ISO 42001 (AI Management System)

ISO/IEC 42001:2023 is the international standard for AI management systems. It provides a framework for organisations to manage AI responsibly.

| Code | Clause | Topic | Typical raigo Use |
|---|---|---|---|
| `ISO42001-4.1` | Clause 4.1 | Understanding the organisation and its context | Rules reflecting organisational risk context |
| `ISO42001-5.2` | Clause 5.2 | AI policy | Rules implementing the documented AI policy |
| `ISO42001-6.1` | Clause 6.1 | Actions to address risks and opportunities | Rules implementing risk treatment actions |
| `ISO42001-6.2` | Clause 6.2 | AI system objectives | Rules aligned with documented AI objectives |
| `ISO42001-7.5` | Clause 7.5 | Documented information | Rules enforcing documentation and record-keeping |
| `ISO42001-8.4` | Clause 8.4 | AI system impact assessment | Rules implementing impact assessment controls |
| `ISO42001-9.1` | Clause 9.1 | Monitoring, measurement, analysis and evaluation | Rules supporting performance monitoring |
| `ISO42001-A.6` | Annex A — A.6 | AI system operation | Controls for AI system operational governance |

**Example:**

```yaml
compliance:
  - "ISO42001-6.1"   # Risk treatment action
  - "ISO42001-7.5"   # Documented information — audit trail
```

---

### NIST AI RMF

The NIST AI Risk Management Framework (AI RMF 1.0, January 2023) provides a voluntary framework for managing AI risks across four core functions: GOVERN, MAP, MEASURE, MANAGE.

| Code | Function / Category | Topic | Typical raigo Use |
|---|---|---|---|
| `NIST-GOVERN-1.1` | GOVERN 1.1 | Policies and procedures for AI risk | Rules implementing documented AI risk policies |
| `NIST-GOVERN-1.2` | GOVERN 1.2 | Accountability and oversight | Rules enforcing human oversight requirements |
| `NIST-GOVERN-2.2` | GOVERN 2.2 | AI risk tolerance | Rules aligned with the organisation's risk tolerance |
| `NIST-MAP-1.1` | MAP 1.1 | Context is established | Rules reflecting the deployment context |
| `NIST-MAP-2.1` | MAP 2.1 | Scientific findings reviewed | Rules based on validated risk findings |
| `NIST-MEASURE-2.5` | MEASURE 2.5 | AI system to be evaluated | Rules supporting systematic AI evaluation |
| `NIST-MANAGE-1.3` | MANAGE 1.3 | Responses to AI risks | Rules implementing risk response actions |
| `NIST-MANAGE-4.1` | MANAGE 4.1 | Post-deployment monitoring | Rules supporting ongoing monitoring |

**Example:**

```yaml
compliance:
  - "NIST-GOVERN-1.2"   # Accountability and oversight
  - "NIST-MANAGE-1.3"   # Risk response action
```

---

### GDPR and UK GDPR

| Code | Article | Topic | Typical raigo Use |
|---|---|---|---|
| `GDPR-Art.5` | Article 5 | Principles relating to processing | Rules enforcing data minimisation and purpose limitation |
| `GDPR-Art.6` | Article 6 | Lawfulness of processing | Rules requiring lawful basis before AI data processing |
| `GDPR-Art.9` | Article 9 | Special categories of personal data | Rules blocking sensitive data (health, biometric, etc.) |
| `GDPR-Art.22` | Article 22 | Automated individual decision-making | Rules requiring human review for automated decisions |
| `GDPR-Art.25` | Article 25 | Data protection by design and by default | Rules implementing privacy-by-design controls |
| `UKGDPR-Art.9` | UK GDPR Article 9 | Special categories (UK) | UK-specific equivalent of GDPR Art.9 |

---

### Additional Frameworks

| Code | Framework | Notes |
|---|---|---|
| `SOC2-CC6.1` | SOC 2 — Common Criteria 6.1 | Logical and physical access controls |
| `SOC2-CC7.2` | SOC 2 — Common Criteria 7.2 | System monitoring |
| `ISO27001-A.8.2` | ISO 27001 — Annex A.8.2 | Information classification |
| `ISO27001-A.9.4` | ISO 27001 — Annex A.9.4 | System and application access control |
| `PCI-DSS-3.4` | PCI DSS 3.4 | Cardholder data protection |
| `PCI-DSS-6.3` | PCI DSS 6.3 | Vulnerability management |
| `CMMC-AC.1.001` | CMMC — Access Control | Limit system access to authorised users |
| `FCA-SYSC.6.1` | FCA — SYSC 6.1 | Compliance function |
| `FCA-PRIN.2.1` | FCA — PRIN 2.1 | Skill, care and diligence |
| `CQC-Reg.17` | CQC Regulation 17 | Good governance |
| `NIST-CSF-PR.DS-1` | NIST CSF — Protect: Data Security | Data-at-rest protection |

---

## Compliance Reference Format Rules

All compliance references in `.raigo` files must follow the format `FRAMEWORK-ARTICLE`:

```
EUAIA-Art.14
DORA-Art.9
HIPAA-164.514
ISO42001-6.1
NIST-GOVERN-1.2
GDPR-Art.9
SOC2-CC6.1
```

The following rules apply:

1. **Use only codes from this document.** Do not invent new framework codes.
2. **Use the exact capitalisation shown.** `EUAIA-Art.14` is correct; `euaia-art14` is not.
3. **Use the most specific article available.** Prefer `EUAIA-Art.14` over just `EUAIA`.
4. **Multiple frameworks may be cited.** A single rule may carry references from several frameworks.
5. **When no specific article applies,** use just the framework code: `HIPAA`, `GDPR`, `SOC2`.

---

## Example: Multi-Framework Policy Rule

The following rule demonstrates how a single enforcement control can map to multiple regulatory frameworks simultaneously:

```yaml
- id: "FIN-PHI-001"
  name: "Block Customer Financial Data in AI Prompts"
  description: "Prevents AI from processing identifiable customer financial records"
  enabled: true
  action: block
  severity: critical
  triggers:
    prompt_contains:
      - "account number"
      - "sort code"
      - "IBAN"
      - "credit score"
      - "bank statement"
  message: "Processing identifiable customer financial data via AI is not permitted under data governance policy."
  error_code: "FIN_PHI_001_VIOLATION"
  compliance:
    - "GDPR-Art.9"          # Special categories — financial data
    - "DORA-Art.9"          # ICT protection and prevention
    - "EUAIA-Art.10"        # Data governance for high-risk AI
    - "ISO42001-6.1"        # Risk treatment action
    - "NIST-GOVERN-1.2"     # Accountability and oversight
    - "FCA-PRIN.2.1"        # FCA — skill, care and diligence
```

---

## Compliance in API Responses

When a rule fires during evaluation, the `compliance_refs` field in the API response contains the compliance references from the matched rule:

```json
{
  "action": "block",
  "rule_id": "FIN-PHI-001",
  "rule_name": "Block Customer Financial Data in AI Prompts",
  "severity": "critical",
  "message": "Processing identifiable customer financial data via AI is not permitted under data governance policy.",
  "error_code": "FIN_PHI_001_VIOLATION",
  "compliance_refs": [
    "GDPR-Art.9",
    "DORA-Art.9",
    "EUAIA-Art.10",
    "ISO42001-6.1",
    "NIST-GOVERN-1.2",
    "FCA-PRIN.2.1"
  ],
  "latency_ms": 3
}
```

This response can be logged directly to an audit trail system, providing machine-readable evidence of which regulatory obligations were enforced for each AI interaction.

---

## Compliance Dashboard Filtering

The raigo cloud dashboard and CLI support filtering violation logs by framework code:

```bash
# Show all violations mapped to EU AI Act
raigo violations --framework EUAIA

# Show all violations mapped to DORA in the last 30 days
raigo violations --framework DORA --since 30d

# Export DORA violations as JSON for regulatory reporting
raigo violations --framework DORA --format json > dora-violations.json
```

---

## References

- EU AI Act (Regulation (EU) 2024/1689): https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689
- DORA (Regulation (EU) 2022/2554): https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554
- HIPAA: https://www.hhs.gov/hipaa/for-professionals/index.html
- ISO/IEC 42001:2023: https://www.iso.org/standard/81230.html
- NIST AI RMF 1.0: https://airc.nist.gov/RMF/Overview
- GDPR: https://gdpr-info.eu
- UK GDPR: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/
