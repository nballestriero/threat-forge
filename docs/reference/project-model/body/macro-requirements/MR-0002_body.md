# MR-0002 — Authoring e implementazione governata

## Scopo

Authoring e implementazione governata definisce come ThreatForge accompagna una persona o un LLM dal requisito governato agli artefatti implementativi e alle relative verifiche.

Il macro-requirement deve mantenere separati il modello applicativo, i tool deterministici e gli adapter degli ambienti di sviluppo.

## Principi

- Un artefatto implementativo deve derivare da almeno un requisito governato esistente.
- Le regole di dominio e di tracciabilità devono vivere nel core o nei tool governati, non nell'IDE.
- L'app ThreatForge deve orchestrare il flusso complessivo senza diventare dipendente da uno specifico editor.
- Gli adapter IDE devono raccogliere input, invocare capacità governate e presentare risultati.
- La generazione deve partire da modalità pianificate e verificabili prima di abilitare scritture reali.

## Superfici supportate

La prima superficie di authoring integrata è Visual Studio Code, coerente con lo stack Node.js, JavaScript, TypeScript, React, Markdown, YAML e JSON del progetto.

Visual Studio e altri IDE possono essere aggiunti come adapter successivi senza modificare le regole canoniche del core.

## Ambito

Include:

- selezione guidata di macro-requirement, decisioni e requisiti;
- pianificazione e generazione di artefatti implementativi;
- tracciabilità tra requisito, codice e verifica;
- adapter IDE sottili;
- apertura dei file generati nell'editor;
- esecuzione dei gate locali;
- integrazione futura con l'app ThreatForge.

Fuori ambito iniziale:

- generazione autonoma di codice senza requisito governato;
- regole di dominio duplicate dentro un'estensione IDE;
- commit o push automatici non governati;
- supporto simultaneo obbligatorio per tutti gli IDE;
- implementazione completa dell'interfaccia applicativa ThreatForge.
