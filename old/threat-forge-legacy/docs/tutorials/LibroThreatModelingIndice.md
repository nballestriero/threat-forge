# Threat Modeling Moderno con Overlay di Threat Intelligence

## Parte I: Fondamenta del Threat Modeling

### Capitolo 1: Introduzione al Threat Modeling Moderno
- 1.1 Cos'è il threat modeling e perché è essenziale
- 1.2 Evoluzione: da checklist a processo continuo
- 1.3 I 4 pilastri del threat modeling moderno
- 1.4 Diagramma: Maturità del threat modeling
- 1.5 Esercizio: Analisi di un caso reale

### Capitolo 2: Metodologie a Confronto
- 2.1 STRIDE: Microsoft Security Development Lifecycle
- 2.2 PASTA: Process for Attack Simulation and Threat Analysis
- 2.3 LINDDUN: Privacy-focused threat modeling
- 2.4 Trike: Risk-based approach
- 2.5 VAST: Visual, Agile, Simple Threat modeling
- 2.6 Tabella comparativa metodologie
- 2.7 Diagramma: Mappatura metodologie vs scenari
- 2.8 Esercizio guidato: Scegliere la metodologia

## Parte II: Layer 1 - Asset Inventory

### Capitolo 3: Identificazione e Classificazione degli Asset
- 3.1 Cosa sono gli asset: dati, sistemi, processi, persone
- 3.2 Asset inventory: il fondamento di tutto
- 3.3 Classificazione degli asset
  - Criticità (critical, high, medium, low)
  - Data classification (public, internal, confidential, restricted)
  - Regulatory requirements (GDPR, PCI-DSS, HIPAA)
- 3.4 Diagramma: Tassonomia degli asset
- 3.5 Esempio pratico: Asset inventory per e-commerce
- 3.6 Template YAML per asset definition
- 3.7 Esercizio guidato: Asset inventory per banking app
- 3.8 Esercizio autonomo: Asset inventory per IoT healthcare

### Capitolo 4: Asset Modeling con Zod e Validazione
- 4.1 Schema definition con Zod
- 4.2 Type inference e validation runtime
- 4.3 Custom validators per asset classification
- 4.4 Error handling strutturato
- 4.5 Diagramma: Flow di validazione asset
- 4.6 Codice: Implementazione Zod schema
- 4.7 Esercizio: Validare asset inventory con edge cases

## Parte III: Layer 2 - Data Flow Diagram (DFD)

### Capitolo 5: Data Flow Diagram - Teoria e Pratica
- 5.1 Cos'è un DFD e perché è fondamentale
- 5.2 Elementi del DFD
  - External Entities (attori esterni)
  - Processes (elaborazioni)
  - Data Stores (archivi dati)
  - Data Flows (flussi di dati)
  - Trust Boundaries (confini di sicurezza)
- 5.3 Livelli di DFD: Context → Level 0 → Level 1 → Level 2
- 5.4 Diagramma: Esempio DFD completo
- 5.5 Best practices: Come evitare DFD troppo complessi
- 5.6 Anti-pattern: Errori comuni nei DFD
- 5.7 Esercizio: Creare DFD Level 0 e Level 1

### Capitolo 6: DFD in YAML - Modellazione Testuale
- 6.1 Perché YAML per i DFD
- 6.2 Schema YAML per DFD components
- 6.3 Schema YAML per DFD flows
- 6.4 Trust boundaries e security zones
- 6.5 Diagramma Mermaid: Visualizzazione DFD da YAML
- 6.6 Esempio completo: DFD per microservices
- 6.7 Tooling: Generare visualizzazioni automatiche
- 6.8 Esercizio guidato: DFD per social media application
- 6.9 Esercizio autonomo: DFD per cloud storage service

### Capitolo 7: Visualizzazione DFD con Mermaid e D3.js
- 7.1 Mermaid.js: diagrammi come codice
- 7.2 D3.js: visualizzazioni interattive avanzate
- 7.3 Cytoscape.js: grafi complessi e analisi
- 7.4 Diagramma: Confronto tra tool di visualizzazione
- 7.5 Codice: Generare DFD interattivo da YAML
- 7.6 Esercizio: Creare visualizzazione DFD con zoom e pan

## Parte IV: Layer 3 - Threat Analysis (STRIDE)

### Capitolo 8: STRIDE - Metodologia Completa
- 8.1 Origini di STRIDE (Microsoft SDL)
- 8.2 Le 6 categorie di minacce
  - Spoofing: falsificazione identità
  - Tampering: alterazione dati
  - Repudiation: negazione azioni
  - Information Disclosure: esposizione dati
  - Denial of Service: indisponibilità
  - Elevation of Privilege: escalation privilegi
- 8.3 Diagramma: STRIDE matrix applicata a DFD
- 8.4 Mapping STRIDE → DFD elements
- 8.5 Esempio pratico: STRIDE su ogni elemento DFD
- 8.6 Esercizio: Applicare STRIDE a DFD esistente

### Capitolo 9: STRIDE Analyzer - Implementazione
- 9.1 Algoritmo di analisi automatica STRIDE
- 9.2 Pattern matching per identificare minacce
- 9.3 Severity scoring (CVSS-like)
- 9.4 Mitigation recommendations
- 9.5 Diagramma di flusso: Processo di analisi STRIDE
- 9.6 Codice completo: STRIDE analyzer in JavaScript
- 9.7 Esempio pratico: Analisi STRIDE su DFD reale
- 9.8 Esercizio guidato: STRIDE analysis su e-commerce
- 9.9 Esercizio autonomo: STRIDE analysis su API gateway

### Capitolo 10: Threat Prioritization e Risk Scoring
- 10.1 DREAD model (Deprecated ma utile storicamente)
- 10.2 CVSS (Common Vulnerability Scoring System)
- 10.3 Risk matrix: Likelihood × Impact
- 10.4 FAIR (Factor Analysis of Information Risk)
- 10.5 Diagramma: Risk matrix 5×5
- 10.6 Tabella: Confronto metodi di scoring
- 10.7 Esercizio: Calcolare risk score per 10 minacce

## Parte V: Layer 3 - Threat Analysis (PASTA)

### Capitolo 11: PASTA - I 7 Step
- 11.1 Introduzione a PASTA
- 11.2 I 7 step di PASTA
  1. Define Objectives: Business e security objectives
  2. Define Scope: Application boundaries
  3. Application Decomposition: DFD e asset inventory
  4. Threat Analysis: STRIDE-like analysis
  5. Vulnerability Detection: CVE, weakness analysis
  6. Attack Modeling: Attack trees, kill chains
  7. Risk & Impact Analysis: Business impact
- 11.3 Diagramma: PASTA workflow completo
- 11.4 Confronto: PASTA vs STRIDE vs LINDDUN
- 11.5 Esercizio: Applicare step 1-3 di PASTA

### Capitolo 12: Attack Trees e Kill Chains
- 12.1 Attack trees: modellazione gerarchica degli attacchi
- 12.2 MITRE ATT&CK framework
- 12.3 Cyber Kill Chain (Lockheed Martin)
- 12.4 Diamond Model for Intrusion Analysis
- 12.5 Diagramma: Attack tree per credential theft
- 12.6 Esempio: Mappatura ATT&CK su threat model
- 12.7 Esercizio: Costruire attack tree per data exfiltration

### Capitolo 13: PASTA Implementation
- 13.1 Implementazione step-by-step di PASTA
- 13.2 Template per ogni fase
- 13.3 Tooling e automazione
- 13.4 Diagramma: PASTA workflow automation
- 13.5 Codice: PASTA analyzer framework
- 13.6 Esercizio guidato: PASTA analysis completa

## Parte VI: Layer 4 - Threat Intelligence Overlay (STIX 2.1)

### Capitolo 14: Introduzione a STIX 2.1
- 14.1 Cos'è STIX (Structured Threat Information eXpression)
- 14.2 Storia e standardizzazione OASIS
- 14.3 Use cases: sharing, correlation, enrichment
- 14.4 STIX 2.1 vs STIX 1.x (cambiamenti major)
- 14.5 Diagramma: STIX ecosystem e relazioni
- 14.6 Confronto: STIX vs OpenIOC vs IODEF
- 14.7 Esempio: STIX bundle semplice
- 14.8 Esercizio: Creare STIX bundle base

### Capitolo 15: STIX Domain Objects (SDO)
- 15.1 Panoramica completa degli SDO
  - threat-actor: Chi attacca
  - intrusion-set: Campagne organizzate
  - malware: Codice malevolo
  - attack-pattern: Tecniche (MITRE ATT&CK)
  - indicator: IOC (Indicators of Compromise)
  - vulnerability: CVE
  - course-of-action: Mitigazioni
  - infrastructure: Reti, sistemi
  - identity: Organizzazioni, individui
  - location: Geolocalizzazione
- 15.2 Diagramma: Relazioni tra SDO
- 15.3 Esempi pratici: Ogni SDO con casi reali
- 15.4 Esercizio: Creare STIX bundle per APT group

### Capitolo 16: STIX Relationship Objects (SRO)
- 16.1 Tipi di relazioni STIX
  - relationship: Generic relationship
  - sighting: Avvistamento IOC
- 16.2 Relationship types
  - uses, targets, mitigates, indicates
  - attributed-to, variant-of, part-of
  - related-to, derived-from, based-on
- 16.3 Diagramma: Graph di relazioni STIX
- 16.4 Esempio: APT → uses → Malware → targets → Vulnerability
- 16.5 Esercizio: Modellare kill chain con SRO

### Capitolo 17: STIX Patterning Language
- 17.1 Cos'è STIX Patterning (simile a SQL per threat intel)
- 17.2 Sintassi base: `[object-type:field OPERATOR value]`
- 17.3 Operatori: =, !=, >, <, IN, LIKE, MATCHES
- 17.4 Combinazioni: AND, OR, NOT
- 17.5 Qualifiers: START, STOP, WITHIN
- 17.6 Esempi pratici di pattern
- 17.7 Esercizio: Scrivere pattern per IOC complessi

### Capitolo 18: TAXII 2.1 - Sharing Protocol
- 18.1 Cos'è TAXII (Trusted Automated eXchange)
- 18.2 TAXII 2.1 architecture
  - Discovery: Trovare servizi TAXII
  - API Root: Punti di accesso
  - Collections: Gruppi di indicatori
  - Channel: Publish/subscribe
- 18.3 Diagramma: TAXII client-server architecture
- 18.4 Esempio: TAXII server implementation
- 18.5 Esercizio: Configurare client TAXII

### Capitolo 19: STIX Overlay - Integrazione con STRIDE
- 19.1 Il concetto di overlay: arricchire minacce STRIDE
- 19.2 Mapping STRIDE → STIX
  - Information Disclosure → indicator, malware
  - Tampering → attack-pattern, vulnerability
  - Spoofing → threat-actor, intrusion-set
- 19.3 Diagramma: STRIDE + STIX integration flow
- 19.4 Algoritmo: Correlazione automatica
- 19.5 Codice: STIX enrichment engine
- 19.6 Esempio completo: Da STRIDE threat a enriched threat
- 19.7 Esercizio guidato: Enrichment su payment system

### Capitolo 20: MITRE ATT&CK Integration
- 20.1 Cos'è MITRE ATT&CK
- 20.2 Tactic, Technique, Procedure (TTP)
- 20.3 ATT&CK Navigator
- 20.4 Mapping ATT&CK → STRIDE
- 20.5 Diagramma: ATT&CK matrix visualizzazione
- 20.6 Esempio: ATT&CK techniques per web application
- 20.7 Codice: ATT&CK STIX bundle parser
- 20.8 Esercizio: Mappare tecniche ATT&CK su DFD

### Capitolo 21: Threat Intelligence Sources
- 21.1 Fonti gratuite
  - MITRE ATT&CK
  - MISP (Malware Information Sharing Platform)
  - AlienVault OTX
  - CISA AIS (Automated Indicator Sharing)
  - Abuse.ch
- 21.2 Fonti commerciali
  - Recorded Future
  - CrowdStrike Intelligence
  - Mandiant
  - ThreatConnect
- 21.3 Tabella comparativa: Fonti di threat intelligence
- 21.4 Diagramma: Threat intelligence pipeline
- 21.5 Esercizio: Configurare feed MISP in STIX

## Parte VII: Implementation & Tooling

### Capitolo 22: Architettura Software del Threat Modeling Tool
- 22.1 Architettura esagonale (Ports and Adapters)
- 22.2 Domain-Driven Design (DDD) per threat modeling
- 22.3 Diagramma: Architettura completa a layer
- 22.4 Codice: Project structure e dependency injection
- 22.5 Best practices: Separation of concerns

### Capitolo 23: YAML Parser e Validator
- 23.1 Implementazione parser YAML
- 23.2 Validazione con Zod schemas
- 23.3 Error handling e reporting
- 23.4 Diagramma: Validation pipeline
- 23.5 Codice: Zod schemas per threat model
- 23.6 Esercizio: Validare threat model complessi

### Capitolo 24: DFD Visualization Engine
- 24.1 Mermaid.js integration
- 24.2 D3.js per visualizzazioni avanzate
- 24.3 Export SVG/PNG/PDF
- 24.4 Diagramma: Rendering pipeline
- 24.5 Codice: DFD renderer da YAML
- 24.6 Esercizio: Creare visualizzazione interattiva

### Capitolo 25: Threat Analysis Engine
- 25.1 STRIDE analyzer implementation
- 25.2 PASTA workflow engine
- 25.3 Risk scoring algorithms
- 25.4 Diagramma: Analysis pipeline
- 25.5 Codice: Complete threat analyzer
- 25.6 Esercizio: Estendere analyzer con custom rules

### Capitolo 26: STIX Integration Layer
- 26.1 STIX bundle loader
- 26.2 STIX validator (validazione spec 2.1)
- 26.3 STIX ↔ Internal model converter
- 26.4 Diagramma: STIX integration architecture
- 26.5 Codice: STIX adapter pattern
- 26.6 Esercizio: Importare MITRE ATT&CK STIX bundle

### Capitolo 27: Report Generation
- 27.1 Template engine per report
- 27.2 Markdown → PDF conversion
- 27.3 Executive summary automation
- 27.4 Diagramma: Report generation flow
- 27.5 Esempio: Report completo threat model
- 27.6 Esercizio: Customizzare template report

## Parte VIII: Advanced Topics

### Capitolo 28: Automation e CI/CD Integration
- 28.1 Threat modeling as code
- 28.2 GitHub Actions / GitLab CI integration
- 28.3 Automated threat detection on PR
- 28.4 Diagramma: CI/CD pipeline con threat modeling
- 28.5 Esempio: GitHub Actions workflow
- 28.6 Esercizio: Configurare automated threat check

### Capitolo 29: Compliance Mapping
- 29.1 GDPR compliance checking
- 29.2 PCI-DSS requirements mapping
- 29.3 ISO 27001 controls
- 29.4 NIST Cybersecurity Framework
- 29.5 Tabella: Compliance frameworks mapping
- 29.6 Diagramma: Compliance verification flow
- 29.7 Esercizio: Mappare controlli PCI-DSS

### Capitolo 30: Machine Learning per Threat Modeling
- 30.1 ML per threat classification
- 30.2 Anomaly detection in DFD
- 30.3 Predictive risk scoring
- 30.4 Diagramma: ML pipeline per threat modeling
- 30.5 Esempio: Modello ML per severity prediction
- 30.6 Esercizio: Training dataset per threat classification

### Capitolo 31: Collaborative Threat Modeling
- 31.1 Multi-user editing
- 31.2 Version control e diff
- 31.3 Review workflow
- 31.4 Diagramma: Collaborative workflow
- 31.5 Esempio: WebSocket per real-time collaboration
- 31.6 Esercizio: Implementare review comments system

## Parte IX: Case Studies

### Capitolo 32: Case Study 1 - E-Commerce Platform
- 32.1 Scenario: Piattaforma e-commerce con pagamenti
- 32.2 Asset inventory completo
- 32.3 DFD multi-livello
- 32.4 STRIDE analysis
- 32.5 PASTA analysis
- 32.6 STIX enrichment con threat intelligence
- 32.7 Diagrammi: DFD completo, attack tree, risk matrix
- 32.8 Report: Threat model completo

### Capitolo 33: Case Study 2 - Healthcare IoT Device
- 33.1 Scenario: Dispositivo medico IoT
- 33.2 Regulatory requirements (HIPAA, FDA)
- 33.3 Privacy-focused analysis (LINDDUN)
- 33.4 Hardware + software threat modeling
- 33.5 Diagrammi: Architecture DFD, data lifecycle
- 33.6 Report: Compliance + security analysis

### Capitolo 34: Case Study 3 - Cloud-Native Microservices
- 34.1 Scenario: Architettura microservices su Kubernetes
- 34.2 Cloud-specific threats
- 34.3 Container security
- 34.4 Service mesh threat modeling
- 34.5 Diagrammi: Microservices DFD, trust boundaries
- 34.6 Report: Cloud security assessment

### Capitolo 35: Case Study 4 - Mobile Banking App
- 35.1 Scenario: Applicazione mobile banking
- 35.2 Mobile-specific threats (OWASP Mobile Top 10)
- 35.3 API security
- 35.4 Client-side threats
- 35.5 Diagrammi: Mobile app DFD, data flows
- 35.6 Report: Mobile security assessment

## Appendici

### Appendice A: YAML Schemas Reference
- Complete Zod schemas per threat modeling
- Validation rules
- Examples

### Appendice B: STIX 2.1 Specification Cheat Sheet
- SDO reference
- SRO reference
- Pattern syntax
- Examples

### Appendice C: STRIDE Quick Reference
- STRIDE per DFD element
- Common mitigations
- Examples

### Appendice D: PASTA Templates
- Template per ogni step
- Worksheets
- Examples

### Appendice E: MITRE ATT&CK Techniques
- Enterprise techniques
- Mobile techniques
- ICS techniques
- Mapping a STRIDE

### Appendice F: Tooling e Risorse
- Threat modeling tools comparison
- STIX/TAXII tools
- Visualization tools
- Learning resources

### Appendice G: Glossario
- Terminologia threat modeling
- Acronimi
- Definizioni

## Risorse Online

- Repository GitHub con codice completo
- Template YAML scaricabili
- STIX bundles di esempio
- Video tutorials
- Community forum