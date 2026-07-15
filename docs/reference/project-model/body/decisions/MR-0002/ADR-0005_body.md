# ADR-0005 — Integrazione locale di VS Code tramite task governati

## Status

Draft

## Context

I tool locali governati sono disponibili come comandi CLI, ma il loro uso quotidiano richiede di ricordare path, argomenti e modalità sicure di esecuzione.

L'integrazione editor riduce questo attrito senza duplicare logica, introdurre prematuramente una custom extension o trasformare VS Code in una nuova fonte canonica delle regole operative.

I task coprono check locali, authoring guidato e produzione dell'handoff. Per questo motivo formano un livello trasversale e non una semplice estensione del solo generatore documentale governato da MR-0002/ADR-0004 o della Decision sull'handoff MR-0001/ADR-0006.

## Decision

ThreatForge adotta un catalogo locale di task VS Code come livello di lancio sottile sopra i comandi CLI governati esistenti.

Il catalogo:

- usa label visibili con prefisso canonico `ThreatForge:`;
- invoca direttamente i tool esistenti senza replicarne la logica;
- esegue i comandi dalla root del repository;
- mantiene separati i task di preview dai task che producono side effect;
- consente la creazione di documenti governati delegando al core CLI la preview e la conferma esplicita con valore predefinito non distruttivo;
- mantiene in `--dry-run` la produzione dell'handoff fino a un Requirement successivo sulla creazione confermata;
- esclude da task, input, setting, associazioni di schema e snippet ogni copia delle regole e dei valori canonici;
- risiede sotto `.vscode/tasks.json` nella root canonica del repository;
- non introduce una custom extension VS Code.

I task vengono caricati aprendo la root del repository ThreatForge come cartella workspace in VS Code. Il `cwd` coincide con `${workspaceFolder}`.

## Consequences

- Benefit: I check e i generatori locali diventano accessibili dalla palette `Tasks: Run Task`.
- Benefit: Le label utente espongono esclusivamente il nome canonico `ThreatForge`.
- Benefit: Le modifiche ai comandi restano governate nei tool CLI anziché nel catalogo editor.
- Constraint: Schemi, snippet e setting dedicati entrano come incrementi separati.
- Constraint: Una custom extension resta fuori ambito finché i task locali risultano sufficienti.
